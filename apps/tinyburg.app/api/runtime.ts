import { Config, Effect, Layer, ManagedRuntime, String, Path, ConfigProvider } from "effect";
import { FetchHttpClient } from "effect/unstable/http";

import { NodeServices } from "@effect/platform-node";
import { PgClient, PgMigrator } from "@effect/sql-pg";

import { AuthRepository } from "../domain/auth.ts";
import { DevelopersRepository } from "../domain/developers.ts";
import { OIDCRepository } from "../domain/oidc.ts";
import { SessionsRepository } from "../domain/sessions.ts";

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
    SessionsRepository.Default,
    DevelopersRepository.Default,
    AuthRepository.Default,
    OIDCRepository.Default
);

const DatabaseLive = Repositories.pipe(Layer.provide(MigratorLive), Layer.provide(SqlLive));

export const AppLive = Layer.mergeAll(DatabaseLive, FetchHttpClient.layer).pipe(
    Layer.provideMerge(ConfigProvider.layerAdd(ConfigProvider.fromDotEnv())),
    Layer.provideMerge(NodeServices.layer)
);

export const AppRuntime = ManagedRuntime.make(AppLive);
