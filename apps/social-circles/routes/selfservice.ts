/**
 * The dashboard's api.
 *
 * Every handler behind {@link SessionCookie} acts as the signed-in visitor and
 * nobody else. The ownership gate is not enforced here: enrolling and
 * withdrawing both go through their workflows, which check against tinyburg.app
 * that the visitor actually owns the tower. Doing it there rather than here
 * means a future caller cannot skip the check by taking a different route in.
 */

import { DateTime, Effect, Layer, Option, Redacted } from "effect";
import { HttpEffect, HttpServerResponse } from "effect/unstable/http";
import { HttpApiBuilder, HttpApiError } from "effect/unstable/httpapi";

import { CookiePolicy, maybeCurrentSession } from "../cookies.ts";
import { unseal } from "../crypto.ts";
import { ConsentRepository } from "../domain/consent.ts";
import { GraphRepository } from "../domain/graph.ts";
import { SessionsRepository } from "../domain/sessions.ts";
import { TinyburgTowers } from "../services/towers.ts";
import { CurrentSession, SelfServiceApi, SessionCookie } from "../shared/api.ts";
import { ConsentWorkflow } from "../workflows/consent.ts";
import { PurgeWorkflow } from "../workflows/purge.ts";

const SessionCookieLive = Layer.effect(
    SessionCookie,
    Effect.gen(function* () {
        const sessions = yield* SessionsRepository;
        const cookiePolicy = yield* CookiePolicy;

        return Effect.fnUntraced(function* (httpEffect) {
            const currentSession = yield* maybeCurrentSession.pipe(
                Effect.provideService(SessionsRepository, sessions),
                Effect.provideService(CookiePolicy, cookiePolicy),
                Effect.mapError(() => new HttpApiError.InternalServerError())
            );

            if (Option.isNone(currentSession)) {
                return yield* new HttpApiError.Unauthorized();
            }

            yield* HttpEffect.appendPreResponseHandler((_request, response) =>
                Effect.succeed(HttpServerResponse.setHeader(response, "cache-control", "no-store"))
            );

            return yield* Effect.provideService(httpEffect, CurrentSession, { session: currentSession.value });
        });
    })
);

const SelfServiceGroupLive = HttpApiBuilder.group(
    SelfServiceApi,
    "SelfServiceGroup",
    Effect.fnUntraced(function* (handlers) {
        const consents = yield* ConsentRepository;
        const graph = yield* GraphRepository;
        const towers = yield* TinyburgTowers;

        /**
         * The provider access token stashed at sign-in, if it is still good.
         *
         * This is what makes the dashboard usable before the provider supports
         * refresh tokens. An expired or missing token is not an error the
         * visitor can act on beyond signing in again, so it reads as
         * ServiceUnavailable: the study cannot currently reach tinyburg.app on
         * their behalf.
         */
        const liveAccessToken = Effect.fnUntraced(function* () {
            const { session } = yield* CurrentSession;
            const now = yield* DateTime.now;

            const usable = Option.zipWith(
                session.accessTokenCiphertext,
                session.accessTokenExpiresAt,
                (ciphertext, expiresAt) =>
                    DateTime.isGreaterThan(expiresAt, now) ? Option.some(ciphertext) : Option.none<string>()
            ).pipe(Option.flatten);

            if (Option.isNone(usable)) {
                return yield* new HttpApiError.ServiceUnavailable();
            }

            const token = yield* unseal(usable.value).pipe(
                Effect.mapError(() => new HttpApiError.ServiceUnavailable())
            );
            return { sub: session.sub, accessToken: Redacted.value(token) };
        });

        return handlers
            .handle("session", () => Effect.map(CurrentSession, ({ session }) => session))

            .handle("towers", () =>
                Effect.gen(function* () {
                    const { accessToken, sub } = yield* liveAccessToken();

                    const linked = yield* towers
                        .linkedPlayersWith({ tinyburgUserId: sub, accessToken })
                        .pipe(Effect.mapError(() => new HttpApiError.ServiceUnavailable()));

                    const statuses = yield* graph.statusFor(linked).pipe(Effect.orDie);

                    return statuses.map((status) => ({
                        playerId: status.playerId,
                        enrolled: status.enrolled,
                        circleSize: status.consentedFriends,
                        totalFriends: status.totalFriends,
                        lastCrawledAt: Option.fromNullishOr(status.lastSuccessAt).pipe(
                            Option.map(DateTime.fromDateUnsafe)
                        ),
                    }));
                })
            )

            .handle("enroll", ({ params }) =>
                Effect.gen(function* () {
                    const { session } = yield* CurrentSession;
                    return yield* ConsentWorkflow.execute({
                        tinyburgUserId: session.sub,
                        playerId: params.playerId,
                    }).pipe(
                        // The workflow rejects a player the visitor cannot prove
                        // they own. That is the ownership gate, and Forbidden is
                        // what it looks like from outside.
                        Effect.mapError(() => new HttpApiError.Forbidden())
                    );
                })
            )

            .handle("withdraw", ({ params }) =>
                Effect.gen(function* () {
                    const { session } = yield* CurrentSession;

                    // Only the account that granted consent may withdraw it. The
                    // purge workflow scopes its revoke the same way, so a
                    // mismatch removes nothing; checking here just turns that
                    // into an honest 404 instead of a receipt for no work.
                    const held = yield* consents.findForUser(session.sub).pipe(Effect.orDie);
                    const owns = held.some(
                        (consent) => consent.playerId === params.playerId && Option.isNone(consent.revokedAt)
                    );
                    if (!owns) {
                        return yield* new HttpApiError.NotFound();
                    }

                    const requestedAt = yield* DateTime.now;
                    return yield* PurgeWorkflow.execute({
                        tinyburgUserId: session.sub,
                        playerId: params.playerId,
                        requestedAt,
                    }).pipe(Effect.mapError(() => new HttpApiError.NotFound()));
                })
            )

            .handle("circle", ({ params }) =>
                Effect.gen(function* () {
                    const { session } = yield* CurrentSession;

                    // A circle is only ever shown to the player it belongs to.
                    const held = yield* consents.findForUser(session.sub).pipe(Effect.orDie);
                    const owns = held.some(
                        (consent) => consent.playerId === params.playerId && Option.isNone(consent.revokedAt)
                    );
                    if (!owns) {
                        return yield* new HttpApiError.Forbidden();
                    }

                    const friends = yield* graph.mutualFriendsOf(params.playerId).pipe(Effect.orDie);
                    const [status] = yield* graph.statusFor([params.playerId]).pipe(Effect.orDie);

                    return {
                        playerId: params.playerId,
                        friends,
                        totalFriends: status?.totalFriends ?? 0,
                    };
                })
            );
    })
);

export const SelfServiceApiLive = HttpApiBuilder.layer(SelfServiceApi).pipe(
    Layer.provide(SelfServiceGroupLive),
    Layer.provide(SessionCookieLive)
);
