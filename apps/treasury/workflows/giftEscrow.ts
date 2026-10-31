/**
 * A gift trade, end to end: both deposits into the vault, verification that
 * they actually arrived, and the crossed release.
 *
 * The durable part is not the speed, it is the ordering. An item must never
 * be forwarded before *both* deposits are verified sitting in the vault, and
 * an escrow slot must never be claimed before its item has been sent onward.
 * Running this as a workflow means a crash between any two of those steps
 * resumes rather than stranding somebody's bitizen in the vault.
 *
 * Verification matches the vault's gift against the agreed contents exactly -
 * sender, type and the item string verbatim. That is the bait-and-switch
 * check: what was offered is what escrows, or nothing does.
 */

import { Effect, Option, Schema } from "effect";
import { Activity, DurableClock, Workflow } from "effect/unstable/workflow";

import type { GiftItem } from "@tinyburg/treasury-sdk/Sdk";

import { ItemSpec } from "@tinyburg/treasury-sdk/Sdk";

import { LedgerRepository } from "../domain/ledger.ts";
import { LegsRepository } from "../domain/legs.ts";
import { TradesRepository } from "../domain/trades.ts";
import { TinyburgTrading } from "../services/tinyburg.ts";
import { Vault } from "../services/vault.ts";
import { RefundWorkflow } from "./refund.ts";

/** How many times the vault's queue is checked for the deposits. */
const VERIFY_ATTEMPTS = 6;

const decodeItemSpec = Schema.decodeEffect(Schema.fromJsonString(ItemSpec));

/**
 * @since 1.0.0
 * @category Workflows
 */
export const GiftEscrowWorkflow = Workflow.make("TreasuryGiftEscrow", {
    payload: {
        tradeId: Schema.String.check(Schema.isUUID()),
    },
    success: Schema.Struct({
        outcome: Schema.Literals(["settled", "refunded", "failed", "aborted"]),
    }),
    /** A double-submitted accept joins the existing execution instead of racing a second one. */
    idempotencyKey: ({ tradeId }) => tradeId,
});

/**
 * @since 1.0.0
 * @category Layers
 */
