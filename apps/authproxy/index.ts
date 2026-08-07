import { Config, Effect, Layer, String, Path } from "effect";
import { FetchHttpClient, HttpRouter } from "effect/unstable/http";
import { RateLimiter } from "effect/unstable/persistence";

import { createServer } from "node:http";

import { NodeHttpServer, NodeRuntime } from "@effect/platform-node";
import { PgClient, PgMigrator } from "@effect/sql-pg";

import { CookiePolicy } from "./cookies.ts";
import { Repository } from "./domain/model.ts";
import { SessionsRepository } from "./domain/sessions.ts";
import { AccountsApiLive } from "./routes/accounts.ts";
import { HealthCheckRoutesLive } from "./routes/health.ts";
import { OAuthRoutesLive } from "./routes/oauth.ts";
import { SelfServiceApiLive } from "./routes/selfservice.ts";
import { StaticRoutesLive } from "./routes/static.ts";
import { TinyTowerApiLive } from "./routes/tinytower.ts";
import { TelemetryLive } from "./telemetry.ts";

const AllRoutes = Layer.mergeAll(
    TinyTowerApiLive,
    AccountsApiLive,
    SelfServiceApiLive,
    OAuthRoutesLive,
    HealthCheckRoutesLive,
    StaticRoutesLive
);

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
    Layer.provide([
        RateLimiter.layerStoreMemory,
        Repository.Live,
        SessionsRepository.Default,
        CookiePolicy.Default,
        FetchHttpClient.layer,
    ]),
    Layer.provide(MigratorLive),
    Layer.provide(SqlLive),
    Layer.provide(
        NodeHttpServer.layerConfig(createServer, {
            port: Config.number("PORT").pipe(Config.withDefault(3000)),
            host: Config.string("HOST").pipe(Config.withDefault("0.0.0.0")),
        })
    ),
    // Outermost, so the tracer and logger it installs are the ones every layer
    // above is built and served with.
    Layer.provide(TelemetryLive),
    Layer.launch,
    NodeRuntime.runMain
);
