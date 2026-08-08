import { Config, DateTime, Duration, Effect, Layer, Option, Redacted, Schema } from "effect";
import {
    HttpClient,
    HttpClientRequest,
    HttpClientResponse,
    HttpRouter,
    HttpServerRequest,
    HttpServerResponse,
} from "effect/unstable/http";
import { RateLimiter } from "effect/unstable/persistence";

import * as crypto from "node:crypto";

import { RelyingParty } from "effect-oidc";

import { CookiePolicy, maybeCurrentSession, SESSION_COOKIE_NAME } from "../cookies.ts";
import { randomSecret, sha256 } from "../crypto.ts";
import { SessionsRepository } from "../domain/sessions.ts";
// "Sign in with Tinyburg": the authproxy is an OIDC relying party of
// tinyburg.app's provider. Authorization code + PKCE; the client may be
// public (no secret registered) since PKCE carries the proof.
import { tinyburgConfig } from "../tinyburg.ts";

/** Signing in asks for identity only. */
const LOGIN_SCOPES = ["openid", "profile"];

/**
 * Elevation re-authorizes with `towers:read` on top, so the callback can ask
 * the trading api - as the visitor, with their fresh consent - which towers
 * they have linked right now. The token lives 15 minutes and is used once;
 * nothing is stored.
 */
const ELEVATE_SCOPES = ["openid", "towers:read"];

/** Where a fresh sign-in lands when nothing better was asked for. */
const HOME_AFTER_LOGIN = "/keys";

/**
 * Why the browser was sent to the provider: to sign in, or to prove tower
 * ownership for admin elevation. It rides the relying party's payload cookie
 * through the round trip, and the callback reads it to know what to do with
 * the tokens it gets back.
 */
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

/** The linked-towers list, as the trading api serves it to its owner. */
const LinkedTowers = Schema.Array(
    Schema.Struct({
        playerId: Schema.String,
        createdAt: Schema.String,
    })
);

/**
 * The callback failure reasons, mapped onto the error strings the login page
 * already knows how to explain.
 */
const loginErrorMessage: Record<RelyingParty.CallbackError["reason"], string> = {
    InvalidCallback: "invalid_oauth_callback",
    AccessDenied: "oauth_denied",
    ProviderError: "invalid_oauth_provider",
    StateMismatch: "invalid_oauth_cookies",
    ExchangeFailed: "invalid_oauth_token",
    InvalidIdToken: "invalid_oauth_claims",
};

interface TinyburgRealized {
    /** Sends the browser to the provider asking for identity only. */
    readonly loginParty: RelyingParty.RelyingParty;
    /** Sends the browser to the provider asking for `towers:read` on top. */
    readonly elevateParty: RelyingParty.RelyingParty;
    readonly adminPassword: Redacted.Redacted;
    readonly adminPlayerIds: ReadonlySet<string>;
    readonly linkedPlayerIds: (accessToken: string) => Effect.Effect<ReadonlySet<string>, unknown, never>;
    readonly elevationRateLimiter: RateLimiter.RateLimiter;
}

const login = (tinyburg: TinyburgRealized) =>
    Effect.gen(function* () {
        const returnTo = yield* returnToParam;

        const tryCurrentSession = yield* maybeCurrentSession.pipe(Effect.option);
        if (Option.isNone(tryCurrentSession)) {
            return HttpServerResponse.redirect("/login?error=oauth_failed");
        }

        // Already signed in: nothing to ask the provider for.
        if (Option.isSome(tryCurrentSession.value)) {
            return HttpServerResponse.redirect(Option.getOrElse(returnTo, () => HOME_AFTER_LOGIN));
        }

        const intent = yield* Schema.encodeEffect(OAuthIntent)({
            mode: "login",
            returnTo: Option.getOrUndefined(returnTo),
        }).pipe(Effect.orDie);

        return yield* tinyburg.loginParty
            .beginAuthorization({ payload: intent })
            .pipe(Effect.catch(() => Effect.succeed(HttpServerResponse.redirect("/login?error=start_failed"))));
    }).pipe(Effect.satisfiesErrorType<never>());

/**
 * The step-up: takes the admin password, records whether it matched - the
 * verdict lives server-side on the session, where the browser cannot forge
 * it - and sends the visitor to re-authorize with `towers:read` either way,
 * so the response never says whether the password was right.
 */
const elevate = (tinyburg: TinyburgRealized) =>
    Effect.gen(function* () {
        const refused = HttpServerResponse.redirect("/admin?error=elevation_failed");

        const tryCurrentSession = yield* maybeCurrentSession.pipe(Effect.option);
        if (Option.isNone(tryCurrentSession)) {
            return refused;
        }
        if (Option.isNone(tryCurrentSession.value)) {
            return HttpServerResponse.redirect("/login?returnTo=%2Fadmin");
        }

        const session = tryCurrentSession.value.value;

        const maybeBody = yield* HttpServerRequest.schemaBodyUrlParams(Schema.Struct({ password: Schema.String })).pipe(
            Effect.option
        );
        if (Option.isNone(maybeBody)) {
            return refused;
        }

        // The password check is an oracle, so attempts are strictly limited.
        const allowed = yield* tinyburg.elevationRateLimiter
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

        // Hash both sides before comparing: equal lengths for the timing-safe
        // comparison, and no length leak.
        const presented = yield* sha256(maybeBody.value.password);
        const expected = yield* sha256(Redacted.value(tinyburg.adminPassword));
        const passwordOk = crypto.timingSafeEqual(Buffer.from(presented), Buffer.from(expected));

        const begun = yield* SessionsRepository.use((repo) =>
            repo.beginElevation({ sessionId: session.id, passwordOk })
        ).pipe(Effect.option, Effect.map(Option.flatten));
        if (Option.isNone(begun)) {
            return refused;
        }

        const intent = yield* Schema.encodeEffect(OAuthIntent)({ mode: "elevate" }).pipe(Effect.orDie);

        return yield* tinyburg.elevateParty
            .beginAuthorization({ payload: intent })
            .pipe(Effect.catch(() => Effect.succeed(refused)));
    }).pipe(Effect.satisfiesErrorType<never>());

