import { FetchHttpClient, Path, PlatformConfigProvider } from "@effect/platform";
import { NodeContext } from "@effect/platform-node";
import { PgClient, PgMigrator } from "@effect/sql-pg";
import { Config, Effect, Layer, ManagedRuntime, String } from "effect";

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
}).pipe(Layer.unwrapEffect, Layer.provide(NodeContext.layer));

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
    Layer.provide(PlatformConfigProvider.layerDotEnvAdd("./.env")),
    Layer.provide(NodeContext.layer)
);

/**
 * @since 1.0.0
 * @category Runtime
 */
export const AppRuntime = ManagedRuntime.make(AppLive);
