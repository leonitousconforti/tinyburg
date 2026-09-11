/**
 * A save-splice trade: both saves pulled, snapshotted, rewritten and pushed.
 *
 * This is the mechanism the gift channel cannot provide - costumes, pets and
 * currency move here, and items are debited from the giver rather than
 * duplicated - and it is also the dangerous one, which is why it only runs
 * after *both* parties confirmed on the web app, why cloud snapshots of both
 * originals are pushed before anything is rewritten, and why each push is
 * guarded by a version check so a player who kept playing aborts the splice
 * instead of losing progress.
 */

import { Effect, Option, Schema, type Types } from "effect";
import { Activity, Workflow } from "effect/unstable/workflow";

import type { SpliceItems } from "@tinyburg/treasury-sdk/Sdk";

import { Bitizens, TinyTower } from "@tinyburg/tinytower-sdk";
import { ItemSpec } from "@tinyburg/treasury-sdk/Sdk";

import { LedgerRepository } from "../domain/ledger.ts";
import { SpliceRepository } from "../domain/splice.ts";
import { TradesRepository } from "../domain/trades.ts";
import { TinyburgTrading } from "../services/tinyburg.ts";

const decodeItemSpec = Schema.decodeEffect(Schema.fromJsonString(ItemSpec));
const decodeSave = Schema.decodeEffect(TinyTower.SaveData);
const encodeSave = Schema.encodeEffect(TinyTower.SaveData);
const encodeBitizen = Schema.encodeEffect(Bitizens.Bitizen);

type MutableSave = Types.DeepMutable<typeof TinyTower.SaveData.Type>;

/**
 * The splice could not be computed as agreed: an offered item was not in the
 * giver's save, or a balance was short. Nothing has been pushed when this is
 * raised; it fails the trade with a reason the participants can read.
 */
class SpliceRejected extends Schema.Error<SpliceRejected>("@tinyburg/treasury/SpliceRejected")({
    _tag: Schema.tag("SpliceRejected"),
    reason: Schema.String,
}) {}

/**
 * Moves one side's items out of the giver's decoded save and into the
 * receiver's. Every removal is by exact match against what was agreed, so
 * the save that ends up pushed contains precisely the trade both parties
 * confirmed and nothing else.
 */
// The early exits return never-typed values; the normal path runs to the end.
// oxlint-disable-next-line typescript/consistent-return
const applyItems = Effect.fnUntraced(function* (
    giver: MutableSave,
    receiver: MutableSave,
    items: typeof SpliceItems.Type extends { readonly items: infer I } ? I : never
) {
    for (const entry of items) {
        switch (entry.kind) {
            case "bitizen": {
                if (entry.item === undefined) {
                    return yield* new SpliceRejected({ reason: "a bitizen entry carries no item" });
                }
                let index = -1;
                for (let candidate = 0; candidate < giver.bzns.length; candidate = candidate + 1) {
                    const encoded = yield* encodeBitizen(giver.bzns[candidate]).pipe(
                        Effect.mapError(() => new SpliceRejected({ reason: "a bitizen in the save would not encode" }))
                    );
                    if (encoded === entry.item) {
                        index = candidate;
                        break;
                    }
                }
                if (index === -1) {
                    return yield* new SpliceRejected({ reason: "the giver no longer has the offered bitizen" });
                }
                const [moved] = giver.bzns.splice(index, 1);
                receiver.bzns.push(moved);
                break;
            }
            case "costume": {
                if (entry.item === undefined) {
                    return yield* new SpliceRejected({ reason: "a costume entry carries no item" });
                }
                const index = giver.costumes.indexOf(entry.item);
                if (index === -1) {
                    return yield* new SpliceRejected({ reason: "the giver no longer has the offered costume" });
                }
                giver.costumes.splice(index, 1);
                receiver.costumes.push(entry.item);
                break;
            }
            case "pet": {
                if (entry.item === undefined) {
                    return yield* new SpliceRejected({ reason: "a pet entry carries no item" });
                }
                const pets = giver.pets ?? [];
                const index = pets.indexOf(entry.item);
                if (index === -1) {
                    return yield* new SpliceRejected({ reason: "the giver no longer has the offered pet" });
                }
                pets.splice(index, 1);
                giver.pets = pets;
                receiver.pets = [...(receiver.pets ?? []), entry.item];
                break;
            }
            case "coins": {
                const amount = entry.amount ?? 0;
                if (amount <= 0) return yield* new SpliceRejected({ reason: "a coin entry carries no amount" });
                if (giver.coins < amount) {
                    return yield* new SpliceRejected({ reason: "the giver no longer has the offered coins" });
                }
                giver.coins = giver.coins - amount;
                receiver.coins = receiver.coins + amount;
                break;
            }
            case "bux": {
                const amount = entry.amount ?? 0;
                if (amount <= 0) return yield* new SpliceRejected({ reason: "a bux entry carries no amount" });
                if (giver.bux < amount) {
                    return yield* new SpliceRejected({ reason: "the giver no longer has the offered bux" });
                }
                giver.bux = giver.bux - amount;
                receiver.bux = receiver.bux + amount;
                break;
            }
        }
    }
});

