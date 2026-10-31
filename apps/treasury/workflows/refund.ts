/**
 * Undoing a gift trade after something was deposited.
 *
 * Every deposit sitting in the vault goes back where it came from, and only
 * then is its escrow slot claimed - the same send-before-receive ordering as
 * a release, so a crash between the two leaves the item recoverable in the
 * vault rather than gone. A deposit that was dispatched but never arrived is
 * marked `lost` for the reconciler and ops to chase; there is nothing in the
 * vault to send back.
 */

import { Effect, Option, Schema } from "effect";
import { Activity, Workflow } from "effect/unstable/workflow";

import { LedgerRepository } from "../domain/ledger.ts";
import { LegsRepository } from "../domain/legs.ts";
import { TradesRepository } from "../domain/trades.ts";
import { Vault } from "../services/vault.ts";

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
});

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

        const tradeLegs = yield* Effect.orDie(legs.forTrade(payload.tradeId));
        let refunded = 0;
        let lost = 0;

        for (const leg of tradeLegs) {
            if (leg.state === "verified" || leg.state === "refund_sent") {
                // Send back first, claim the slot second: the mirror of a
                // release, and journaled separately so a crash between the
                // two resumes at the claim rather than double-sending.
                yield* Activity.make({
                    name: `refundSend-${leg.role}`,
                    execute: Effect.gen(function* () {
                        const current = yield* Effect.orDie(legs.forTrade(payload.tradeId));
                        const fresh = current.find((l) => l.id === leg.id);
                        if (fresh === undefined || fresh.state !== "verified") return;
                        yield* vault.sendItem({
                            friendId: leg.fromPlayerId,
                            itemType: leg.itemType,
                            itemStr: leg.itemStr,
                        });
                        yield* Effect.orDie(legs.transition({ legId: leg.id, from: ["verified"], to: "refund_sent" }));
                        yield* Effect.ignore(
                            ledger.append({ tradeId: payload.tradeId, legId: leg.id, event: "refund_sent" })
                        );
                    }).pipe(Effect.orDie),
                });

                yield* Activity.make({
                    name: `refundSettle-${leg.role}`,
                    execute: Effect.gen(function* () {
                        yield* vault.receiveGift(Option.getOrThrow(leg.vaultGiftId));
                        yield* Effect.orDie(legs.transition({ legId: leg.id, from: ["refund_sent"], to: "refunded" }));
                        yield* Effect.ignore(
                            ledger.append({ tradeId: payload.tradeId, legId: leg.id, event: "refunded" })
                        );
                    }).pipe(Effect.orDie),
                });
                refunded = refunded + 1;
            } else if (leg.state === "sent") {
                /**
                 * Dispatched but never seen in the vault. There is nothing
                 * to send back; the ledger records it and the reconciler
                 * keeps watching in case it arrives absurdly late.
                 */
                yield* Activity.make({
                    name: `markLost-${leg.role}`,
                    execute: Effect.gen(function* () {
                        yield* Effect.orDie(legs.transition({ legId: leg.id, from: ["sent"], to: "lost" }));
                        yield* Effect.ignore(ledger.append({ tradeId: payload.tradeId, legId: leg.id, event: "lost" }));
                    }),
                });
                lost = lost + 1;
            }
        }

        yield* Activity.make({
            name: "finishRefund",
            execute: Effect.gen(function* () {
                yield* Effect.orDie(
                    trades.transition({ tradeId: payload.tradeId, from: ["refunding"], to: "refunded" })
                );
                yield* Effect.ignore(ledger.append({ tradeId: payload.tradeId, event: "trade_refunded" }));
            }),
        });

        return { refunded, lost };
    })
);
