import { DateTime, Effect, Layer, Option, Redacted, Ref, Result, Schema } from "effect";
import { HttpClient, HttpRouter, HttpServerRequest, HttpServerResponse, Url } from "effect/unstable/http";

import type { Jwt } from "effect-oidc";

import { Oidc } from "effect-oidc";

import { CookiePolicy, maybeCurrentSession, SESSION_COOKIE_NAME } from "../cookies.ts";
import { randomSecret, sha256 } from "../crypto.ts";
import { SessionsRepository } from "../domain/sessions.ts";
// "Sign in with Tinyburg": the authproxy is an OIDC relying party of
// tinyburg.app's provider. Authorization code + PKCE; the client may be
// public (no secret registered) since PKCE carries the proof.
import { tinyburgConfig } from "../tinyburg.ts";

const STATE_COOKIE_NAME = "authproxy_oauth_state";
const CODE_VERIFIER_COOKIE_NAME = "authproxy_oauth_code_verifier";
const RETURN_TO_COOKIE_NAME = "authproxy_oauth_return_to";

const SCOPES = ["openid", "profile"];

/** Where a fresh sign-in lands when nothing better was asked for. */
const HOME_AFTER_LOGIN = "/keys";

const isLocalPath = (value: string): boolean => {
    const NOWHERE = "https://authproxy.invalid";
    if (!value.startsWith("/")) return false;
    try {
        return new URL(value, NOWHERE).origin === NOWHERE;
    } catch {
        return false;
    }
};

const returnToParam = HttpServerRequest.schemaSearchParams(
    Schema.Struct({
        returnTo: Schema.optional(Schema.String),
    })
).pipe(
    Effect.map(({ returnTo }) => Option.fromUndefinedOr(returnTo)),
    Effect.map(Option.filter(isLocalPath)),
    Effect.option,
    Effect.map(Option.flatten)
);

interface TinyburgRealized {
    readonly issuer: string;
    readonly clientId: string;
    readonly clientSecret: Option.Option<Redacted.Redacted>;
    readonly redirectUri: string;
    readonly jwks: Effect.Effect<Schema.Schema.Type<typeof Jwt.JwksSchema>, unknown, never>;
}

const login = (tinyburg: TinyburgRealized) =>
    Effect.gen(function* () {
        const cookies = yield* CookiePolicy;
        const returnTo = yield* returnToParam;

        const tryCurrentSession = yield* maybeCurrentSession.pipe(Effect.option);
        if (Option.isNone(tryCurrentSession)) {
            return HttpServerResponse.redirect("/login?error=oauth_failed");
        }

        // Already signed in: nothing to ask the provider for.
        if (Option.isSome(tryCurrentSession.value)) {
            return HttpServerResponse.redirect(Option.getOrElse(returnTo, () => HOME_AFTER_LOGIN));
        }

        const codeVerifier = randomSecret();
        const state = randomSecret();

        const authorizationRequest = Oidc.authorizationRequest({
            authorizationEndpoint: `${tinyburg.issuer}/oauth/authorize`,
            clientId: tinyburg.clientId,
            redirectUri: tinyburg.redirectUri,
            scopes: SCOPES,
            state,
            codeChallenge: yield* sha256(codeVerifier),
        });

        const authorizationUrl = Url.make(
            authorizationRequest.url,
            authorizationRequest.urlParams,
            authorizationRequest.hash.valueOrUndefined
        ).pipe(Result.getOrThrow);

        const cookieOptions = {
            maxAge: "10 minutes",
            httpOnly: true,
            path: "/",
            secure: cookies.secure,
            sameSite: "lax",
        } as const;

        return yield* HttpServerResponse.redirect(authorizationUrl).pipe(
            HttpServerResponse.setCookies([
                [cookies.name(STATE_COOKIE_NAME), state, cookieOptions],
                [cookies.name(CODE_VERIFIER_COOKIE_NAME), codeVerifier, cookieOptions],
                [
                    cookies.name(RETURN_TO_COOKIE_NAME),
                    Option.getOrElse(returnTo, () => HOME_AFTER_LOGIN),
                    cookieOptions,
                ],
            ]),
            Effect.catch(() => Effect.succeed(HttpServerResponse.redirect("/login?error=start_failed")))
        );
    }).pipe(Effect.satisfiesErrorType<never>());

