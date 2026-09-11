/**
 * The treasury's scheduled side: expiring deposited trades into refunds, and
 * reconciling the book against the vault's actual gift queue.
 *
 * Neither cron does the real work itself. Expiry hands trades to the refund
 * saga; reconciliation only records what it observed. The queue in the vault
 * is the physical truth and the ledger is the account of it - when they
 * disagree, the reconciler is what notices.
 */

import { Cron, Effect } from "effect";
import { ClusterCron } from "effect/unstable/cluster";

import { LedgerRepository } from "../domain/ledger.ts";
import { LegsRepository } from "../domain/legs.ts";
import { TradesRepository } from "../domain/trades.ts";
import { Vault } from "../services/vault.ts";
import { RefundWorkflow } from "../workflows/refund.ts";

/** How many expired trades one sweep hands to the refund saga. */
const EXPIRY_BATCH = 50;

/** How long a dispatched deposit may stay unseen before it reads as lost. */
const LOST_AFTER_MINUTES = 120;

/**
 * Trades past their expiry that something was already deposited into. The
 * pg_cron sweep expires the untouched ones; these need their items back,
 * which is application code.
 */
export const ExpiryLive = ClusterCron.make({
    name: "treasury-expiry",
    cron: Cron.parseUnsafe("*/10 * * * *"),
    execute: Effect.gen(function* () {
        const trades = yield* TradesRepository;
        const ledger = yield* LedgerRepository;

        const due = yield* trades.dueForRefund(EXPIRY_BATCH).pipe(Effect.orDie);
        if (due.length === 0) return;

        yield* Effect.logInfo(`expiring ${due.length} deposited trades into refunds`);
        for (const trade of due) {
            yield* Effect.ignore(ledger.append({ tradeId: trade.id, event: "expired" }));
            yield* RefundWorkflow.execute({ tradeId: trade.id }, { discard: true }).pipe(
                Effect.catchCause((cause) =>
                    Effect.logWarning(`could not start the refund for expired trade ${trade.id}`, cause)
                )
            );
        }
    }),
});

/**
 * Compares the vault's queue to the book, in both directions: deposits that
 * were dispatched but never arrived become `lost`, and gifts no leg accounts
 * for are recorded as orphans for ops to look at. A late arrival is still
 * verified here - its trade has likely refunded, but the claim puts the gift
 * under a leg where the ledger can explain it.
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

        // Every dispatched-but-unseen deposit, oldest first.
        const stale = yield* legs.staleSent(LOST_AFTER_MINUTES).pipe(Effect.orDie);
        for (const leg of stale) {
            const match = queue.value.gifts.find(
                (gift) => gift.from === leg.fromPlayerId && gift.type === leg.itemType && gift.contents === leg.itemStr
            );
            if (match !== undefined) {
                const verified = yield* legs.verify({ legId: leg.id, vaultGiftId: match.id }).pipe(Effect.orDie);
                if (verified) {
                    yield* Effect.ignore(
                        ledger.append({
                            tradeId: leg.tradeId,
                            legId: leg.id,
                            event: "deposit_verified",
                            detail: "late arrival, seen by the reconciler",
                        })
                    );
                }
            } else {
                yield* legs.transition({ legId: leg.id, from: ["sent"], to: "lost" }).pipe(Effect.orDie);
                yield* Effect.ignore(ledger.append({ tradeId: leg.tradeId, legId: leg.id, event: "lost" }));
            }
        }

        // Gifts nothing accounts for. `sent` legs are excluded because the
        // verifier or a later sweep will claim them; everything else in the
        // queue should be claimed by a leg already.
        const claimed = yield* legs.claimedGiftIds.pipe(Effect.orDie);
        const awaiting = yield* legs.staleSent(0).pipe(Effect.orDie);
        for (const gift of queue.value.gifts) {
            if (claimed.has(gift.id)) continue;
            const expected = awaiting.some(
                (leg) => gift.from === leg.fromPlayerId && gift.type === leg.itemType && gift.contents === leg.itemStr
            );
            if (expected) continue;
            const seen = yield* ledger.hasOrphan(gift.id).pipe(Effect.orDie);
            if (!seen) {
                yield* Effect.ignore(
                    ledger.append({ event: "orphan_gift", detail: JSON.stringify({ giftId: gift.id }) })
                );
                yield* Effect.logWarning(`the vault holds a gift no trade accounts for: ${gift.id} from ${gift.from}`);
            }
        }
    }),
});
