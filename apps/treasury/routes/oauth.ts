/**
 * The connect flow: how a trader lets the treasury act on their towers.
 *
 * Authorization code plus PKCE against tinyburg.app, asking for
 * `offline_access` and the handful of tower leaves the sagas need, with the
 * client `services/provider.ts` registered at boot. The one deliberate
 * difference from the usual relying-party port: **no session is created**.
 * The treasury's api is bearer authenticated (see `routes/access.ts`), so the
 * callback's only job is to store the sealed refresh token and send the
 * visitor back to the `/trades` page they came from - which lives on the
 * provider's own origin, not this one, so the return-to check is an origin
 * allow-list rather than a local path check.
 */

import { DateTime, Duration, Effect, Layer, Option, Redacted, Result, Schema } from "effect";
import { HttpRouter, HttpServerRequest, HttpServerResponse } from "effect/http";

import * as crypto from "node:crypto";

import * as OAuth from "@yielded/oauth/OAuth";
import * as Pkce from "@yielded/oauth/Pkce";

import { CookiePolicy } from "../cookies.ts";
import { seal, sha256 } from "../crypto.ts";
import { GrantsRepository } from "../domain/grants.ts";
import { TinyburgProvider, USER_GRANT_SCOPES } from "../services/provider.ts";

/**
 * One round trip to the provider in flight, kept in a short-lived cookie
 * between the redirect there and the callback: the state, nonce and PKCE
 * verifier the answer is checked against, and where to send the visitor
 * afterwards.
 */
const ConnectTransaction = Schema.fromJsonString(
    Schema.Struct({
        state: Schema.String,
        nonce: Schema.String,
        verifier: Schema.String,
        returnTo: Schema.String,
    })
);

const TRANSACTION_COOKIE_NAME = "treasury_oauth";
const TRANSACTION_MAX_AGE = Duration.minutes(10);

/** The parts of the callback query this flow reads; anything else is ignored. */
const CallbackParams = Schema.Struct({
    state: Schema.optional(Schema.String),
    code: Schema.optional(Schema.String),
    error: Schema.optional(Schema.String),
    iss: Schema.optional(Schema.String),
});

class ConnectError extends Schema.TaggedError<ConnectError, { readonly brand: unique symbol }>()("ConnectError", {
    reason: Schema.Literals([
        "invalid_oauth_callback",
        "oauth_denied",
        "invalid_oauth_provider",
        "invalid_oauth_cookies",
        "invalid_oauth_token",
        "invalid_oauth_claims",
        "no_offline_access",
        "grant_not_stored",
    ]),
}) {}

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

/** `returnTo` with the outcome added to its query, whatever query it already had. */
const withOutcome = (returnTo: string, outcome: Readonly<Record<string, string>>): string => {
    const url = new URL(returnTo);
    for (const [key, value] of Object.entries(outcome)) url.searchParams.set(key, value);
    return url.href;
};

