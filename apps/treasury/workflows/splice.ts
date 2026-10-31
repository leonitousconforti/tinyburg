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
import { Activity, Workflow } from "effect/workflow";

import type { SplicePlan } from "../domain/model.ts";
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
class SpliceRejected extends Schema.Error<SpliceRejected, { readonly brand: unique symbol }>(
    "@tinyburg/treasury/SpliceRejected"
)({
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
})
    /**
     * A failure suspends the splice instead of ending it, so the resume
     * sweep can pick it up where it stopped rather than leave the trade in
     * `executing` with one side rewritten. Every expected way out (a
     * rejection, a conflict) is an answer, not a failure, for that reason.
     */
    .annotate(Workflow.SuspendOnFailure, true);

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
            execute: Effect.gen(function* () {
                const started = yield* trades.transition({
                    tradeId: payload.tradeId,
                    from: ["awaiting_confirmation"],
                    to: "executing",
                });
                if (started) return true;
                // A replay after the transition committed: already executing.
                const current = yield* trades.byId(payload.tradeId);
                return Option.exists(current, (trade) => trade.state === "executing");
            }).pipe(Effect.orDie),
        });
        if (!started) return { outcome: "aborted" as const };

        /**
         * Pull both saves and keep the originals. `recordPull` refuses to
         * overwrite, so a replay cannot replace the restore point with a
         * save the first attempt may already have rewritten. The save ids
         * the pushes are guarded by come from that stored first pull too: a
         * replay after the player synced must not guard a push of the old
         * splice with the new version.
         */
        const pulled = yield* Activity.make({
            name: "pullSaves",
            success: Schema.NullOr(Schema.Struct({ proposerSaveId: Schema.Finite, counterpartySaveId: Schema.Finite })),
            execute: Effect.gen(function* () {
                const storedIds = (plan: Option.Option<SplicePlan>) =>
                    Option.flatMap(plan, (stored) =>
                        Option.zipWith(
                            stored.proposerSaveId,
                            stored.counterpartySaveId,
                            (proposerSaveId, counterpartySaveId) => ({
                                proposerSaveId,
                                counterpartySaveId,
                            })
                        )
                    );

                const already = storedIds(yield* Effect.orDie(splices.byTrade(payload.tradeId)));
                if (Option.isSome(already)) return already.value;

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
                const recorded = storedIds(yield* Effect.orDie(splices.byTrade(payload.tradeId)));
                if (Option.isNone(recorded)) return yield* Effect.die("the splice plan has no save ids after the pull");
                yield* Effect.ignore(ledger.append({ tradeId: payload.tradeId, event: "splice_pulled" }));
                return recorded.value;
            }).pipe(
                Effect.catchTags({
                    TowerGrantUnusable: () => Effect.succeed(null),
                    TowerUnavailable: () => Effect.succeed(null),
                })
            ),
        });
        if (pulled === null) return yield* failTrade("could not pull both saves");

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
            }).pipe(Effect.orElseSucceed(() => false)),
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
                Effect.orElseSucceed(() => ({ ok: false, reason: "the saves would not splice" }))
            ),
        });
        if (!computed.ok) return yield* failTrade(computed.reason);

        /**
         * Fails the trade for a person to look at: a push may have landed
         * somewhere the treasury can no longer safely undo by itself. The
         * snapshots pushed before the splice are the way back.
         */
        const needsReview = (reason: string) =>
            Effect.gen(function* () {
                yield* Effect.logWarning(`splice trade ${payload.tradeId} needs manual review: ${reason}`);
                yield* Effect.ignore(
                    ledger.append({ tradeId: payload.tradeId, event: "splice_needs_review", detail: reason })
                );
                return yield* failTrade(`needs manual review: ${reason}`);
            });

        /**
         * One guarded push. The version check is check-then-act against a
         * live game, so the confirm screen tells players to close their game;
         * a sync in the gap aborts here with nothing lost. The push marker is
         * written before the push goes out, and that is what tells a moved
         * version apart: with no marker it is the player syncing, with one it
         * may be this push having landed (a crash, or a failure whose answer
         * was lost).
         *
         * - `pushed`: the spliced save went up; `savedId` is the version it
         *   left behind, if that could be read back.
         * - `conflict`: nothing of the treasury's landed on this tower.
         * - `unknown`: a push was attempted and may or may not have landed.
         */
        const push = (
            side: "proposer" | "counterparty",
            owner: { readonly userId: string; readonly playerId: typeof trade.proposerPlayerId },
            pulledId: number
        ) =>
            Activity.make({
                name: side === "proposer" ? "pushProposer" : "pushCounterparty",
                success: Schema.Struct({
                    outcome: Schema.Literals(["pushed", "conflict", "unknown"]),
                    reason: Schema.String,
                    savedId: Schema.NullOr(Schema.Finite),
                }),
                execute: Effect.gen(function* () {
                    const tower = { tinyburgUserId: owner.userId, playerId: owner.playerId };
                    const plan = Option.getOrThrow(yield* Effect.orDie(splices.byTrade(payload.tradeId)));
                    const attempted = Option.isSome(
                        side === "proposer" ? plan.proposerPushStartedAt : plan.counterpartyPushStartedAt
                    );
                    const nothing = (reason: string) => ({ outcome: "conflict" as const, reason, savedId: null });
                    const maybe = (reason: string) => ({ outcome: "unknown" as const, reason, savedId: null });

                    const version = yield* Effect.option(tinyburg.checkVersion(tower));
                    if (Option.isNone(version)) {
                        return attempted
                            ? maybe(`could not read the ${side}'s save version after a push was attempted`)
                            : nothing(`could not check the ${side}'s save version`);
                    }
                    if (version.value !== pulledId) {
                        return attempted
                            ? maybe(`the ${side}'s save changed after a push was attempted`)
                            : nothing(`the ${side}'s tower synced during the trade`);
                    }

                    yield* Effect.orDie(splices.markPushStarted({ tradeId: payload.tradeId, side }));
                    const pushed = yield* Effect.result(
                        tinyburg.pushSave({
                            ...tower,
                            data: Option.getOrElse(
                                side === "proposer" ? plan.proposerSpliced : plan.counterpartySpliced,
                                () => ""
                            ),
                        })
                    );
                    if (pushed._tag === "Failure") {
                        // The answer may be lost rather than the push: only an
                        // unchanged version says it did not land.
                        const after = yield* Effect.option(tinyburg.checkVersion(tower));
                        return Option.contains(after, pulledId)
                            ? nothing(`could not push the ${side}'s save`)
                            : maybe(`the ${side}'s push failed and may have landed`);
                    }
                    yield* Effect.ignore(ledger.append({ tradeId: payload.tradeId, event: `splice_pushed_${side}` }));
                    const savedId = yield* Effect.option(tinyburg.checkVersion(tower));
                    return { outcome: "pushed" as const, reason: "", savedId: Option.getOrNull(savedId) };
                }),
            });

        const proposerPushed = yield* push(
            "proposer",
            { userId: trade.proposerUserId, playerId: trade.proposerPlayerId },
            pulled.proposerSaveId
        );
        if (proposerPushed.outcome === "conflict") return yield* failTrade(proposerPushed.reason);
        if (proposerPushed.outcome === "unknown") return yield* needsReview(proposerPushed.reason);

        const counterpartyPushed = yield* push("counterparty", counterparty.value, pulled.counterpartySaveId);
        if (counterpartyPushed.outcome === "unknown") {
            // The counterparty may hold the spliced save: restoring the
            // proposer now could destroy one item and duplicate the other.
            return yield* needsReview(`${counterpartyPushed.reason}; the proposer was left spliced`);
        }

        if (counterpartyPushed.outcome === "conflict") {
            /**
             * Nothing landed on the counterparty, and the proposer is
             * already rewritten, so it goes back to its original before the
             * trade is failed. Guarded like every other push: only over the
             * exact save the splice left, so progress made since is never
             * overwritten. Anything doubtful goes to manual review instead,
             * with the pushed snapshot as the player's recovery.
             */
            const restored = yield* Activity.make({
                name: "restoreProposer",
                success: Schema.Struct({ restored: Schema.Boolean, reason: Schema.String }),
                execute: Effect.gen(function* () {
                    if (proposerPushed.savedId === null) {
                        return { restored: false, reason: "the proposer's version after the splice is unknown" };
                    }
                    const tower = { tinyburgUserId: trade.proposerUserId, playerId: trade.proposerPlayerId };
                    const version = yield* Effect.option(tinyburg.checkVersion(tower));
                    if (!Option.contains(version, proposerPushed.savedId)) {
                        return { restored: false, reason: "the proposer's save changed after the splice" };
                    }
                    const plan = Option.getOrThrow(yield* Effect.orDie(splices.byTrade(payload.tradeId)));
                    const pushed = yield* Effect.result(
                        tinyburg.pushSave({ ...tower, data: Option.getOrElse(plan.proposerOriginal, () => "") })
                    );
                    if (pushed._tag === "Failure") return { restored: false, reason: "the restore push failed" };
                    yield* Effect.ignore(
                        ledger.append({ tradeId: payload.tradeId, event: "splice_restored_proposer" })
                    );
                    return { restored: true, reason: "" };
                }),
            });
            if (!restored.restored) {
                return yield* needsReview(`${counterpartyPushed.reason}, and ${restored.reason}`);
            }
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
