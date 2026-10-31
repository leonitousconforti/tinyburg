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
import { Activity, Workflow } from "effect/workflow";

import type { GiftItem } from "@tinyburg/treasury-sdk/Sdk";

import { ItemSpec } from "@tinyburg/treasury-sdk/Sdk";

import { LedgerRepository } from "../domain/ledger.ts";
import { LegsRepository } from "../domain/legs.ts";
import { TradesRepository } from "../domain/trades.ts";
import { TinyburgApi } from "../services/tinyburg.ts";
import { Vault } from "../services/vault.ts";
import { RefundWorkflow } from "./refund.ts";
import { awaitDeposits, untilTheVaultAnswers } from "./vaultSteps.ts";

/** How many looks at the vault's queue the deposits get before the trade is refunded. */
const VERIFY_LOOKS = 6;

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
})
    /**
     * A failure suspends the escrow instead of ending it, so the resume
     * sweep can pick it up where it stopped rather than leave the trade in
     * `escrowing` or `releasing` with items in the vault.
     */
    .annotate(Workflow.SuspendOnFailure, true);

/**
 * @since 1.0.0
 * @category Layers
 */
export const GiftEscrowWorkflowLive = GiftEscrowWorkflow.toLayer(
    Effect.fnUntraced(function* (payload) {
        const trades = yield* TradesRepository;
        const legs = yield* LegsRepository;
        const ledger = yield* LedgerRepository;
        const tinyburg = yield* TinyburgApi;
        const vault = yield* Vault;

        const record = (event: string, legId?: string) =>
            Effect.ignore(ledger.append({ tradeId: payload.tradeId, legId, event }));

        const failTrade = (reason: string) =>
            Effect.gen(function* () {
                yield* Effect.orDie(trades.fail({ tradeId: payload.tradeId, reason }));
                yield* record("trade_failed");
                return { outcome: "failed" as const };
            });

        const freshLeg = (legId: string) =>
            Effect.map(Effect.orDie(legs.forTrade(payload.tradeId)), (current) =>
                current.find((leg) => leg.id === legId)
            );

        /**
         * Hands the trade to the refund saga (or joins the one a cancel or
         * the expiry sweep already started) and reports how this one ended.
         * The ledger entry is an activity so the replays that waiting on the
         * refund causes record it once.
         */
        const refundAndFinish = Effect.gen(function* () {
            yield* Activity.make({ name: "refundStarted", execute: record("refund_started") });
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
                if (!transitioned) {
                    // A replay after the transition committed finds the trade
                    // escrowing, with or without its legs; anything else is a
                    // cancel or an expiry that won the race.
                    const current = yield* trades.byId(payload.tradeId);
                    if (!Option.exists(current, (trade) => trade.state === "escrowing")) return false;
                    if ((yield* legs.forTrade(payload.tradeId)).length > 0) return true;
                }
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
         * never replayed. Each leg is reserved (`pending` to `sent`) before
         * its send, and only while the trade is still escrowing: a refund
         * that claimed the trade first stops the deposit from leaving, and
         * one that claims it after sees the deposit as on its way and waits
         * for it. A failure here reports rather than throwing: whether to
         * refund depends on what the *other* side already did.
         */
        let stopped: { readonly outcome: "refused" | "failed"; readonly reason: string } | undefined;
        for (const leg of tradeLegs) {
            const result = yield* Activity.make({
                name: `deposit-${leg.role}`,
                success: Schema.Struct({
                    outcome: Schema.Literals(["sent", "refused", "failed"]),
                    reason: Schema.String,
                }),
                execute: Effect.gen(function* () {
                    const fresh = yield* freshLeg(leg.id);
                    if (fresh === undefined) return { outcome: "failed" as const, reason: "leg disappeared" };
                    // A replay after the reservation: the send went out, or
                    // a crash cut it off and the leg reads as lost later.
                    if (fresh.state !== "pending") return { outcome: "sent" as const, reason: "" };

                    const reserved = yield* Effect.orDie(legs.reserveDeposit(leg.id));
                    if (!reserved) return { outcome: "refused" as const, reason: "the trade stopped escrowing" };

                    const sent = yield* tinyburg
                        .sendItem({
                            tinyburgUserId: leg.depositorUserId,
                            playerId: leg.fromPlayerId,
                            friendId: leg.vaultPlayerId,
                            itemType: leg.itemType,
                            item: leg.itemStr,
                        })
                        .pipe(Effect.retry({ times: 2 }), Effect.result);
                    if (sent._tag === "Failure") {
                        // Nothing went out, so the leg is not on its way.
                        yield* Effect.orDie(legs.transition({ legId: leg.id, from: ["sent"], to: "pending" }));
                        yield* Effect.ignore(
                            ledger.append({
                                tradeId: payload.tradeId,
                                legId: leg.id,
                                event: "deposit_failed",
                                detail: sent.failure.reason,
                            })
                        );
                        return { outcome: "failed" as const, reason: sent.failure.reason };
                    }
                    yield* Effect.ignore(
                        ledger.append({ tradeId: payload.tradeId, legId: leg.id, event: "deposit_sent" })
                    );
                    return { outcome: "sent" as const, reason: "" };
                }),
            });
            if (result.outcome !== "sent") {
                stopped = { outcome: result.outcome, reason: result.reason };
                break;
            }
        }

        if (stopped !== undefined) {
            // A cancel or the expiry sweep claimed the trade: the refund
            // owns it now, and this saga ends with it.
            if (stopped.outcome === "refused") return yield* refundAndFinish;
            // Whatever did go out comes back; a trade where nothing moved
            // just fails in place, unless a refund got there first.
            const current = yield* Effect.orDie(legs.forTrade(payload.tradeId));
            if (current.some((leg) => leg.state !== "pending")) return yield* refundAndFinish;
            const failed = yield* Effect.orDie(
                trades.fail({
                    tradeId: payload.tradeId,
                    reason: `deposit failed: ${stopped.reason}`,
                    from: ["escrowing"],
                })
            );
            if (!failed) return yield* refundAndFinish;
            yield* record("trade_failed");
            return { outcome: "failed" as const };
        }

        /**
         * Watch the vault's queue until both deposits appear. The sleeps are
         * durable, so this waits across a deploy instead of restarting the
         * count, and a look that could not reach the vault does not count.
         */
        const arrival = yield* awaitDeposits({
            name: "verify",
            tradeId: payload.tradeId,
            state: "escrowing",
            looks: VERIFY_LOOKS,
        });
        if (arrival !== "arrived") return yield* refundAndFinish;

        const releasing = yield* Activity.make({
            name: "startRelease",
            success: Schema.Boolean,
            execute: Effect.gen(function* () {
                // Refused unless both legs are verified in the vault.
                const escrowed = yield* trades.markEscrowed(payload.tradeId);
                if (escrowed) yield* Effect.ignore(ledger.append({ tradeId: payload.tradeId, event: "escrowed" }));
                const released = yield* trades.transition({
                    tradeId: payload.tradeId,
                    from: ["escrowed"],
                    to: "releasing",
                });
                if (released) return true;
                // A replay after the transition committed: already releasing.
                const current = yield* trades.byId(payload.tradeId);
                return Option.exists(current, (trade) => trade.state === "releasing");
            }).pipe(Effect.orDie),
        });
        // A cancel arrived between the deposits and the release, or a leg is
        // not verified: whatever is in the vault goes back.
        if (!releasing) return yield* refundAndFinish;

        /**
         * The crossed release. Send onward first, claim the slot second, per
         * leg and journaled per step: a crash after the send resumes at the
         * claim, and the item is never both unclaimed and unsent. Each step
         * retries until the vault answers, so the trade cannot be left in
         * `releasing` by an outage.
         */
        for (const leg of tradeLegs) {
            yield* untilTheVaultAnswers(
                `release-${leg.role}`,
                Effect.gen(function* () {
                    const fresh = yield* freshLeg(leg.id);
                    if (fresh === undefined || fresh.state !== "verified") return;
                    yield* vault.sendItem({
                        friendId: fresh.toPlayerId,
                        itemType: fresh.itemType,
                        itemStr: fresh.itemStr,
                    });
                    yield* Effect.orDie(legs.transition({ legId: leg.id, from: ["verified"], to: "released" }));
                    yield* Effect.ignore(ledger.append({ tradeId: payload.tradeId, legId: leg.id, event: "released" }));
                })
            );

            yield* untilTheVaultAnswers(
                `settle-${leg.role}`,
                Effect.gen(function* () {
                    const fresh = yield* freshLeg(leg.id);
                    if (fresh === undefined || fresh.state !== "released") return;
                    yield* vault.clearSlot(Option.getOrThrow(fresh.vaultGiftId));
                    yield* Effect.orDie(legs.transition({ legId: leg.id, from: ["released"], to: "settled" }));
                    yield* Effect.ignore(ledger.append({ tradeId: payload.tradeId, legId: leg.id, event: "settled" }));
                })
            );
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
