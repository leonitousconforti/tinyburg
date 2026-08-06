import { Config, Effect, Layer, Path, String } from "effect";
import { FetchHttpClient, HttpRouter } from "effect/unstable/http";

import { createServer } from "node:http";

import { NodeHttpServer, NodeRuntime } from "@effect/platform-node";
import { PgClient, PgMigrator } from "@effect/sql-pg";

import { LinksRepository } from "./domain/links.ts";
import { HealthCheckRoutesLive } from "./routes/health.ts";
import { InteractionRoutesLive } from "./routes/interactions.ts";
import { CallbackRoutesLive } from "./routes/oauth.ts";

const AllRoutes = Layer.mergeAll(InteractionRoutesLive, CallbackRoutesLive, HealthCheckRoutesLive);

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

HttpRouter.serve(AllRoutes).pipe(
    Layer.provide([LinksRepository.Default, FetchHttpClient.layer]),
    Layer.provide(MigratorLive),
    Layer.provide(SqlLive),
    Layer.provide(
        NodeHttpServer.layerConfig(createServer, {
            port: Config.number("PORT").pipe(Config.withDefault(3001)),
            host: Config.string("HOST").pipe(Config.withDefault("0.0.0.0")),
        })
    ),
    Layer.launch,
    NodeRuntime.runMain
);