/**
 * @since 1.0.0
 * @category Workflows
 */
export const SpliceWorkflow = Workflow.make("TreasurySplice", {
    payload: {
        tradeId: Schema.String.check(Schema.isUUID()),
    },
    success: Schema.Struct({
        outcome: Schema.Literals(["settled", "failed", "aborted"]),
    }),
    /** The second confirmer starts it; a racing first confirmer joins the same execution. */
    idempotencyKey: ({ tradeId }) => tradeId,
});

/**
 * @since 1.0.0
 * @category Layers
 */
export const SpliceWorkflowLive = SpliceWorkflow.toLayer(
    Effect.fnUntraced(function* (payload) {
        const trades = yield* TradesRepository;
        const splices = yield* SpliceRepository;
        const ledger = yield* LedgerRepository;
        const tinyburg = yield* TinyburgTrading;

        const record = (event: string) => Effect.ignore(ledger.append({ tradeId: payload.tradeId, event }));

        const failTrade = (reason: string) =>
            Effect.gen(function* () {
                yield* Effect.orDie(trades.fail({ tradeId: payload.tradeId, reason }));
                yield* record("trade_failed");
                return { outcome: "failed" as const };
            });

        const maybeTrade = yield* Effect.orDie(trades.byId(payload.tradeId));
        if (Option.isNone(maybeTrade)) return yield* failTrade("trade disappeared before the splice started");
        const trade = maybeTrade.value;

        const counterparty = Option.zipWith(
            trade.counterpartyUserId,
            trade.counterpartyPlayerId,
            (userId, playerId) => ({ userId, playerId })
        );
        if (
            trade.mechanism !== "splice" ||
            Option.isNone(counterparty) ||
            Option.isNone(trade.proposerConfirmedAt) ||
            Option.isNone(trade.counterpartyConfirmedAt)
        ) {
            return yield* failTrade("trade is not a fully confirmed splice");
        }

        const gives = yield* decodeItemSpec(trade.gives).pipe(Effect.option);
        const wants = yield* decodeItemSpec(trade.wants).pipe(Effect.option);
        if (
            Option.isNone(gives) ||
            Option.isNone(wants) ||
            gives.value._tag !== "SpliceItems" ||
            wants.value._tag !== "SpliceItems"
        ) {
            return yield* failTrade("trade offer is not a pair of splice lists");
        }
        const givesSpec: typeof SpliceItems.Type = gives.value;
        const wantsSpec: typeof SpliceItems.Type = wants.value;

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
            name: "startExecuting",
            success: Schema.Boolean,
            execute: Effect.orDie(
                trades.transition({ tradeId: payload.tradeId, from: ["awaiting_confirmation"], to: "executing" })
            ),
        });
        if (!started) return { outcome: "aborted" as const };

        /**
         * Pull both saves and keep the originals. `recordPull` refuses to
         * overwrite, so a replay cannot replace the restore point with a
         * save the first attempt may already have rewritten.
         */
        const pulled = yield* Activity.make({
            name: "pullSaves",
            success: Schema.Struct({ proposerSaveId: Schema.Finite, counterpartySaveId: Schema.Finite }),
            error: SpliceRejected,
            execute: Effect.gen(function* () {
                const proposerSave = yield* tinyburg.pullSave({
                    tinyburgUserId: trade.proposerUserId,
                    playerId: trade.proposerPlayerId,
                });
                const counterpartySave = yield* tinyburg.pullSave({
                    tinyburgUserId: counterparty.value.userId,
                    playerId: counterparty.value.playerId,
                });
                yield* Effect.orDie(
                    splices.recordPull({
                        tradeId: payload.tradeId,
                        proposerSaveId: proposerSave.saveId,
                        counterpartySaveId: counterpartySave.saveId,
                        proposerOriginal: proposerSave.data,
                        counterpartyOriginal: counterpartySave.data,
                    })
                );
                yield* Effect.ignore(ledger.append({ tradeId: payload.tradeId, event: "splice_pulled" }));
                return { proposerSaveId: proposerSave.saveId, counterpartySaveId: counterpartySave.saveId };
            }).pipe(
                Effect.catchTags({
                    TowerGrantUnusable: (error) => new SpliceRejected({ reason: error.reason }),
                    TowerUnavailable: (error) => new SpliceRejected({ reason: error.reason }),
                })
            ),
        }).pipe(Effect.option);
        if (Option.isNone(pulled)) return yield* failTrade("could not pull both saves");

        /** The safety rail: an in-game-recoverable backup of both towers, before anything mutates. */
        const snapshotted = yield* Activity.make({
            name: "snapshots",
            success: Schema.Boolean,
            execute: Effect.gen(function* () {
                const plan = yield* Effect.orDie(splices.byTrade(payload.tradeId));
                if (Option.isNone(plan)) return false;
                const proposerOriginal = Option.getOrElse(plan.value.proposerOriginal, () => "");
                const counterpartyOriginal = Option.getOrElse(plan.value.counterpartyOriginal, () => "");
                yield* tinyburg.pushSnapshot({
                    tinyburgUserId: trade.proposerUserId,
                    playerId: trade.proposerPlayerId,
                    data: proposerOriginal,
                });
                yield* tinyburg.pushSnapshot({
                    tinyburgUserId: counterparty.value.userId,
                    playerId: counterparty.value.playerId,
                    data: counterpartyOriginal,
                });
                yield* Effect.ignore(ledger.append({ tradeId: payload.tradeId, event: "splice_snapshot" }));
                return true;
            }).pipe(
                Effect.catch(() => Effect.succeed(false)),
                Effect.orDie
            ),
        });
        if (!snapshotted) return yield* failTrade("could not snapshot both towers before splicing");

        /** Pure computation: decode, move the agreed items, re-encode, re-decode as a sanity check. */
        const computed = yield* Activity.make({
            name: "computeSplice",
            success: Schema.Struct({ ok: Schema.Boolean, reason: Schema.String }),
            execute: Effect.gen(function* () {
                const plan = yield* Effect.orDie(splices.byTrade(payload.tradeId));
                if (Option.isNone(plan)) return { ok: false, reason: "splice plan disappeared" };
                const proposerOriginal = Option.getOrElse(plan.value.proposerOriginal, () => "");
                const counterpartyOriginal = Option.getOrElse(plan.value.counterpartyOriginal, () => "");

                // The decoded saves are mutated in place before re-encoding.
                // oxlint-disable-next-line typescript/no-unsafe-type-assertion
                const proposerSave = (yield* decodeSave(proposerOriginal)) as MutableSave;
                // oxlint-disable-next-line typescript/no-unsafe-type-assertion
                const counterpartySave = (yield* decodeSave(counterpartyOriginal)) as MutableSave;

                yield* applyItems(proposerSave, counterpartySave, givesSpec.items);
                yield* applyItems(counterpartySave, proposerSave, wantsSpec.items);

                const proposerSpliced = yield* encodeSave(proposerSave);
                const counterpartySpliced = yield* encodeSave(counterpartySave);
                yield* decodeSave(proposerSpliced);
                yield* decodeSave(counterpartySpliced);

                yield* Effect.orDie(
                    splices.recordSpliced({ tradeId: payload.tradeId, proposerSpliced, counterpartySpliced })
                );
                return { ok: true, reason: "" };
            }).pipe(
                Effect.catchTag("SpliceRejected", (error) => Effect.succeed({ ok: false, reason: error.reason })),
                Effect.catch(() => Effect.succeed({ ok: false, reason: "the saves would not splice" })),
                Effect.orDie
            ),
        });
        if (!computed.ok) return yield* failTrade(computed.reason);

        /**
         * The guarded pushes. The version check is check-then-act against a
         * live game, so the confirm screen tells players to close their game;
         * a sync in the gap aborts here with nothing lost. The window between
         * a push landing and its journal entry is accepted for v1 - a crash
         * inside it re-runs the version check and reads as a conflict, which
         * fails safe (the trade fails, the snapshot restores by hand).
         */
        const proposerPushed = yield* Activity.make({
            name: "pushProposer",
            success: Schema.Struct({ pushed: Schema.Boolean, reason: Schema.String }),
            execute: Effect.gen(function* () {
                const plan = Option.getOrThrow(yield* Effect.orDie(splices.byTrade(payload.tradeId)));
                const version = yield* tinyburg.checkVersion({
                    tinyburgUserId: trade.proposerUserId,
                    playerId: trade.proposerPlayerId,
                });
                if (version !== pulled.value.proposerSaveId) {
                    return { pushed: false, reason: "the proposer's tower synced during the trade" };
                }
                yield* tinyburg.pushSave({
                    tinyburgUserId: trade.proposerUserId,
                    playerId: trade.proposerPlayerId,
                    data: Option.getOrElse(plan.proposerSpliced, () => ""),
                });
                yield* Effect.ignore(ledger.append({ tradeId: payload.tradeId, event: "splice_pushed_proposer" }));
                return { pushed: true, reason: "" };
            }).pipe(
                Effect.catch(() => Effect.succeed({ pushed: false, reason: "could not push the proposer's save" })),
                Effect.orDie
            ),
        });
        if (!proposerPushed.pushed) return yield* failTrade(proposerPushed.reason);

        const counterpartyPushed = yield* Activity.make({
            name: "pushCounterparty",
            success: Schema.Struct({ pushed: Schema.Boolean, reason: Schema.String }),
            execute: Effect.gen(function* () {
                const plan = Option.getOrThrow(yield* Effect.orDie(splices.byTrade(payload.tradeId)));
                const version = yield* tinyburg.checkVersion({
                    tinyburgUserId: counterparty.value.userId,
                    playerId: counterparty.value.playerId,
                });
                if (version !== pulled.value.counterpartySaveId) {
                    return { pushed: false, reason: "the counterparty's tower synced during the trade" };
                }
                yield* tinyburg.pushSave({
                    tinyburgUserId: counterparty.value.userId,
                    playerId: counterparty.value.playerId,
                    data: Option.getOrElse(plan.counterpartySpliced, () => ""),
                });
                yield* Effect.ignore(ledger.append({ tradeId: payload.tradeId, event: "splice_pushed_counterparty" }));
                return { pushed: true, reason: "" };
            }).pipe(
                Effect.catch(() => Effect.succeed({ pushed: false, reason: "could not push the counterparty's save" })),
                Effect.orDie
            ),
        });

        if (!counterpartyPushed.pushed) {
            // Side A is already rewritten, so it goes back to its original
            // before the trade is failed. Best effort with retries; if even
            // the restore fails, the pushed snapshot is the player's recovery
            // and the ledger says exactly what happened.
            yield* Activity.make({
                name: "restoreProposer",
                execute: Effect.gen(function* () {
                    const plan = Option.getOrThrow(yield* Effect.orDie(splices.byTrade(payload.tradeId)));
                    yield* tinyburg.pushSave({
                        tinyburgUserId: trade.proposerUserId,
                        playerId: trade.proposerPlayerId,
                        data: Option.getOrElse(plan.proposerOriginal, () => ""),
                    });
                    yield* Effect.ignore(
                        ledger.append({ tradeId: payload.tradeId, event: "splice_restored_proposer" })
                    );
                }).pipe(Effect.retry({ times: 3 }), Effect.ignore),
            });
            return yield* failTrade(counterpartyPushed.reason);
        }

        yield* Activity.make({
            name: "finishTrade",
            execute: Effect.gen(function* () {
                yield* Effect.orDie(
                    trades.transition({ tradeId: payload.tradeId, from: ["executing"], to: "settled" })
                );
                yield* record("trade_settled");
            }),
        });

        return { outcome: "settled" as const };
    })
);
