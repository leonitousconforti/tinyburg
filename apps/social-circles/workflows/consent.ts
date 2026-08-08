/**
 * Enrolling a player in the study.
 *
 * The durable part is not the speed, it is the ordering. Consent must never be
 * recorded for a player the requester cannot prove they own, and a player must
 * never end up half-enrolled: consented but invisible to the scheduler, or
 * enrolled with no consent row backing the edges the crawler is about to write.
 * Running this as a workflow means a crash between those steps resumes rather
 * than leaving one of them stranded.
 */

import { Effect, Schema } from "effect";
import { Activity, DurableClock, Workflow } from "effect/unstable/workflow";

import { PlayerIdSchema } from "@tinyburg/nimblebit-sdk/NimblebitConfig";

import { ConsentRepository } from "../domain/consent.ts";
import { CrawlStateRepository } from "../domain/crawl.ts";
import { CrawlService } from "../services/crawl.ts";
import { TinyburgTowers } from "../services/towers.ts";

/**
 * The requester could not be shown to own the player they tried to enroll.
 *
 * @since 1.0.0
 * @category Errors
 */
export class ConsentRejected extends Schema.Error<ConsentRejected>("@tinyburg/social-circles/ConsentRejected")({
    _tag: Schema.tag("ConsentRejected"),
    playerId: PlayerIdSchema,
    reason: Schema.String,
}) {}

/** How many times the first crawl is attempted before leaving it to the scheduler. */
const FIRST_CRAWL_ATTEMPTS = 3;

/**
 * @since 1.0.0
 * @category Workflows
 */
export const ConsentWorkflow = Workflow.make("SocialCirclesConsent", {
    payload: {
        tinyburgUserId: Schema.String.check(Schema.isUUID()),
        playerId: PlayerIdSchema,
    },
    success: Schema.Struct({
        /** Whether the first crawl landed, or the scheduler will pick it up later. */
        crawled: Schema.Boolean,
    }),
    error: ConsentRejected,
    /**
     * One enrollment per player. A double-submitted consent form joins the
     * existing execution instead of racing a second one.
     */
    idempotencyKey: ({ playerId }) => playerId,
});

/**
 * @since 1.0.0
 * @category Layers
 */
export const ConsentWorkflowLive = ConsentWorkflow.toLayer(
    Effect.fnUntraced(function* (payload) {
        const consents = yield* ConsentRepository;
        const crawlState = yield* CrawlStateRepository;
        const crawl = yield* CrawlService;
        const towers = yield* TinyburgTowers;

        /**
         * The ownership gate, and the entire reason "sign in with tinyburg"
         * exists.
         *
         * tinyburg.app only lists a TinyTower account for a user once that user
         * has proven control of the account's email through Nimblebit. So this
         * check is the difference between "somebody typed a friend code into a
         * form" and "the owner of this tower asked to be included".
         */
        const linked = yield* Activity.make({
            name: "verifyOwnership",
            success: Schema.Array(PlayerIdSchema),
            error: ConsentRejected,
            execute: towers.linkedPlayers(payload.tinyburgUserId).pipe(
                Effect.mapError(
                    (cause) =>
                        new ConsentRejected({
                            playerId: payload.playerId,
                            reason: `could not confirm linked accounts: ${cause.reason}`,
                        })
                )
            ),
        });

        if (!linked.includes(payload.playerId)) {
            return yield* new ConsentRejected({
                playerId: payload.playerId,
                reason: "this player is not linked to the requesting Tinyburg account",
            });
        }

        /**
         * Recorded with compensation: if anything after this fails terminally,
         * consent is withdrawn again rather than left standing for a player the
         * study never actually enrolled.
         */
        yield* Activity.make({
            name: "recordConsent",
            execute: Effect.orDie(
                consents.grant({ tinyburgUserId: payload.tinyburgUserId, playerId: payload.playerId })
            ),
        }).pipe(
            ConsentWorkflow.withCompensation(() =>
                Effect.ignore(consents.revoke({ tinyburgUserId: payload.tinyburgUserId, playerId: payload.playerId }))
            )
        );

        yield* Activity.make({
            name: "enrollCrawl",
            execute: Effect.orDie(crawlState.enroll(payload.playerId)),
        });

        /**
         * A best-effort first pull so a new participant sees their circle
         * appear rather than waiting for the next scheduled round.
         *
         * Deliberately not fatal. Nimblebit being unreachable is not a reason to
         * undo somebody's consent, and the player is already in the rotation, so
         * the scheduler will get them. The sleeps are durable, so this waits
         * across a deploy instead of restarting the attempt count.
         */
        let crawled = false;
        for (let attempt = 1; attempt <= FIRST_CRAWL_ATTEMPTS; attempt = attempt + 1) {
            const outcome = yield* Activity.make({
                name: `firstCrawl-${attempt}`,
                success: Schema.Boolean,
                execute: crawl.crawlPlayer(payload.playerId).pipe(
                    Effect.map((result) => result._tag !== "Skipped"),
                    Effect.catchCause((cause) =>
                        Effect.as(Effect.logWarning("first crawl attempt failed", cause), false)
                    )
                ),
            });

            if (outcome) {
                crawled = true;
                break;
            }

            if (attempt < FIRST_CRAWL_ATTEMPTS) {
                yield* DurableClock.sleep({
                    name: `firstCrawlBackoff-${attempt}`,
                    duration: `${attempt * 5} minutes`,
                });
            }
        }

        return { crawled };
    })
);
