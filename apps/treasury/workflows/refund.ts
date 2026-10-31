/**
 * Undoing a gift trade after something was deposited.
 *
 * Every deposit sitting in the vault goes back where it came from, and only
 * then is its escrow slot claimed - the same send-before-receive ordering as
 * a release, so a crash between the two leaves the item recoverable in the
 * vault rather than gone.
 *
 * A refund can start while the escrow saga is still depositing or verifying
 * (a cancel, or the expiry sweep). Claiming the trade for refunding stops
 * any pending deposit from leaving (`LegsRepository.reserveDeposit`), and a
 * deposit already on its way gets the same chance to land that the escrow
 * would have given it: only once the vault's queue has been seen without it
 * for a while is it marked `lost`.
 */

import { Effect, Option, Schema } from "effect";
import { Activity, Workflow } from "effect/workflow";

import { LedgerRepository } from "../domain/ledger.ts";
import { LegsRepository } from "../domain/legs.ts";
import { TradesRepository } from "../domain/trades.ts";
import { Vault } from "../services/vault.ts";
import { awaitDeposits, untilTheVaultAnswers } from "./vaultSteps.ts";

/** How many looks at the vault's queue an in-flight deposit gets before it reads as lost. */
const ARRIVAL_LOOKS = 4;

/**
 * @since 1.0.0
 * @category Workflows
 */
export const RefundWorkflow = Workflow.make("TreasuryRefund", {
    payload: {
        tradeId: Schema.String.check(Schema.isUUID()),
    },
    success: Schema.Struct({
        refunded: Schema.Finite,
        lost: Schema.Finite,
    }),
    /**
     * One refund per trade, however many roads lead here: an explicit
     * cancel, a verify timeout and the expiry sweep all join the same
     * execution.
     */
    idempotencyKey: ({ tradeId }) => tradeId,
})
    /**
     * A failure suspends the refund instead of ending it, so the resume
     * sweep can pick it up where it stopped: a refund that ended in failure
     * would leave the trade in `refunding` and its items in the vault.
     */
    .annotate(Workflow.SuspendOnFailure, true);

/**
 * @since 1.0.0
 * @category Layers
 */
export const RefundWorkflowLive = RefundWorkflow.toLayer(
    Effect.fnUntraced(function* (payload) {
        const trades = yield* TradesRepository;
        const legs = yield* LegsRepository;
        const ledger = yield* LedgerRepository;
        const vault = yield* Vault;

        const freshLeg = (legId: string) =>
            Effect.map(Effect.orDie(legs.forTrade(payload.tradeId)), (current) =>
                current.find((leg) => leg.id === legId)
            );

        /**
         * Claiming the trade for refunding is itself the guard: if a
         * settlement or another terminal state got there first, there is
         * nothing to undo and the answer is zero.
         */
        const claimed = yield* Activity.make({
            name: "claimForRefund",
            success: Schema.Boolean,
            execute: Effect.orDie(
                Effect.map(
                    Effect.all([
                        trades.transition({
                            tradeId: payload.tradeId,
                            from: ["accepted", "awaiting_confirmation", "escrowing", "escrowed"],
                            to: "refunding",
                        }),
                        trades.byId(payload.tradeId),
                    ]),
                    ([transitioned, trade]) =>
                        transitioned ||
                        Option.match(trade, { onNone: () => false, onSome: (t) => t.state === "refunding" })
                )
            ),
        });

        if (!claimed) {
            return { refunded: 0, lost: 0 };
        }

        // Deposits still on their way get their chance to land. Whatever
        // arrives is verified here, and sent back below like the rest.
        yield* awaitDeposits({
            name: "refundArrivals",
            tradeId: payload.tradeId,
            state: "refunding",
            looks: ARRIVAL_LOOKS,
        });

        /**
         * Dispatched but never seen in the vault, after the queue was looked
         * at repeatedly. The transition is guarded, and only a leg that
         * actually moved to `lost` is recorded as lost: a verifier that won
         * the race leaves a verified leg, which is refunded below.
         */
        yield* Activity.make({
            name: "markLost",
            execute: Effect.gen(function* () {
                for (const leg of yield* Effect.orDie(legs.forTrade(payload.tradeId))) {
                    if (leg.state !== "sent") continue;
                    const marked = yield* Effect.orDie(legs.transition({ legId: leg.id, from: ["sent"], to: "lost" }));
                    if (marked) {
                        yield* Effect.ignore(ledger.append({ tradeId: payload.tradeId, legId: leg.id, event: "lost" }));
                    }
                }
            }),
        });

        /**
         * Every leg is read fresh by its steps, so a leg verified at any
         * point before this (by the escrow saga, the arrival watch or the
         * reconciler) goes back too. No leg of this trade can still become
         * verified: none is `sent` any more, and none can be reserved while
         * the trade is `refunding`.
         */
        for (const leg of yield* Effect.orDie(legs.forTrade(payload.tradeId))) {
            // Send back first, claim the slot second: the mirror of a
            // release, and journaled separately so a crash between the two
            // resumes at the claim rather than double-sending.
            yield* untilTheVaultAnswers(
                `refundSend-${leg.role}`,
                Effect.gen(function* () {
                    const fresh = yield* freshLeg(leg.id);
                    if (fresh === undefined || fresh.state !== "verified") return;
                    yield* vault.sendItem({
                        friendId: fresh.fromPlayerId,
                        itemType: fresh.itemType,
                        itemStr: fresh.itemStr,
                    });
                    yield* Effect.orDie(legs.transition({ legId: leg.id, from: ["verified"], to: "refund_sent" }));
                    yield* Effect.ignore(
                        ledger.append({ tradeId: payload.tradeId, legId: leg.id, event: "refund_sent" })
                    );
                })
            );

            yield* untilTheVaultAnswers(
                `refundSettle-${leg.role}`,
                Effect.gen(function* () {
                    const fresh = yield* freshLeg(leg.id);
                    if (fresh === undefined || fresh.state !== "refund_sent") return;
                    yield* vault.clearSlot(Option.getOrThrow(fresh.vaultGiftId));
                    yield* Effect.orDie(legs.transition({ legId: leg.id, from: ["refund_sent"], to: "refunded" }));
                    yield* Effect.ignore(ledger.append({ tradeId: payload.tradeId, legId: leg.id, event: "refunded" }));
                })
            );
        }

        return yield* Activity.make({
            name: "finishRefund",
            success: Schema.Struct({ refunded: Schema.Finite, lost: Schema.Finite }),
            execute: Effect.gen(function* () {
                yield* Effect.orDie(
                    trades.transition({ tradeId: payload.tradeId, from: ["refunding"], to: "refunded" })
                );
                yield* Effect.ignore(ledger.append({ tradeId: payload.tradeId, event: "trade_refunded" }));
                const final = yield* Effect.orDie(legs.forTrade(payload.tradeId));
                return {
                    refunded: final.filter((leg) => leg.state === "refunded").length,
                    lost: final.filter((leg) => leg.state === "lost").length,
                };
            }),
        });
    })
);
