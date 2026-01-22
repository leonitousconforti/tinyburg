import { FetchHttpClient, HttpClient, Path } from "@effect/platform";
import { NodeContext, NodeRuntime } from "@effect/platform-node";
import { PgClient, PgMigrator } from "@effect/sql-pg";
import { NimblebitAuth, NimblebitConfig } from "@tinyburg/nimblebit-sdk";
import { TinyTower } from "@tinyburg/tinytower-sdk";
import { Array, Config, Effect, Layer, pipe, Redacted, Schema, String } from "effect";

import { Repository } from "../domain/model.ts";

const program = Effect.gen(function* () {
    const repo = yield* Repository;
    const player = yield* NimblebitConfig.AuthenticatedPlayerConfig;
    yield* repo.refreshViews;

    // If you made it into the friendships list, then you have granted permission
    const allPlayers = yield* pipe(
        repo.currentFriendships(),
        Effect.map(Array.flatten),
        Effect.map((players) => new Set(players))
    );

    for (const friendId of allPlayers) {
        // Pull friend's tower data
        const friendSaveData = yield* Effect.flatMap(
            TinyTower.social_pullFriendTower({ ...player, friendId }),
            ({ data }) => Schema.decode(TinyTower.SaveData)(data)
        );

        // Get friend's friends whom have also granted permission
        const friends = pipe(
            friendSaveData.friends ?? [],
            Array.map(({ friendId }) => friendId),
            Array.filter((id) => allPlayers.has(id))
        );

        // Sync friend's friendships
        yield* repo.syncFriends(friendId, new Set(friends));
    }

    // Heartbeat to indicate job completion
    const heartbeatUrl = yield* Config.redacted("HEARTBEAT_URL");
    yield* HttpClient.get(Redacted.value(heartbeatUrl));
});

const SqlLive = PgClient.layerConfig({
    url: Config.redacted("DATABASE_URL"),
    transformQueryNames: Config.succeed(String.camelToSnake),
    transformResultNames: Config.succeed(String.snakeToCamel),
});

const MigratorLive = Effect.gen(function* () {
    const path = yield* Path.Path;
    const migrations = yield* path.fromFileUrl(new URL("migrations", import.meta.url));
    const loader = PgMigrator.fromFileSystem(migrations);
    return PgMigrator.layer({ loader });
}).pipe(Layer.unwrapEffect);

const Live = Layer.empty.pipe(
    Layer.provideMerge(NimblebitAuth.layerNodeDirectConfig()),
    Layer.provideMerge(FetchHttpClient.layer),
    Layer.provideMerge(Repository.Default),
    Layer.provideMerge(MigratorLive),
    Layer.provideMerge(SqlLive),
    Layer.provide(NodeContext.layer)
);

program.pipe(Effect.provide(Live), NodeRuntime.runMain);
