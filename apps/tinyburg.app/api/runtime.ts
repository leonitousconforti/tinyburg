import { Config, Effect, Layer, ManagedRuntime, String, Path, ConfigProvider } from "effect";
import { FetchHttpClient } from "effect/unstable/http";

import { NodeServices } from "@effect/platform-node";
import { PgClient, PgMigrator } from "@effect/sql-pg";

import { Repository } from "../domain/model.ts";

const SqlLive = PgClient.layerConfig({
    url: Config.redacted("DATABASE_URL"),
    transformQueryNames: Config.succeed(String.camelToSnake),
    transformResultNames: Config.succeed(String.snakeToCamel),
});

const MigratorLive = Effect.gen(function* () {
    const path = yield* Path.Path;
    const migrations = yield* path.fromFileUrl(new URL("../migrations", import.meta.url));
    const loader = PgMigrator.fromFileSystem(migrations);
    return PgMigrator.layer({ loader });
}).pipe(Layer.unwrap);

const DatabaseLive = Repository.Default.pipe(Layer.provide(MigratorLive), Layer.provide(SqlLive));

export const AppLive = Layer.mergeAll(DatabaseLive, FetchHttpClient.layer).pipe(
    Layer.provideMerge(ConfigProvider.layerAdd(ConfigProvider.fromDotEnv())),
    Layer.provide(NodeServices.layer)
);

export const AppRuntime = ManagedRuntime.make(AppLive);
