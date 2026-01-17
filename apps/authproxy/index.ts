import { RateLimiter } from "@effect/experimental";
import { FetchHttpClient, HttpLayerRouter, Path } from "@effect/platform";
import { NodeHttpServer, NodeRuntime } from "@effect/platform-node";
import { PgClient, PgMigrator } from "@effect/sql-pg";
import { NimblebitAuth } from "@tinyburg/nimblebit-sdk";
import { Config, Effect, Layer, String } from "effect";
import { createServer } from "node:http";

import { Repository } from "./domain/model.ts";
import { HttpApiErrorMiddleware } from "./middleware/00_httpApiError.ts";
import { AuthProxyApiAccountMiddleware } from "./middleware/10_account.ts";
import { AuthProxyApiRatelimitMiddleware } from "./middleware/20_ratelimit.ts";
import { AuthProxyApiAuthorizationMiddleware } from "./middleware/30_authorization.ts";
import { AuthProxyApiDecodeHashMiddleware } from "./middleware/40_tinytowerDecode.ts";
import { AllAccountsRoutes } from "./routes/accounts.ts";
import { HealthCheckRoute } from "./routes/health.ts";
import { AllTinyTowerRoutes } from "./routes/tinytower.ts";

const AuthProxyApiMiddleware =
    // Runs fourth to decode the hash before the handler
    AuthProxyApiDecodeHashMiddleware
        // Runs third to authorize after rate limiting
        .combine(AuthProxyApiAuthorizationMiddleware)
        // Runs second to rate limit before authorization
        .combine(AuthProxyApiRatelimitMiddleware)
        // Runs first to get the account from the bearer token (if present)
        .combine(AuthProxyApiAccountMiddleware)
        // Runs zeroth to handle HttpApi errors
        .combine(HttpApiErrorMiddleware);

const AuthProxyApiRoutes = AllTinyTowerRoutes.pipe(
    Layer.provide(AuthProxyApiMiddleware.layer),
    Layer.provide(RateLimiter.layer),
    Layer.provide(RateLimiter.layerStoreMemory)
);

const AllRoutes = Layer.provide(Layer.mergeAll(AuthProxyApiRoutes, HealthCheckRoute, AllAccountsRoutes), [
    NimblebitAuth.layerNodeDirectConfig(),
    FetchHttpClient.layer,
]);

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

HttpLayerRouter.serve(AllRoutes).pipe(
    Layer.provide(Repository.Default),
    Layer.provide(MigratorLive),
    Layer.provide(SqlLive),
    Layer.provide(
        NodeHttpServer.layerConfig(createServer, {
            port: Config.number("PORT").pipe(Config.withDefault(3000)),
        })
    ),
    Layer.launch,
    NodeRuntime.runMain
);
