import { Path } from "@effect/platform";
import { NodePath } from "@effect/platform-node";
import { PgClient, PgMigrator } from "@effect/sql-pg";
import { Config, Effect, Layer, String } from "effect";

import { Repository } from "../domain/model.ts";

/**
 * PostgreSQL client configuration layer. Reads DATABASE_URL from environment
 * and configures name transformations.
 *
 * @since 1.0.0
 * @category Layers
 */
export const SqlLive = PgClient.layerConfig({
    url: Config.redacted("DATABASE_URL"),
    transformQueryNames: Config.succeed(String.camelToSnake),
    transformResultNames: Config.succeed(String.snakeToCamel),
});

/**
 * Migration layer that runs database migrations from the migrations directory.
 *
 * @since 1.0.0
 * @category Layers
 */
export const MigratorLive = Effect.gen(function* () {
    const path = yield* Path.Path;
    const migrations = yield* path.fromFileUrl(new URL("../migrations", import.meta.url));
    const loader = PgMigrator.fromFileSystem(migrations);
    return PgMigrator.layer({ loader });
}).pipe(Layer.unwrapEffect, Layer.provide(NodePath.layer));

/**
 * Complete database layer including SQL client, migrations, and repository.
 *
 * @since 1.0.0
 * @category Layers
 */
export const DatabaseLive = Repository.Default.pipe(Layer.provide(MigratorLive), Layer.provide(SqlLive));