export const GiftEscrowWorkflowLive = GiftEscrowWorkflow.toLayer(
    Effect.fnUntraced(function* (payload) {
        const trades = yield* TradesRepository;
        const legs = yield* LegsRepository;
        const ledger = yield* LedgerRepository;
        const tinyburg = yield* TinyburgTrading;
        const vault = yield* Vault;

        const record = (event: string, legId?: string) =>
            Effect.ignore(ledger.append({ tradeId: payload.tradeId, legId, event }));

        const failTrade = (reason: string) =>
            Effect.gen(function* () {
                yield* Effect.orDie(trades.fail({ tradeId: payload.tradeId, reason }));
                yield* record("trade_failed");
                return { outcome: "failed" as const };
            });

        /** Hands the trade to the refund saga and reports how this one ended. */
        const refundAndFinish = Effect.gen(function* () {
            yield* record("refund_started");
            yield* RefundWorkflow.execute({ tradeId: payload.tradeId });
            return { outcome: "refunded" as const };
        });

        const maybeTrade = yield* Effect.orDie(trades.byId(payload.tradeId));
        if (Option.isNone(maybeTrade)) return yield* failTrade("trade disappeared before escrow started");
        const trade = maybeTrade.value;

        const counterparty = Option.zipWith(
            trade.counterpartyUserId,
            trade.counterpartyPlayerId,
            (userId, playerId) => ({ userId, playerId })
        );
        if (Option.isNone(counterparty) || trade.mechanism !== "gift") {
            return yield* failTrade("trade is not an accepted gift trade");
        }

        const gives = yield* decodeItemSpec(trade.gives).pipe(Effect.option);
        const wants = yield* decodeItemSpec(trade.wants).pipe(Effect.option);
        if (
            Option.isNone(gives) ||
            Option.isNone(wants) ||
            gives.value._tag !== "GiftItem" ||
            wants.value._tag !== "GiftItem"
        ) {
            return yield* failTrade("trade offer is not a pair of gift items");
        }
        const giveItem: typeof GiftItem.Type = gives.value;
        const wantItem: typeof GiftItem.Type = wants.value;

        /**
         * The ownership gate, re-checked at execution time rather than
         * trusted from the accept: hours may have passed, and a grant or a
         * link that was revoked in between means nothing moves.
         */
        const parties = yield* Activity.make({
            name: "verifyParties",
            success: Schema.Struct({ ok: Schema.Boolean, reason: Schema.String }),
            execute: Effect.gen(function* () {
                const owns = Effect.fnUntraced(function* (userId: string, playerId: string) {
                    const linked = yield* tinyburg.listAccounts(userId);
                    return linked.some((account) => account.playerId === playerId);
                });
                const proposerOk = yield* owns(trade.proposerUserId, trade.proposerPlayerId);
                const counterpartyOk = yield* owns(counterparty.value.userId, counterparty.value.playerId);
                if (!proposerOk) return { ok: false, reason: "proposer no longer owns their tower" };
                if (!counterpartyOk) return { ok: false, reason: "counterparty no longer owns their tower" };
                return { ok: true, reason: "" };
            }).pipe(
                Effect.catch((error) => Effect.succeed({ ok: false, reason: error.reason })),
                Effect.orDie
            ),
        });
        if (!parties.ok) return yield* failTrade(parties.reason);

        const started = yield* Activity.make({
            name: "startEscrow",
            success: Schema.Boolean,
            execute: Effect.gen(function* () {
                const transitioned = yield* trades.transition({
                    tradeId: payload.tradeId,
                    from: ["accepted"],
                    to: "escrowing",
                });
                if (!transitioned) return false;
                yield* legs.createForTrade({
                    tradeId: payload.tradeId,
                    vaultPlayerId: vault.playerId,
                    proposer: { userId: trade.proposerUserId, playerId: trade.proposerPlayerId },
                    counterparty: counterparty.value,
                    gives: { itemType: giveItem.itemType, item: giveItem.item },
                    wants: { itemType: wantItem.itemType, item: wantItem.item },
                });
                yield* Effect.ignore(ledger.append({ tradeId: payload.tradeId, event: "escrow_started" }));
                return true;
            }).pipe(Effect.orDie),
        });
        // A cancel or an expiry won the race before anything moved.
        if (!started) return { outcome: "aborted" as const };

        const tradeLegs = yield* Effect.orDie(legs.forTrade(payload.tradeId));

        /**
         * Deposits, one activity per side so each send is journaled and
         * never replayed. A failure here reports rather than throwing:
         * whether to refund depends on what the *other* side already did.
         */
        let depositsFailed = "";
        for (const leg of tradeLegs) {
            const result = yield* Activity.make({
                name: `deposit-${leg.role}`,
                success: Schema.Struct({ sent: Schema.Boolean, reason: Schema.String }),
                execute: Effect.gen(function* () {
                    const fresh = (yield* Effect.orDie(legs.forTrade(payload.tradeId))).find((l) => l.id === leg.id);
                    if (fresh === undefined) return { sent: false, reason: "leg disappeared" };
                    if (fresh.state !== "pending") return { sent: true, reason: "" };
                    yield* tinyburg.sendItem({
                        tinyburgUserId: leg.depositorUserId,
                        playerId: leg.fromPlayerId,
                        friendId: leg.vaultPlayerId,
                        itemType: leg.itemType,
                        item: leg.itemStr,
                    });
                    yield* Effect.orDie(legs.transition({ legId: leg.id, from: ["pending"], to: "sent" }));
                    yield* Effect.ignore(
                        ledger.append({ tradeId: payload.tradeId, legId: leg.id, event: "deposit_sent" })
                    );
                    return { sent: true, reason: "" };
                }).pipe(
                    Effect.retry({ times: 2 }),
                    Effect.catch((error) => Effect.succeed({ sent: false, reason: error.reason })),
                    Effect.orDie
                ),
            });
            if (!result.sent) depositsFailed = result.reason;
        }

        if (depositsFailed !== "") {
            // Whatever did go out comes back; a trade where nothing moved
            // just fails in place.
            const current = yield* Effect.orDie(legs.forTrade(payload.tradeId));
            if (current.some((leg) => leg.state !== "pending")) return yield* refundAndFinish;
            return yield* failTrade(`deposit failed: ${depositsFailed}`);
        }

        /**
         * Watch the vault's queue until both deposits appear. The sleeps are
         * durable, so this waits across a deploy instead of restarting the
         * attempt count.
         */
        let unverified = tradeLegs.length;
        for (let attempt = 1; attempt <= VERIFY_ATTEMPTS; attempt = attempt + 1) {
            unverified = yield* Activity.make({
                name: `verify-${attempt}`,
                success: Schema.Finite,
                execute: Effect.gen(function* () {
                    const queue = yield* vault.listGifts;
                    const current = yield* Effect.orDie(legs.forTrade(payload.tradeId));
                    for (const leg of current) {
                        if (leg.state !== "sent") continue;
                        const match = queue.gifts.find(
                            (gift) =>
                                gift.from === leg.fromPlayerId &&
                                gift.type === leg.itemType &&
                                gift.contents === leg.itemStr
                        );
                        if (match !== undefined) {
                            const verified = yield* Effect.orDie(legs.verify({ legId: leg.id, vaultGiftId: match.id }));
                            if (verified) {
                                yield* Effect.ignore(
                                    ledger.append({
                                        tradeId: payload.tradeId,
                                        legId: leg.id,
                                        event: "deposit_verified",
                                    })
                                );
                            }
                        }
                    }
                    const after = yield* Effect.orDie(legs.forTrade(payload.tradeId));
                    return after.filter((leg) => leg.state === "sent").length;
                }).pipe(
                    Effect.catchTag("VaultUnavailable", () => Effect.succeed(-1)),
                    Effect.orDie
                ),
            });

            if (unverified === 0) break;
            if (attempt < VERIFY_ATTEMPTS) {
                yield* DurableClock.sleep({
                    name: `verifyBackoff-${attempt}`,
                    duration: `${attempt * 2} minutes`,
                });
            }
        }

        if (unverified !== 0) return yield* refundAndFinish;

        const releasing = yield* Activity.make({
            name: "startRelease",
            success: Schema.Boolean,
            execute: Effect.gen(function* () {
                const escrowed = yield* trades.transition({
                    tradeId: payload.tradeId,
                    from: ["escrowing"],
                    to: "escrowed",
                });
                if (escrowed) yield* Effect.ignore(ledger.append({ tradeId: payload.tradeId, event: "escrowed" }));
                return yield* trades.transition({ tradeId: payload.tradeId, from: ["escrowed"], to: "releasing" });
            }).pipe(Effect.orDie),
        });
        // A cancel arrived between the deposits and the release: everything
        // is verified in the vault, so it all goes back.
        if (!releasing) return yield* refundAndFinish;

        /**
         * The crossed release. Send onward first, claim the slot second, per
         * leg and journaled per step: a crash after the send resumes at the
         * claim, and the item is never both unclaimed and unsent.
         */
        for (const leg of tradeLegs) {
            yield* Activity.make({
                name: `release-${leg.role}`,
                execute: Effect.gen(function* () {
                    const fresh = (yield* Effect.orDie(legs.forTrade(payload.tradeId))).find((l) => l.id === leg.id);
                    if (fresh === undefined || fresh.state !== "verified") return;
                    yield* vault.sendItem({
                        friendId: fresh.toPlayerId,
                        itemType: fresh.itemType,
                        itemStr: fresh.itemStr,
                    });
                    yield* Effect.orDie(legs.transition({ legId: leg.id, from: ["verified"], to: "released" }));
                    yield* Effect.ignore(ledger.append({ tradeId: payload.tradeId, legId: leg.id, event: "released" }));
                }).pipe(Effect.retry({ times: 2 }), Effect.orDie),
            });

            yield* Activity.make({
                name: `settle-${leg.role}`,
                execute: Effect.gen(function* () {
                    const fresh = (yield* Effect.orDie(legs.forTrade(payload.tradeId))).find((l) => l.id === leg.id);
                    if (fresh === undefined || fresh.state !== "released") return;
                    yield* vault.receiveGift(Option.getOrThrow(fresh.vaultGiftId));
                    yield* Effect.orDie(legs.transition({ legId: leg.id, from: ["released"], to: "settled" }));
                    yield* Effect.ignore(ledger.append({ tradeId: payload.tradeId, legId: leg.id, event: "settled" }));
                }).pipe(Effect.retry({ times: 2 }), Effect.orDie),
            });
        }

        yield* Activity.make({
            name: "finishTrade",
            execute: Effect.gen(function* () {
                yield* Effect.orDie(
                    trades.transition({ tradeId: payload.tradeId, from: ["releasing"], to: "settled" })
                );
                yield* record("trade_settled");
            }),
        });

        return { outcome: "settled" as const };
    })
);
