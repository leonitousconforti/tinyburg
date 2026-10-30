/**
 * "Sign in with Tinyburg", from the study's side.
 *
 * social-circles is an OIDC relying party of tinyburg.app: authorization code
 * plus PKCE, public client (the code challenge carries the proof, so no secret
 * is required). The protocol is `@yielded/oauth`'s, through the client in
 * `services/tinyburg.ts`; what is left here is the cookies and the session.
 *
 * The round trip yields two different tokens with two different jobs, and they
 * are stored separately on purpose:
 *
 * - the **access token** rides the browser session and lets the dashboard ask
 *   the provider, right now, which towers this visitor owns.
 * - the **refresh token** goes in `tower_grants` and is what the scheduled
 *   crawl uses hours later.
 */

import { DateTime, Effect, Layer, Option, Redacted, Schema } from "effect";
import { HttpRouter, HttpServerRequest, HttpServerResponse } from "effect/http";

import * as OAuth from "@yielded/oauth/OAuth";

import { CookiePolicy, SESSION_COOKIE_NAME, maybeCurrentSession } from "../cookies.ts";
import { randomSecret, seal, sha256 } from "../crypto.ts";
import { REQUIRED_SCOPES } from "../domain/games.ts";
import { GrantsRepository } from "../domain/grants.ts";
import { SessionsRepository } from "../domain/sessions.ts";
import { TinyburgClient } from "../services/tinyburg.ts";

const STATE_COOKIE_NAME = "social_circles_oauth_state";
const CODE_VERIFIER_COOKIE_NAME = "social_circles_oauth_code_verifier";
const NONCE_COOKIE_NAME = "social_circles_oauth_nonce";
const RETURN_TO_COOKIE_NAME = "social_circles_oauth_return_to";

/**
 * What the study asks a participant to grant, derived from the game catalog
 * rather than written out here.
 *
 * Per readable game, `list_accounts` and `pull_save` let the study see which
 * towers a participant has linked and read their saves; `offline_access` lets
 * it keep doing so on a schedule. Two leaves per game rather than a whole
 * `:read` branch: a research project has no business with anyone's snapshots,
 * gifts or visits, let alone overwriting a tower, and the consent screen says
 * exactly what is asked for in as many words.
 *
 * Reading it off the catalog is what stops the sign-in asking for one game
 * while the crawler reads another.
 */
const SCOPES = REQUIRED_SCOPES;

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

/**
 * The claims the study reads beyond the subject. `profile` shares a display
 * name and nothing else; tinyburg.app has no picture to give.
 */
const ProfileClaims = Schema.Struct({
    name: Schema.optional(Schema.String),
});

const login = (tinyburg: TinyburgClient["Service"]) =>
    Effect.gen(function* () {
        const cookies = yield* CookiePolicy;
        const returnTo = yield* returnToParam;
        const codeVerifier = randomSecret();
        const state = randomSecret();
        const nonce = randomSecret();

        const { client } = yield* tinyburg.connected;
        const authorizationUrl = yield* client.authorizationUrl({
            redirectUri: tinyburg.redirectUri,
            scopes: SCOPES,
            state: Redacted.make(state),
            nonce: Redacted.make(nonce),
            codeChallenge: yield* sha256(codeVerifier),
        });

        const cookieOptions = {
            maxAge: "10 minutes",
            httpOnly: true,
            path: "/",
            secure: cookies.secure,
            sameSite: "lax",
        } as const;

        return yield* HttpServerResponse.redirect(Redacted.value(authorizationUrl)).pipe(
            HttpServerResponse.setCookies([
                [cookies.name(STATE_COOKIE_NAME), state, cookieOptions],
                [cookies.name(CODE_VERIFIER_COOKIE_NAME), codeVerifier, cookieOptions],
                [cookies.name(NONCE_COOKIE_NAME), nonce, cookieOptions],
                [
                    cookies.name(RETURN_TO_COOKIE_NAME),
                    Option.getOrElse(returnTo, () => HOME_AFTER_LOGIN),
                    cookieOptions,
                ],
            ])
        );
    }).pipe(
        // The provider being unreachable lands here too, and reads the same to
        // the visitor: sign in could not start, try again.
        Effect.tapError((error) => Effect.logWarning("could not start sign in", error)),
        Effect.orElseSucceed(() => HttpServerResponse.redirect("/login?error=start_failed")),
        Effect.satisfiesErrorType<never>()
    );

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
            Effect.flatMap(HttpServerResponse.expireCookie(cookies.name(NONCE_COOKIE_NAME), expireOptions)),
            Effect.flatMap(HttpServerResponse.expireCookie(cookies.name(RETURN_TO_COOKIE_NAME), expireOptions))
        );
    });

