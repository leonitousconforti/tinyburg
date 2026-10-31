/**
 * The treasury's scheduled side: refunding escrows that stalled, resuming
 * sagas that stopped on a failure, and reconciling the book against the
 * vault's actual gift queue.
 *
 * None of these crons does the real work itself. The expiry sweep hands
 * trades to the refund saga, the resume sweep hands stopped sagas back to
 * the workflow engine, and reconciliation only records what it observed.
 * The queue in the vault is the physical truth and the ledger is the account
 * of it - when they disagree, the reconciler is what notices.
 */

import type { Workflow, WorkflowEngine } from "effect/workflow";

import { Cron, Effect, Layer, Option } from "effect";
import { ClusterCron } from "effect/cluster";

import type { Trade } from "../domain/model.ts";

import { LedgerRepository, orphanDetail } from "../domain/ledger.ts";
import { LegsRepository, depositCandidates } from "../domain/legs.ts";
import { TradesRepository } from "../domain/trades.ts";
import { Vault } from "../services/vault.ts";
import { GiftEscrowWorkflow } from "../workflows/giftEscrow.ts";
import { RefundWorkflow } from "../workflows/refund.ts";
import { SpliceWorkflow } from "../workflows/splice.ts";

/** How many stalled escrows one expiry sweep hands to the refund saga. */
const EXPIRY_BATCH = 50;

/**
 * How many in-flight trades one resume sweep checks on. Generous, because
 * most of them are sagas legitimately asleep (a long verify window, a vault
 * outage) and the ones that stopped must not starve behind them.
 */
const RESUME_BATCH = 500;

/**
 * How long an escrow may sit in `escrowing` or `escrowed` before it reads as
 * stalled and is refunded. Well past the escrow saga's own verify window.
 */
const ESCROW_DEADLINE_MINUTES = 120;

/** How long an in-flight trade may sit unchanged before the resume sweep checks on its saga. */
const IDLE_MINUTES = 15;

/** How long a dispatched deposit may stay unseen before the reconciler reports it. */
const STALE_AFTER_MINUTES = 120;

/**
 * Escrows that stalled with something already deposited. The pg_cron sweep
 * expires the untouched trades; these need their items back, which is
 * application code. Joining a refund is safe whatever the escrow saga is
 * doing: claiming the trade stops its pending deposits, and the refund waits
 * for the ones already on their way.
 */
const expiry = ClusterCron.make({
    name: "treasury-expiry",
    cron: Cron.parseUnsafe("*/10 * * * *"),
    execute: Effect.gen(function* () {
        const trades = yield* TradesRepository;
        const ledger = yield* LedgerRepository;

        const due = yield* trades
            .dueForRefund({ limit: EXPIRY_BATCH, stalledMinutes: ESCROW_DEADLINE_MINUTES })
            .pipe(Effect.orDie);
        if (due.length === 0) return;

        yield* Effect.logInfo(`refunding ${due.length} stalled escrows`);
        for (const trade of due) {
            yield* Effect.ignore(ledger.append({ tradeId: trade.id, event: "escrow_timed_out" }));
            yield* RefundWorkflow.execute({ tradeId: trade.id }, { discard: true }).pipe(
                Effect.catchCause((cause) =>
                    Effect.logWarning(`could not start the refund for stalled trade ${trade.id}`, cause)
                )
            );
        }
    }),
});

/** What the resume sweep needs of a saga; all three are keyed by trade id. */
interface Saga {
    readonly _tag: string;
    readonly executionId: (payload: { readonly tradeId: string }) => Effect.Effect<string>;
    readonly poll: (
        executionId: string
    ) => Effect.Effect<Option.Option<Workflow.Result<unknown, unknown>>, never, WorkflowEngine.WorkflowEngine>;
    readonly resume: (executionId: string) => Effect.Effect<void, never, WorkflowEngine.WorkflowEngine>;
}

/** The saga that owns a trade in this state. */
const sagaFor = (trade: Trade): Saga =>
    trade.state === "refunding" ? RefundWorkflow : trade.mechanism === "splice" ? SpliceWorkflow : GiftEscrowWorkflow;

/**
 * Sagas that stopped on a failure. Every saga suspends rather than ends when
 * something fails (a database blip, a defect), because an ended saga would
 * leave its trade in flight forever with items in the vault. This sweep
 * finds trades in flight that have not moved for a while and resumes their
 * saga if it is suspended on a failure; the saga replays from its journal
 * and retries the step that failed. A saga that keeps failing is resumed
 * (and logged) every sweep, which is the alert.
 */
