/**
 * Erasure.
 *
 * Every operation here is idempotent and reports how much it actually removed,
 * because the purge workflow replays steps after a crash and the receipt it
 * writes has to be true the first time and every time after.
 */

import type { SqlError } from "effect/unstable/sql";

import { Context, Effect, Layer, Schema } from "effect";
import { SqlClient, SqlSchema } from "effect/unstable/sql";

import { type PlayerId, PurgeReceipt } from "./model.ts";

export class PurgeRepository extends Context.Service<PurgeRepository>()(
    "@tinyburg/social-circles/domain/PurgeRepository",
    {
        make: Effect.gen(function* () {
            const sql = yield* SqlClient.SqlClient;

            /**
             * How much of the graph mentions this player, counted before
             * anything is removed so the receipt can report real numbers.
             */
            const countFootprint = (
                playerId: PlayerId
            ): Effect.Effect<{ readonly events: number; readonly edges: number }, SqlError.SqlError, never> =>
                Effect.map(
                    sql`
                        SELECT
                            (SELECT COUNT(*) FROM friendship_events fe
                             JOIN players p ON p.id IN (fe.from_player_id, fe.to_player_id)
                             WHERE p.player_id = ${playerId}) AS events,
                            (SELECT COUNT(*) FROM current_friendships cf
                             WHERE cf.from_player = ${playerId} OR cf.to_player = ${playerId}) AS edges
                    `,
                    (rows) => {
                        // Bridges an untyped runtime boundary; the shape is guaranteed by construction, not by the compiler.
                        // oxlint-disable-next-line typescript/no-unsafe-type-assertion
                        const row = rows[0] as { events: string | number; edges: string | number } | undefined;
                        return {
                            events: Number(row?.events ?? 0),
                            edges: Number(row?.edges ?? 0),
                        };
                    }
                );

            /**
             * Removes the player and everything that references them.
             *
             * `friendship_events`, `friend_counts`, `crawl_state`, and
             * `consents` all cascade from `players`, so a single delete is
             * enough and cannot leave one table behind if the process dies
             * partway. Deleting an already-deleted player is a no-op.
             */
            const erasePlayer = (playerId: PlayerId): Effect.Effect<void, SqlError.SqlError, never> =>
                sql`DELETE FROM players WHERE player_id = ${playerId}`.pipe(Effect.asVoid);

            /**
             * Drops the stored `towers` grant so no background job can act for
             * this user again, even before the provider-side revocation lands.
             */
            const eraseGrant = (tinyburgUserId: string): Effect.Effect<void, SqlError.SqlError, never> =>
                sql`DELETE FROM tower_grants WHERE tinyburg_user_id = ${tinyburgUserId}`.pipe(Effect.asVoid);

            /**
             * Writes the proof of completion.
             *
             * Deliberately the last step: a receipt is a claim that everything
             * above it already happened.
             */
            const writeReceipt = (options: {
                readonly playerId: PlayerId;
                readonly tinyburgUserId: string;
                readonly requestedAt: Date;
                readonly edgesRemoved: number;
                readonly eventsRemoved: number;
            }): Effect.Effect<void, SqlError.SqlError, never> =>
                sql`
                    INSERT INTO purge_receipts
                        (player_id, tinyburg_user_id, requested_at, edges_removed, events_removed)
                    VALUES (
                        ${options.playerId},
                        ${options.tinyburgUserId},
                        ${options.requestedAt},
                        ${options.edgesRemoved},
                        ${options.eventsRemoved}
                    )
                `.pipe(Effect.asVoid);

            const receiptsFor = SqlSchema.findAll({
                Request: Schema.String,
                Result: PurgeReceipt,
                execute: (playerId) => sql`
                    SELECT * FROM purge_receipts
                    WHERE player_id = ${playerId}
                    ORDER BY completed_at DESC
                `,
            });

            return {
                countFootprint,
                erasePlayer,
                eraseGrant,
                writeReceipt,
                receiptsFor,
            };
        }),
    }
) {
    static readonly Default = Layer.effect(PurgeRepository, PurgeRepository.make);
}
