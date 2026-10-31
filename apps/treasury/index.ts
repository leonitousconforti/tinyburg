/**
 * The treasury: the escrow behind every trade.
 *
 * One process runs everything: the bearer-authenticated api tinyburg.app
 * proxies to, the connect flow that stores traders' grants, the single-node
 * cluster, and the durable escrow, refund and splice workflows with the
 * crons that feed them. Single node is a deliberate choice rather than a
 * stepping stone; see `cluster/runtime.ts`.
 *
 * Boot registers the treasury at tinyburg.app (`services/provider.ts`), so
 * the provider has to be reachable; it is retried for about a minute.
 */

import { Config, ConfigProvider, Effect, Layer, Path, String } from "effect";
import { FetchHttpClient, HttpRouter } from "effect/http";

import { createServer } from "node:http";

import { NodeCrypto, NodeHttpServer, NodeRuntime, NodeServices } from "@effect/platform-node";
import { PgClient, PgMigrator } from "@effect/sql-pg";

import { ExpiryLive, ReconcilerLive } from "./cluster/crons.ts";
import { DurableLive } from "./cluster/runtime.ts";
import { CookiePolicy } from "./cookies.ts";
import { GrantsRepository } from "./domain/grants.ts";
import { LedgerRepository } from "./domain/ledger.ts";
import { LegsRepository } from "./domain/legs.ts";
import { SpliceRepository } from "./domain/splice.ts";
import { TradesRepository } from "./domain/trades.ts";
import { ApiLive } from "./routes/api.ts";
import { HealthRoutesLive } from "./routes/health.ts";
import { OAuthRoutesLive } from "./routes/oauth.ts";
import { TinyburgProvider } from "./services/provider.ts";
import { NimblebitPacer } from "./services/ratelimit.ts";
import { TinyburgApi } from "./services/tinyburg.ts";
import { Vault, VaultAuthLive } from "./services/vault.ts";
import { GiftEscrowWorkflowLive } from "./workflows/giftEscrow.ts";
import { RefundWorkflowLive } from "./workflows/refund.ts";
import { SpliceWorkflowLive } from "./workflows/splice.ts";

const AllRoutes = Layer.mergeAll(ApiLive, OAuthRoutesLive, HealthRoutesLive);

const DotEnvLive = Effect.map(ConfigProvider.fromDotEnv(), ConfigProvider.nested("TREASURY"));

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

const RepositoriesLive = Layer.mergeAll(
    GrantsRepository.Default,
    LegsRepository.Default,
    LedgerRepository.Default,
    SpliceRepository.Default,
    TradesRepository.Default
);

/**
 * Layer order reads bottom-up: each `provideMerge` supplies everything above
 * it and stays visible to the next one.
 */
const DependenciesLive = Layer.empty.pipe(
    Layer.provideMerge(Vault.Default),
    Layer.provideMerge(TinyburgApi.Default),
    Layer.provideMerge(TinyburgProvider.Default),
    Layer.provideMerge(NimblebitPacer.Default),
    Layer.provideMerge(VaultAuthLive),
    Layer.provideMerge(DurableLive),
    Layer.provideMerge(RepositoriesLive),
    Layer.provideMerge(CookiePolicy.Default),
    Layer.provideMerge(MigratorLive),
    Layer.provideMerge(SqlLive),
    Layer.provideMerge(FetchHttpClient.layer),
    // Randomness for OAuth state and Nimblebit salts, digests for PKCE and
    // the cluster, and what JOSE verification asks for (signatures, and MACs
    // for the algorithms the treasury never accepts) for the provider's tokens.
    Layer.provideMerge(
        Layer.mergeAll(
            NodeCrypto.layerSecureRandom,
            NodeCrypto.layerDigest,
            NodeCrypto.layerMac,
            NodeCrypto.layerSignature
        )
    ),
    Layer.provideMerge(NodeServices.layer)
);

/**
 * The workflows and the crons are merged in rather than provided to
 * anything: they export no service, and building them is what registers the
 * workflow handlers and the schedules with the cluster.
 */
Layer.mergeAll(
    HttpRouter.serve(AllRoutes, { routerConfig: { maxParamLength: 500 } }),
    GiftEscrowWorkflowLive,
    RefundWorkflowLive,
    SpliceWorkflowLive,
    ExpiryLive,
    ReconcilerLive
).pipe(
    Layer.provide(DependenciesLive),
    Layer.provide(
        NodeHttpServer.layerConfig(createServer, {
            port: Config.Number("PORT").pipe(Config.withDefault(3004)),
            host: Config.String("HOST").pipe(Config.withDefault("0.0.0.0")),
        })
    ),
    // The environment as it comes, `.env` nested under the service name; see
    // `tinyburg.app`'s server entrypoint for why they differ.
    Layer.provideMerge(ConfigProvider.layerAdd(DotEnvLive)),
    Layer.provide(NodeServices.layer),
    Layer.launch,
    NodeRuntime.runMain
);
