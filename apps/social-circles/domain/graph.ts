/**
 * The friendship graph, stored as an append-only event log.
 *
 * Two invariants are enforced here rather than in calling code, because a
 * caller that forgets either one leaks data about a person who never opted in:
 *
 * 1. An edge may only be written when *both* endpoints hold live consent. This
 *    is a join against `consents` inside the insert, not a filter the caller is
 *    trusted to have applied.
 * 2. Every write is idempotent, so a durable workflow replaying a step cannot
 *    manufacture phantom friend/unfriend churn.
 */

import type { SqlError } from "effect/unstable/sql";

import { Array, Context, Effect, Layer, Schema, pipe } from "effect";
import { SqlClient, SqlSchema } from "effect/unstable/sql";

import type { PlayerId } from "./model.ts";

import { PlayerIdSchema } from "@tinyburg/nimblebit-sdk/NimblebitConfig";

export class GraphRepository extends Context.Service<GraphRepository>()(
    "@tinyburg/social-circles/domain/GraphRepository",
    {
        make: Effect.gen(function* () {
            const sql = yield* SqlClient.SqlClient;

            /**
             * A player's current outbound friends, read straight from the event
             * log.
             *
             * This deliberately does *not* read `current_friendships`. That
             * materialized view was refreshed once at the top of the old crawl
             * job, so as the loop wrote events the view drifted, and every
             * player processed after the first was diffed against stale state.
             * The result was spurious friended/unfriended pairs on every run.
             * The view is now for analytics and export only, where a snapshot
             * that lags by a few minutes is fine.
             */
            const currentFriendsOf = SqlSchema.findAll({
                Request: PlayerIdSchema,
                Result: PlayerIdSchema,
                execute: (fromPlayer) =>
                    sql`
                        SELECT p2.player_id AS friend
                        FROM (
                            SELECT DISTINCT ON (fe.from_player_id, fe.to_player_id)
                                fe.to_player_id,
                                fe.event_type
                            FROM friendship_events fe
                            JOIN players p1 ON fe.from_player_id = p1.id
                            WHERE p1.player_id = ${fromPlayer}
                            ORDER BY fe.from_player_id, fe.to_player_id, fe.event_timestamp DESC
                        ) latest
                        JOIN players p2 ON latest.to_player_id = p2.id
                        WHERE latest.event_type = 'friended'
                    `.pipe(Effect.map((rows) => rows.map(({ friend }) => friend))),
            });

            /**
             * Writes edges, keeping only those whose *other* endpoint has also
             * consented.
             *
             * The `INNER JOIN consents` on both sides is the two-sided rule. A
             * caller cannot bypass it by passing a longer list.
             */
            const addFriends = (
                fromPlayer: PlayerId,
                toPlayers: ReadonlySet<PlayerId>
            ): Effect.Effect<void, SqlError.SqlError, never> => {
                if (toPlayers.size === 0) return Effect.void;
                const toPlayersArray = Array.fromIterable(toPlayers);
                return sql`
                    WITH consented AS (
                        SELECT p.id, p.player_id
                        FROM players p
                        JOIN consents c ON c.player_id = p.player_id AND c.revoked_at IS NULL
                        WHERE p.player_id = ${fromPlayer} OR p.player_id = ANY(${toPlayersArray}::text[])
                    )
                    INSERT INTO friendship_events (from_player_id, to_player_id, event_type)
                    SELECT p1.id, p2.id, 'friended'
                    FROM consented p1, consented p2
                    WHERE p1.player_id = ${fromPlayer}
                      AND p2.player_id = ANY(${toPlayersArray}::text[])
                      AND p1.id <> p2.id
                    ON CONFLICT ON CONSTRAINT unique_friendship_event DO NOTHING
                `.pipe(Effect.asVoid);
            };

            /**
             * Records that edges went away.
             *
             * Unlike {@link addFriends} this does not re-check consent: an
             * unfriend event only ever *removes* an edge that consent already
             * permitted, and suppressing it would strand a stale edge in the
             * graph.
             */
            const removeFriends = (
                fromPlayer: PlayerId,
                toPlayers: ReadonlySet<PlayerId>
            ): Effect.Effect<void, SqlError.SqlError, never> => {
                if (toPlayers.size === 0) return Effect.void;
                const toPlayersArray = Array.fromIterable(toPlayers);
                return sql`
                    INSERT INTO friendship_events (from_player_id, to_player_id, event_type)
                    SELECT p1.id, p2.id, 'unfriended'
                    FROM players p1, players p2
                    WHERE p1.player_id = ${fromPlayer}
                      AND p2.player_id = ANY(${toPlayersArray}::text[])
                      AND p1.id <> p2.id
                    ON CONFLICT ON CONSTRAINT unique_friendship_event DO NOTHING
                `.pipe(Effect.asVoid);
            };

            /**
             * Reconciles one player's friends list against what is stored.
             *
             * `observedFriends` is the raw list off the player's save. It is
             * *not* pre-filtered by the caller: the redaction happens here so
             * the redacted count can be recorded honestly.
             */
            const syncFriends = Effect.fnUntraced(function* (
                fromPlayer: PlayerId,
                observedFriends: ReadonlyArray<PlayerId>
            ) {
                const candidates = pipe(
                    observedFriends,
                    Array.filter((friend) => friend !== fromPlayer),
                    Array.dedupe
                );

                // Which of this player's friends are in the study. Everyone else
                // is dropped, and only ever counted.
                const consentedFriends = yield* pipe(
                    sql`
                        SELECT player_id
                        FROM consents
                        WHERE revoked_at IS NULL AND player_id = ANY(${candidates}::text[])
                    `,
                    // Bridges an untyped runtime boundary; the shape is guaranteed by construction, not by the compiler.
                    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
                    Effect.map((rows) => new Set(rows.map((row) => row["playerId"] as PlayerId)))
                );

                const newSet = new Set(candidates.filter((friend) => consentedFriends.has(friend)));
                const existingSet = new Set(yield* currentFriendsOf(fromPlayer));

                const toAdd = new Set(Array.filter(Array.fromIterable(newSet), (f) => !existingSet.has(f)));
                const toRemove = new Set(Array.filter(Array.fromIterable(existingSet), (f) => !newSet.has(f)));

                yield* addFriends(fromPlayer, toAdd);
                yield* removeFriends(fromPlayer, toRemove);

                // The sampling rate, so downstream analysis can say how much of
                // the real network it is actually looking at.
                yield* sql`
                    INSERT INTO friend_counts (player_id, total_friends, consented_friends)
                    VALUES (${fromPlayer}, ${candidates.length}, ${newSet.size})
                `;

                return {
                    added: toAdd.size,
                    removed: toRemove.size,
                    totalFriends: candidates.length,
                    consentedFriends: newSet.size,
                };
            });

            // -- Analytics reads. These hit the materialized views, which the
            // -- refresh singleton keeps current.

            const currentFriendships = SqlSchema.findAll({
                Request: Schema.Void,
                Result: Schema.Tuple([PlayerIdSchema, PlayerIdSchema]),
                execute: () =>
                    sql`SELECT from_player, to_player FROM current_friendships`.pipe(
                        Effect.map(Array.map(({ fromPlayer, toPlayer }) => [fromPlayer, toPlayer]))
                    ),
            });

            const mutualFriendships = SqlSchema.findAll({
                Request: Schema.Void,
                Result: Schema.Tuple([PlayerIdSchema, PlayerIdSchema]),
                execute: () =>
                    sql`SELECT player_a, player_b FROM mutual_friendships`.pipe(
                        Effect.map(Array.map(({ playerA, playerB }) => [playerA, playerB]))
                    ),
            });

            const mutualFriendsOf = SqlSchema.findAll({
                Request: PlayerIdSchema,
                Result: PlayerIdSchema,
                execute: (playerId) =>
                    sql`
                        SELECT CASE WHEN player_a = ${playerId} THEN player_b ELSE player_a END AS friend
                        FROM mutual_friendships
                        WHERE player_a = ${playerId} OR player_b = ${playerId}
                    `.pipe(Effect.map(Array.map(({ friend }) => friend))),
            });

            /**
             * Everything the dashboard shows about a set of players, in one
             * query.
             *
             * Driven off `unnest` and left joins so a player who has never been
             * crawled, or never enrolled, still comes back with a row saying so.
             * The dashboard needs to render "not taking part" just as much as it
             * needs to render a circle.
             */
            const statusFor = (playerIds: ReadonlyArray<PlayerId>) =>
                Effect.map(
                    sql`
                        SELECT
                            requested.player_id AS player_id,
                            (c.player_id IS NOT NULL) AS enrolled,
                            COALESCE(fc.total_friends, 0) AS total_friends,
                            COALESCE(fc.consented_friends, 0) AS consented_friends,
                            cs.last_success_at AS last_success_at
                        FROM unnest(${playerIds}::text[]) AS requested(player_id)
                        LEFT JOIN consents c
                            ON c.player_id = requested.player_id AND c.revoked_at IS NULL
                        LEFT JOIN crawl_state cs
                            ON cs.player_id = requested.player_id
                        LEFT JOIN LATERAL (
                            SELECT total_friends, consented_friends
                            FROM friend_counts
                            WHERE player_id = requested.player_id
                            ORDER BY observed_at DESC
                            LIMIT 1
                        ) fc ON TRUE
                    `,
                    Array.map((row) => ({
                        // Bridges an untyped runtime boundary; the shape is guaranteed by construction, not by the compiler.
                        // oxlint-disable-next-line typescript/no-unsafe-type-assertion
                        playerId: row["playerId"] as PlayerId,
                        enrolled: row["enrolled"] === true,
                        totalFriends: Number(row["totalFriends"] ?? 0),
                        consentedFriends: Number(row["consentedFriends"] ?? 0),
                        // Bridges an untyped runtime boundary; the shape is guaranteed by construction, not by the compiler.
                        // oxlint-disable-next-line typescript/no-unsafe-type-assertion
                        lastSuccessAt: (row["lastSuccessAt"] ?? null) as Date | null,
                    }))
                );

            /**
             * Refreshes the analytics views. Mutuals are derived from currents,
             * so the order matters.
             */
            const refreshViews = pipe(
                sql`REFRESH MATERIALIZED VIEW CONCURRENTLY current_friendships`,
                Effect.flatMap(() => sql`REFRESH MATERIALIZED VIEW CONCURRENTLY mutual_friendships`),
                Effect.asVoid
            );

            return {
                currentFriendsOf,
                addFriends,
                removeFriends,
                syncFriends,
                currentFriendships,
                mutualFriendships,
                mutualFriendsOf,
                statusFor,
                refreshViews,
            };
        }),
    }
) {
    static readonly Default = Layer.effect(GraphRepository, GraphRepository.make);
}
