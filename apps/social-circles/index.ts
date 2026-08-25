/**
 * The social-circles study.
 *
 * One process runs everything: the dashboard's http server, the single-node
 * cluster, the durable consent and purge workflows, the per-player crawl
 * entities, and the crons that feed them. That is a deliberate choice rather
 * than a stepping stone; see `cluster/runtime.ts`.
 */

import { Config, ConfigProvider, Effect, Layer, Path, String } from "effect";
import { FetchHttpClient, HttpRouter } from "effect/unstable/http";

import { createServer } from "node:http";

import { NodeHttpServer, NodeRuntime, NodeServices } from "@effect/platform-node";
import { PgClient, PgMigrator } from "@effect/sql-pg";

import { CrawlerLive } from "./cluster/crawler.ts";
import { DurableLive } from "./cluster/runtime.ts";
import { CookiePolicy } from "./cookies.ts";
import { ConsentRepository } from "./domain/consent.ts";
import { CrawlStateRepository } from "./domain/crawl.ts";
import { GrantsRepository } from "./domain/grants.ts";
import { GraphRepository } from "./domain/graph.ts";
import { PurgeRepository } from "./domain/purge.ts";
import { SessionsRepository } from "./domain/sessions.ts";
import { OAuthRoutesLive } from "./routes/oauth.ts";
import { SelfServiceApiLive } from "./routes/selfservice.ts";
import { StaticRoutesLive } from "./routes/static.ts";
import { CrawlService } from "./services/crawl.ts";
import { NimblebitPacer } from "./services/ratelimit.ts";
import { TinyburgTowers } from "./services/towers.ts";
import { ConsentWorkflowLive } from "./workflows/consent.ts";
import { PurgeWorkflowLive } from "./workflows/purge.ts";

/** Static last, so its SPA fallback never shadows a route the study owns. */
const AllRoutes = Layer.mergeAll(SelfServiceApiLive, OAuthRoutesLive, StaticRoutesLive);

const DotEnvLive = Effect.map(ConfigProvider.fromDotEnv(), ConfigProvider.nested("SOCIALCIRCLES"));

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

const RepositoriesLive = Layer.mergeAll(
    ConsentRepository.Default,
    CrawlStateRepository.Default,
    GrantsRepository.Default,
    GraphRepository.Default,
    PurgeRepository.Default,
    SessionsRepository.Default
);

/**
 * Layer order reads bottom-up: each `provideMerge` supplies everything above it
 * and stays visible to the next one.
 */
const DependenciesLive = Layer.empty.pipe(
    Layer.provideMerge(CrawlService.Default),
    Layer.provideMerge(TinyburgTowers.Default),
    Layer.provideMerge(NimblebitPacer.Default),
    Layer.provideMerge(DurableLive),
    Layer.provideMerge(RepositoriesLive),
    Layer.provideMerge(CookiePolicy.Default),
    Layer.provideMerge(MigratorLive),
    Layer.provideMerge(SqlLive),
    Layer.provideMerge(FetchHttpClient.layer),
    Layer.provideMerge(NodeServices.layer)
);

/**
 * The workflows and the crawler are merged in rather than provided to anything:
 * they export no service, and building them is what registers the workflow
 * handlers, the entity, and the crons with the cluster.
 */
Layer.mergeAll(
    HttpRouter.serve(AllRoutes, { routerConfig: { maxParamLength: 500 } }),
    ConsentWorkflowLive,
    PurgeWorkflowLive,
    CrawlerLive
).pipe(
    Layer.provide(DependenciesLive),
    Layer.provide(
        NodeHttpServer.layerConfig(createServer, {
            port: Config.number("PORT").pipe(Config.withDefault(3002)),
            host: Config.string("HOST").pipe(Config.withDefault("0.0.0.0")),
        })
    ),
    // The environment as it comes, `.env` nested under the service name; see
    // `tinyburg.app`'s server entrypoint for why they differ.
    Layer.provideMerge(ConfigProvider.layerAdd(DotEnvLive)),
    Layer.provide(NodeServices.layer),
    Layer.launch,
    NodeRuntime.runMain
);
