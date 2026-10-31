/**
 * A save-splice trade: both saves pulled, the splice computed, both
 * originals snapshotted, and the rewritten saves pushed.
 *
 * This is the mechanism the gift channel cannot provide - costumes, pets and
 * currency move here, and items are debited from the giver rather than
 * duplicated - and it is also the dangerous one, which is why it only runs
 * after *both* parties confirmed on the web app, why the splice is computed
 * from the stored originals before either tower is touched, why cloud
 * snapshots of both originals are pushed before anything is rewritten, and
 * why each push is guarded by a version check so a player who kept playing
 * aborts the splice instead of losing progress.
 */

import { Effect, Function, Option, Schema } from "effect";
import { Activity, Workflow } from "effect/workflow";

import type { SplicePlan } from "../domain/model.ts";
import type { SpliceItem, SpliceItems } from "@tinyburg/treasury-sdk/Sdk";

import { Bitizens, SaveDiffer, Splice, TinyTower } from "@tinyburg/tinytower-sdk";
import { ItemSpec } from "@tinyburg/treasury-sdk/Sdk";

import { LedgerRepository } from "../domain/ledger.ts";
import { SpliceRepository } from "../domain/splice.ts";
import { TradesRepository } from "../domain/trades.ts";
import { TinyburgApi } from "../services/tinyburg.ts";

const decodeItemSpec = Schema.decodeEffect(Schema.fromJsonString(ItemSpec));
const decodeSave = Schema.decodeEffect(TinyTower.SaveData);
const encodeSave = Schema.encodeEffect(TinyTower.SaveData);
const encodeBitizen = Schema.encodeEffect(Bitizens.Bitizen);

/**
 * The detail of a `splice_spliced` ledger entry: the edits that took each
 * side's agreed items out of its original save, in order. What arrived on
 * each side is what left the other, so together with the stored originals
 * these two patches account for the whole splice.
 */
const SplicedDetail = Schema.fromJsonString(
    Schema.Struct({ proposer: SaveDiffer.SavePatch, counterparty: SaveDiffer.SavePatch })
);
const encodeSplicedDetail = Schema.encodeEffect(SplicedDetail);

type Side = "proposer" | "counterparty";

type SpliceEntry = typeof SpliceItem.Type;

/**
 * The splice could not be computed as agreed: an offered item was not in the
 * giver's save, or `Splice` refused an edit that would leave either tower
 * contradicting itself. Raised before either tower is snapshotted or pushed;
 * it fails the trade with a reason the participants can read.
 */
class SpliceRejected extends Schema.Error<SpliceRejected, { readonly brand: unique symbol }>(
    "@tinyburg/treasury/SpliceRejected"
)({
    _tag: Schema.tag("SpliceRejected"),
    reason: Schema.String,
}) {}

/** A `Splice` refusal as the trade's failure reason, its code kept for support. */
const refused =
    (context: string) =>
    (error: Splice.SpliceError): SpliceRejected =>
        new SpliceRejected({ reason: `${context}: ${error.message} (${error.reason})` });

/**
 * Finds the bitizen agreed by its full encoded string. Positions shift as
 * earlier items of the same side come out, so this always looks at the save
 * as it stands now, and the match is exact: a bitizen re-dressed or moved
 * to another job since the proposal is no longer the one agreed.
 */
const bitizenSelector = Effect.fnUntraced(function* (side: Side, save: SaveDiffer.SaveData, item: string) {
    const encoded = yield* Effect.forEach(save.bzns, (bitizen) => encodeBitizen(bitizen)).pipe(
        Effect.mapError(() => new SpliceRejected({ reason: `a bitizen in the ${side}'s save would not encode` }))
    );
    const index = encoded.indexOf(item);
    if (index === -1) {
        return yield* new SpliceRejected({ reason: `the ${side} no longer has the offered bitizen` });
    }
    return { _tag: "Bitizen", index } satisfies Splice.Selector;
});

/** Names one agreed item the way `Splice` addresses it in the giver's current save. */
const selectorFor = (
    side: Side,
    save: SaveDiffer.SaveData,
    entry: SpliceEntry
): Effect.Effect<Splice.Selector, SpliceRejected, never> => {
    const missing = (what: string) =>
        Effect.fail(new SpliceRejected({ reason: `a ${entry.kind} entry carries no ${what}` }));
    switch (entry.kind) {
        case "bitizen": {
            return entry.item === undefined ? missing("item") : bitizenSelector(side, save, entry.item);
        }
        case "costume": {
            return entry.item === undefined
                ? missing("item")
                : Effect.succeed({ _tag: "Costume", costume: entry.item });
        }
        case "pet": {
            return entry.item === undefined ? missing("item") : Effect.succeed({ _tag: "Pet", pet: entry.item });
        }
        case "coins":
        case "bux": {
            // A zero or negative amount is Splice's to refuse, as `InvalidAmount`.
            return entry.amount === undefined
                ? missing("amount")
                : Effect.succeed({ _tag: "Currency", currency: entry.kind, amount: entry.amount });
        }
        default: {
            return Function.absurd(entry.kind);
        }
    }
};

