import { Config, ConfigProvider, Effect, Layer, Path, String } from "effect";
import { FetchHttpClient, HttpRouter } from "effect/http";
import { RateLimiter } from "effect/persistence";

// @effect-diagnostics-next-line nodeBuiltinImport:off
import { createServer } from "node:http";

import { NodeCrypto, NodeHttpServer, NodeRuntime } from "@effect/platform-node";
import { PgClient, PgMigrator } from "@effect/sql-pg";

import { CookiePolicy } from "./cookies.ts";
import { Repository } from "./domain/model.ts";
import { SessionsRepository } from "./domain/sessions.ts";
import { BitCityApiLive } from "./routes/bitCity.ts";
import { DiscoZooApiLive } from "./routes/discoZoo.ts";
import { HealthCheckRoutesLive } from "./routes/health.ts";
import { LegoTowerApiLive } from "./routes/legoTower.ts";
import { OAuthRoutesLive } from "./routes/oauth.ts";
import { PocketPlanesApiLive } from "./routes/pocketPlanes.ts";
import { PocketTrainsApiLive } from "./routes/pocketTrains.ts";
import { SelfServiceApiLive } from "./routes/selfservice.ts";
import { StaticRoutesLive } from "./routes/static.ts";
import { TinyTowerApiLive } from "./routes/tinytower.ts";
import { TinyTowerClassicApiLive } from "./routes/tinytowerClassic.ts";
import { TinyTowerVegasApiLive } from "./routes/tinytowerVegas.ts";

const AllRoutes = Layer.mergeAll(
    TinyTowerApiLive,
    TinyTowerClassicApiLive,
    PocketPlanesApiLive,
    PocketTrainsApiLive,
    LegoTowerApiLive,
    DiscoZooApiLive,
    BitCityApiLive,
    TinyTowerVegasApiLive,
    SelfServiceApiLive,
    OAuthRoutesLive,
    HealthCheckRoutesLive,
    StaticRoutesLive
);

const SqlLive = PgClient.layerConfig({
    url: Config.Redacted("DATABASE_URL"),
    transformQueryNames: Config.succeed(String.camelToSnake),
    transformResultNames: Config.succeed(String.snakeToCamel),
});

const MigratorLive = Effect.gen(function* () {
    const path = yield* Path.Path;
    const migrations = yield* path.fromFileUrl(new URL("migrations", import.meta.url));
    const loader = PgMigrator.fromFileSystem(migrations);
    return PgMigrator.layer({ loader });
}).pipe(Layer.unwrap);

const ConfigProviderLive = ConfigProvider.fromEnv().pipe(ConfigProvider.nested("AUTHPROXY"));

HttpRouter.serve(AllRoutes, { routerConfig: { maxParamLength: 500 } }).pipe(
    Layer.provide([
        RateLimiter.layerStoreMemory,
        Repository.Live,
        SessionsRepository.Default,
        CookiePolicy.Default,
        FetchHttpClient.layer,
        NodeCrypto.layerSecureRandom,
        // PKCE and ID token verification at tinyburg.app sign in.
        NodeCrypto.layerDigest,
        NodeCrypto.layerMac,
        NodeCrypto.layerSignature,
    ]),
    Layer.provide(MigratorLive),
    Layer.provide(SqlLive),
    Layer.provide(
        NodeHttpServer.layerConfig(createServer, {
            port: Config.Number("PORT").pipe(Config.withDefault(3000)),
            host: Config.String("HOST").pipe(Config.withDefault("0.0.0.0")),
        })
    ),
    Layer.provideMerge(ConfigProvider.layerAdd(ConfigProviderLive, { asPrimary: true })),
    Layer.provideMerge(NodeHttpServer.layerHttpServices),
    Layer.launch,
    NodeRuntime.runMain
);