const resume = ClusterCron.make({
    name: "treasury-resume",
    cron: Cron.parseUnsafe("5,15,25,35,45,55 * * * *"),
    execute: Effect.gen(function* () {
        const trades = yield* TradesRepository;

        const idle = yield* trades.inFlight({ limit: RESUME_BATCH, idleMinutes: IDLE_MINUTES }).pipe(Effect.orDie);
        for (const trade of idle) {
            const saga = sagaFor(trade);
            const executionId = yield* saga.executionId({ tradeId: trade.id });
            const result = yield* saga.poll(executionId);
            // No answer yet: the saga is running, or was never started.
            if (Option.isNone(result)) continue;
            if (result.value._tag === "Complete") {
                yield* Effect.logWarning(
                    `trade ${trade.id} is still ${trade.state}, but its ${saga._tag} saga has finished`
                );
                continue;
            }
            // Suspended on a clock or a child saga: it wakes by itself.
            if (result.value.failed !== true) continue;
            yield* Effect.logWarning(
                `resuming the ${saga._tag} saga of trade ${trade.id} (${trade.state}), which stopped on a failure`,
                result.value.cause
            );
            yield* saga.resume(executionId);
        }
    }),
});

/**
 * The expiry sweep and the resume sweep, registered together.
 */
export const ExpiryLive = Layer.merge(expiry, resume);

/**
 * Compares the vault's queue to the book, in both directions: deposits that
 * were dispatched long ago and still have not arrived are reported, and
 * gifts no leg accounts for are recorded as orphans for ops to look at.
 * Neither is acted on here: the saga waiting on a deposit decides when it is
 * lost, after looking at the queue itself. A late arrival is still verified
 * here, which the waiting saga sees on its next look.
 */
export const ReconcilerLive = ClusterCron.make({
    name: "treasury-reconciler",
    cron: Cron.parseUnsafe("7,22,37,52 * * * *"),
    execute: Effect.gen(function* () {
        const legs = yield* LegsRepository;
        const ledger = yield* LedgerRepository;
        const vault = yield* Vault;

        const queue = yield* vault.listGifts.pipe(Effect.option);
        if (queue._tag === "None") {
            yield* Effect.logWarning("reconciler skipped: the vault could not be reached");
            return;
        }
        const claimed = new Set(yield* legs.claimedGiftIds.pipe(Effect.orDie));

        // Every dispatched-but-unseen deposit past the reporting threshold.
        const stale = yield* legs.staleSent(STALE_AFTER_MINUTES).pipe(Effect.orDie);
        for (const leg of stale) {
            let verified = false;
            for (const gift of depositCandidates(queue.value.gifts, leg, claimed)) {
                verified = yield* legs.verify({ legId: leg.id, vaultGiftId: gift.id }).pipe(Effect.orDie);
                if (verified) {
                    claimed.add(gift.id);
                    yield* Effect.ignore(
                        ledger.append({
                            tradeId: leg.tradeId,
                            legId: leg.id,
                            event: "deposit_verified",
                            detail: "late arrival, seen by the reconciler",
                        })
                    );
                    break;
                }
            }
            if (!verified) {
                yield* Effect.logWarning(
                    `deposit ${leg.id} of trade ${leg.tradeId} has not reached the vault after ${STALE_AFTER_MINUTES} minutes`
                );
            }
        }

        // Gifts nothing accounts for. Each deposit still on its way accounts
        // for one matching gift (its saga will claim it); everything else in
        // the queue should be claimed by a leg already.
        const awaiting = [...(yield* legs.staleSent(0).pipe(Effect.orDie))];
        for (const gift of queue.value.gifts) {
            if (claimed.has(gift.id)) continue;
            const expected = awaiting.findIndex((leg) => depositCandidates([gift], leg, claimed).length > 0);
            if (expected !== -1) {
                awaiting.splice(expected, 1);
                continue;
            }
            const seen = yield* ledger.hasOrphan(gift.id).pipe(Effect.orDie);
            if (!seen) {
                yield* Effect.ignore(ledger.append({ event: "orphan_gift", detail: orphanDetail(gift.id) }));
                yield* Effect.logWarning(`the vault holds a gift no trade accounts for: ${gift.id} from ${gift.from}`);
            }
        }
    }),
});
