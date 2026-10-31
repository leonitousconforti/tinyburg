/**
 * Cluster runtime for the treasury.
 *
 * `SingleRunner` is a deliberate choice, not a placeholder. The treasury's
 * real bottleneck is Nimblebit's rate limit - every escrow leg queues behind
 * the one pacer - so sharding sagas across runners would hand us parallelism
 * we cannot spend while making the global token bucket a distributed
 * problem. One node keeps the durable programming model (workflows,
 * exactly-once scheduling) and drops the operational cost to "we already
 * have a Postgres".
 *
 * Message and runner storage both live in that same Postgres, so a saga that
 * was mid-flight when the process died resumes rather than stranding an item
 * in the vault.
 */

import { Layer } from "effect";
import { ClusterWorkflowEngine, SingleRunner } from "effect/unstable/cluster";

import { NodeCrypto } from "@effect/platform-node";

export const ClusterLive = SingleRunner.layer({ runnerStorage: "sql" }).pipe(Layer.provide(NodeCrypto.layer));

/**
 * Durable execution on top of the cluster: what makes the escrow, refund and
 * splice workflows replayable across deploys.
 */
export const DurableLive = ClusterWorkflowEngine.layer.pipe(Layer.provideMerge(ClusterLive));
