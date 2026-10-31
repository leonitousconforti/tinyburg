/**
 * The steps both gift sagas share: working the vault without giving up on
 * it, and watching its queue for deposits.
 *
 * Both are loops of journaled activities with durable sleeps in between, so
 * a Nimblebit outage, a rate limit or a deploy in the middle of one resumes
 * where it was. A refund or a release that cannot reach the vault waits; it
 * never ends half done with the trade stuck in `refunding` or `releasing`.
 */

import { Duration, Effect, Option, Schema } from "effect";
import { Activity, DurableClock } from "effect/workflow";

import type { VaultUnavailable } from "../services/vault.ts";
import type { TradeState } from "@tinyburg/treasury-sdk/Sdk";

import { LedgerRepository } from "../domain/ledger.ts";
import { LegsRepository, depositCandidates } from "../domain/legs.ts";
import { TradesRepository } from "../domain/trades.ts";
import { Vault } from "../services/vault.ts";

/**
 * Runs one vault step until the vault answers: each try is its own activity,
 * and the waits between them (doubling from two minutes, capped at an hour)
 * are durable. Anything other than the vault being unreachable is a defect,
 * which suspends the saga for the resume sweep in `cluster/crons.ts`.
 *
 * The step must be safe to run again, because a crash can land anywhere in
 * it: it re-reads its leg and does nothing if the leg has already moved on.
 */
export const untilTheVaultAnswers = <R>(name: string, step: Effect.Effect<void, VaultUnavailable, R>) =>
    Effect.gen(function* () {
        for (let attempt = 1; ; attempt = attempt + 1) {
            const answered = yield* Activity.make({
                name: attempt === 1 ? name : `${name}-try-${attempt}`,
                success: Schema.Boolean,
                execute: step.pipe(
                    Effect.as(true),
                    Effect.catchTag("VaultUnavailable", (error) =>
                        Effect.as(
                            Effect.logWarning(`${name}: the vault did not answer, will retry: ${error.reason}`),
                            false
                        )
                    )
                ),
            });
            if (answered) return;
            yield* DurableClock.sleep({
                name: `${name}-wait-${attempt}`,
                duration: Duration.minutes(Math.min(2 ** attempt, 60)),
            });
        }
    });

/**
 * One look at the vault's queue for a trade's dispatched deposits. Each is
 * matched exactly (sender, type and contents verbatim: the bait-and-switch
 * check) against the gifts no other leg has claimed, trying every match in
 * turn, so the same item offered in two live trades verifies both. Answers
 * how many deposits are still on their way.
 */
const verifyArrivals = (tradeId: string) =>
    Effect.gen(function* () {
        const vault = yield* Vault;
        const legs = yield* LegsRepository;
        const ledger = yield* LedgerRepository;

        const queue = yield* vault.listGifts;
        const claimed = new Set(yield* Effect.orDie(legs.claimedGiftIds));
        for (const leg of yield* Effect.orDie(legs.forTrade(tradeId))) {
            if (leg.state !== "sent") continue;
            for (const gift of depositCandidates(queue.gifts, leg, claimed)) {
                const verified = yield* Effect.orDie(legs.verify({ legId: leg.id, vaultGiftId: gift.id }));
                if (verified) {
                    claimed.add(gift.id);
                    yield* Effect.ignore(ledger.append({ tradeId, legId: leg.id, event: "deposit_verified" }));
                    break;
                }
            }
        }
        const after = yield* Effect.orDie(legs.forTrade(tradeId));
        return after.filter((leg) => leg.state === "sent").length;
    });

/**
 * Watches the vault's queue until every dispatched deposit of the trade is
 * verified (`arrived`), the trade leaves `state` because another saga owns
 * it now (`moved`), or `looks` actual looks at the queue have come up short
 * (`missing`). A look that could not reach the vault does not count: a
 * deposit is never given up on without the queue having been seen.
 */
export const awaitDeposits = (options: {
    readonly name: string;
    readonly tradeId: string;
    readonly state: typeof TradeState.Type;
    readonly looks: number;
}) =>
    Effect.gen(function* () {
        const trades = yield* TradesRepository;
        let looked = 0;
        for (let attempt = 1; ; attempt = attempt + 1) {
            const pass = yield* Activity.make({
                name: `${options.name}-${attempt}`,
                success: Schema.Struct({ live: Schema.Boolean, looked: Schema.Boolean, waiting: Schema.Finite }),
                execute: Effect.gen(function* () {
                    const trade = yield* Effect.orDie(trades.byId(options.tradeId));
                    if (Option.isNone(trade) || trade.value.state !== options.state) {
                        return { live: false, looked: false, waiting: 0 };
                    }
                    const waiting = yield* verifyArrivals(options.tradeId);
                    return { live: true, looked: true, waiting };
                }).pipe(
                    Effect.catchTag("VaultUnavailable", () =>
                        Effect.succeed({ live: true, looked: false, waiting: -1 })
                    )
                ),
            });
            if (!pass.live) return "moved" as const;
            if (pass.waiting === 0) return "arrived" as const;
            if (pass.looked) looked = looked + 1;
            if (looked >= options.looks) return "missing" as const;
            yield* DurableClock.sleep({
                name: `${options.name}Backoff-${attempt}`,
                duration: Duration.minutes(Math.min(attempt * 2, 30)),
            });
        }
    });
