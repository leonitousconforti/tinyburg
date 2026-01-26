import { Path } from "@effect/platform";
import { NodeContext } from "@effect/platform-node";
import { PgClient, PgMigrator } from "@effect/sql-pg";
import { Config, Effect, Layer, String } from "effect";

import { Repository } from "../domain/model.ts";

/**
 * @since 1.0.0
 * @category Layers
 */
export const SqlLive = PgClient.layerConfig({
    url: Config.redacted("DATABASE_URL"),
    transformQueryNames: Config.succeed(String.camelToSnake),
    transformResultNames: Config.succeed(String.snakeToCamel),
});

/**
 * @since 1.0.0
 * @category Layers
 */
export const MigratorLive = Effect.gen(function* () {
    const path = yield* Path.Path;
    const migrations = yield* path.fromFileUrl(new URL("../migrations", import.meta.url));
    const loader = PgMigrator.fromFileSystem(migrations);
    return PgMigrator.layer({ loader });
}).pipe(Layer.unwrapEffect, Layer.provide(NodeContext.layer));

/**
 * @since 1.0.0
 * @category Layers
 */
export const DatabaseLive = Repository.Default.pipe(Layer.provide(MigratorLive), Layer.provide(SqlLive));
