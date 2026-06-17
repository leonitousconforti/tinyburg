import { Config, Effect, Layer, ManagedRuntime, String, Path, ConfigProvider } from "effect";
import { FetchHttpClient } from "effect/unstable/http";

import { NodeServices } from "@effect/platform-node";
import { PgClient, PgMigrator } from "@effect/sql-pg";

import { Repository } from "../domain/model.ts";

/**
 * @since 1.0.0
 * @category Layers
 */
const SqlLive = PgClient.layerConfig({
    url: Config.redacted("DATABASE_URL"),
    transformQueryNames: Config.succeed(String.camelToSnake),
    transformResultNames: Config.succeed(String.snakeToCamel),
});

/**
 * @since 1.0.0
 * @category Layers
 */
const MigratorLive = Effect.gen(function* () {
    const path = yield* Path.Path;
    const migrations = yield* path.fromFileUrl(new URL("../migrations", import.meta.url));
    const loader = PgMigrator.fromFileSystem(migrations);
    return PgMigrator.layer({ loader });
}).pipe(Layer.unwrap);

/**
 * @since 1.0.0
 * @category Layers
 */
const DatabaseLive = Repository.Default.pipe(Layer.provide(MigratorLive), Layer.provide(SqlLive));

/**
 * @since 1.0.0
 * @category Layers
 */
export const AppLive = Layer.mergeAll(DatabaseLive, FetchHttpClient.layer).pipe(
    Layer.provide(ConfigProvider.layerAdd(ConfigProvider.fromDotEnv())),
    Layer.provide(NodeServices.layer)
);

/**
 * @since 1.0.0
 * @category Runtime
 */
export const AppRuntime = ManagedRuntime.make(AppLive);
