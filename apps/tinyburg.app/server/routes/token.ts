import { Data, Effect, Layer, Option, Schema } from "effect";
import { type Headers, HttpRouter, HttpServerRequest, HttpServerResponse } from "effect/http";

import { DevelopersRepository } from "../../domain/developers.ts";
import { CookiePolicy, PROVIDER_SESSION_COOKIE_NAME, maybeCurrentUser } from "../cookies.ts";
import { codeVerifier, sha256 } from "../crypto.ts";
import { OidcKeys } from "../keys.ts";
import { FIRST_PARTY_SCOPES, TinyburgOAuth, apiResourceFor, firstPartyRedirectUriFor } from "../oauthServer.ts";

/**
 * GET /auth/token - an access token for the first-party app, a
 * token-mediating backend.
 *
 * The SPA is signed in with the provider session cookie and holds no token,
 * which is all this server's own `/v1` needs. The treasury behind
 * `/v1/treasury` reads no cookie: it takes the same JWT access tokens every
 * other application presents. `@yielded/auth` mints tokens only through the
 * authorization code flow, and will not answer a silent (`prompt=none`)
 * authorization for a stored client, so the SPA cannot fetch one itself.
 *
 * So this runs that flow on the SPA's behalf, inside the request: the first
 * party's authorization request, PKCE and all, handed straight to the OAuth
 * server with the visitor's session cookie on it, the redirect followed the
 * way the browser would, and the code exchanged. The first party is never
 * asked for consent, so the redirect carries the code at once. Nothing is
 * visited: the redirect uri (`firstPartyRedirectUriFor`) is only matched.
 *
 * The answer is `{ access_token, token_type, expires_in, scope }` and nothing
 * more, never cached. The ID token the exchange also returns stays here, and
 * no refresh token is issued at all, because the first party is not
 * registered for `offline_access`: the SPA keeps the token in memory and asks
 * again once it lapses or a call is refused. Each answer is a grant of its
 * own, ending with its token, which the hourly sweep then removes.
 *
 * Only the site itself may ask (`isSameOrigin`), and only with a session:
 * `403` and `401` otherwise. A failure inside the flow is this server's, and
 * `503`.
 */

const noStore = { "cache-control": "no-store" };

/** What the token endpoint answers that the SPA is given. Everything else is dropped on decoding. */
const TokenResponse = Schema.Struct({
    access_token: Schema.String,
    token_type: Schema.Literal("Bearer"),
    expires_in: Schema.Finite,
    scope: Schema.String,
});

/** A step of the internal flow answered something other than what the flow expects of it. */
class MintFailed extends Data.TaggedError("MintFailed")<{
    readonly step: "authorize" | "consent" | "token";
    readonly status: number;
}> {}

/**
 * Whether the request comes from the site's own pages. `Sec-Fetch-Site` says
 * so where the browser sends it, which every current one does; without it,
 * an `Origin` naming the site is the only evidence accepted. A same-origin
 * GET carries no `Origin`, so a browser sending neither is refused.
 */
const isSameOrigin = (headers: Headers.Headers, origin: string): boolean => {
    const site = headers["sec-fetch-site"];
    return site === undefined ? headers["origin"] === origin : site === "same-origin";
};

/** The `name=value` pair of a cookie the response sets, as a browser would send it back. */
const setCookie = (response: Response, name: string): Option.Option<string> =>
    Option.fromNullishOr(
        response.headers
            .getSetCookie()
            .map((header) => header.split(";", 1)[0].trim())
            .find((pair) => pair.startsWith(`${name}=`))
    );

