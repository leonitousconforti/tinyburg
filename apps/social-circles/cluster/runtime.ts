/**
 * Cluster runtime for social-circles.
 *
 * `SingleRunner` is a deliberate choice, not a placeholder. The study's real
 * bottleneck is Nimblebit's rate limit, not compute, so sharding the crawl
 * across runners would hand us parallelism we cannot spend while making the
 * global token bucket a distributed problem. Running one node keeps the durable
 * programming model (entities, workflows, exactly-once scheduling) and drops
 * the operational cost to "we already have a Postgres".
 *
 * Message and runner storage both live in that same Postgres, so there is no
 * new infrastructure to stand up.
 */

import { Config, Layer, String } from "effect";
import { ClusterWorkflowEngine, SingleRunner } from "effect/unstable/cluster";

import { NodeCrypto } from "@effect/platform-node";
import { PgClient } from "@effect/sql-pg";

/**
 * The Postgres the study already uses. `transformQueryNames`/`transformResultNames`
 * keep snake_case in the database and camelCase in TypeScript.
 */
export const SqlLive = PgClient.layerConfig({
    url: Config.redacted("DATABASE_URL"),
    transformQueryNames: Config.succeed(String.camelToSnake),
    transformResultNames: Config.succeed(String.snakeToCamel),
});

/**
 * Sharding, runners, and SQL-backed message storage for a single process.
 *
 * Runner storage is SQL rather than memory so that in-flight entity mailboxes
 * survive a restart. A crawl that was mid-flight when the process died is
 * resumed rather than silently dropped.
 */
export const ClusterLive = SingleRunner.layer({ runnerStorage: "sql" }).pipe(Layer.provide(NodeCrypto.layer));

/**
 * Durable execution on top of the cluster. This is what makes the consent and
 * purge workflows replayable across deploys.
 *
 * `provideMerge` rather than `provide` so that `Sharding` stays visible
 * downstream: the crawl entity and the cron scheduler need it too, and this
 * keeps them on the same single cluster instance as the workflow engine.
 */
export const DurableLive = ClusterWorkflowEngine.layer.pipe(Layer.provideMerge(ClusterLive));
