/**
 * The connect flow: how a trader lets the treasury act on their towers.
 *
 * Authorization code plus PKCE against tinyburg.app, asking for
 * `offline_access` and the handful of tower leaves the sagas need. The one
 * deliberate difference from the usual relying-party port: **no session is
 * created**. The treasury's api is bearer authenticated through
 * tinyburg.app's proxy, so the callback's only job is to store the sealed
 * refresh token and send the visitor back to the `/trades` page they came
 * from - which lives on the provider's own origin, not this one, so the
 * return-to check is an origin allow-list rather than `isLocalPath`.
 */

import { Effect, Layer, Option, Result, Schema } from "effect";
import { HttpRouter, HttpServerRequest, HttpServerResponse, Url } from "effect/unstable/http";

import { Oidc } from "effect-oidc";

import { CookiePolicy } from "../cookies.ts";
import { randomSecret, seal, sha256 } from "../crypto.ts";
import { GrantsRepository } from "../domain/grants.ts";
import { TinyburgOidc, USER_GRANT_SCOPES } from "../services/oidc.ts";

const STATE_COOKIE_NAME = "treasury_oauth_state";
const CODE_VERIFIER_COOKIE_NAME = "treasury_oauth_code_verifier";
const RETURN_TO_COOKIE_NAME = "treasury_oauth_return_to";

/**
 * Where the visitor lands when the flow finishes, absent anything better:
 * the trades page on the provider's own origin, since that is the only page
 * that links here.
 */
const homeAfterConnect = (issuer: string): string => `${issuer}/trades`;

/** Only the provider's origin may be returned to; this flow serves no other site. */
const isAllowedReturnTo = (issuer: string, value: string): boolean => {
    try {
        return new URL(value).origin === new URL(issuer).origin;
    } catch {
        return false;
    }
};

const returnToParam = (issuer: string) =>
    HttpServerRequest.schemaSearchParams(
        Schema.Struct({
            returnTo: Schema.optional(Schema.String),
        })
    ).pipe(
        Effect.map(({ returnTo }) => Option.fromUndefinedOr(returnTo)),
        Effect.map(Option.filter((value) => isAllowedReturnTo(issuer, value))),
        Effect.option,
        Effect.map(Option.flatten)
    );

const connect = Effect.gen(function* () {
    const oidc = yield* TinyburgOidc;
    const cookies = yield* CookiePolicy;
    const returnTo = yield* returnToParam(oidc.issuer);
    const codeVerifier = randomSecret();
    const state = randomSecret();

    const authorizationRequest = Oidc.authorizationRequest({
        authorizationEndpoint: `${oidc.issuer}/oauth/authorize`,
        clientId: oidc.clientId,
        redirectUri: oidc.redirectUri,
        scopes: [...USER_GRANT_SCOPES],
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
                Option.getOrElse(returnTo, () => homeAfterConnect(oidc.issuer)),
                cookieOptions,
            ],
        ]),
        Effect.catch(() =>
            Effect.succeed(
                HttpServerResponse.redirect(`${homeAfterConnect(oidc.issuer)}?connected=0&error=start_failed`)
            )
        )
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

const callback = Effect.gen(function* () {
    const oidc = yield* TinyburgOidc;
    const cookiesPolicy = yield* CookiePolicy;

    const request = yield* HttpServerRequest.HttpServerRequest;
    const returnTo = Option.fromNullishOr(request.cookies[cookiesPolicy.name(RETURN_TO_COOKIE_NAME)]).pipe(
        Option.filter((value) => isAllowedReturnTo(oidc.issuer, value)),
        Option.getOrElse(() => homeAfterConnect(oidc.issuer))
    );

    const failed = (errorMessage: string) =>
        HttpServerResponse.redirect(`${returnTo}?connected=0&error=${encodeURIComponent(errorMessage)}`).pipe(
            expireSpentCookies,
            Effect.orDie
        );

    // The provider redirects back with either an error or a code
    const maybeUrlParams = yield* HttpServerRequest.schemaSearchParams(
        Schema.Union([
            Schema.Struct({ error: Schema.String }),
            Schema.Struct({ code: Schema.String, state: Schema.String }),
        ])
    ).pipe(Effect.option);
    if (Option.isNone(maybeUrlParams)) {
        return yield* failed("invalid_oauth_callback");
    }

    // The visitor declined at the consent screen, or the provider refused
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

    const maybeToken = yield* Oidc.exchangeAuthorizationCode({
        tokenEndpoint: `${oidc.issuer}/oauth/token`,
        clientId: oidc.clientId,
        clientSecret: oidc.clientSecret,
        redirectUri: oidc.redirectUri,
        code: urlParams.code,
        codeVerifier: codeVerifierCookie,
    }).pipe(Effect.option);
    if (Option.isNone(maybeToken)) {
        return yield* failed("invalid_oauth_token");
    }

    const maybeClaims = yield* oidc.jwks.pipe(
        Effect.flatMap((jwks) =>
            Oidc.verifyIdToken({
                jwks,
                clientId: oidc.clientId,
                issuer: oidc.issuer,
                idToken: maybeToken.value.id_token ?? "",
            })
        ),
        Effect.option
    );
    if (Option.isNone(maybeClaims)) {
        return yield* failed("invalid_oauth_claims");
    }

    /**
     * The refresh token is the entire point of the flow: escrow legs run
     * hours after this redirect. A provider that issued none leaves the
     * visitor exactly as connected as they were before, and the page says
     * so rather than pretending.
     */
    const tokens = maybeToken.value;
    const refreshToken = Option.fromNullishOr(tokens.refresh_token);
    if (Option.isNone(refreshToken)) {
        return yield* failed("no_offline_access");
    }

    const stored = yield* seal(refreshToken.value).pipe(
        Effect.flatMap((ciphertext) =>
            GrantsRepository.use((repo) =>
                repo.upsert({
                    tinyburgUserId: maybeClaims.value.sub,
                    refreshTokenCiphertext: ciphertext,
                    scope: USER_GRANT_SCOPES.join(" "),
                })
            )
        ),
        Effect.option
    );
    if (Option.isNone(stored)) {
        return yield* failed("grant_not_stored");
    }

    return yield* HttpServerResponse.redirect(`${returnTo}?connected=1`).pipe(
        expireSpentCookies,
        Effect.catch(() => failed("invalid_oauth_response"))
    );
}).pipe(Effect.satisfiesErrorType<never>());

export const OAuthRoutesLive = Layer.mergeAll(
    HttpRouter.add("GET", "/auth/connect", connect),
    HttpRouter.add("GET", "/auth/callback", callback)
);