const makeConnectFlow = (provider: TinyburgProvider["Service"], cookiePolicy: CookiePolicy["Service"]) => {
    const cookieName = cookiePolicy.name(TRANSACTION_COOKIE_NAME);
    const cookieOptions = { httpOnly: true, path: "/", secure: cookiePolicy.secure, sameSite: "lax" } as const;

    /** Ends the round trip, whichever way it went. */
    const expire = (response: HttpServerResponse.HttpServerResponse) =>
        HttpServerResponse.expireCookie(response, cookieName, cookieOptions).pipe(Effect.orDie);

    const returnToParam = HttpServerRequest.schemaSearchParams(
        Schema.Struct({ returnTo: Schema.optional(Schema.String) })
    ).pipe(
        Effect.map(({ returnTo }) => Option.fromUndefinedOr(returnTo)),
        Effect.map(Option.filter((value) => isAllowedReturnTo(provider.issuer, value))),
        Effect.option,
        Effect.map(Option.flatten)
    );

    const connect = Effect.gen(function* () {
        const returnTo = Option.getOrElse(yield* returnToParam, () => homeAfterConnect(provider.issuer));

        const started = yield* Effect.gen(function* () {
            const state = yield* Pkce.random();
            const nonce = yield* Pkce.random();
            const pkce = yield* Pkce.make();

            const url = yield* provider.client.authorizationUrl({
                redirectUri: provider.redirectUri,
                scopes: USER_GRANT_SCOPES,
                state,
                nonce,
                codeChallenge: pkce.challenge,
            });

            const transaction = yield* Schema.encodeEffect(ConnectTransaction)({
                state: Redacted.value(state),
                nonce: Redacted.value(nonce),
                verifier: Redacted.value(pkce.verifier),
                returnTo,
            });

            return yield* HttpServerResponse.redirect(Redacted.value(url)).pipe(
                HttpServerResponse.setCookie(cookieName, transaction, { ...cookieOptions, maxAge: TRANSACTION_MAX_AGE })
            );
        }).pipe(Effect.result);

        if (Result.isSuccess(started)) return started.success;
        yield* Effect.logWarning("could not start the connect flow", started.failure);
        return HttpServerResponse.redirect(withOutcome(returnTo, { connected: "0", error: "start_failed" }));
    }).pipe(Effect.satisfiesErrorType<never>());

    /**
     * Checks the callback against the round trip, exchanges the code,
     * verifies the ID token and stores the grant. The issuer is checked
     * first, as RFC 9207 asks of a provider that says it sends one, and the
     * state before an error is believed.
     */
    const complete = (pending: typeof ConnectTransaction.Type) =>
        Effect.gen(function* () {
            const fail = (reason: ConnectError["reason"]) => Effect.fail(new ConnectError({ reason }));

            const params = yield* HttpServerRequest.schemaSearchParams(CallbackParams).pipe(
                Effect.mapError(() => new ConnectError({ reason: "invalid_oauth_callback" }))
            );

            const metadata = provider.client.metadata;
            const issuerRequired = metadata.authorization_response_iss_parameter_supported === true;
            if (params.iss === undefined ? issuerRequired : params.iss !== metadata.issuer) {
                return yield* fail("invalid_oauth_provider");
            }

            if (params.state === undefined) return yield* fail("invalid_oauth_callback");
            const [presented, expected] = yield* Effect.all([sha256(params.state), sha256(pending.state)]);
            if (!crypto.timingSafeEqual(Buffer.from(presented), Buffer.from(expected))) {
                return yield* fail("invalid_oauth_cookies");
            }

            // The visitor declined at the consent screen, or the provider refused
            if (params.error !== undefined) {
                return yield* fail(params.error === "access_denied" ? "oauth_denied" : "invalid_oauth_provider");
            }
            if (params.code === undefined) return yield* fail("invalid_oauth_callback");

            const code = Redacted.make(params.code);
            const verificationStartedAt = yield* DateTime.now;
            const tokens = yield* provider.client
                .codeGrant({
                    code,
                    redirectUri: provider.redirectUri,
                    pkceVerifier: Redacted.make(pending.verifier),
                })
                .pipe(
                    Effect.flatMap(OAuth.tokens),
                    Effect.mapError(() => new ConnectError({ reason: "invalid_oauth_token" }))
                );

            if (tokens.idToken === undefined) return yield* fail("invalid_oauth_claims");
            const verified = yield* provider.idTokens
                .verify(tokens.idToken, {
                    verificationStartedAt,
                    nonce: Redacted.make(pending.nonce),
                    accessToken: tokens.accessToken,
                    code,
                })
                .pipe(Effect.mapError(() => new ConnectError({ reason: "invalid_oauth_claims" })));

            /**
             * The refresh token is the entire point of the flow: escrow legs
             * run hours after this redirect. A provider that issued none
             * leaves the visitor exactly as connected as they were before,
             * and the page says so rather than pretending.
             */
            if (tokens.refreshToken === undefined) return yield* fail("no_offline_access");

            yield* seal(Redacted.value(tokens.refreshToken)).pipe(
                Effect.flatMap((ciphertext) =>
                    GrantsRepository.use((repo) =>
                        repo.upsert({
                            tinyburgUserId: verified.subject,
                            refreshTokenCiphertext: ciphertext,
                            scope: tokens.scope ?? USER_GRANT_SCOPES.join(" "),
                        })
                    )
                ),
                Effect.tapError((error) => Effect.logError("could not store a treasury grant", error)),
                Effect.mapError(() => new ConnectError({ reason: "grant_not_stored" }))
            );

            return verified.subject;
        });

    const callback = Effect.gen(function* () {
        const request = yield* HttpServerRequest.HttpServerRequest;
        const pending = yield* Option.match(Option.fromNullishOr(request.cookies[cookieName]), {
            onNone: () => Effect.succeedNone,
            onSome: (raw) => Schema.decodeEffect(ConnectTransaction)(raw).pipe(Effect.option),
        });

        // Without its round trip the callback cannot be checked at all, and
        // the only safe place to send the visitor is the trades page.
        if (Option.isNone(pending)) {
            return yield* expire(
                HttpServerResponse.redirect(
                    withOutcome(homeAfterConnect(provider.issuer), { connected: "0", error: "invalid_oauth_cookies" })
                )
            );
        }

        // Checked again on the way out: the cookie is this site's own, but
        // nothing that reads it should have to trust that.
        const returnTo = isAllowedReturnTo(provider.issuer, pending.value.returnTo)
            ? pending.value.returnTo
            : homeAfterConnect(provider.issuer);

        const outcome = yield* Effect.result(complete(pending.value));
        if (Result.isFailure(outcome)) {
            return yield* expire(
                HttpServerResponse.redirect(withOutcome(returnTo, { connected: "0", error: outcome.failure.reason }))
            );
        }

        return yield* expire(HttpServerResponse.redirect(withOutcome(returnTo, { connected: "1" })));
    }).pipe(Effect.satisfiesErrorType<never>());

    return { connect, callback } as const;
};

export const OAuthRoutesLive = Effect.gen(function* () {
    const provider = yield* TinyburgProvider;
    const cookiePolicy = yield* CookiePolicy;
    const flow = makeConnectFlow(provider, cookiePolicy);

    return Layer.mergeAll(
        HttpRouter.add("GET", "/auth/connect", flow.connect),
        HttpRouter.add("GET", "/auth/callback", flow.callback)
    );
}).pipe(Layer.unwrap);