export const FirstPartyTokenLive = Layer.unwrap(
    Effect.gen(function* () {
        const service = yield* TinyburgOAuth.Service;
        const { issuer } = yield* OidcKeys;
        const cookies = yield* CookiePolicy;
        const { paths } = TinyburgOAuth;

        const origin = new URL(issuer).origin;
        const resource = apiResourceFor(issuer);
        const redirectUri = firstPartyRedirectUriFor(issuer);
        const clientId = DevelopersRepository.FIRST_PARTY_CLIENT_ID;
        const sessionCookieName = cookies.name(PROVIDER_SESSION_COOKIE_NAME);

        /**
         * One run of the first party's authorization, as the visitor holding
         * `session`. None when the OAuth server finds nobody signed in, which
         * happens only if the session ended since it was read.
         */
        const mint = (session: string) =>
            Effect.gen(function* () {
                const verifier = codeVerifier();
                const challenge = yield* sha256(verifier);
                const sessionCookie = `${sessionCookieName}=${encodeURIComponent(session)}`;

                // The authorization request. The server keeps it and moves it
                // into its consent cookie, as it does for every client.
                const query = new URLSearchParams({
                    response_type: "code",
                    client_id: clientId,
                    redirect_uri: redirectUri,
                    scope: [...FIRST_PARTY_SCOPES].join(" "),
                    resource,
                    code_challenge: challenge,
                    code_challenge_method: "S256",
                });
                const started = yield* service.handle(
                    new Request(`${issuer}${paths.authorize}?${query.toString()}`, {
                        headers: { cookie: sessionCookie },
                    })
                );
                const consent = setCookie(started, service.cookieName);
                if (started.status !== 303 || Option.isNone(consent)) {
                    return yield* new MintFailed({ step: "authorize", status: started.status });
                }

                // Its continuation, with only the cookies it reads: a consent
                // cookie for a third party's pending authorization may ride
                // on the visitor's own request, and must not stand in for
                // this one. The visitor is signed in and the first party is
                // never asked, so the answer is the redirect with the code.
                const decided = yield* service.handle(
                    new Request(`${issuer}${paths.authorize}`, {
                        headers: { cookie: `${sessionCookie}; ${consent.value}` },
                    })
                );
                const location = Option.fromNullishOr(decided.headers.get("location")).pipe(
                    Option.map((value) => new URL(value, issuer))
                );
                if (decided.status !== 303 || Option.isNone(location)) {
                    return yield* new MintFailed({ step: "consent", status: decided.status });
                }
                if (location.value.origin === origin && location.value.pathname === "/oauth/login") {
                    return Option.none();
                }

                const code = location.value.searchParams.get("code");
                if (`${location.value.origin}${location.value.pathname}` !== redirectUri || code === null) {
                    return yield* new MintFailed({ step: "consent", status: decided.status });
                }

                const exchanged = yield* service.handle(
                    new Request(`${issuer}${paths.token}`, {
                        method: "POST",
                        headers: { "content-type": "application/x-www-form-urlencoded" },
                        body: new URLSearchParams({
                            grant_type: "authorization_code",
                            client_id: clientId,
                            code,
                            redirect_uri: redirectUri,
                            code_verifier: verifier,
                            resource,
                        }).toString(),
                    })
                );
                if (exchanged.status !== 200) {
                    return yield* new MintFailed({ step: "token", status: exchanged.status });
                }

                const body = yield* Effect.flatMap(
                    Effect.promise(() => exchanged.json()),
                    Schema.decodeUnknownEffect(TokenResponse)
                ).pipe(Effect.mapError(() => new MintFailed({ step: "token", status: exchanged.status })));

                return Option.some(body);
            });

        const token = Effect.gen(function* () {
            const request = yield* HttpServerRequest.HttpServerRequest;
            if (!isSameOrigin(request.headers, origin)) {
                return HttpServerResponse.empty({ status: 403, headers: noStore });
            }

            const session = request.cookies[sessionCookieName];
            const current = yield* maybeCurrentUser;
            if (session === undefined || Option.isNone(current)) {
                return HttpServerResponse.empty({ status: 401, headers: noStore });
            }

            const minted = yield* mint(session);
            if (Option.isNone(minted)) return HttpServerResponse.empty({ status: 401, headers: noStore });

            const { access_token, expires_in, scope } = minted.value;
            return HttpServerResponse.jsonUnsafe(
                { access_token, token_type: "Bearer", expires_in, scope },
                { headers: noStore }
            );
        }).pipe(
            Effect.catch((error) =>
                Effect.as(
                    Effect.logError("could not mint a first-party access token", error),
                    HttpServerResponse.empty({ status: 503, headers: noStore })
                )
            )
        );

        return HttpRouter.add("GET", "/auth/token", token);
    })
);
