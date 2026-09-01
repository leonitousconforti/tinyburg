import { Array, Config, DateTime, Duration, Effect, Layer, Option, Redacted, Result, Schedule, Schema } from "effect";
import { HttpClient, HttpClientRequest, HttpRouter, HttpServerRequest, HttpServerResponse } from "effect/unstable/http";
import { HttpApiClient } from "effect/unstable/httpapi";
import { RateLimiter } from "effect/unstable/persistence";

import * as crypto from "node:crypto";

import { NimblebitConfig } from "@tinyburg/nimblebit-sdk";
import { Sdk } from "@tinyburg/trading-sdk";
import { TinyTower as TinyTowerScopes } from "@tinyburg/trading-sdk/Scopes";
import { DynamicClientRegistration, RelyingParty } from "effect-oidc";

import { CookiePolicy, SESSION_COOKIE_NAME, maybeCurrentSession } from "../cookies.ts";
import { randomSecret, sha256 } from "../crypto.ts";
import { SessionsRepository } from "../domain/sessions.ts";

const tinyburgConfig = Config.all({
    adminPassword: Config.redacted("ADMIN_PASSWORD"),
    adminPlayerIds: Config.schema(Config.Array(NimblebitConfig.PlayerIdSchema), "ADMIN_PLAYER_IDS"),
    registrationToken: Config.option(Config.redacted("TINYBURG_OAUTH_REGISTRATION_TOKEN")),
    redirectUri: Config.string("TINYBURG_OAUTH_REDIRECT_URI"),
    issuer: Config.string("TINYBURG_OAUTH_ISSUER").pipe(
        Config.withDefault("https://tinyburg.app"),
        Config.map((issuer) => issuer.replace(/\/$/, ""))
    ),
    development: Config.string("NODE_ENV").pipe(
        Config.withDefault("production"),
        Config.map((env) => env === "development")
    ),
});

const LOGIN_SCOPES = ["openid", "profile"];
// Elevation only needs to know which towers the visitor has linked, and the
// scope tree is fine enough to ask for exactly that.
const ELEVATE_SCOPES = ["openid", TinyTowerScopes.read.list_accounts.name];
const HOME_AFTER_LOGIN = "/keys";

/**
 * The credentials the proxy presents at the provider, obtained by registering
 * itself at boot (RFC 7591) and held for the life of the process. Registering
 * is idempotent - the provider keys it on the software id below - so this is
 * the same client every time and there is nothing to keep between runs.
 * Public: PKCE carries the proof, and the scope is everything either flow
 * below asks for.
 *
 * Outside development the registration token is required, and is read again
 * here as such so a deployment without one fails naming the setting, rather
 * than being refused by the provider a minute of retries later.
 */
const SOFTWARE_ID = "tinyburg-authproxy";

/**
 * In the dev stack registration runs at boot, and the provider next door may
 * still be coming up: an unreachable provider is retried for a little under a
 * minute. A refusal is not retried - it would only be refused again - and a
 * provider that offers no registration is not either.
 */
const registrationBackoff = Schedule.exponential("500 millis").pipe(
    Schedule.jittered,
    Schedule.upTo({ duration: "1 minute" })
);

const registerAtProvider = (config: Config.Success<typeof tinyburgConfig>) =>
    Effect.gen(function* () {
        const initialAccessToken = config.development
            ? Option.getOrUndefined(config.registrationToken)
            : yield* Config.redacted("TINYBURG_OAUTH_REGISTRATION_TOKEN");

        const registration = yield* DynamicClientRegistration.register({
            issuer: config.issuer,
            initialAccessToken,
            metadata: {
                softwareId: SOFTWARE_ID,
                clientName: "Authproxy Self Service",
                redirectUris: [config.redirectUri],
                tokenEndpointAuthMethod: "none",
                scopes: Array.union(LOGIN_SCOPES, ELEVATE_SCOPES),
                grantTypes: ["authorization_code", "refresh_token"],
            },
        }).pipe(
            Effect.retry({ while: (error) => error.reason === "Unreachable", schedule: registrationBackoff }),
            Effect.tap(({ clientId }) => Effect.logInfo(`registered at ${config.issuer} as client ${clientId}`))
        );

        return {
            clientId: registration.clientId,
            clientSecret: Option.map(registration.clientSecret, Redacted.value).pipe(Option.getOrUndefined),
        };
    });

const OAuthIntent = Schema.fromJsonString(
    Schema.Struct({
        mode: Schema.Literals(["login", "elevate"]),
        returnTo: Schema.optional(Schema.String),
    })
);

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

