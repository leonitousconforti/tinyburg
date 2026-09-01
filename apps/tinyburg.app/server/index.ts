import { Config, ConfigProvider, Effect, Layer, Path, String } from "effect";
import { FetchHttpClient, HttpRouter, HttpServerResponse } from "effect/unstable/http";

import { createServer } from "node:http";

import { NodeHttpServer, NodeRuntime } from "@effect/platform-node";
import { PgClient, PgMigrator } from "@effect/sql-pg";

import { DevelopersRepository } from "../domain/developers.ts";
import { OidcRepository } from "../domain/oidc.ts";
import { SessionsRepository } from "../domain/sessions.ts";
import { TinyTowerAccountsRepository, TinyTowerClassicAccountsRepository } from "../domain/tinytower.ts";
import { UsersRepository } from "../domain/users.ts";
import { CookiePolicy } from "./cookies.ts";
import { OidcKeys } from "./keys.ts";
import { ApiLive } from "./routes/api.ts";
import { AuthRoutesLive } from "./routes/auth.ts";
import { OAuthRoutesLive } from "./routes/oauth.ts";
import { OidcProviderLive } from "./routes/oidc.ts";
import { DynamicRegistrationLive } from "./routes/registration.ts";
import { StandaloneStylesheetLive } from "./routes/standalone.ts";
import { StaticRoutesLive } from "./routes/static.ts";

/**
 * Baseline security headers on every response. Nothing this site serves is
 * meant to be embedded, least of all the OAuth consent screen, so framing is
 * denied outright; HSTS rides along whenever cookies demand https.
 */
const SecurityHeadersLive = HttpRouter.middleware(
    Effect.map(CookiePolicy, ({ secure }) => {
        const headers = {
            "x-content-type-options": "nosniff",
            "x-frame-options": "DENY",
            "content-security-policy": "frame-ancestors 'none'",
            ...(secure ? { "strict-transport-security": "max-age=31536000; includeSubDomains" } : {}),
        };

        return (httpEffect) => Effect.map(httpEffect, HttpServerResponse.setHeaders(headers));
    }),
    { global: true }
);

const DotEnvLive = Effect.map(ConfigProvider.fromDotEnv(), ConfigProvider.nested("TINYBURGAPP"));

const AllRoutes = Layer.mergeAll(
    ApiLive,
    AuthRoutesLive,
    OAuthRoutesLive,
    OidcProviderLive,
    DynamicRegistrationLive,
    StandaloneStylesheetLive,
    StaticRoutesLive,
    SecurityHeadersLive
);

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
    TinyTowerAccountsRepository.Default,
    TinyTowerClassicAccountsRepository.Default
);

HttpRouter.serve(AllRoutes).pipe(
    Layer.provide([Repositories, CookiePolicy.Default, OidcKeys.Default, FetchHttpClient.layer]),
    Layer.provide(MigratorLive),
    Layer.provide(SqlLive),
    Layer.provide(
        NodeHttpServer.layerConfig(createServer, {
            port: Config.number("PORT").pipe(Config.withDefault(3000)),
            host: Config.string("HOST").pipe(Config.withDefault("0.0.0.0")),
        })
    ),
    /*
      The environment is read as it comes, because a process has one of its own
      and nothing to collide with. `.env` is nested under the service name
      instead, because that one file holds the whole stack's settings and two
      services would otherwise fight over `DATABASE_URL`. Added rather than
      installed, so the environment still wins: the dev stack's wiring cannot
      be overridden by a stale `.env`.
    */
    Layer.provideMerge(ConfigProvider.layerAdd(DotEnvLive)),
    Layer.provideMerge(NodeHttpServer.layerHttpServices),
    Layer.launch,
    NodeRuntime.runMain
);
