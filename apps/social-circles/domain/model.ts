import { Model, SqlClient, SqlSchema, type SqlError } from "@effect/sql";
import { PlayerIdSchema } from "@tinyburg/nimblebit-sdk/NimblebitConfig";
import { Array, Cron, Effect, Function, Schedule, Schema, pipe, type ParseResult } from "effect";

/**
 * @since 1.0.0
 * @category Model
 */
export class Player extends Model.Class<Player>("Player")({
    id: Model.Generated(Schema.UUID),
    playerId: PlayerIdSchema,
    firstSeenAt: Model.DateTimeInsertFromDate,
}) {}

/**
 * @since 1.0.0
 * @category Repository
 */
export class Repository extends Effect.Service<Repository>()("@tinyburg/social-circles/domain/model/Repository", {
    accessors: true,
    dependencies: [],
    scoped: Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;
        const materializedViewsRefresh = yield* Cron.parse("*/5 * * * *");

        // Player repository
        const players = yield* Model.makeRepository(Player, {
            idColumn: "playerId",
            tableName: "players",
            spanPrefix: "@tinyburg/social-circles/domain/model/Repository/players",
        });

        // Refresh current friendships view
        const refreshCurrentFriendships = Effect.map(
            sql`REFRESH MATERIALIZED VIEW CONCURRENTLY current_friendships`,
            Function.identity
        );

        // Refresh mutual friendships view
        const refreshMutualFriendships = Effect.map(
            sql`REFRESH MATERIALIZED VIEW CONCURRENTLY mutual_friendships`,
            Function.identity
        );

        // Refresh both views (mutuals depends on currents)
        const refreshViews = pipe(
            refreshCurrentFriendships,
            Effect.flatMap(() => refreshMutualFriendships),
            Effect.asVoid
        );

        // Background task for periodic refresh
        yield* pipe(
            refreshViews,
            Effect.tapErrorCause(Effect.logWarning),
            Effect.retry(Schedule.spaced("500 millis")),
            Effect.scheduleForked(Schedule.cron(materializedViewsRefresh))
        );

        // Add a single friend (records a 'friended' event)
        const addFriend = (
            fromPlayer: Schema.Schema.Type<PlayerIdSchema>,
            toPlayer: Schema.Schema.Type<PlayerIdSchema>
        ) =>
            sql`
                WITH new_players AS (
                    INSERT INTO players (player_id) VALUES (${fromPlayer}), (${toPlayer})
                    ON CONFLICT (player_id) DO NOTHING
                    RETURNING id, player_id
                ),
                all_players AS (
                    SELECT id, player_id FROM new_players
                    UNION
                    SELECT id, player_id FROM players WHERE player_id IN (${fromPlayer}, ${toPlayer})
                )
                INSERT INTO friendship_events (from_player_id, to_player_id, event_type)
                SELECT p1.id, p2.id, 'friended'
                FROM all_players p1, all_players p2
                WHERE p1.player_id = ${fromPlayer} AND p2.player_id = ${toPlayer}
            `.pipe(Effect.asVoid);

        // Remove a singular friend (records an 'unfriended' event)
        const removeFriend = (
            fromPlayer: Schema.Schema.Type<PlayerIdSchema>,
            toPlayer: Schema.Schema.Type<PlayerIdSchema>
        ) =>
            sql`
                INSERT INTO friendship_events (from_player_id, to_player_id, event_type)
                SELECT p1.id, p2.id, 'unfriended'
                FROM players p1, players p2
                WHERE p1.player_id = ${fromPlayer} AND p2.player_id = ${toPlayer}
            `.pipe(Effect.asVoid);

        // Add multiple friends at once (bulk 'friended' events)
        const addFriends = (
            fromPlayer: Schema.Schema.Type<PlayerIdSchema>,
            toPlayers: ReadonlySet<Schema.Schema.Type<PlayerIdSchema>>
        ) => {
            if (toPlayers.size === 0) return Effect.void;
            const toPlayersArray = Array.fromIterable(toPlayers);
            const allPlayersArray = [fromPlayer, ...toPlayersArray];
            return sql`
                WITH new_players AS (
                    INSERT INTO players (player_id)
                    SELECT unnest(${allPlayersArray}::text[])
                    ON CONFLICT (player_id) DO NOTHING
                    RETURNING id, player_id
                ),
                all_players AS (
                    SELECT id, player_id FROM new_players
                    UNION
                    SELECT id, player_id FROM players WHERE player_id = ANY(${allPlayersArray}::text[])
                )
                INSERT INTO friendship_events (from_player_id, to_player_id, event_type)
                SELECT p1.id, p2.id, 'friended'
                FROM all_players p1, all_players p2
                WHERE p1.player_id = ${fromPlayer} AND p2.player_id = ANY(${toPlayersArray}::text[])
            `.pipe(Effect.asVoid);
        };

        // Remove multiple friends at once (bulk 'unfriended' events)
        const removeFriends = (
            fromPlayer: Schema.Schema.Type<PlayerIdSchema>,
            toPlayers: ReadonlySet<Schema.Schema.Type<PlayerIdSchema>>
        ) => {
            if (toPlayers.size === 0) return Effect.void;
            const toPlayersArray = Array.fromIterable(toPlayers);
            return sql`
                INSERT INTO friendship_events (from_player_id, to_player_id, event_type)
                SELECT p1.id, p2.id, 'unfriended'
                FROM players p1, players p2
                WHERE p1.player_id = ${fromPlayer} AND p2.player_id = ANY(${toPlayersArray}::text[])
            `.pipe(Effect.asVoid);
        };

        // All the friends of a player (one-way)
        const currentFriendsOf = SqlSchema.findAll({
            Result: PlayerIdSchema,
            Request: PlayerIdSchema,
            execute: (fromPlayer) =>
                sql`
                    SELECT to_player
                    FROM current_friendships
                    WHERE from_player = ${fromPlayer}
                `.pipe(Effect.map(Array.map(({ toPlayer }) => toPlayer))),
        });

        // All the mutual friends of a player
        const mutualFriendsOf = SqlSchema.findAll({
            Result: PlayerIdSchema,
            Request: PlayerIdSchema,
            execute: (playerId) =>
                sql`
                    SELECT CASE WHEN player_a = ${playerId} THEN player_b ELSE player_a END AS friend
                    FROM mutual_friendships
                    WHERE player_a = ${playerId} OR player_b = ${playerId}
                `.pipe(Effect.map(Array.map(({ friend }) => friend))),
        });

        // ALl the current friendships between all players
        const currentFriendships = SqlSchema.findAll({
            Result: Schema.Tuple(PlayerIdSchema, PlayerIdSchema),
            Request: Schema.Void,
            execute: () =>
                sql`
                    SELECT from_player, to_player
                    FROM current_friendships
                `.pipe(Effect.map(Array.map(({ fromPlayer, toPlayer }) => [fromPlayer, toPlayer]))),
        });

        // All the current mutual friendships between all players
        const mutualFriendships = SqlSchema.findAll({
            Result: Schema.Tuple(PlayerIdSchema, PlayerIdSchema),
            Request: Schema.Void,
            execute: () =>
                sql`
                    SELECT player_a, player_b
                    FROM mutual_friendships
                `.pipe(Effect.map(Array.map(({ playerA, playerB }) => [playerA, playerB]))),
        });

        // Sync a player's friends list (adds new friends, removes old ones)
        const syncFriends = Effect.fnUntraced(function* (
            fromPlayer: Schema.Schema.Type<PlayerIdSchema>,
            friends: ReadonlySet<Schema.Schema.Type<PlayerIdSchema>>
        ): Effect.fn.Return<
            {
                added: number;
                removed: number;
            },
            SqlError.SqlError | ParseResult.ParseError,
            never
        > {
            const newSet = pipe(
                friends,
                Array.fromIterable,
                Array.filter((friend) => friend !== fromPlayer),
                (friends) => new Set(friends)
            );
            const existingSet = yield* pipe(
                fromPlayer,
                currentFriendsOf,
                Effect.map((friends) => new Set(friends))
            );

            const toAdd = pipe(
                newSet,
                Array.fromIterable,
                Array.filter((f) => !existingSet.has(f)),
                (array) => new Set(array)
            );
            const toRemove = pipe(
                existingSet,
                Array.fromIterable,
                Array.filter((f) => !newSet.has(f)),
                (array) => new Set(array)
            );

            yield* addFriends(fromPlayer, toAdd);
            yield* removeFriends(fromPlayer, toRemove);
            return { added: toAdd.size, removed: toRemove.size };
        });

        return {
            players,
            refreshViews,
            addFriend,
            removeFriend,
            addFriends,
            removeFriends,
            currentFriendsOf,
            mutualFriendsOf,
            currentFriendships,
            mutualFriendships,
            syncFriends,
        };
    }),
}) {}