const loginErrorMessage: Record<RelyingParty.CallbackError["reason"], string> = {
    InvalidCallback: "invalid_oauth_callback",
    AccessDenied: "oauth_denied",
    ProviderError: "invalid_oauth_provider",
    StateMismatch: "invalid_oauth_cookies",
    ExchangeFailed: "invalid_oauth_token",
    InvalidIdToken: "invalid_oauth_claims",
};

const login = Effect.fnUntraced(function* (
    _config: Config.Success<typeof tinyburgConfig>,
    relyingParty: RelyingParty.RelyingParty
) {
    const returnTo = yield* returnToParam;

    const tryCurrentSession = yield* maybeCurrentSession.pipe(Effect.option);
    if (Option.isNone(tryCurrentSession)) {
        return HttpServerResponse.redirect("/login?error=oauth_failed");
    }

    if (Option.isSome(tryCurrentSession.value)) {
        return HttpServerResponse.redirect(Option.getOrElse(returnTo, () => HOME_AFTER_LOGIN));
    }

    const intent = yield* Schema.encodeEffect(OAuthIntent)({
        returnTo: Option.getOrUndefined(returnTo),
        mode: "login",
    }).pipe(Effect.orDie);

    return yield* relyingParty
        .beginAuthorization({ payload: intent })
        .pipe(Effect.orElseSucceed(() => HttpServerResponse.redirect("/login?error=start_failed")));
}, Effect.satisfiesErrorType<never>());

const elevate = Effect.fnUntraced(function* (
    config: Config.Success<typeof tinyburgConfig>,
    relyingParty: RelyingParty.RelyingParty,
    rateLimiter: RateLimiter.RateLimiter
) {
    const refused = HttpServerResponse.redirect("/admin?error=elevation_failed");
    const tryCurrentSession = yield* maybeCurrentSession.pipe(Effect.option);

    if (Option.isNone(tryCurrentSession)) {
        return refused;
    }

    if (Option.isNone(tryCurrentSession.value)) {
        return HttpServerResponse.redirect(`/login?returnTo=${encodeURIComponent("/admin")}`);
    }

    const session = tryCurrentSession.value.value;
    const maybeBody = yield* HttpServerRequest.schemaBodyUrlParams(
        Schema.Struct({
            password: Schema.String,
        })
    ).pipe(Effect.option);

    if (Option.isNone(maybeBody)) {
        return refused;
    }

    // The password check is an oracle, so attempts are strictly limited.
    const allowed = yield* rateLimiter
        .consume({
            onExceeded: "fail",
            algorithm: "fixed-window",
            key: `elevate:${session.id}`,
            limit: 5,
            window: Duration.minutes(5),
        })
        .pipe(Effect.isSuccess);
    if (!allowed) {
        return refused;
    }

    const presented = yield* sha256(maybeBody.value.password);
    const expected = yield* sha256(Redacted.value(config.adminPassword));
    const passwordOk = crypto.timingSafeEqual(Buffer.from(presented), Buffer.from(expected));

    const begun = yield* SessionsRepository.use((repo) =>
        repo.beginElevation({
            sessionId: session.id,
            passwordOk,
        })
    ).pipe(Effect.option, Effect.map(Option.flatten));

    if (Option.isNone(begun)) {
        return refused;
    }

    const intent = yield* Schema.encodeEffect(OAuthIntent)({ mode: "elevate" }).pipe(Effect.orDie);
    return yield* relyingParty.beginAuthorization({ payload: intent }).pipe(Effect.orElseSucceed(() => refused));
}, Effect.satisfiesErrorType<never>());