const callback = (tinyburg: TinyburgClient["Service"]) =>
    Effect.gen(function* () {
        // Taken before anything else, so the id token is judged against when
        // the response arrived rather than however long the exchange took.
        const verificationStartedAt = yield* DateTime.now;
        const cookiesPolicy = yield* CookiePolicy;

        const failed = (errorMessage: string) =>
            HttpServerResponse.redirect(`/login?error=${encodeURIComponent(errorMessage)}`).pipe(
                expireSpentCookies,
                Effect.orDie
            );

        // The provider redirects back with either an error or a code
        const maybeUrlParams = yield* HttpServerRequest.schemaSearchParams(
            Schema.Union([
                Schema.Struct({ error: Schema.String, iss: Schema.optional(Schema.String) }),
                Schema.Struct({ code: Schema.String, state: Schema.String, iss: Schema.optional(Schema.String) }),
            ])
        ).pipe(Effect.option);
        if (Option.isNone(maybeUrlParams)) {
            return yield* failed("invalid_oauth_callback");
        }

        // RFC 9207: the provider names itself on the way back, so a response
        // some other issuer minted for this callback is refused outright
        const urlParams = maybeUrlParams.value;
        if (urlParams.iss !== tinyburg.issuer) {
            return yield* failed("invalid_oauth_provider");
        }

        // The visitor cancelled at the provider, or the provider refused
        if ("error" in urlParams) {
            return yield* failed(urlParams.error === "access_denied" ? "oauth_denied" : "invalid_oauth_provider");
        }

        // The state cookie must match the state the provider echoed back
        const maybeCookies = yield* HttpServerRequest.schemaCookies(
            Schema.Struct({
                [cookiesPolicy.name(STATE_COOKIE_NAME)]: Schema.Literal(urlParams.state),
                [cookiesPolicy.name(CODE_VERIFIER_COOKIE_NAME)]: Schema.String,
                [cookiesPolicy.name(NONCE_COOKIE_NAME)]: Schema.String,
            })
        ).pipe(Effect.option);
        if (Option.isNone(maybeCookies)) {
            return yield* failed("invalid_oauth_cookies");
        }

        const cookies = maybeCookies.value;
        const codeVerifierCookie = cookies[cookiesPolicy.name(CODE_VERIFIER_COOKIE_NAME)];
        const nonceCookie = cookies[cookiesPolicy.name(NONCE_COOKIE_NAME)];

        const request = yield* HttpServerRequest.HttpServerRequest;
        const returnTo = Option.fromNullishOr(request.cookies[cookiesPolicy.name(RETURN_TO_COOKIE_NAME)]).pipe(
            Option.filter(isLocalPath),
            Option.getOrElse(() => HOME_AFTER_LOGIN)
        );

        const code = Redacted.make(urlParams.code);
        const maybeExchange = yield* Effect.gen(function* () {
            const { client, verifier } = yield* tinyburg.connected;
            const receipt = yield* client.codeGrant({
                code,
                redirectUri: tinyburg.redirectUri,
                pkceVerifier: Redacted.make(codeVerifierCookie),
            });
            return { tokens: yield* OAuth.tokens(receipt), verifier };
        }).pipe(Effect.option);
        if (Option.isNone(maybeExchange)) {
            return yield* failed("invalid_oauth_token");
        }

        const { tokens, verifier } = maybeExchange.value;
        if (tokens.idToken === undefined) {
            return yield* failed("invalid_oauth_claims");
        }

        const maybeIdentity = yield* verifier
            .verify(tokens.idToken, {
                verificationStartedAt,
                nonce: Redacted.make(nonceCookie),
                accessToken: tokens.accessToken,
                code,
            })
            .pipe(
                Effect.flatMap((verified) =>
                    Effect.map(Schema.decodeEffect(ProfileClaims)(Redacted.value(verified.claims)), (profile) => ({
                        sub: verified.subject,
                        name: profile.name,
                    }))
                ),
                Effect.option
            );
        if (Option.isNone(maybeIdentity)) {
            return yield* failed("invalid_oauth_claims");
        }

        const identity = maybeIdentity.value;
        const sessionToken = randomSecret();
        const tokenHash = yield* sha256(sessionToken);

        const maybeSession = yield* SessionsRepository.use((repo) =>
            repo.createSession({
                sub: identity.sub,
                displayName: Option.fromUndefinedOr(identity.name),
                avatarUrl: Option.none(),
                tokenHash,
            })
        ).pipe(Effect.option);
        if (Option.isNone(maybeSession)) {
            return yield* failed("invalid_oauth_session");
        }

        const now = yield* DateTime.now;

        /**
         * The access token is what makes the dashboard work today. Sealed, so
         * the sessions table is not a pile of live provider credentials.
         * tinyburg.app always states a lifetime; a token that came without one
         * is stored as already spent rather than trusted indefinitely.
         */
        yield* seal(Redacted.value(tokens.accessToken)).pipe(
            Effect.flatMap((ciphertext) =>
                SessionsRepository.use((repo) =>
                    repo.setAccessToken({
                        sessionId: maybeSession.value.id,
                        ciphertext,
                        expiresAt: DateTime.toDateUtc(DateTime.addDuration(now, `${tokens.expiresIn ?? 0} seconds`)),
                    })
                )
            ),
            // A session without a stored token still signs the visitor in; the
            // dashboard will just report that it cannot reach the provider,
            // which is more useful than failing the whole sign-in.
            Effect.catchCause((cause) => Effect.logWarning("could not store the provider access token", cause))
        );

        /**
         * Only present when the study's registration at tinyburg.app includes
         * `offline_access`. Without it this is skipped and background crawling
         * stays blocked, which is the honest state of things rather than a
         * silent half-configuration.
         */
        yield* Option.match(Option.fromUndefinedOr(tokens.refreshToken), {
            onNone: () =>
                Effect.logInfo(
                    "the provider issued no refresh token, so scheduled crawling stays unavailable for this user"
                ),
            onSome: (refreshToken) =>
                seal(Redacted.value(refreshToken)).pipe(
                    Effect.flatMap((ciphertext) =>
                        GrantsRepository.use((repo) =>
                            repo.upsert({
                                tinyburgUserId: identity.sub,
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
    const tinyburg = yield* TinyburgClient;

    return Layer.mergeAll(
        HttpRouter.add("GET", "/auth/login", login(tinyburg)),
        HttpRouter.add("GET", "/auth/callback", callback(tinyburg)),
        HttpRouter.add("POST", "/logout", logout)
    );
}).pipe(Layer.unwrap);

/** Re-exported so the self-service handlers can read the same session. */
export { maybeCurrentSession };
