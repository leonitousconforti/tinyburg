/**
 * Reading one player's tower and folding it into the graph.
 *
 * Kept as a plain service rather than a workflow on purpose. A crawl is a
 * short, idempotent, retryable task: pull, diff, write. Journaling each of those
 * steps for durable replay would buy nothing and cost a write per step. What
 * genuinely needs durability is the *scheduling* around it, and that lives in
 * the entity and cron that call this.
 */

import { Config, Context, Effect, Layer, Option, Schema } from "effect";

import type { PlayerId } from "../domain/model.ts";
import type { TowerGrantUnusable } from "./towers.ts";

import { TinyTower } from "@tinyburg/tinytower-sdk";

import { sha256 } from "../crypto.ts";
import { CrawlStateRepository } from "../domain/crawl.ts";
import { GrantsRepository } from "../domain/grants.ts";
import { GraphRepository } from "../domain/graph.ts";
import { NimblebitPacer } from "./ratelimit.ts";
import { TinyburgTowers, TowerUnavailable } from "./towers.ts";

/**
 * What a single crawl attempt produced.
 *
 * @since 1.0.0
 * @category Models
 */
export const CrawlOutcome = Schema.Union([
    Schema.Struct({
        _tag: Schema.tag("Synced"),
        added: Schema.Finite,
        removed: Schema.Finite,
        totalFriends: Schema.Finite,
        consentedFriends: Schema.Finite,
    }),
    /** The tower had not changed since the last successful crawl. */
    Schema.Struct({ _tag: Schema.tag("Unchanged") }),
    /** Consent was withdrawn between scheduling and running. */
    Schema.Struct({ _tag: Schema.tag("Skipped"), reason: Schema.String }),
]);

export type CrawlOutcome = typeof CrawlOutcome.Type;

export class CrawlService extends Context.Service<CrawlService>()("@tinyburg/social-circles/services/CrawlService", {
    make: Effect.gen(function* () {
        const towers = yield* TinyburgTowers;
        const graph = yield* GraphRepository;
        const grants = yield* GrantsRepository;
        const crawlState = yield* CrawlStateRepository;
        const pacer = yield* NimblebitPacer;

        /** How long between routine crawls of the same player. */
        const intervalMinutes = yield* Config.int("CRAWL_INTERVAL_MINUTES").pipe(Config.withDefault(6 * 60));

        /**
         * Crawls one player.
         *
         * Failures are recorded and re-raised: the caller decides whether that
         * is fatal (the consent workflow's first crawl) or just another backoff
         * tick (the scheduled entity).
         */
        const crawlPlayer = Effect.fnUntraced(function* (playerId: PlayerId) {
            /**
             * Whoever consented is who we act as. If nobody does, the player is
             * either revoked or their grant died, and either way there is
             * nothing to do and nothing to back off from.
             */
            const maybeUser = yield* grants.findUserForPlayer(playerId).pipe(Effect.orDie);
            if (Option.isNone(maybeUser)) {
                return { _tag: "Skipped", reason: "no live consent or usable grant" } as const;
            }
            const tinyburgUserId = maybeUser.value;

            const save = yield* pacer.paced(towers.pullSave({ tinyburgUserId, playerId }));

            /**
             * Fingerprint the raw save. Nimblebit has no etag, and a fingerprint
             * is enough to skip the decode and the diff for a player whose tower
             * has not moved, which is most players most of the time.
             */
            const saveVersion = yield* sha256(save);
            const previous = yield* crawlState.lastSaveVersion(playerId).pipe(Effect.orDie);
            if (previous === saveVersion) {
                yield* crawlState.recordSuccess({ playerId, saveVersion, intervalMinutes }).pipe(Effect.orDie);
                return { _tag: "Unchanged" } as const;
            }

            const decoded = yield* Schema.decodeEffect(TinyTower.SaveData)(save).pipe(
                Effect.mapError((cause) => new TowerUnavailable({ playerId, reason: `save did not decode: ${cause}` }))
            );

            /**
             * An empty friends list encodes as `""`, not as an empty array.
             * Passing the raw list on is deliberate: `syncFriends` does the
             * consent filtering itself so it can count what it dropped.
             */
            const observed = decoded.friends === undefined || decoded.friends === "" ? [] : decoded.friends;

            const result = yield* graph
                .syncFriends(
                    playerId,
                    observed.map(({ friendId }) => friendId)
                )
                .pipe(Effect.orDie);

            yield* crawlState.recordSuccess({ playerId, saveVersion, intervalMinutes }).pipe(Effect.orDie);

            return { _tag: "Synced", ...result } as const;
        });

        /**
         * Crawls a player, converting failure into recorded backoff.
         *
         * This is the entry point for scheduled work, where one unreachable
         * tower must never take down the round.
         */
        const crawlPlayerScheduled = Effect.fnUntraced(function* (playerId: PlayerId) {
            const outcome = yield* Effect.result(crawlPlayer(playerId));
            if (outcome._tag === "Success") {
                return outcome.success;
            }

            const failure = outcome.failure;
            yield* crawlState.recordFailure({ playerId, error: describe(failure) }).pipe(Effect.orDie);

            /**
             * A dead grant is a decision the user made upstream, not an outage.
             * It is already marked invalid, so the player simply stops being
             * scheduled rather than being retried into the void.
             */
            if (failure._tag === "TowerGrantUnusable" && failure.permanent) {
                yield* Effect.logInfo(`grant for ${playerId} is permanently unusable, pausing crawl`);
            } else {
                yield* Effect.logWarning(`crawl of ${playerId} failed: ${describe(failure)}`);
            }

            return { _tag: "Skipped", reason: describe(failure) } as const;
        });

        return { crawlPlayer, crawlPlayerScheduled };
    }),
}) {
    static readonly Default = Layer.effect(CrawlService, CrawlService.make);
}

const describe = (failure: TowerGrantUnusable | TowerUnavailable): string =>
    failure._tag === "TowerGrantUnusable"
        ? `grant unusable: ${failure.reason}`
        : `tower unavailable: ${failure.reason}`;
