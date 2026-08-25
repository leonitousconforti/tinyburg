/**
 * "Sign in with Tinyburg", from the study's side.
 *
 * social-circles is an OIDC relying party of tinyburg.app: authorization code
 * plus PKCE, public client (the code challenge carries the proof, so no secret
 * is required).
 *
 * The round trip yields two different tokens with two different jobs, and they
 * are stored separately on purpose:
 *
 * - the **access token** rides the browser session and lets the dashboard ask
 *   the provider, right now, which towers this visitor owns.
 * - the **refresh token**, when the provider starts issuing them, goes in
 *   `tower_grants` and is what the scheduled crawl uses hours later.
 */

import type { HttpClientError } from "effect/unstable/http";

import { Config, DateTime, Effect, Layer, Option, Redacted, Ref, Result, Schema } from "effect";
import { HttpClient, HttpRouter, HttpServerRequest, HttpServerResponse, Url } from "effect/unstable/http";

import type { Jwt } from "effect-oidc";

import { Oidc } from "effect-oidc";

import { CookiePolicy, SESSION_COOKIE_NAME, maybeCurrentSession } from "../cookies.ts";
import { randomSecret, seal, sha256 } from "../crypto.ts";
import { GrantsRepository } from "../domain/grants.ts";
import { SessionsRepository } from "../domain/sessions.ts";

const tinyburgConfig = Config.all({
    issuer: Config.string("TINYBURG_ISSUER").pipe(
        Config.withDefault("https://tinyburg.app"),
        Config.map((issuer) => issuer.replace(/\/$/, ""))
    ),
    // The default keeps the study booting before its client is registered at
    // the provider; sign in simply fails at tinyburg.app until it is set.
    clientId: Config.string("TINYBURG_CLIENT_ID").pipe(Config.withDefault("unconfigured")),
    clientSecret: Config.option(Config.redacted("TINYBURG_CLIENT_SECRET")),
    redirectUri: Config.string("TINYBURG_REDIRECT_URI").pipe(Config.withDefault("http://localhost:3002/auth/callback")),
});

const STATE_COOKIE_NAME = "social_circles_oauth_state";
const CODE_VERIFIER_COOKIE_NAME = "social_circles_oauth_code_verifier";
const RETURN_TO_COOKIE_NAME = "social_circles_oauth_return_to";

/**
 * `towers:read` lets the study read a friends list; `offline_access` lets it
 * keep doing so on a schedule.
 *
 * Read-only is the whole point of asking for `towers:read` rather than the
 * older `towers`: a research project has no business being able to overwrite
 * somebody's tower, and the consent screen now says so in as many words.
 */
const SCOPES = ["openid", "profile", "towers:read", "offline_access"];

/** Where a fresh sign-in lands when nothing better was asked for. */
const HOME_AFTER_LOGIN = "/towers";

const isLocalPath = (value: string): boolean => {
    const NOWHERE = "https://social-circles.invalid";
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
    /**
     * The signing keys, already cached. Spelled out rather than left as
     * `unknown`, so a caller can see that a failure here is a fetch or a decode
     * and not something it should be catching broadly.
     */
    readonly jwks: Effect.Effect<
        Schema.Schema.Type<typeof Jwt.JwksSchema>,
        HttpClientError.HttpClientError | Schema.SchemaError,
        never
    >;
}

const login = (tinyburg: TinyburgRealized) =>
    Effect.gen(function* () {
        const cookies = yield* CookiePolicy;
        const returnTo = yield* returnToParam;
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
                Schema.Struct({ error: Schema.String }),
                Schema.Struct({ code: Schema.String, state: Schema.String }),
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

        const request = yield* HttpServerRequest.HttpServerRequest;
        const returnTo = Option.fromNullishOr(request.cookies[cookiesPolicy.name(RETURN_TO_COOKIE_NAME)]).pipe(
            Option.filter(isLocalPath),
            Option.getOrElse(() => HOME_AFTER_LOGIN)
        );

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

        const tokens = maybeToken.value;
        const now = yield* DateTime.now;

        /**
         * The access token is what makes the dashboard work today. Sealed, so
         * the sessions table is not a pile of live provider credentials.
         */
        yield* seal(tokens.access_token).pipe(
            Effect.flatMap((ciphertext) =>
                SessionsRepository.use((repo) =>
                    repo.setAccessToken({
                        sessionId: maybeSession.value.id,
                        ciphertext,
                        expiresAt: DateTime.toDateUtc(DateTime.addDuration(now, `${tokens.expires_in} seconds`)),
                    })
                )
            ),
            // A session without a stored token still signs the visitor in; the
            // dashboard will just report that it cannot reach the provider,
            // which is more useful than failing the whole sign-in.
            Effect.catchCause((cause) => Effect.logWarning("could not store the provider access token", cause))
        );

        /**
         * Only present once the provider supports `offline_access`. Until then
         * this is skipped and background crawling stays blocked, which is the
         * honest state of things rather than a silent half-configuration.
         */
        yield* Option.match(Option.fromNullishOr(tokens.refresh_token), {
            onNone: () =>
                Effect.logInfo(
                    "the provider issued no refresh token, so scheduled crawling stays unavailable for this user"
                ),
            onSome: (refreshToken) =>
                seal(refreshToken).pipe(
                    Effect.flatMap((ciphertext) =>
                        GrantsRepository.use((repo) =>
                            repo.upsert({
                                tinyburgUserId: claims.sub,
                                refreshTokenCiphertext: ciphertext,
                                scope: SCOPES.join(" "),
                            })
                        )
                    ),
                    Effect.catchCause((cause) => Effect.logWarning("could not store the towers grant", cause))
                ),
        });

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

/**
 * Signing out drops the browser session only.
 *
 * The `tower_grants` row deliberately survives: it is what keeps the crawl
 * running for a participant who signed out of the dashboard but has not
 * withdrawn from the study. Withdrawing is a separate, explicit act, and it is
 * the purge workflow that removes the grant.
 */
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

    // The provider's signing keys, cached with a last-good fallback so a hiccup
    // fetching them does not read as a failed sign in.
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

/** Re-exported so the self-service handlers can read the same session. */
export { maybeCurrentSession };