const expireSpentCookies = (response: HttpServerResponse.HttpServerResponse) =>
    Effect.gen(function* () {
        const cookies = yield* CookiePolicy;

        const expireOptions = {
            httpOnly: true,
            path: "/",
            secure: cookies.secure,
            sameSite: "lax",
        } as const;

        return yield* Effect.succeed(response).pipe(
            Effect.flatMap(HttpServerResponse.expireCookie(cookies.name(STATE_COOKIE_NAME), expireOptions)),
            Effect.flatMap(HttpServerResponse.expireCookie(cookies.name(CODE_VERIFIER_COOKIE_NAME), expireOptions)),
            Effect.flatMap(HttpServerResponse.expireCookie(cookies.name(RETURN_TO_COOKIE_NAME), expireOptions))
        );
    });

const callback = (tinyburg: TinyburgRealized) =>
    Effect.gen(function* () {
        const cookiesPolicy = yield* CookiePolicy;

        const failed = (errorMessage: string) =>
            HttpServerResponse.redirect(`/login?error=${encodeURIComponent(errorMessage)}`).pipe(
                expireSpentCookies,
                Effect.orDie
            );

        // The provider redirects back with either an error or a code
        const maybeUrlParams = yield* HttpServerRequest.schemaSearchParams(
            Schema.Union([
                Schema.Struct({
                    error: Schema.String,
                }),
                Schema.Struct({
                    code: Schema.String,
                    state: Schema.String,
                }),
            ])
        ).pipe(Effect.option);
        if (Option.isNone(maybeUrlParams)) {
            return yield* failed("invalid_oauth_callback");
        }

        // The visitor cancelled at the provider, or the provider refused
        const urlParams = maybeUrlParams.value;
        if ("error" in urlParams) {
            return yield* failed(urlParams.error === "access_denied" ? "oauth_denied" : "invalid_oauth_provider");
        }

        // The state cookie must match the state the provider echoed back
        const maybeCookies = yield* HttpServerRequest.schemaCookies(
            Schema.Struct({
                [cookiesPolicy.name(STATE_COOKIE_NAME)]: Schema.Literal(urlParams.state),
                [cookiesPolicy.name(CODE_VERIFIER_COOKIE_NAME)]: Schema.String,
            })
        ).pipe(Effect.option);
        if (Option.isNone(maybeCookies)) {
            return yield* failed("invalid_oauth_cookies");
        }

        const cookies = maybeCookies.value;
        const codeVerifierCookie = cookies[cookiesPolicy.name(CODE_VERIFIER_COOKIE_NAME)];

        // Where to land after signing in; the cookie is best-effort and the
        // default is always safe.
        const request = yield* HttpServerRequest.HttpServerRequest;
        const returnTo = Option.fromNullishOr(request.cookies[cookiesPolicy.name(RETURN_TO_COOKIE_NAME)]).pipe(
            Option.filter(isLocalPath),
            Option.getOrElse(() => HOME_AFTER_LOGIN)
        );

        // Exchange the authorization code for tokens
        const maybeToken = yield* Oidc.exchangeAuthorizationCode({
            tokenEndpoint: `${tinyburg.issuer}/oauth/token`,
            clientId: tinyburg.clientId,
            clientSecret: Option.map(tinyburg.clientSecret, Redacted.value).pipe(Option.getOrUndefined),
            redirectUri: tinyburg.redirectUri,
            code: urlParams.code,
            codeVerifier: codeVerifierCookie,
        }).pipe(Effect.option);
        if (Option.isNone(maybeToken)) {
            return yield* failed("invalid_oauth_token");
        }

        // Verify the ID token and extract user information
        const maybeClaims = yield* tinyburg.jwks.pipe(
            Effect.flatMap((jwks) =>
                Oidc.verifyIdToken({
                    jwks,
                    clientId: tinyburg.clientId,
                    issuer: tinyburg.issuer,
                    idToken: maybeToken.value.id_token ?? "",
                })
            ),
            Effect.option
        );
        if (Option.isNone(maybeClaims)) {
            return yield* failed("invalid_oauth_claims");
        }

        const claims = maybeClaims.value;
        const sessionToken = randomSecret();
        const tokenHash = yield* sha256(sessionToken);

        const maybeSession = yield* SessionsRepository.use((repo) =>
            repo.createSession({
                sub: claims.sub,
                displayName: Option.fromNullishOr(claims.name),
                avatarUrl: Option.fromNullishOr(claims.picture),
                tokenHash,
            })
        ).pipe(Effect.option);
        if (Option.isNone(maybeSession)) {
            return yield* failed("invalid_oauth_session");
        }

        return yield* HttpServerResponse.redirect(returnTo).pipe(
            HttpServerResponse.setCookie(cookiesPolicy.name(SESSION_COOKIE_NAME), sessionToken, {
                expires: DateTime.toDateUtc(maybeSession.value.expiresAt),
                httpOnly: true,
                path: "/",
                secure: cookiesPolicy.secure,
                sameSite: "lax",
            }),
            Effect.flatMap(expireSpentCookies),
            Effect.catch(() => failed("invalid_oauth_response"))
        );
    }).pipe(Effect.satisfiesErrorType<never>());