/** One side's agreed items, taken out of its save. */
interface Taken {
    /** The giver's tower without them. */
    readonly save: SaveDiffer.SaveData;
    /** What the other side receives. */
    readonly holdings: ReadonlyArray<Splice.Holding>;
    /** Every extraction's edit, in order, for the ledger. */
    readonly patch: SaveDiffer.SavePatch;
}

/**
 * Takes every agreed item out of the giver's save, one after another, each
 * from the save the previous one left.
 */
const takeFrom = Effect.fnUntraced(function* (
    side: Side,
    original: SaveDiffer.SaveData,
    items: ReadonlyArray<SpliceEntry>
) {
    let taken: Taken = { save: original, holdings: [], patch: [] };
    for (const entry of items) {
        const selector = yield* selectorFor(side, taken.save, entry);
        const extraction = yield* Splice.extract(taken.save, selector).pipe(
            Effect.mapError(refused(`the ${side} cannot hand over what was agreed`))
        );
        taken = {
            save: extraction.save,
            holdings: [...taken.holdings, extraction.holding],
            patch: [...taken.patch, ...extraction.patch],
        };
    }
    return taken;
});

/** Puts the other side's holdings into a save, one after another. */
const deliverTo = Effect.fnUntraced(function* (
    side: Side,
    save: SaveDiffer.SaveData,
    holdings: ReadonlyArray<Splice.Holding>
) {
    let delivered = save;
    for (const holding of holdings) {
        delivered = yield* Splice.insert(delivered, holding).pipe(
            Effect.mapError(refused(`the ${side} cannot take what was agreed`))
        );
    }
    return delivered;
});

/**
 * The splice itself, a function of the two stored originals and the agreed
 * lists and nothing else, so a replay computes exactly what the first run
 * did.
 *
 * Both sides' items come out of the *original* saves before anything goes
 * in, so every ownership check is against what the player actually had and
 * neither side can hand over something it only receives in this same trade.
 * Only then does each side's haul go into the other's tower.
 */
const spliceSaves = Effect.fnUntraced(function* (options: {
    readonly proposerOriginal: string;
    readonly counterpartyOriginal: string;
    readonly gives: ReadonlyArray<SpliceEntry>;
    readonly wants: ReadonlyArray<SpliceEntry>;
}) {
    const fromProposer = yield* takeFrom("proposer", yield* decodeSave(options.proposerOriginal), options.gives);
    const fromCounterparty = yield* takeFrom(
        "counterparty",
        yield* decodeSave(options.counterpartyOriginal),
        options.wants
    );

    const proposerSave = yield* deliverTo("proposer", fromProposer.save, fromCounterparty.holdings);
    const counterpartySave = yield* deliverTo("counterparty", fromCounterparty.save, fromProposer.holdings);

    // Whatever gets pushed has to read back as a save.
    const proposerSpliced = yield* encodeSave(proposerSave);
    const counterpartySpliced = yield* encodeSave(counterpartySave);
    yield* decodeSave(proposerSpliced);
    yield* decodeSave(counterpartySpliced);

    const detail = yield* encodeSplicedDetail({ proposer: fromProposer.patch, counterparty: fromCounterparty.patch });
    return { proposerSpliced, counterpartySpliced, detail };
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
        const tinyburg = yield* TinyburgApi;

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

        /**
         * The splice, computed before anything leaves the treasury: a trade
         * `Splice` refuses fails here, before either tower is snapshotted
         * or pushed. It reads only the stored originals, so running it
         * again after a crash records the same splice it did the first time.
         */
        const computed = yield* Activity.make({
            name: "computeSplice",
            success: Schema.Struct({ ok: Schema.Boolean, reason: Schema.String }),
            execute: Effect.gen(function* () {
                const plan = yield* Effect.orDie(splices.byTrade(payload.tradeId));
                if (Option.isNone(plan)) return { ok: false, reason: "splice plan disappeared" };

                const spliced = yield* spliceSaves({
                    proposerOriginal: Option.getOrElse(plan.value.proposerOriginal, () => ""),
                    counterpartyOriginal: Option.getOrElse(plan.value.counterpartyOriginal, () => ""),
                    gives: givesSpec.items,
                    wants: wantsSpec.items,
                });

                yield* Effect.orDie(
                    splices.recordSpliced({
                        tradeId: payload.tradeId,
                        proposerSpliced: spliced.proposerSpliced,
                        counterpartySpliced: spliced.counterpartySpliced,
                    })
                );
                yield* Effect.ignore(
                    ledger.append({ tradeId: payload.tradeId, event: "splice_spliced", detail: spliced.detail })
                );
                return { ok: true, reason: "" };
            }).pipe(
                Effect.catchTag("SpliceRejected", (error) => Effect.succeed({ ok: false, reason: error.reason })),
                Effect.orElseSucceed(() => ({ ok: false, reason: "the saves would not splice" }))
            ),
        });
        if (!computed.ok) return yield* failTrade(computed.reason);

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
