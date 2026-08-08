import { Config, DateTime, Duration, Effect, Layer, Option, Redacted, Ref, Result, Schema } from "effect";
import {
    HttpClient,
    HttpClientRequest,
    HttpClientResponse,
    HttpRouter,
    HttpServerRequest,
    HttpServerResponse,
    Url,
} from "effect/unstable/http";
import { RateLimiter } from "effect/unstable/persistence";

import * as crypto from "node:crypto";

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
const INTENT_COOKIE_NAME = "authproxy_oauth_intent";

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
 * ownership for admin elevation. The callback reads it to know what to do
 * with the tokens it gets back.
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

interface TinyburgRealized {
    readonly issuer: string;
    readonly clientId: string;
    readonly clientSecret: Option.Option<Redacted.Redacted>;
    readonly redirectUri: string;
    readonly jwks: Effect.Effect<Schema.Schema.Type<typeof Jwt.JwksSchema>, unknown, never>;
    readonly adminPassword: Redacted.Redacted;
    readonly adminPlayerIds: ReadonlySet<string>;
    readonly linkedPlayerIds: (accessToken: string) => Effect.Effect<ReadonlySet<string>, unknown, never>;
    readonly elevationRateLimiter: RateLimiter.RateLimiter;
}

/** Sends the browser to the provider, remembering why in the intent cookie. */
const beginAuthorization = (
    tinyburg: TinyburgRealized,
    options: {
        readonly scopes: ReadonlyArray<string>;
        readonly intent: typeof OAuthIntent.Type;
        readonly failTo: string;
    }
) =>
    Effect.gen(function* () {
        const cookies = yield* CookiePolicy;

        const codeVerifier = randomSecret();
        const state = randomSecret();

        const authorizationRequest = Oidc.authorizationRequest({
            authorizationEndpoint: `${tinyburg.issuer}/oauth/authorize`,
            clientId: tinyburg.clientId,
            redirectUri: tinyburg.redirectUri,
            scopes: options.scopes,
            state,
            codeChallenge: yield* sha256(codeVerifier),
        });

        const authorizationUrl = Url.make(
            authorizationRequest.url,
            authorizationRequest.urlParams,
            authorizationRequest.hash.valueOrUndefined
        ).pipe(Result.getOrThrow);

        const intentSerialized = yield* Schema.encodeEffect(OAuthIntent)(options.intent).pipe(Effect.orDie);

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
                [cookies.name(INTENT_COOKIE_NAME), intentSerialized, cookieOptions],
            ]),
            Effect.catch(() => Effect.succeed(HttpServerResponse.redirect(options.failTo)))
        );
    });

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

        return yield* beginAuthorization(tinyburg, {
            scopes: LOGIN_SCOPES,
            intent: { mode: "login", returnTo: Option.getOrUndefined(returnTo) },
            failTo: "/login?error=start_failed",
        });
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

        return yield* beginAuthorization(tinyburg, {
            scopes: ELEVATE_SCOPES,
            intent: { mode: "elevate" },
            failTo: "/admin?error=elevation_failed",
        });
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
            Effect.flatMap(HttpServerResponse.expireCookie(cookies.name(INTENT_COOKIE_NAME), expireOptions))
        );
    });

const callback = (tinyburg: TinyburgRealized) =>
    Effect.gen(function* () {
        const cookiesPolicy = yield* CookiePolicy;

        // The intent decides where failures land: sign-in problems go to the
        // login page with a reason, elevation problems go to the admin page
        // with one uniform code that never says which factor failed.
        const maybeIntentCookie = yield* HttpServerRequest.schemaCookies(
            Schema.Struct({
                [cookiesPolicy.name(INTENT_COOKIE_NAME)]: OAuthIntent,
            })
        ).pipe(
            Effect.map((cookies) => cookies[cookiesPolicy.name(INTENT_COOKIE_NAME)]),
            Effect.option
        );
        if (Option.isNone(maybeIntentCookie)) {
            return yield* HttpServerResponse.redirect("/login?error=invalid_oauth_intent").pipe(
                expireSpentCookies,
                Effect.orDie
            );
        }

        const intent = maybeIntentCookie.value;
        const failed = (errorMessage: string) =>
            HttpServerResponse.redirect(
                intent.mode === "elevate"
                    ? "/admin?error=elevation_failed"
                    : `/login?error=${encodeURIComponent(errorMessage)}`
            ).pipe(expireSpentCookies, Effect.orDie);

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
            const linked = yield* tinyburg.linkedPlayerIds(maybeToken.value.access_token).pipe(
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

            return yield* HttpServerResponse.redirect("/admin").pipe(expireSpentCookies, Effect.orDie);
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

        const returnTo = Option.fromNullishOr(intent.returnTo).pipe(
            Option.filter(isLocalPath),
            Option.getOrElse(() => HOME_AFTER_LOGIN)
        );

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

    const linkedPlayerIds = (accessToken: string): Effect.Effect<ReadonlySet<string>, unknown, never> =>
        HttpClientRequest.get(`${config.issuer}/v1/tinytower/linkedAccounts/list`).pipe(
            HttpClientRequest.setHeader("authorization", `Bearer ${accessToken}`),
            HttpClient.execute,
            Effect.flatMap(HttpClientResponse.schemaBodyJson(LinkedTowers)),
            Effect.map((towers) => new Set(towers.map((tower) => tower.playerId))),
            Effect.provideService(HttpClient.HttpClient, httpClient)
        );

    const tinyburg: TinyburgRealized = {
        issuer: config.issuer,
        clientId: config.clientId,
        clientSecret: config.clientSecret,
        redirectUri: config.redirectUri,
        jwks: cachedJwks,
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
