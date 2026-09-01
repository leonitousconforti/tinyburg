/**
 * The friendship graph, stored as an append-only event log.
 *
 * Three invariants are enforced here rather than in calling code, because a
 * caller that forgets any of them leaks data about a person who never opted in:
 *
 * 1. An edge may only be written when *both* endpoints hold live consent. This
 *    is a join against `consents` inside the insert, not a filter the caller is
 *    trusted to have applied.
 * 2. Every write is idempotent, so a durable workflow replaying a step cannot
 *    manufacture phantom friend/unfriend churn.
 * 3. Every read and every write names a game. A friend code identifies a person
 *    only within one game, so a query that forgets the game would mix two
 *    people's circles together. The composite foreign keys on
 *    `friendship_events` stop a cross-game edge reaching the table at all, but
 *    the reads have to be scoped here.
 */

import type { SqlError } from "effect/unstable/sql";

import { Array, Context, Effect, Layer, Schema, pipe } from "effect";
import { SqlClient, SqlSchema } from "effect/unstable/sql";

import type { GameId } from "./games.ts";
import type { PlayerId } from "./model.ts";

import { PlayerIdSchema } from "@tinyburg/nimblebit-sdk/NimblebitConfig";

/**
 * One player of one game, as the graph identifies them.
 *
 * @since 1.0.0
 * @category Models
 */
export interface GamePlayerRef {
    readonly game: GameId;
    readonly playerId: PlayerId;
}

/** Splits a list of refs into the two parallel arrays a composite `unnest` wants. */
const columns = (players: ReadonlyArray<GamePlayerRef>): readonly [Array<string>, Array<string>] => [
    players.map((player) => player.game),
    players.map((player) => player.playerId),
];