const callback = (config: Config.Success<typeof tinyburgConfig>, relyingParty: RelyingParty.RelyingParty) =>
    Effect.gen(function* () {
        const maybeIntent = yield* relyingParty.payload.pipe(
            Effect.flatMap(
                Option.match({
                    onNone: () => Effect.succeed(Option.none<typeof OAuthIntent.Type>()),
                    onSome: (raw) => Schema.decodeEffect(OAuthIntent)(raw).pipe(Effect.option),
                })
            )
        );

        if (Option.isNone(maybeIntent)) {
            return yield* HttpServerResponse.redirect("/login?error=invalid_oauth_intent").pipe(
                relyingParty.expireTransactionCookies,
                Effect.orDie
            );
        }

        const intent = maybeIntent.value;
        const failed = (errorMessage: string) =>
            HttpServerResponse.redirect(
                intent.mode === "elevate"
                    ? "/admin?error=elevation_failed"
                    : `/login?error=${encodeURIComponent(errorMessage)}`
            ).pipe(relyingParty.expireTransactionCookies, Effect.orDie);

        const outcome = yield* Effect.result(relyingParty.completeAuthorization);
        if (Result.isFailure(outcome)) return yield* failed(loginErrorMessage[outcome.failure.reason]);

        const { claims, tokens } = outcome.success;
        if (intent.mode === "elevate") {
            const tryCurrentSession = yield* maybeCurrentSession.pipe(Effect.option, Effect.map(Option.flatten));
            if (Option.isNone(tryCurrentSession)) {
                return yield* failed("elevation_failed");
            }

            const session = tryCurrentSession.value;
            const clearPending = SessionsRepository.use((repo) => repo.clearElevation(session.id)).pipe(Effect.ignore);
            if (claims.sub !== session.sub) {
                yield* clearPending;
                return yield* failed("elevation_failed");
            }

            const addBearer = HttpClient.mapRequest(HttpClientRequest.bearerToken(tokens.access_token));
            const httpClient = yield* HttpClient.HttpClient.pipe(Effect.map(addBearer));

            const pullLinkedTowers = yield* HttpApiClient.endpoint(Sdk.Api, {
                baseUrl: config.issuer,
                group: "TinyTowerAccountsGroup",
                endpoint: "ListAccounts",
                httpClient,
            });

            const linkedTowers = yield* pullLinkedTowers().pipe(
                Effect.orElseSucceed(() => []),
                Effect.map(Array.map((tower) => tower.playerId)),
                Effect.map((ids) => new Set(ids))
            );

            const eligible = config.adminPlayerIds.some((admin) => linkedTowers.has(admin));
            if (!eligible) {
                yield* clearPending;
                return yield* failed("elevation_failed");
            }

            const completed = yield* SessionsRepository.use((repo) => repo.completeElevation(session.id)).pipe(
                Effect.option,
                Effect.map(Option.flatten)
            );

            if (Option.isNone(completed)) {
                return yield* failed("elevation_failed");
            }

            return yield* HttpServerResponse.redirect("/admin").pipe(
                relyingParty.expireTransactionCookies,
                Effect.orDie
            );
        }

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

        const cookiePolicy = yield* CookiePolicy;
        const returnTo = Option.fromNullishOr(intent.returnTo).pipe(
            Option.filter(isLocalPath),
            Option.getOrElse(() => HOME_AFTER_LOGIN)
        );

        return yield* HttpServerResponse.redirect(returnTo).pipe(
            HttpServerResponse.setCookie(cookiePolicy.name(SESSION_COOKIE_NAME), sessionToken, {
                expires: DateTime.toDateUtc(maybeSession.value.expiresAt),
                httpOnly: true,
                path: "/",
                secure: cookiePolicy.secure,
                sameSite: "lax",
            }),
            Effect.flatMap(relyingParty.expireTransactionCookies),
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
    const cookiePolicy = yield* CookiePolicy;
    const elevationRateLimiter = yield* RateLimiter.make;

    const credentials = yield* registerAtProvider(config);

    // One registration at the provider, two scope sets: signing in asks for
    // identity only, elevation re-authorizes with towers:read on top. Both
    // share one cookie prefix, so the single callback route completes either
    // flow.
    const relyingParty = (scopes: ReadonlyArray<string>) =>
        RelyingParty.make({
            issuer: config.issuer,
            authorizationEndpoint: `${config.issuer}/oauth/authorize`,
            tokenEndpoint: `${config.issuer}/oauth/token`,
            jwksUri: `${config.issuer}/.well-known/jwks.json`,
            clientId: credentials.clientId,
            clientSecret: credentials.clientSecret,
            redirectUri: config.redirectUri,
            scopes,
            cookies: {
                prefix: "authproxy_oauth",
                name: cookiePolicy.name,
                secure: cookiePolicy.secure,
            },
        });

    const loginParty = yield* relyingParty(LOGIN_SCOPES);
    const elevateParty = yield* relyingParty(ELEVATE_SCOPES);

    return Layer.mergeAll(
        HttpRouter.add("GET", "/auth/login", login(config, loginParty)),
        HttpRouter.add("POST", "/auth/elevate", elevate(config, elevateParty, elevationRateLimiter)),
        HttpRouter.add("GET", "/auth/callback", callback(config, elevateParty)),
        HttpRouter.add("POST", "/logout", logout)
    );
}).pipe(Layer.unwrap);