const callback = (tinyburg: TinyburgRealized) =>
    Effect.gen(function* () {
        // Both parties share one cookie prefix, so either can complete the
        // round trip; scopes only matter on the way out.
        const party = tinyburg.loginParty;

        // The intent decides where failures land: sign-in problems go to the
        // login page with a reason, elevation problems go to the admin page
        // with one uniform code that never says which factor failed.
        const maybeIntent = yield* party.payload.pipe(
            Effect.flatMap(
                Option.match({
                    onNone: () => Effect.succeed(Option.none<typeof OAuthIntent.Type>()),
                    onSome: (raw) => Schema.decodeEffect(OAuthIntent)(raw).pipe(Effect.option),
                })
            )
        );
        if (Option.isNone(maybeIntent)) {
            return yield* HttpServerResponse.redirect("/login?error=invalid_oauth_intent").pipe(
                party.expireTransactionCookies,
                Effect.orDie
            );
        }

        const intent = maybeIntent.value;
        const failed = (errorMessage: string) =>
            HttpServerResponse.redirect(
                intent.mode === "elevate"
                    ? "/admin?error=elevation_failed"
                    : `/login?error=${encodeURIComponent(errorMessage)}`
            ).pipe(party.expireTransactionCookies, Effect.orDie);

        const outcome = yield* Effect.result(party.completeAuthorization);
        if (outcome._tag === "Failure") {
            return yield* failed(loginErrorMessage[outcome.failure.reason]);
        }

        const { claims, tokens } = outcome.success;

        if (intent.mode === "elevate") {
            const tryCurrentSession = yield* maybeCurrentSession.pipe(Effect.option, Effect.map(Option.flatten));
            if (Option.isNone(tryCurrentSession)) {
                return yield* failed("elevation_failed");
            }

            const session = tryCurrentSession.value;
            const clearPending = SessionsRepository.use((repo) => repo.clearElevation(session.id)).pipe(Effect.ignore);

            // The account that just re-authorized must be the account this
            // session belongs to; proving ownership of some other tower-holding
            // account elevates nothing.
            if (claims.sub !== session.sub) {
                yield* clearPending;
                return yield* failed("elevation_failed");
            }

            // Which towers does this account hold, right now, by their own
            // freshly consented token. A lookup failure reads as not eligible,
            // never as a pass.
            const linked = yield* tinyburg.linkedPlayerIds(tokens.access_token).pipe(
                Effect.map(Option.some),
                Effect.catch(() => Effect.succeed(Option.none<ReadonlySet<string>>()))
            );
            const eligible = Option.match(linked, {
                onNone: () => false,
                onSome: (playerIds) =>
                    tinyburg.adminPlayerIds.size > 0 &&
                    Array.from(tinyburg.adminPlayerIds).some((playerId) => playerIds.has(playerId)),
            });
            if (!eligible) {
                yield* clearPending;
                return yield* failed("elevation_failed");
            }

            // Grants the hour only if the password matched when the round trip
            // left and it came back inside its window; the check and the grant
            // are one statement, so there is no moment between them.
            const completed = yield* SessionsRepository.use((repo) => repo.completeElevation(session.id)).pipe(
                Effect.option,
                Effect.map(Option.flatten)
            );
            if (Option.isNone(completed)) {
                return yield* failed("elevation_failed");
            }

            return yield* HttpServerResponse.redirect("/admin").pipe(party.expireTransactionCookies, Effect.orDie);
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
            Effect.flatMap(party.expireTransactionCookies),
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
    const httpClient = yield* HttpClient.HttpClient;
    const elevationRateLimiter = yield* RateLimiter.make;

    const adminPassword = yield* Config.redacted("ADMIN_PASSWORD");
    const adminPlayerIds = yield* Config.string("ADMIN_PLAYER_IDS").pipe(
        Config.withDefault(""),
        Config.map(
            (raw) =>
                new Set(
                    raw
                        .split(",")
                        .map((playerId) => playerId.trim())
                        .filter((playerId) => playerId !== "")
                )
        )
    );

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
            clientId: config.clientId,
            clientSecret: Option.getOrUndefined(config.clientSecret),
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

    const linkedPlayerIds = (accessToken: string): Effect.Effect<ReadonlySet<string>, unknown, never> =>
        HttpClientRequest.get(`${config.issuer}/v1/tinytower/linkedAccounts/list`).pipe(
            HttpClientRequest.setHeader("authorization", `Bearer ${accessToken}`),
            HttpClient.execute,
            Effect.flatMap(HttpClientResponse.schemaBodyJson(LinkedTowers)),
            Effect.map((towers) => new Set(towers.map((tower) => tower.playerId))),
            Effect.provideService(HttpClient.HttpClient, httpClient)
        );

    const tinyburg: TinyburgRealized = {
        loginParty,
        elevateParty,
        adminPassword,
        adminPlayerIds,
        linkedPlayerIds,
        elevationRateLimiter,
    };

    return Layer.mergeAll(
        HttpRouter.add("GET", "/auth/login", login(tinyburg)),
        HttpRouter.add("POST", "/auth/elevate", elevate(tinyburg)),
        HttpRouter.add("GET", "/auth/callback", callback(tinyburg)),
        HttpRouter.add("POST", "/logout", logout)
    );
}).pipe(Layer.unwrap);
