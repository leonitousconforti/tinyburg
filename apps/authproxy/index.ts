import { Config, Effect, Layer, String, Path } from "effect";
import { FetchHttpClient, HttpRouter } from "effect/unstable/http";
import { RateLimiter } from "effect/unstable/persistence";

import { createServer } from "node:http";

import { NodeHttpServer, NodeRuntime } from "@effect/platform-node";
import { PgClient, PgMigrator } from "@effect/sql-pg";

import { Repository } from "./domain/model.ts";
import { AccountsApiLive } from "./routes/accounts.ts";
import { HealthCheckRoutesLive } from "./routes/health.ts";
import { TinyTowerApiLive } from "./routes/tinytower.ts";

const AllRoutes = Layer.mergeAll(TinyTowerApiLive, AccountsApiLive, HealthCheckRoutesLive);

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
}).pipe(Layer.unwrap);

HttpRouter.serve(AllRoutes, { routerConfig: { maxParamLength: 500 } }).pipe(
    Layer.provide([RateLimiter.layerStoreMemory, Repository.Live, FetchHttpClient.layer]),
    Layer.provide(MigratorLive),
    Layer.provide(SqlLive),
    Layer.provide(
        NodeHttpServer.layerConfig(createServer, {
            port: Config.number("PORT").pipe(Config.withDefault(3000)),
            host: Config.string("HOST").pipe(Config.withDefault("0.0.0.0")),
        })
    ),
    Layer.launch,
    NodeRuntime.runMain
);