export class GraphRepository extends Context.Service<GraphRepository>()(
    "@tinyburg/social-circles/domain/GraphRepository",
    {
        make: Effect.gen(function* () {
            const sql = yield* SqlClient.SqlClient;

            /**
             * A player's current outbound friends in one game, read straight
             * from the event log.
             *
             * This deliberately does *not* read `current_friendships`. That
             * materialized view was refreshed once at the top of the old crawl
             * job, so as the loop wrote events the view drifted, and every
             * player processed after the first was diffed against stale state.
             * The result was spurious friended/unfriended pairs on every run.
             * The view is now for analytics and export only, where a snapshot
             * that lags by a few minutes is fine.
             */
            const currentFriendsOf = (
                game: GameId,
                fromPlayer: PlayerId
            ): Effect.Effect<ReadonlyArray<PlayerId>, SqlError.SqlError, never> =>
                Effect.map(
                    sql`
                        SELECT p2.player_id AS friend
                        FROM (
                            SELECT DISTINCT ON (fe.from_player_id, fe.to_player_id)
                                fe.to_player_id,
                                fe.event_type
                            FROM friendship_events fe
                            JOIN players p1 ON fe.from_player_id = p1.id
                            WHERE fe.game = ${game} AND p1.player_id = ${fromPlayer}
                            ORDER BY fe.from_player_id, fe.to_player_id, fe.event_timestamp DESC
                        ) latest
                        JOIN players p2 ON latest.to_player_id = p2.id
                        WHERE latest.event_type = 'friended'
                    `,
                    // Bridges an untyped runtime boundary; the shape is guaranteed by construction, not by the compiler.
                    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
                    Array.map((row) => row["friend"] as PlayerId)
                );

            /**
             * Writes edges, keeping only those whose *other* endpoint has also
             * consented, in the same game.
             *
             * The `INNER JOIN consents` on both sides is the two-sided rule. A
             * caller cannot bypass it by passing a longer list.
             */
            const addFriends = (
                game: GameId,
                fromPlayer: PlayerId,
                toPlayers: ReadonlySet<PlayerId>
            ): Effect.Effect<void, SqlError.SqlError, never> => {
                if (toPlayers.size === 0) return Effect.void;
                const toPlayersArray = Array.fromIterable(toPlayers);
                return sql`
                    WITH consented AS (
                        SELECT p.id, p.player_id
                        FROM players p
                        JOIN consents c
                            ON c.game = p.game AND c.player_id = p.player_id AND c.revoked_at IS NULL
                        WHERE p.game = ${game}
                          AND (p.player_id = ${fromPlayer} OR p.player_id = ANY(${toPlayersArray}::text[]))
                    )
                    INSERT INTO friendship_events (game, from_player_id, to_player_id, event_type)
                    SELECT ${game}, p1.id, p2.id, 'friended'
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
                game: GameId,
                fromPlayer: PlayerId,
                toPlayers: ReadonlySet<PlayerId>
            ): Effect.Effect<void, SqlError.SqlError, never> => {
                if (toPlayers.size === 0) return Effect.void;
                const toPlayersArray = Array.fromIterable(toPlayers);
                return sql`
                    INSERT INTO friendship_events (game, from_player_id, to_player_id, event_type)
                    SELECT ${game}, p1.id, p2.id, 'unfriended'
                    FROM players p1, players p2
                    WHERE p1.game = ${game} AND p2.game = ${game}
                      AND p1.player_id = ${fromPlayer}
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
                game: GameId,
                fromPlayer: PlayerId,
                observedFriends: ReadonlyArray<PlayerId>
            ) {
                const candidates = pipe(
                    observedFriends,
                    Array.filter((friend) => friend !== fromPlayer),
                    Array.dedupe
                );

                // Which of this player's friends are in the study, in this game.
                // Everyone else is dropped, and only ever counted.
                const consentedFriends = yield* pipe(
                    sql`
                        SELECT player_id
                        FROM consents
                        WHERE revoked_at IS NULL
                          AND game = ${game}
                          AND player_id = ANY(${candidates}::text[])
                    `,
                    // Bridges an untyped runtime boundary; the shape is guaranteed by construction, not by the compiler.
                    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
                    Effect.map((rows) => new Set(rows.map((row) => row["playerId"] as PlayerId)))
                );

                const newSet = new Set(candidates.filter((friend) => consentedFriends.has(friend)));
                const existingSet = new Set(yield* currentFriendsOf(game, fromPlayer));

                const toAdd = new Set(Array.filter(Array.fromIterable(newSet), (f) => !existingSet.has(f)));
                const toRemove = new Set(Array.filter(Array.fromIterable(existingSet), (f) => !newSet.has(f)));

                yield* addFriends(game, fromPlayer, toAdd);
                yield* removeFriends(game, fromPlayer, toRemove);

                // The sampling rate, so downstream analysis can say how much of
                // the real network it is actually looking at.
                yield* sql`
                    INSERT INTO friend_counts (game, player_id, total_friends, consented_friends)
                    VALUES (${game}, ${fromPlayer}, ${candidates.length}, ${newSet.size})
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
                Result: Schema.Tuple([Schema.String, PlayerIdSchema, PlayerIdSchema]),
                execute: () =>
                    sql`SELECT game, from_player, to_player FROM current_friendships`.pipe(
                        Effect.map(Array.map(({ fromPlayer, game, toPlayer }) => [game, fromPlayer, toPlayer]))
                    ),
            });

            const mutualFriendships = SqlSchema.findAll({
                Request: Schema.Void,
                Result: Schema.Tuple([Schema.String, PlayerIdSchema, PlayerIdSchema]),
                execute: () =>
                    sql`SELECT game, player_a, player_b FROM mutual_friendships`.pipe(
                        Effect.map(Array.map(({ game, playerA, playerB }) => [game, playerA, playerB]))
                    ),
            });

            const mutualFriendsOf = (
                game: GameId,
                playerId: PlayerId
            ): Effect.Effect<ReadonlyArray<PlayerId>, SqlError.SqlError, never> =>
                Effect.map(
                    sql`
                        SELECT CASE WHEN player_a = ${playerId} THEN player_b ELSE player_a END AS friend
                        FROM mutual_friendships
                        WHERE game = ${game} AND (player_a = ${playerId} OR player_b = ${playerId})
                    `,
                    // Bridges an untyped runtime boundary; the shape is guaranteed by construction, not by the compiler.
                    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
                    Array.map((row) => row["friend"] as PlayerId)
                );

            /**
             * Everything the dashboard shows about a set of towers, in one
             * query.
             *
             * Driven off a two-column `unnest` and left joins so a player who
             * has never been crawled, or never enrolled, still comes back with a
             * row saying so. The dashboard needs to render "not taking part"
             * just as much as it needs to render a circle.
             */
            const statusFor = (players: ReadonlyArray<GamePlayerRef>) => {
                if (players.length === 0) return Effect.succeed([]);
                const [games, playerIds] = columns(players);
                return Effect.map(
                    sql`
                        SELECT
                            requested.game AS game,
                            requested.player_id AS player_id,
                            (c.player_id IS NOT NULL) AS enrolled,
                            COALESCE(fc.total_friends, 0) AS total_friends,
                            COALESCE(fc.consented_friends, 0) AS consented_friends,
                            cs.last_success_at AS last_success_at
                        FROM unnest(${games}::text[], ${playerIds}::text[]) AS requested(game, player_id)
                        LEFT JOIN consents c
                            ON c.game = requested.game
                            AND c.player_id = requested.player_id
                            AND c.revoked_at IS NULL
                        LEFT JOIN crawl_state cs
                            ON cs.game = requested.game AND cs.player_id = requested.player_id
                        LEFT JOIN LATERAL (
                            SELECT total_friends, consented_friends
                            FROM friend_counts
                            WHERE game = requested.game AND player_id = requested.player_id
                            ORDER BY observed_at DESC
                            LIMIT 1
                        ) fc ON TRUE
                    `,
                    Array.map((row) => ({
                        // Bridges an untyped runtime boundary; the shape is guaranteed by construction, not by the compiler.
                        // oxlint-disable-next-line typescript/no-unsafe-type-assertion
                        game: row["game"] as GameId,
                        // oxlint-disable-next-line typescript/no-unsafe-type-assertion
                        playerId: row["playerId"] as PlayerId,
                        enrolled: row["enrolled"] === true,
                        totalFriends: Number(row["totalFriends"] ?? 0),
                        consentedFriends: Number(row["consentedFriends"] ?? 0),
                        // oxlint-disable-next-line typescript/no-unsafe-type-assertion
                        lastSuccessAt: (row["lastSuccessAt"] ?? null) as Date | null,
                    }))
                );
            };

            /**
             * The visitor's circles across every game, as a graph.
             *
             * Nodes are the visitor's own towers and the people mutually
             * friended with them. Edges are the mutual friendships *among those
             * nodes*, which is the part worth drawing: without them the picture
             * is a star per tower and says nothing a list could not.
             *
             * That does disclose something the per-tower circle list does not,
             * namely that two of the visitor's friends know each other. It stays
             * within the study's rule that an edge needs both endpoints
             * consenting, and every person drawn is already someone the visitor
             * is shown in their circle, but it is a real widening and the
             * privacy page says so in as many words.
             *
             * Nobody outside the visitor's own circles appears. A friend's other
             * friends are not nodes here, so the graph never grows past the
             * people the visitor already knows about.
             */
            const circleGraphFor = Effect.fnUntraced(function* (owned: ReadonlyArray<GamePlayerRef>) {
                if (owned.length === 0) return { nodes: [], edges: [] };
                const [games, playerIds] = columns(owned);

                // Everyone the visitor may see: their own towers, and the
                // players mutually friended with one of them.
                const nodes = yield* Effect.map(
                    sql`
                        WITH mine AS (
                            SELECT * FROM unnest(${games}::text[], ${playerIds}::text[]) AS t(game, player_id)
                        )
                        SELECT game, player_id, bool_or(is_mine) AS is_mine
                        FROM (
                            SELECT m.game, m.player_id, TRUE AS is_mine FROM mine m
                            UNION ALL
                            SELECT
                                mf.game,
                                CASE WHEN mf.player_a = m.player_id THEN mf.player_b ELSE mf.player_a END,
                                FALSE
                            FROM mutual_friendships mf
                            JOIN mine m
                                ON m.game = mf.game
                                AND m.player_id IN (mf.player_a, mf.player_b)
                        ) everyone
                        GROUP BY game, player_id
                    `,
                    Array.map((row) => ({
                        // Bridges an untyped runtime boundary; the shape is guaranteed by construction, not by the compiler.
                        // oxlint-disable-next-line typescript/no-unsafe-type-assertion
                        game: row["game"] as GameId,
                        // oxlint-disable-next-line typescript/no-unsafe-type-assertion
                        playerId: row["playerId"] as PlayerId,
                        mine: row["isMine"] === true,
                    }))
                );

                // The induced subgraph: an edge is kept only when both of its
                // endpoints are already nodes above.
                const edges = yield* Effect.map(
                    sql`
                        WITH mine AS (
                            SELECT * FROM unnest(${games}::text[], ${playerIds}::text[]) AS t(game, player_id)
                        ),
                        circle AS (
                            SELECT m.game, m.player_id FROM mine m
                            UNION
                            SELECT
                                mf.game,
                                CASE WHEN mf.player_a = m.player_id THEN mf.player_b ELSE mf.player_a END
                            FROM mutual_friendships mf
                            JOIN mine m
                                ON m.game = mf.game
                                AND m.player_id IN (mf.player_a, mf.player_b)
                        )
                        SELECT mf.game, mf.player_a, mf.player_b
                        FROM mutual_friendships mf
                        JOIN circle a ON a.game = mf.game AND a.player_id = mf.player_a
                        JOIN circle b ON b.game = mf.game AND b.player_id = mf.player_b
                    `,
                    Array.map((row) => ({
                        // Bridges an untyped runtime boundary; the shape is guaranteed by construction, not by the compiler.
                        // oxlint-disable-next-line typescript/no-unsafe-type-assertion
                        game: row["game"] as GameId,
                        // oxlint-disable-next-line typescript/no-unsafe-type-assertion
                        a: row["playerA"] as PlayerId,
                        // oxlint-disable-next-line typescript/no-unsafe-type-assertion
                        b: row["playerB"] as PlayerId,
                    }))
                );

                return { nodes, edges };
            });

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
                circleGraphFor,
                refreshViews,
            };
        }),
    }
) {
    static readonly Default = Layer.effect(GraphRepository, GraphRepository.make);
}
