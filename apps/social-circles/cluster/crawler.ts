/**
 * The crawl, as a cluster entity plus a cron that feeds it.
 *
 * Modelling a player as an entity buys three things the old `for` loop over
 * every friend could not give:
 *
 * - **Serialisation per player.** An entity processes its mailbox one message
 *   at a time, so a slow crawl and the next scheduled round cannot overlap and
 *   race each other's diffs.
 * - **Isolation.** One unreachable tower fails one entity. The old job threw on
 *   the first bad player and abandoned everyone after them in the loop.
 * - **Durable mailboxes.** Messages are stored in Postgres, so a crawl that was
 *   queued when the process died still runs after it comes back.
 */

import { Cron, DateTime, Duration, Effect, Layer, Schema } from "effect";
import { ClusterCron, ClusterSchema, Entity } from "effect/unstable/cluster";
import { Rpc } from "effect/unstable/rpc";

import type { GamePlayerRef } from "../domain/graph.ts";

import { PlayerIdSchema } from "@tinyburg/nimblebit-sdk/NimblebitConfig";

import { CrawlStateRepository } from "../domain/crawl.ts";
import { GameId, gamePlayerKey } from "../domain/games.ts";
import { GraphRepository } from "../domain/graph.ts";
import { CrawlService } from "../services/crawl.ts";

/**
 * One entity per player, keyed by player id.
 *
 * `Persisted` is what makes a queued crawl survive a restart; without it the
 * mailbox is memory only and a deploy would silently drop scheduled work.
 */
export const CrawlEntity = Entity.make("SocialCirclesCrawl", [
    // The tower is both the entity id (which is what shards and serialises the
    // work) and part of the payload. Carrying it explicitly keeps the handler
    // off `Entity.CurrentAddress`, which would otherwise leak into the layer's
    // requirements.
    //
    // The id is `game:playerId` rather than the friend code alone. Two games can
    // hand out the same code to different people, and keying on the code alone
    // would serialise two unrelated towers behind one mailbox while letting each
    // one's crawl race the other's diff.
    Rpc.make("crawl", { payload: Schema.Struct({ game: GameId, playerId: PlayerIdSchema }) }).annotate(
        ClusterSchema.Persisted,
        true
    ),
]);

/**
 * @since 1.0.0
 * @category Layers
 */
export const CrawlEntityLive = CrawlEntity.toLayer(
    Effect.gen(function* () {
        const crawl = yield* CrawlService;

        return {
            crawl: Effect.fnUntraced(function* (request) {
                const { game, playerId } = request.payload;

                /**
                 * The scheduled variant swallows failure into recorded backoff.
                 * An entity handler that failed here would just retry the
                 * message, which is the wrong shape of retry: backoff belongs in
                 * the database where it survives the process.
                 */
                const outcome = yield* crawl.crawlPlayerScheduled({ game, playerId });
                yield* Effect.logDebug(`crawled ${game}:${playerId}: ${outcome._tag}`);
            }, Effect.orDie),
        };
    })
);

/** How many players one dispatch round will enqueue. */
const BATCH_SIZE = 200;

/**
 * Enqueues every player whose next attempt is due.
 *
 * This only sends messages; it does no network work itself, so a round finishes
 * immediately and the pacer decides how fast the queue actually drains.
 */
const dispatchDue = Effect.gen(function* () {
    const crawlState = yield* CrawlStateRepository;
    const makeClient = yield* CrawlEntity.client;

    const due = yield* crawlState.due(BATCH_SIZE).pipe(Effect.orDie);
    if (due.length === 0) return;

    yield* Effect.logInfo(`dispatching ${due.length} due crawls`);

    yield* Effect.forEach(
        due,
        (tower: GamePlayerRef) =>
            makeClient(gamePlayerKey(tower))
                .crawl(tower, { discard: true })
                .pipe(
                    Effect.catchCause((cause) =>
                        Effect.logWarning(`could not enqueue crawl for ${gamePlayerKey(tower)}`, cause)
                    )
                ),
        { discard: true }
    );

    // A round that filled the batch means there is more waiting, which is worth
    // knowing before it turns into a backlog nobody noticed.
    if (due.length === BATCH_SIZE) {
        yield* Effect.logWarning(`dispatch hit the ${BATCH_SIZE} batch cap, more players are still due`);
    }
});

/**
 * @since 1.0.0
 * @category Layers
 */
export const CrawlSchedulerLive = ClusterCron.make({
    name: "social-circles-dispatch",
    cron: Cron.parseUnsafe("*/5 * * * *"),
    execute: dispatchDue,
});

/**
 * Keeps the analytics views current.
 *
 * Separate from the crawl on purpose: the views feed exports and the public
 * graph, which tolerate lagging a few minutes, while the crawl's own diffing
 * reads the event log directly and never touches these.
 */
export const ViewRefreshLive = ClusterCron.make({
    name: "social-circles-refresh-views",
    cron: Cron.parseUnsafe("*/10 * * * *"),
    execute: Effect.gen(function* () {
        const graph = yield* GraphRepository;
        const started = yield* DateTime.now;
        yield* graph.refreshViews.pipe(Effect.orDie);
        const finished = yield* DateTime.now;
        yield* Effect.logInfo(
            `refreshed analytics views in ${Duration.toMillis(DateTime.distance(started, finished))}ms`
        );
    }),
});

/**
 * The whole scheduled side of the study.
 *
 * @since 1.0.0
 * @category Layers
 */
export const CrawlerLive = Layer.mergeAll(CrawlEntityLive, CrawlSchedulerLive, ViewRefreshLive);
