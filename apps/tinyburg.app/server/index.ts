import { Config, ConfigProvider, Effect, Layer, Path, String } from "effect";
import { FetchHttpClient, HttpRouter } from "effect/unstable/http";

import { createServer } from "node:http";

import { NodeHttpServer, NodeRuntime } from "@effect/platform-node";
import { PgClient, PgMigrator } from "@effect/sql-pg";

import { DevelopersRepository } from "../domain/developers.ts";
import { OidcRepository } from "../domain/oidc.ts";
import { SessionsRepository } from "../domain/sessions.ts";
import { TinyTowerAccountsRepository } from "../domain/tinytower.ts";
import { UsersRepository } from "../domain/users.ts";
import { OidcKeys } from "./keys.ts";
import { ApiLive } from "./routes/api.ts";
import { OAuthRoutesLive } from "./routes/oauth.ts";
import { OidcProviderLive } from "./routes/oidc.ts";
import { StaticRoutesLive } from "./routes/static.ts";

const AllRoutes = Layer.mergeAll(ApiLive, OAuthRoutesLive, OidcProviderLive, StaticRoutesLive);

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

const Repositories = Layer.mergeAll(
    DevelopersRepository.Default,
    UsersRepository.Default,
    OidcRepository.Default,
    SessionsRepository.Default,
    TinyTowerAccountsRepository.Default
);

HttpRouter.serve(AllRoutes).pipe(
    Layer.provide([Repositories, OidcKeys.Default, FetchHttpClient.layer]),
    Layer.provide(MigratorLive),
    Layer.provide(SqlLive),
    Layer.provide(
        NodeHttpServer.layerConfig(createServer, {
            port: Config.number("PORT").pipe(Config.withDefault(3000)),
            host: Config.string("HOST").pipe(Config.withDefault("0.0.0.0")),
        })
    ),
    Layer.provideMerge(ConfigProvider.layerAdd(ConfigProvider.fromDotEnv())),
    Layer.provideMerge(NodeHttpServer.layerHttpServices),
    Layer.launch,
    NodeRuntime.runMain
);
