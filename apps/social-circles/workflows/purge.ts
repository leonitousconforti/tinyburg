/**
 * The deletion saga.
 *
 * This is the clearest case in the app for durable execution. A purge touches
 * several tables plus a third party, and a half-finished one is the worst
 * possible outcome: the user is told their data is gone while edges naming them
 * are still being served in exports. Running it as a workflow means every step
 * is journaled, a crash resumes from the last completed step rather than
 * restarting or silently stopping, and the final receipt is only written once
 * everything before it genuinely happened.
 */

import { DateTime, Effect, Schema } from "effect";
import { Activity, Workflow } from "effect/unstable/workflow";

import { PlayerIdSchema } from "@tinyburg/nimblebit-sdk/NimblebitConfig";

import { ConsentRepository } from "../domain/consent.ts";
import { GraphRepository } from "../domain/graph.ts";
import { PurgeRepository } from "../domain/purge.ts";
import { TinyburgTowers } from "../services/towers.ts";

/**
 * A deletion request could not be completed.
 *
 * @since 1.0.0
 * @category Errors
 */
export class PurgeFailed extends Schema.Error<PurgeFailed>("@tinyburg/social-circles/PurgeFailed")({
    _tag: Schema.tag("PurgeFailed"),
    playerId: PlayerIdSchema,
    reason: Schema.String,
}) {}

/**
 * @since 1.0.0
 * @category Workflows
 */
export const PurgeWorkflow = Workflow.make("SocialCirclesPurge", {
    payload: {
        tinyburgUserId: Schema.String.check(Schema.isUUID()),
        playerId: PlayerIdSchema,
        requestedAt: Schema.DateTimeUtcFromDate,
    },
    success: Schema.Struct({
        edgesRemoved: Schema.Finite,
        eventsRemoved: Schema.Finite,
    }),
    error: PurgeFailed,
    /**
     * Two requests for the same player collapse into one execution. A user
     * hammering the delete button gets one purge, not five racing ones.
     */
    idempotencyKey: ({ playerId }) => playerId,
});

/**
 * @since 1.0.0
 * @category Layers
 */
export const PurgeWorkflowLive = PurgeWorkflow.toLayer(
    Effect.fnUntraced(function* (payload) {
        const consents = yield* ConsentRepository;
        const graph = yield* GraphRepository;
        const purge = yield* PurgeRepository;
        const towers = yield* TinyburgTowers;

        /**
         * Stop the crawler before touching anything else.
         *
         * Ordering matters: if erasure ran first, an in-flight crawl could
         * re-insert the player behind the purge and leave orphaned rows that no
         * receipt accounts for.
         */
        yield* Activity.make({
            name: "revokeConsent",
            execute: consents
                .revoke({ tinyburgUserId: payload.tinyburgUserId, playerId: payload.playerId })
                .pipe(Effect.asVoid, Effect.orDie),
        });

        /** Measure before deleting, or there is nothing left to count. */
        const footprint = yield* Activity.make({
            name: "countFootprint",
            success: Schema.Struct({ events: Schema.Finite, edges: Schema.Finite }),
            execute: Effect.orDie(purge.countFootprint(payload.playerId)),
        });

        yield* Activity.make({
            name: "erasePlayer",
            execute: Effect.orDie(purge.erasePlayer(payload.playerId)),
        });

        yield* Activity.make({
            name: "eraseGrant",
            execute: Effect.orDie(purge.eraseGrant(payload.tinyburgUserId)),
        });

        /**
         * Best effort by design. Losing our copy of the grant is what actually
         * stops us using it; telling the provider is courtesy, and a provider
         * outage must not strand a deletion that is otherwise complete.
         */
        yield* Activity.make({
            name: "revokeUpstreamGrant",
            execute: towers
                .revokeGrant(payload.tinyburgUserId)
                .pipe(
                    Effect.catchCause((cause) =>
                        Effect.logWarning("upstream grant revocation failed, local grant is already gone", cause)
                    )
                ),
        });

        /**
         * Until the views are refreshed the player is still visible to exports
         * and the analytics reads, so this is part of the deletion, not cleanup
         * after it.
         */
        yield* Activity.make({
            name: "refreshViews",
            execute: Effect.orDie(graph.refreshViews),
        });

        yield* Activity.make({
            name: "writeReceipt",
            execute: Effect.orDie(
                purge.writeReceipt({
                    playerId: payload.playerId,
                    tinyburgUserId: payload.tinyburgUserId,
                    requestedAt: DateTime.toDateUtc(payload.requestedAt),
                    edgesRemoved: footprint.edges,
                    eventsRemoved: footprint.events,
                })
            ),
        });

        return { edgesRemoved: footprint.edges, eventsRemoved: footprint.events };
    })
);
