import { Config, Effect, Layer, Path, String } from "effect";
import { FetchHttpClient, HttpRouter } from "effect/unstable/http";

import { createServer } from "node:http";

import { NodeHttpServer, NodeRuntime, NodeServices, NodeSocket } from "@effect/platform-node";
import { PgClient, PgMigrator } from "@effect/sql-pg";
import { DiscordConfig } from "dfx";
import { DiscordIxLive } from "dfx/gateway";

import { LinksRepository } from "./domain/links.ts";
import { InteractionsLive } from "./interactions.ts";
import { HealthCheckRoutesLive } from "./routes/health.ts";
import { CallbackRoutesLive } from "./routes/oauth.ts";

/**
 * The bot runs two things at once.
 *
 * Slash commands arrive over the Discord gateway, which dfx holds open and
 * which also syncs the command list, so there is no separate registration
 * step. The OAuth callback is a browser redirect, so it still needs a real
 * HTTP server; `/link` is the seam between them.
 */

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

const DiscordLive = DiscordIxLive.pipe(
    Layer.provide(NodeSocket.layerWebSocketConstructor),
    Layer.provide(
        DiscordConfig.layerConfig({
            token: Config.redacted("DISCORD_BOT_TOKEN"),
        })
    )
);

const HttpLive = HttpRouter.serve(Layer.mergeAll(CallbackRoutesLive, HealthCheckRoutesLive)).pipe(
    Layer.provide(
        NodeHttpServer.layerConfig(createServer, {
            // 3000/3001/3002 belong to tinyburg.app, authproxy, and
            // social-circles in the dev stack (`nix/dev.nix`).
            port: Config.number("PORT").pipe(Config.withDefault(3003)),
            host: Config.string("HOST").pipe(Config.withDefault("0.0.0.0")),
        })
    )
);

Layer.mergeAll(InteractionsLive, HttpLive).pipe(
    Layer.provide(DiscordLive),
    Layer.provide([LinksRepository.Default, FetchHttpClient.layer]),
    Layer.provide(MigratorLive),
    Layer.provide(SqlLive),
    // The migrator reads its files off disk, so it needs the node services
    // the http server used to bring along implicitly.
    Layer.provide(NodeServices.layer),
    Layer.launch,
    NodeRuntime.runMain
);
