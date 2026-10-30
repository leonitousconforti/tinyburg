import { Array, Config, DateTime, Duration, Effect, Layer, Option, Redacted, Result, Schedule, Schema } from "effect";
import { HttpClient, HttpClientRequest, HttpRouter, HttpServerRequest, HttpServerResponse } from "effect/http";
import { HttpApiClient } from "effect/http-api";
import { RateLimiter } from "effect/persistence";

import * as crypto from "node:crypto";

import { NimblebitConfig } from "@tinyburg/nimblebit-sdk";
import { Sdk } from "@tinyburg/trading-sdk";
import { TinyTower as TinyTowerScopes } from "@tinyburg/trading-sdk/Scopes";
import { OAuth, Oidc, Pkce } from "@yielded/oauth";

import { CookiePolicy, SESSION_COOKIE_NAME, maybeCurrentSession } from "../cookies.ts";
import { randomSecret, sha256 } from "../crypto.ts";
import { SessionsRepository } from "../domain/sessions.ts";
import { register } from "../registration.ts";

const tinyburgConfig = Config.all({
    adminPassword: Config.Redacted("ADMIN_PASSWORD"),
    adminPlayerIds: Config.Array(NimblebitConfig.PlayerIdSchema, "ADMIN_PLAYER_IDS"),
    registrationToken: Config.option(Config.Redacted("TINYBURG_OAUTH_REGISTRATION_TOKEN")),
    redirectUri: Config.String("TINYBURG_OAUTH_REDIRECT_URI"),
    issuer: Config.String("TINYBURG_OAUTH_ISSUER").pipe(
        Config.withDefault("https://tinyburg.app"),
        Config.map((issuer) => issuer.replace(/\/$/, ""))
    ),
    development: Config.String("NODE_ENV").pipe(
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
            : yield* Config.Redacted("TINYBURG_OAUTH_REGISTRATION_TOKEN");

        const registration = yield* register(config.issuer, {
            initialAccessToken,
            metadata: {
                software_id: SOFTWARE_ID,
                client_name: "Authproxy Self Service",
                redirect_uris: [config.redirectUri],
                token_endpoint_auth_method: "none",
                grant_types: ["authorization_code"],
                scope: Array.union(LOGIN_SCOPES, ELEVATE_SCOPES).join(" "),
            },
        }).pipe(
            Effect.retry({ while: (error) => error.reason === "Unreachable", schedule: registrationBackoff }),
            Effect.tap(({ clientId }) => Effect.logInfo(`registered at ${config.issuer} as client ${clientId}`))
        );

        return registration.clientId;
    });

/** How long each request to the provider may take. */
const PROVIDER_TIMEOUT_MS = 10_000;

const OAuthIntent = Schema.Struct({
    mode: Schema.Literals(["login", "elevate"]),
    returnTo: Schema.optional(Schema.String),
});

/**
 * One round trip to the provider in flight, kept in a short-lived cookie
 * between the redirect there and the callback: what the visitor came to do,
 * and the state, nonce and PKCE verifier the answer is checked against.
 */
const OAuthTransaction = Schema.fromJsonString(
    Schema.Struct({
        intent: OAuthIntent,
        state: Schema.String,
        nonce: Schema.String,
        verifier: Schema.String,
    })
);

const TRANSACTION_COOKIE_NAME = "authproxy_oauth";
const TRANSACTION_MAX_AGE = Duration.minutes(10);

/** The parts of the callback query this proxy reads; anything else is ignored. */
const CallbackParams = Schema.Struct({
    state: Schema.optional(Schema.String),
    code: Schema.optional(Schema.String),
    error: Schema.optional(Schema.String),
    iss: Schema.optional(Schema.String),
});

class CallbackError extends Schema.TaggedError<CallbackError, { readonly brand: unique symbol }>()("CallbackError", {
    reason: Schema.Literals([
        "InvalidCallback",
        "AccessDenied",
        "ProviderError",
        "StateMismatch",
        "ExchangeFailed",
        "InvalidIdToken",
    ]),
}) {}

/** What the session keeps of the ID token besides its subject. */
const ProfileClaims = Schema.Struct({
    name: Schema.optional(Schema.String),
});

/**
 * The proxy as a relying party of tinyburg.app: the client registered there
 * and a verifier for the ID tokens it signs, both from its discovery document
 * and both living as long as the routes do, plus the cookie that carries each
 * round trip from `begin` to `complete`.
 */
const makeRelyingParty = (
    config: Config.Success<typeof tinyburgConfig>,
    clientId: string,
    cookiePolicy: CookiePolicy["Service"]
) =>
    Effect.gen(function* () {
        const metadata = yield* Oidc.discover(config.issuer, { timeoutMs: PROVIDER_TIMEOUT_MS });
        const client = yield* OAuth.make({
            metadata,
            clientId,
            authentication: { method: "none", publicClient: true },
            timeoutMs: PROVIDER_TIMEOUT_MS,
        });
        const verifier = yield* Oidc.makeVerifier({
            metadata,
            clientId,
            algorithms: ["RS256"],
            timeoutMs: PROVIDER_TIMEOUT_MS,
        });

        const cookieName = cookiePolicy.name(TRANSACTION_COOKIE_NAME);
        const cookieOptions = { httpOnly: true, path: "/", secure: cookiePolicy.secure, sameSite: "lax" } as const;

        /** Redirects to the provider, asking for `scopes`, with the round trip in the cookie. */
        const begin = (scopes: ReadonlyArray<string>, intent: typeof OAuthIntent.Type) =>
            Effect.gen(function* () {
                const state = yield* Pkce.random();
                const nonce = yield* Pkce.random();
                const pkce = yield* Pkce.make();

                const url = yield* client.authorizationUrl({
                    redirectUri: config.redirectUri,
                    scopes,
                    state,
                    nonce,
                    codeChallenge: pkce.challenge,
                });

                const transaction = yield* Schema.encodeEffect(OAuthTransaction)({
                    intent,
                    state: Redacted.value(state),
                    nonce: Redacted.value(nonce),
                    verifier: Redacted.value(pkce.verifier),
                });

                return yield* HttpServerResponse.redirect(Redacted.value(url)).pipe(
                    HttpServerResponse.setCookie(cookieName, transaction, {
                        ...cookieOptions,
                        maxAge: TRANSACTION_MAX_AGE,
                    })
                );
            });

        /** The round trip this request's cookie carries, if it carries a readable one. */
        const transaction = Effect.gen(function* () {
            const request = yield* HttpServerRequest.HttpServerRequest;
            const raw = Option.fromNullishOr(request.cookies[cookieName]);
            if (Option.isNone(raw)) return Option.none<typeof OAuthTransaction.Type>();
            return yield* Schema.decodeEffect(OAuthTransaction)(raw.value).pipe(Effect.option);
        });

        /**
         * Checks the callback against the round trip, exchanges the code and
         * verifies the ID token. The issuer is checked first, as RFC 9207 asks
         * of a provider that says it sends one, and the state before an error
         * is believed.
         */
        const complete = (pending: typeof OAuthTransaction.Type) =>
            Effect.gen(function* () {
                const fail = (reason: CallbackError["reason"]) => Effect.fail(new CallbackError({ reason }));

                const params = yield* HttpServerRequest.schemaSearchParams(CallbackParams).pipe(
                    Effect.mapError(() => new CallbackError({ reason: "InvalidCallback" }))
                );

                const issuerRequired = metadata.authorization_response_iss_parameter_supported === true;
                if (params.iss === undefined ? issuerRequired : params.iss !== metadata.issuer) {
                    return yield* fail("ProviderError");
                }

                if (params.state === undefined) return yield* fail("InvalidCallback");
                const [presented, expected] = yield* Effect.all([sha256(params.state), sha256(pending.state)]);
                if (!crypto.timingSafeEqual(Buffer.from(presented), Buffer.from(expected))) {
                    return yield* fail("StateMismatch");
                }

                if (params.error !== undefined) {
                    return yield* fail(params.error === "access_denied" ? "AccessDenied" : "ProviderError");
                }
                if (params.code === undefined) return yield* fail("InvalidCallback");

                const code = Redacted.make(params.code);
                const verificationStartedAt = yield* DateTime.now;
                const tokens = yield* client
                    .codeGrant({
                        code,
                        redirectUri: config.redirectUri,
                        pkceVerifier: Redacted.make(pending.verifier),
                    })
                    .pipe(
                        Effect.flatMap(OAuth.tokens),
                        Effect.mapError(() => new CallbackError({ reason: "ExchangeFailed" }))
                    );

                if (tokens.idToken === undefined) return yield* fail("InvalidIdToken");
                const verified = yield* verifier
                    .verify(tokens.idToken, {
                        verificationStartedAt,
                        nonce: Redacted.make(pending.nonce),
                        accessToken: tokens.accessToken,
                        code,
                    })
                    .pipe(Effect.mapError(() => new CallbackError({ reason: "InvalidIdToken" })));

                const profile = Schema.decodeOption(ProfileClaims)(Redacted.value(verified.claims));
                return {
                    subject: verified.subject,
                    displayName: Option.flatMap(profile, ({ name }) => Option.fromUndefinedOr(name)),
                    accessToken: tokens.accessToken,
                };
            });

        /** Ends the round trip, whichever way it went. */
        const expire = (response: HttpServerResponse.HttpServerResponse) =>
            HttpServerResponse.expireCookie(response, cookieName, cookieOptions);

        return { begin, transaction, complete, expire } as const;
    });

type RelyingParty = Effect.Success<ReturnType<typeof makeRelyingParty>>;

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

const loginErrorMessage: Record<CallbackError["reason"], string> = {
    InvalidCallback: "invalid_oauth_callback",
    AccessDenied: "oauth_denied",
    ProviderError: "invalid_oauth_provider",
    StateMismatch: "invalid_oauth_cookies",
    ExchangeFailed: "invalid_oauth_token",
    InvalidIdToken: "invalid_oauth_claims",
};

const login = Effect.fnUntraced(function* (relyingParty: RelyingParty) {
    const returnTo = yield* returnToParam;

    const tryCurrentSession = yield* maybeCurrentSession.pipe(Effect.option);
    if (Option.isNone(tryCurrentSession)) {
        return HttpServerResponse.redirect("/login?error=oauth_failed");
    }

    if (Option.isSome(tryCurrentSession.value)) {
        return HttpServerResponse.redirect(Option.getOrElse(returnTo, () => HOME_AFTER_LOGIN));
    }

    return yield* relyingParty
        .begin(LOGIN_SCOPES, { mode: "login", returnTo: Option.getOrUndefined(returnTo) })
        .pipe(Effect.orElseSucceed(() => HttpServerResponse.redirect("/login?error=start_failed")));
}, Effect.satisfiesErrorType<never>());

const elevate = Effect.fnUntraced(function* (
    config: Config.Success<typeof tinyburgConfig>,
    relyingParty: RelyingParty,
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

    return yield* relyingParty.begin(ELEVATE_SCOPES, { mode: "elevate" }).pipe(Effect.orElseSucceed(() => refused));
}, Effect.satisfiesErrorType<never>());

const callback = (config: Config.Success<typeof tinyburgConfig>, relyingParty: RelyingParty) =>
    Effect.gen(function* () {
        const maybeTransaction = yield* relyingParty.transaction;

        if (Option.isNone(maybeTransaction)) {
            return yield* HttpServerResponse.redirect("/login?error=invalid_oauth_intent").pipe(
                relyingParty.expire,
                Effect.orDie
            );
        }

        const transaction = maybeTransaction.value;
        const intent = transaction.intent;
        const failed = (errorMessage: string) =>
            HttpServerResponse.redirect(
                intent.mode === "elevate"
                    ? "/admin?error=elevation_failed"
                    : `/login?error=${encodeURIComponent(errorMessage)}`
            ).pipe(relyingParty.expire, Effect.orDie);

        const outcome = yield* Effect.result(relyingParty.complete(transaction));
        if (Result.isFailure(outcome)) return yield* failed(loginErrorMessage[outcome.failure.reason]);

        const { subject, displayName, accessToken } = outcome.success;
        if (intent.mode === "elevate") {
            const tryCurrentSession = yield* maybeCurrentSession.pipe(Effect.option, Effect.map(Option.flatten));
            if (Option.isNone(tryCurrentSession)) {
                return yield* failed("elevation_failed");
            }

            const session = tryCurrentSession.value;
            const clearPending = SessionsRepository.use((repo) => repo.clearElevation(session.id)).pipe(Effect.ignore);
            if (subject !== session.sub) {
                yield* clearPending;
                return yield* failed("elevation_failed");
            }

            const addBearer = HttpClient.mapRequest(HttpClientRequest.bearerToken(accessToken));
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

            return yield* HttpServerResponse.redirect("/admin").pipe(relyingParty.expire, Effect.orDie);
        }

        const sessionToken = randomSecret();
        const tokenHash = yield* sha256(sessionToken);
        const maybeSession = yield* SessionsRepository.use((repo) =>
            repo.createSession({
                sub: subject,
                displayName,
                // tinyburg.app's ID tokens carry no picture claim.
                avatarUrl: Option.none(),
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
            Effect.flatMap(relyingParty.expire),
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

    const clientId = yield* registerAtProvider(config);

    // One registration at the provider, two scope sets: signing in asks for
    // identity only, elevation re-authorizes with towers:read on top. Both
    // keep their round trip in the one cookie, so the single callback route
    // completes either flow.
    const relyingParty = yield* makeRelyingParty(config, clientId, cookiePolicy);

    return Layer.mergeAll(
        HttpRouter.add("GET", "/auth/login", login(relyingParty)),
        HttpRouter.add("POST", "/auth/elevate", elevate(config, relyingParty, elevationRateLimiter)),
        HttpRouter.add("GET", "/auth/callback", callback(config, relyingParty)),
        HttpRouter.add("POST", "/logout", logout)
    );
}).pipe(Layer.unwrap);