const logout = Effect.gen(function* () {
    const cookies = yield* CookiePolicy;
    const request = yield* HttpServerRequest.HttpServerRequest;

    const sessionToken = Option.fromNullishOr(request.cookies[cookies.name(SESSION_COOKIE_NAME)]);
    if (Option.isSome(sessionToken)) {
        const tokenHash = yield* sha256(sessionToken.value);
        yield* SessionsRepository.use((repo) => repo.revokeSessionByTokenHash(tokenHash)).pipe(Effect.ignore);
    }

    return yield* HttpServerResponse.expireCookie(HttpServerResponse.redirect("/"), cookies.name(SESSION_COOKIE_NAME), {
        httpOnly: true,
        path: "/",
        secure: cookies.secure,
        sameSite: "lax",
    }).pipe(Effect.orDie);
}).pipe(Effect.satisfiesErrorType<never>());

export const OAuthRoutesLive = Effect.gen(function* () {
    const config = yield* tinyburgConfig;
    const httpClient = yield* HttpClient.HttpClient;

    // The provider's signing keys, cached with a last-good fallback so a
    // hiccup fetching them does not read as a failed sign in.
    const cachedJwks = yield* Effect.flatMap(
        Ref.make(Option.none<Schema.Schema.Type<typeof Jwt.JwksSchema>>()),
        (lastGood) =>
            Oidc.fetchJwks(`${config.issuer}/.well-known/jwks.json`).pipe(
                Effect.provideService(HttpClient.HttpClient, httpClient),
                Effect.tap((jwks) => Ref.set(lastGood, Option.some(jwks))),
                Effect.catch((error) =>
                    Ref.get(lastGood).pipe(
                        Effect.flatMap(
                            Option.match({
                                onNone: () => Effect.fail(error),
                                onSome: Effect.succeed,
                            })
                        )
                    )
                ),
                Effect.cachedInvalidateWithTTL("10 minutes"),
                Effect.map(([cached, invalidate]) => Effect.tapError(cached, () => invalidate))
            )
    );

    const tinyburg: TinyburgRealized = {
        issuer: config.issuer,
        clientId: config.clientId,
        clientSecret: config.clientSecret,
        redirectUri: config.redirectUri,
        jwks: cachedJwks,
    };

    return Layer.mergeAll(
        HttpRouter.add("GET", "/auth/login", login(tinyburg)),
        HttpRouter.add("GET", "/auth/callback", callback(tinyburg)),
        HttpRouter.add("POST", "/logout", logout)
    );
}).pipe(Layer.unwrap);
