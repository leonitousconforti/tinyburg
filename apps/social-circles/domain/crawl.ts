/**
 * Scheduler bookkeeping.
 *
 * Kept in the database rather than in entity memory so that a restart resumes
 * the existing backoff instead of stampeding every player at once the moment
 * the process comes back up.
 */

import type { SqlError } from "effect/unstable/sql";

import { Context, Effect, Layer, Schema } from "effect";
import { SqlClient, SqlSchema } from "effect/unstable/sql";

import type { PlayerId } from "./model.ts";

import { PlayerIdSchema } from "@tinyburg/nimblebit-sdk/NimblebitConfig";

/** Backoff ceiling. A player who keeps failing is retried daily, not abandoned. */
const MAX_BACKOFF_MINUTES = 24 * 60;

export class CrawlStateRepository extends Context.Service<CrawlStateRepository>()(
    "@tinyburg/social-circles/domain/CrawlStateRepository",
    {
        make: Effect.gen(function* () {
            const sql = yield* SqlClient.SqlClient;

            /** Puts a newly consented player into the rotation, due immediately. */
            const enroll = (playerId: PlayerId): Effect.Effect<void, SqlError.SqlError, never> =>
                sql`
                    INSERT INTO crawl_state (player_id) VALUES (${playerId})
                    ON CONFLICT (player_id) DO NOTHING
                `.pipe(Effect.asVoid);

            /**
             * Players who are due for a crawl.
             *
             * Joined against live consent so a revoked player stops being
             * scheduled even if their crawl_state row has not been cleaned up
             * yet. Consent is the gate, everywhere.
             */
            const due = SqlSchema.findAll({
                Request: Schema.Finite,
                Result: PlayerIdSchema,
                execute: (limit) =>
                    sql`
                        SELECT cs.player_id
                        FROM crawl_state cs
                        JOIN consents c ON c.player_id = cs.player_id AND c.revoked_at IS NULL
                        WHERE cs.next_attempt_at <= NOW()
                        ORDER BY cs.next_attempt_at ASC
                        LIMIT ${limit}
                    `.pipe(Effect.map((rows) => rows.map(({ playerId }) => playerId))),
            });

            /**
             * Records a good crawl and schedules the next one.
             *
             * Clearing `consecutive_failures` here is what lets a player who had
             * a bad patch return to the normal cadence immediately.
             */
            const recordSuccess = (options: {
                readonly playerId: PlayerId;
                readonly saveVersion: string;
                readonly intervalMinutes: number;
            }): Effect.Effect<void, SqlError.SqlError, never> =>
                sql`
                    UPDATE crawl_state
                    SET last_crawled_at = NOW(),
                        last_success_at = NOW(),
                        last_save_version = ${options.saveVersion},
                        consecutive_failures = 0,
                        last_error = NULL,
                        next_attempt_at = NOW() + (${options.intervalMinutes} * INTERVAL '1 minute')
                    WHERE player_id = ${options.playerId}
                `.pipe(Effect.asVoid);

            /**
             * Records a failure and backs off exponentially.
             *
             * The backoff is computed in SQL from the stored failure count so it
             * is correct even when the process that observed the previous
             * failure is long gone.
             */
            const recordFailure = (options: {
                readonly playerId: PlayerId;
                readonly error: string;
            }): Effect.Effect<void, SqlError.SqlError, never> =>
                sql`
                    UPDATE crawl_state
                    SET last_crawled_at = NOW(),
                        consecutive_failures = consecutive_failures + 1,
                        last_error = ${options.error},
                        next_attempt_at = NOW() + (
                            LEAST(
                                ${MAX_BACKOFF_MINUTES},
                                POWER(2, LEAST(consecutive_failures + 1, 10)) * 5
                            ) * INTERVAL '1 minute'
                        )
                    WHERE player_id = ${options.playerId}
                `.pipe(Effect.asVoid);

            /**
             * The save fingerprint from the last successful crawl, used to skip
             * the diff when a player's tower has not changed.
             */
            const lastSaveVersion = (playerId: PlayerId): Effect.Effect<string | null, SqlError.SqlError, never> =>
                Effect.map(
                    sql`SELECT last_save_version FROM crawl_state WHERE player_id = ${playerId}`,
                    (rows) => (rows[0]?.["lastSaveVersion"] as string | undefined) ?? null
                );

            return {
                enroll,
                due,
                recordSuccess,
                recordFailure,
                lastSaveVersion,
            };
        }),
    }
) {
    static readonly Default = Layer.effect(CrawlStateRepository, CrawlStateRepository.make);
}
