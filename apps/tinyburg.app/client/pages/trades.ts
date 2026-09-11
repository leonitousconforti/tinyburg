import { Effect, Match, Option, Result, Schema as S } from "effect";

import type { LinkedTowers } from "../backend.ts";
import type { Message as AppMessage } from "../main.ts";
import type { TradesMessages } from "../messages/types.ts";
import type { Html, HtmlBuilder } from "foldkit/html";

import { PlayerIdSchema } from "@tinyburg/nimblebit-sdk/NimblebitConfig";
import { type Language, longDate } from "@tinyburg/shared-ui/Internationalization";
import { SyncItemType } from "@tinyburg/tinytower-sdk/SyncItemType";
import { GrantStatus, Inventory, TradeDetail, Trade as TradeSchema } from "@tinyburg/treasury-sdk/Sdk";
import { AsyncData, Command } from "foldkit";
import { defineMessageUnion } from "foldkit/message";
import { evo } from "foldkit/struct";

import { Treasury } from "../backend.ts";
import { appBackLink } from "../ui/chrome.ts";

type Trade = typeof TradeSchema.Type;
type Detail = typeof TradeDetail.Type;
type Grant = typeof GrantStatus.Type;
type ItemSpecValue = Trade["gives"];
type SpliceKind = "bitizen" | "costume" | "pet" | "coins" | "bux";

// MODEL

const LoadFailed = S.Literals(["loadFailed"]);

export const GrantData = AsyncData.Schema(GrantStatus, LoadFailed);
export const TradesData = AsyncData.Schema(S.Array(TradeSchema), LoadFailed);
export const DetailData = AsyncData.Schema(TradeDetail, LoadFailed);
export const InventoryData = AsyncData.Schema(Inventory, LoadFailed);

export const TradesNotice = S.Literals(["connected", "proposed", "accepted", "cancelled", "confirmed"]);
export type TradesNotice = typeof TradesNotice.Type;

export const TradesProblem = S.Literals(["connectFailed", "badOffer", "notAllowed", "actionFailed", "conflict"]);
export type TradesProblem = typeof TradesProblem.Type;

const SpliceKindSchema = S.Literals(["bitizen", "costume", "pet", "coins", "bux"]);

/**
 * The propose form as typed, everything a string until submit: parsing
 * happens once, in the command, and a form that does not parse is a
 * `badOffer` banner rather than a request.
 */
export const ProposeForm = S.Struct({
    mechanism: S.Literals(["gift", "splice"]),
    proposerPlayerId: S.String,
    counterpartyPlayerId: S.String,
    giveKind: SpliceKindSchema,
    give: S.String,
    wantKind: SpliceKindSchema,
    want: S.String,
    ttlHours: S.String,
});
export type ProposeForm = typeof ProposeForm.Type;

export const TradesModel = S.Struct({
    grant: GrantData.schema,
    trades: TradesData.schema,
    detail: DetailData.schema,
    detailId: S.Option(S.String),
    showPropose: S.Boolean,
    form: ProposeForm,
    /** What the picked tower could put in, from the treasury's inventory endpoint. */
    inventory: InventoryData.schema,
    inventoryFor: S.Option(S.String),
    /** The tower to accept an open offer with, typed on the detail page. */
    acceptPlayerId: S.String,
    /** The trade id (or "propose") currently mid-request, so only its own button says so. */
    busy: S.Option(S.String),
    notice: S.Option(TradesNotice),
    problem: S.Option(TradesProblem),
});
export type TradesModel = typeof TradesModel.Type;

const initialForm: ProposeForm = {
    mechanism: "gift",
    proposerPlayerId: "",
    counterpartyPlayerId: "",
    giveKind: "bitizen",
    give: "",
    wantKind: "bitizen",
    want: "",
    ttlHours: "24",
};

export const initialTrades: TradesModel = {
    grant: GrantData.Idle(),
    trades: TradesData.Idle(),
    detail: DetailData.Idle(),
    detailId: Option.none(),
    showPropose: false,
    form: initialForm,
    inventory: InventoryData.Idle(),
    inventoryFor: Option.none(),
    acceptPlayerId: "",
    busy: Option.none(),
    notice: Option.none(),
    problem: Option.none(),
};

/**
 * The list page as entered. The connect flow is a cross-origin round trip
 * that lands back here with its outcome in the url, so the page opens saying
 * how it went; fetched data is kept from the last visit and revalidated
 * behind it.
 */
export const enterTrades = (
    connected: Option.Option<string>,
    error: Option.Option<string>,
    previous: TradesModel
): TradesModel => {
    const entered: TradesModel = evo(previous, {
        detailId: Option.none,
        busy: Option.none,
        notice: Option.none,
        problem: Option.none,
    });
    if (Option.isSome(error)) return evo(entered, { problem: () => Option.some("connectFailed" as const) });
    if (Option.contains(connected, "1")) return evo(entered, { notice: () => Option.some("connected" as const) });
    return entered;
};

/** The detail page as entered: transient state cleared, held detail revalidated behind. */
export const enterTradeDetail = (tradeId: string, previous: TradesModel): TradesModel =>
    evo(previous, {
        detailId: () => Option.some(tradeId),
        // A different trade's detail must not flash while the right one loads.
        detail: (detail) => (Option.contains(previous.detailId, tradeId) ? detail : DetailData.Idle()),
        acceptPlayerId: () => "",
        busy: Option.none,
        notice: Option.none,
        problem: Option.none,
    });

// MESSAGE

/**
 * Everything this page can say.
 *
 * `defineMessageUnion` declares the union and its constructors together, so a
 * variant cannot be added without joining the union or removed while something
 * still matches on it.
 */
export const TradesMessage = defineMessageUnion({
    SettledGrant: { result: S.Result(GrantStatus, LoadFailed) },
    SettledTrades: { result: S.Result(S.Array(TradeSchema), LoadFailed) },
    SettledDetail: { result: S.Result(TradeDetail, LoadFailed) },
    ToggledPropose: {},
    ChangedForm: { form: ProposeForm },
    /** A tower chip was clicked: sets the proposer and loads its inventory. */
    PickedTower: { playerId: S.String },
    SettledInventory: { result: S.Result(Inventory, LoadFailed) },
    ChangedAcceptPlayer: { value: S.String },
    SubmittedPropose: {},
    ClickedAccept: { tradeId: S.String, playerId: S.String },
    ClickedCancel: { tradeId: S.String },
    ClickedConfirm: { tradeId: S.String },
    CompletedTradeAction: { trade: TradeSchema, notice: TradesNotice },
    FailedTradeAction: { problem: TradesProblem },
    /** The session ended somewhere else while this page was open. */
    TradesSignedOut: {},
});
export type TradesMessage = typeof TradesMessage.Type;

// COMMAND

export const FetchGrant = Command.define("FetchGrant", {
    messages: [TradesMessage.SettledGrant, TradesMessage.TradesSignedOut],
    execute: Effect.gen(function* () {
        const treasury = yield* Treasury;
        const grant = yield* treasury.TreasuryGroup.GrantStatus();
        return TradesMessage.SettledGrant({ result: Result.succeed(grant) });
    }).pipe(
        Effect.catchTag("Unauthorized", () => Effect.succeed(TradesMessage.TradesSignedOut())),
        Effect.catch(() => Effect.succeed(TradesMessage.SettledGrant({ result: Result.fail("loadFailed") })))
    ),
});

export const FetchTrades = Command.define("FetchTrades", {
    messages: [TradesMessage.SettledTrades, TradesMessage.TradesSignedOut],
    execute: Effect.gen(function* () {
        const treasury = yield* Treasury;
        const trades = yield* treasury.TreasuryGroup.ListTrades();
        return TradesMessage.SettledTrades({ result: Result.succeed(trades) });
    }).pipe(
        Effect.catchTag("Unauthorized", () => Effect.succeed(TradesMessage.TradesSignedOut())),
        Effect.catch(() => Effect.succeed(TradesMessage.SettledTrades({ result: Result.fail("loadFailed") })))
    ),
});

export const FetchDetail = Command.define("FetchDetail", {
    args: { tradeId: S.String },
    messages: [TradesMessage.SettledDetail, TradesMessage.TradesSignedOut],
    execute: ({ tradeId }) =>
        Effect.gen(function* () {
            const treasury = yield* Treasury;
            const detail = yield* treasury.TreasuryGroup.GetTrade({ params: { tradeId } });
            return TradesMessage.SettledDetail({ result: Result.succeed(detail) });
        }).pipe(
            Effect.catchTag("Unauthorized", () => Effect.succeed(TradesMessage.TradesSignedOut())),
            Effect.catch(() => Effect.succeed(TradesMessage.SettledDetail({ result: Result.fail("loadFailed") })))
        ),
});

const decodePlayerId = S.decodeUnknownEffect(PlayerIdSchema);

/**
 * What the picked tower could put into a trade. `Forbidden` means the
 * treasury holds no grant yet - the connect banner is already on the page,
 * so the picker just reads as unavailable rather than raising an error.
 */
export const FetchInventory = Command.define("FetchInventory", {
    args: { playerId: S.String },
    messages: [TradesMessage.SettledInventory, TradesMessage.TradesSignedOut],
    execute: ({ playerId }) =>
        Effect.gen(function* () {
            const treasury = yield* Treasury;
            const decoded = yield* decodePlayerId(playerId);
            const inventory = yield* treasury.TreasuryGroup.ListInventory({ params: { playerId: decoded } });
            return TradesMessage.SettledInventory({ result: Result.succeed(inventory) });
        }).pipe(
            Effect.catchTag("Unauthorized", () => Effect.succeed(TradesMessage.TradesSignedOut())),
            Effect.catch(() => Effect.succeed(TradesMessage.SettledInventory({ result: Result.fail("loadFailed") })))
        ),
});

/** One typed form entry turned into the item spec the api takes. */
const itemSpecFor = (mechanism: "gift" | "splice", kind: SpliceKind, value: string): Option.Option<ItemSpecValue> => {
    if (mechanism === "gift") {
        return value === ""
            ? Option.none()
            : Option.some({ _tag: "GiftItem" as const, itemType: SyncItemType.Play, item: value });
    }
    if (kind === "coins" || kind === "bux") {
        const amount = Number(value);
        return Number.isInteger(amount) && amount > 0
            ? Option.some({ _tag: "SpliceItems" as const, items: [{ kind, amount }] })
            : Option.none();
    }
    return value === "" ? Option.none() : Option.some({ _tag: "SpliceItems" as const, items: [{ kind, item: value }] });
};

const failedFrom = (problem: TradesProblem) => Effect.succeed(TradesMessage.FailedTradeAction({ problem }));

export const ProposeTradeCommand = Command.define("ProposeTrade", {
    args: { form: ProposeForm },
    messages: [TradesMessage.CompletedTradeAction, TradesMessage.FailedTradeAction, TradesMessage.TradesSignedOut],
    execute: ({ form }) =>
        Effect.gen(function* () {
            const treasury = yield* Treasury;

            const gives = itemSpecFor(form.mechanism, form.giveKind, form.give);
            const wants = itemSpecFor(form.mechanism, form.wantKind, form.want);
            const ttlHours = Number(form.ttlHours);
            if (Option.isNone(gives) || Option.isNone(wants) || !Number.isInteger(ttlHours) || ttlHours < 1) {
                return TradesMessage.FailedTradeAction({ problem: "badOffer" });
            }

            const proposerPlayerId = yield* decodePlayerId(form.proposerPlayerId.trim().toUpperCase());
            const counterparty = form.counterpartyPlayerId.trim().toUpperCase();
            const counterpartyPlayerId = counterparty === "" ? undefined : yield* decodePlayerId(counterparty);

            const trade = yield* treasury.TreasuryGroup.ProposeTrade({
                payload: {
                    mechanism: form.mechanism,
                    game: "tinytower",
                    proposerPlayerId,
                    counterpartyPlayerId,
                    gives: gives.value,
                    wants: wants.value,
                    ttlHours: Math.min(ttlHours, 168),
                },
            });
            return TradesMessage.CompletedTradeAction({ trade, notice: "proposed" });
        }).pipe(
            Effect.catchTag("Unauthorized", () => Effect.succeed(TradesMessage.TradesSignedOut())),
            Effect.catchTag("SchemaError", () => failedFrom("badOffer")),
            Effect.catchTag("BadRequest", () => failedFrom("badOffer")),
            Effect.catchTag("Forbidden", () => failedFrom("notAllowed")),
            Effect.catch(() => failedFrom("actionFailed"))
        ),
});

export const AcceptTradeCommand = Command.define("AcceptTrade", {
    args: { tradeId: S.String, playerId: S.String },
    messages: [TradesMessage.CompletedTradeAction, TradesMessage.FailedTradeAction, TradesMessage.TradesSignedOut],
    execute: ({ playerId, tradeId }) =>
        Effect.gen(function* () {
            const treasury = yield* Treasury;
            const decoded = yield* decodePlayerId(playerId.trim().toUpperCase());
            const trade = yield* treasury.TreasuryGroup.AcceptTrade({
                params: { tradeId },
                payload: { playerId: decoded },
            });
            return TradesMessage.CompletedTradeAction({ trade, notice: "accepted" });
        }).pipe(
            Effect.catchTag("Unauthorized", () => Effect.succeed(TradesMessage.TradesSignedOut())),
            Effect.catchTag("SchemaError", () => failedFrom("badOffer")),
            Effect.catchTag("Forbidden", () => failedFrom("notAllowed")),
            Effect.catchTag("Conflict", () => failedFrom("conflict")),
            Effect.catch(() => failedFrom("actionFailed"))
        ),
});

export const CancelTradeCommand = Command.define("CancelTrade", {
    args: { tradeId: S.String },
    messages: [TradesMessage.CompletedTradeAction, TradesMessage.FailedTradeAction, TradesMessage.TradesSignedOut],
    execute: ({ tradeId }) =>
        Effect.gen(function* () {
            const treasury = yield* Treasury;
            const trade = yield* treasury.TreasuryGroup.CancelTrade({ params: { tradeId } });
            return TradesMessage.CompletedTradeAction({ trade, notice: "cancelled" });
        }).pipe(
            Effect.catchTag("Unauthorized", () => Effect.succeed(TradesMessage.TradesSignedOut())),
            Effect.catchTag("Conflict", () => failedFrom("conflict")),
            Effect.catch(() => failedFrom("actionFailed"))
        ),
});

export const ConfirmSpliceCommand = Command.define("ConfirmSplice", {
    args: { tradeId: S.String },
    messages: [TradesMessage.CompletedTradeAction, TradesMessage.FailedTradeAction, TradesMessage.TradesSignedOut],
    execute: ({ tradeId }) =>
        Effect.gen(function* () {
            const treasury = yield* Treasury;
            const trade = yield* treasury.TreasuryGroup.ConfirmSplice({ params: { tradeId } });
            return TradesMessage.CompletedTradeAction({ trade, notice: "confirmed" });
        }).pipe(
            Effect.catchTag("Unauthorized", () => Effect.succeed(TradesMessage.TradesSignedOut())),
            Effect.catchTag("Conflict", () => failedFrom("conflict")),
            Effect.catch(() => failedFrom("actionFailed"))
        ),
});

// UPDATE

type TradesStep = readonly [TradesModel, ReadonlyArray<Command.Command<TradesMessage, never, Treasury>>];

/** Starting an action clears whatever the last one had to say about itself. */
const starting = (model: TradesModel, busy: string): TradesModel =>
    evo(model, { busy: () => Option.some(busy), notice: Option.none, problem: Option.none });

export const updateTrades = (model: TradesModel, message: TradesMessage): TradesStep =>
    Match.value(message).pipe(
        Match.withReturnType<TradesStep>(),
        Match.tagsExhaustive({
            SettledGrant: ({ result }) => [evo(model, { grant: AsyncData.settle(result) }), []],
            SettledTrades: ({ result }) => [evo(model, { trades: AsyncData.settle(result) }), []],
            SettledDetail: ({ result }) => [evo(model, { detail: AsyncData.settle(result) }), []],

            ToggledPropose: () => [
                evo(model, { showPropose: (open) => !open, notice: Option.none, problem: Option.none }),
                [],
            ],
            ChangedForm: ({ form }) => [evo(model, { form: () => form }), []],

            // Picking a tower is also the moment its inventory becomes
            // relevant; a repick of the same tower keeps what is held.
            PickedTower: ({ playerId }) => {
                const picked = evo(model, { form: (form) => ({ ...form, proposerPlayerId: playerId }) });
                if (Option.contains(model.inventoryFor, playerId)) return [picked, []];
                return [
                    evo(picked, {
                        inventoryFor: () => Option.some(playerId),
                        inventory: () => InventoryData.Loading(),
                    }),
                    [FetchInventory({ playerId })],
                ];
            },
            SettledInventory: ({ result }) => [evo(model, { inventory: AsyncData.settle(result) }), []],

            ChangedAcceptPlayer: ({ value }) => [evo(model, { acceptPlayerId: () => value }), []],

            SubmittedPropose: () => [starting(model, "propose"), [ProposeTradeCommand({ form: model.form })]],
            ClickedAccept: ({ playerId, tradeId }) => [
                starting(model, tradeId),
                [AcceptTradeCommand({ tradeId, playerId })],
            ],
            ClickedCancel: ({ tradeId }) => [starting(model, tradeId), [CancelTradeCommand({ tradeId })]],
            ClickedConfirm: ({ tradeId }) => [starting(model, tradeId), [ConfirmSpliceCommand({ tradeId })]],

            // Whatever the action was, the fresh trade the server answered
            // with lands in place and both lists revalidate behind it.
            CompletedTradeAction: ({ notice, trade }) => [
                evo(model, {
                    busy: Option.none,
                    notice: () => Option.some(notice),
                    showPropose: () => false,
                    form: (form) => (notice === "proposed" ? initialForm : form),
                    trades: (trades) => Option.getOrElse(AsyncData.revalidate(trades), () => trades),
                }),
                [
                    FetchTrades(),
                    ...(Option.contains(model.detailId, trade.id) ? [FetchDetail({ tradeId: trade.id })] : []),
                ],
            ],

            FailedTradeAction: ({ problem }) => [
                evo(model, { busy: Option.none, problem: () => Option.some(problem) }),
                [],
            ],

            TradesSignedOut: () => [evo(model, { busy: Option.none }), []],
        })
    );

// VIEW

const card = "bg-card-bg shadow-pixel-hover border-gold w-full rounded-2xl border-3 p-8";

const primaryButton =
    "font-pixel shadow-pixel hover:shadow-pixel-hover bg-sky-blue shrink-0 rounded-lg border-2 border-sky-dark px-4 py-3 text-[0.6rem] text-white transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-50";

const quietButton =
    "font-pixel shadow-pixel hover:shadow-pixel-hover shrink-0 rounded-lg border-2 border-gray-300 bg-white px-4 py-3 text-[0.6rem] text-gray-700 transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-50";

const dangerButton =
    "font-pixel shrink-0 rounded-lg border-2 border-red-300 bg-white px-3 py-2 text-[0.55rem] text-red-700 transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:border-red-500 disabled:pointer-events-none disabled:opacity-50";

const inputClass =
    "font-mono w-full rounded-lg border-2 border-gray-300 bg-white px-3 py-2 text-lg text-gray-800 focus:border-sky-blue focus:outline-none";

const labelClass = "font-pixel text-[0.6rem] text-gray-600";

const banner = (h: HtmlBuilder<AppMessage>, tone: "notice" | "problem", text: string): Html =>
    h.p(
        [
            h.Role("status"),
            h.Class(
                tone === "notice"
                    ? "font-mono border-sky-blue bg-sky-light/40 text-sky-dark rounded-lg border-2 px-4 py-3 text-lg"
                    : "font-mono rounded-lg border-2 border-red-300 bg-red-50 px-4 py-3 text-lg text-red-700"
            ),
        ],
        [text]
    );

/** A short human summary of what one side puts in. */
const itemSummary = (msgs: TradesMessages, spec: ItemSpecValue): string => {
    if (spec._tag === "GiftItem") {
        return spec.item.length > 24 ? `${spec.item.slice(0, 24)}…` : spec.item;
    }
    return spec.items
        .map((entry) =>
            entry.kind === "coins" || entry.kind === "bux"
                ? `${entry.amount ?? 0} ${msgs.kinds[entry.kind]}`
                : msgs.kinds[entry.kind]
        )
        .join(", ");
};

const stateChip = (h: HtmlBuilder<AppMessage>, msgs: TradesMessages, state: Trade["state"]): Html => {
    const settled = state === "settled";
    const bad = state === "failed" || state === "expired" || state === "cancelled";
    return h.span(
        [
            h.Class(
                settled
                    ? "font-pixel rounded bg-green-600 px-2 py-1 text-[0.5rem] text-white"
                    : bad
                      ? "font-pixel rounded bg-red-400 px-2 py-1 text-[0.5rem] text-white"
                      : "font-pixel bg-sky-dark rounded px-2 py-1 text-[0.5rem] text-white"
            ),
        ],
        [msgs.states[state]]
    );
};

const connectSection = (h: HtmlBuilder<AppMessage>, msgs: TradesMessages, grant: Grant): Html =>
    grant.connected
        ? h.empty
        : h.section(
              [h.Class(card)],
              [
                  h.h2([h.Class("font-pixel mb-2 text-lg text-gray-800")], [msgs.connectHeading]),
                  h.p([h.Class("font-mono mb-6 text-lg text-gray-500")], [msgs.connectBody]),
                  h.a([h.Href(grant.connectUrl), h.Class(primaryButton)], [msgs.connectButton]),
              ]
          );

const formField = (h: HtmlBuilder<AppMessage>, label: string, control: Html, hint?: string): Html =>
    h.label(
        [h.Class("flex flex-col gap-1")],
        [
            h.span([h.Class(labelClass)], [label]),
            control,
            ...(hint === undefined ? [] : [h.span([h.Class("font-mono text-base text-gray-500")], [hint])]),
        ]
    );

const chipOn = "font-pixel bg-sky-dark rounded px-2 py-1 text-[0.5rem] text-white";
const chipOff = "font-pixel rounded border-2 border-gray-300 bg-white px-2 py-1 text-[0.5rem] text-gray-600";

const chip = (h: HtmlBuilder<AppMessage>, label: string, selected: boolean, onClick: AppMessage): Html =>
    h.button([h.Type("button"), h.Class(selected ? chipOn : chipOff), h.OnClick(onClick)], [label]);

const kindSelect = (
    h: HtmlBuilder<AppMessage>,
    msgs: TradesMessages,
    value: SpliceKind,
    onChange: (kind: SpliceKind) => AppMessage
): Html =>
    h.div(
        [h.Class("flex flex-wrap gap-2")],
        (["bitizen", "costume", "pet", "coins", "bux"] as const).map((kind) =>
            chip(h, msgs.kinds[kind], kind === value, onChange(kind))
        )
    );

/** The rows a data-state holds right now, however fresh; undefined when it holds nothing. */
const heldTowers = (towers: LinkedTowers): ReadonlyArray<{ readonly playerId: string }> | undefined =>
    AsyncData.match(towers, {
        onIdle: () => undefined,
        onLoading: () => undefined,
        onFailure: () => undefined,
        onRefreshing: (data) => data,
        onStale: ({ data }) => data,
        onSuccess: (data) => data,
    });

const heldInventory = (inventory: TradesModel["inventory"]): typeof Inventory.Type | undefined =>
    AsyncData.match(inventory, {
        onIdle: () => undefined,
        onLoading: () => undefined,
        onFailure: () => undefined,
        onRefreshing: (data) => data,
        onStale: ({ data }) => data,
        onSuccess: (data) => data,
    });

const isFailure = (inventory: TradesModel["inventory"]): boolean =>
    AsyncData.match(inventory, {
        onIdle: () => false,
        onLoading: () => false,
        onFailure: () => true,
        onRefreshing: () => false,
        onStale: () => false,
        onSuccess: () => false,
    });

/** Encoded item strings are not for reading; a stub is enough to tell chips apart. */
const shorten = (value: string): string => (value.length > 18 ? `${value.slice(0, 18)}…` : value);

const proposeSection = (
    h: HtmlBuilder<AppMessage>,
    msgs: TradesMessages,
    model: TradesModel,
    towers: LinkedTowers
): Html => {
    const form = model.form;
    const busy = Option.contains(model.busy, "propose");
    const set = (patch: Partial<ProposeForm>): AppMessage => TradesMessage.ChangedForm({ form: { ...form, ...patch } });

    if (!model.showPropose) {
        return h.section(
            [h.Class(card)],
            [
                h.h2([h.Class("font-pixel mb-2 text-lg text-gray-800")], [msgs.proposeHeading]),
                h.p([h.Class("font-mono mb-6 text-lg text-gray-500")], [msgs.duplicationNote]),
                h.button(
                    [h.Type("button"), h.Class(primaryButton), h.OnClick(TradesMessage.ToggledPropose())],
                    [msgs.proposeToggle]
                ),
            ]
        );
    }

    const linked = heldTowers(towers);
    const inventoryRelevant = Option.contains(model.inventoryFor, form.proposerPlayerId);
    const inventory = inventoryRelevant ? heldInventory(model.inventory) : undefined;

    /**
     * The "you give" side, fed by the picked tower's real inventory: chips
     * for the tradable things, a live balance for currency, and the manual
     * input always underneath so nothing is gated on the fetch.
     */
    const giveField = (): Html => {
        const kind = form.giveKind;
        const currency = form.mechanism === "splice" && (kind === "coins" || kind === "bux");
        const options: ReadonlyArray<{ readonly label: string; readonly value: string }> =
            inventory === undefined || currency
                ? []
                : form.mechanism === "gift"
                  ? inventory.bitizens.map((encoded) => ({ label: shorten(encoded), value: `bit:${encoded}` }))
                  : kind === "bitizen"
                    ? inventory.bitizens.map((encoded) => ({ label: shorten(encoded), value: encoded }))
                    : kind === "costume"
                      ? inventory.costumes.map((encoded) => ({ label: shorten(encoded), value: encoded }))
                      : inventory.pets.map((encoded) => ({ label: shorten(encoded), value: encoded }));
        const shown = options.slice(0, 30);

        return h.div(
            [h.Class("flex flex-col gap-2")],
            [
                h.span([h.Class(labelClass)], [msgs.youGiveLabel]),
                ...(form.mechanism === "splice" ? [kindSelect(h, msgs, kind, (giveKind) => set({ giveKind }))] : []),
                ...(shown.length > 0
                    ? [
                          h.span([h.Class("font-mono text-base text-gray-500")], [msgs.available(options.length)]),
                          h.div(
                              [h.Class("flex flex-wrap gap-2")],
                              shown.map((option) =>
                                  chip(h, option.label, form.give === option.value, set({ give: option.value }))
                              )
                          ),
                      ]
                    : []),
                ...(currency && inventory !== undefined
                    ? [
                          h.span(
                              [h.Class("font-mono text-base text-gray-500")],
                              [msgs.balance(String(kind === "coins" ? inventory.coins : inventory.bux))]
                          ),
                      ]
                    : []),
                ...(inventoryRelevant && isFailure(model.inventory)
                    ? [h.span([h.Class("font-mono text-base text-red-700")], [msgs.inventoryLoadFailed])]
                    : []),
                h.input([h.Type("text"), h.Class(inputClass), h.Value(form.give), h.OnInput((give) => set({ give }))]),
                h.span([h.Class("font-mono text-base text-gray-500")], [currency ? msgs.amountHint : msgs.itemHint]),
            ]
        );
    };

    /** The "you want" side stays manual: the counterparty's inventory is not ours to list. */
    const wantField = (): Html => {
        const currency = form.mechanism === "splice" && (form.wantKind === "coins" || form.wantKind === "bux");
        return h.div(
            [h.Class("flex flex-col gap-2")],
            [
                h.span([h.Class(labelClass)], [msgs.youWantLabel]),
                ...(form.mechanism === "splice"
                    ? [kindSelect(h, msgs, form.wantKind, (wantKind) => set({ wantKind }))]
                    : []),
                h.input([h.Type("text"), h.Class(inputClass), h.Value(form.want), h.OnInput((want) => set({ want }))]),
                h.span([h.Class("font-mono text-base text-gray-500")], [currency ? msgs.amountHint : msgs.wantHint]),
            ]
        );
    };

    return h.section(
        [h.Class(card)],
        [
            h.h2([h.Class("font-pixel mb-2 text-lg text-gray-800")], [msgs.proposeHeading]),
            h.p([h.Class("font-mono mb-6 text-lg text-gray-500")], [msgs.duplicationNote]),
            h.form(
                [h.Class("flex flex-col gap-4"), h.OnSubmit(TradesMessage.SubmittedPropose())],
                [
                    formField(
                        h,
                        msgs.mechanismLabel,
                        h.div(
                            [h.Class("flex gap-2")],
                            [
                                h.button(
                                    [
                                        h.Type("button"),
                                        h.Class(form.mechanism === "gift" ? primaryButton : quietButton),
                                        h.OnClick(set({ mechanism: "gift" })),
                                    ],
                                    [msgs.mechanismGift]
                                ),
                                h.button(
                                    [
                                        h.Type("button"),
                                        h.Class(form.mechanism === "splice" ? primaryButton : quietButton),
                                        h.OnClick(set({ mechanism: "splice" })),
                                    ],
                                    [msgs.mechanismSplice]
                                ),
                            ]
                        )
                    ),
                    formField(
                        h,
                        msgs.yourTowerLabel,
                        linked !== undefined && linked.length > 0
                            ? h.div(
                                  [h.Class("flex flex-wrap gap-2")],
                                  linked.map((tower) =>
                                      chip(
                                          h,
                                          tower.playerId,
                                          form.proposerPlayerId === tower.playerId,
                                          TradesMessage.PickedTower({ playerId: tower.playerId })
                                      )
                                  )
                              )
                            : h.input([
                                  h.Type("text"),
                                  h.Class(inputClass),
                                  h.Value(form.proposerPlayerId),
                                  h.OnInput((value) => set({ proposerPlayerId: value })),
                              ]),
                        linked !== undefined && linked.length > 0 ? msgs.pickTower : msgs.orTypeCode
                    ),
                    formField(
                        h,
                        msgs.counterpartyLabel,
                        h.input([
                            h.Type("text"),
                            h.Class(inputClass),
                            h.Value(form.counterpartyPlayerId),
                            h.OnInput((value) => set({ counterpartyPlayerId: value })),
                        ]),
                        msgs.counterpartyHint
                    ),
                    giveField(),
                    wantField(),
                    formField(
                        h,
                        msgs.ttlLabel,
                        h.input([
                            h.Type("number"),
                            h.Class(inputClass),
                            h.Value(form.ttlHours),
                            h.OnInput((value) => set({ ttlHours: value })),
                        ])
                    ),
                    h.div(
                        [h.Class("flex gap-3")],
                        [
                            h.button(
                                [h.Type("submit"), h.Class(primaryButton), h.Disabled(busy)],
                                [busy ? msgs.proposing : msgs.submitPropose]
                            ),
                            h.button(
                                [h.Type("button"), h.Class(quietButton), h.OnClick(TradesMessage.ToggledPropose())],
                                [msgs.proposeCancel]
                            ),
                        ]
                    ),
                ]
            ),
        ]
    );
};

const tradeCard = (h: HtmlBuilder<AppMessage>, msgs: TradesMessages, language: Language, trade: Trade): Html =>
    h.keyed("a")(
        trade.id,
        [
            h.Href(`/trades/${trade.id}`),
            h.Class(
                "shadow-pixel hover:shadow-pixel-hover hover:border-sky-blue flex flex-wrap items-center gap-3 rounded-lg border-2 border-gray-300 bg-white px-4 py-3 no-underline transition-all hover:-translate-x-0.5 hover:-translate-y-0.5"
            ),
        ],
        [
            h.div(
                [h.Class("min-w-0 flex-1")],
                [
                    h.div(
                        [h.Class("flex flex-wrap items-center gap-2")],
                        [
                            h.span(
                                [h.Class("font-mono text-xl text-gray-800")],
                                [`${trade.proposerPlayerId} ⇄ ${trade.counterpartyPlayerId ?? msgs.openOffer}`]
                            ),
                            stateChip(h, msgs, trade.state),
                            h.span(
                                [
                                    h.Class(
                                        "font-pixel rounded border-2 border-gray-300 px-2 py-1 text-[0.5rem] text-gray-600"
                                    ),
                                ],
                                [msgs.mechanisms[trade.mechanism]]
                            ),
                        ]
                    ),
                    h.div(
                        [h.Class("font-mono text-base text-gray-500")],
                        [
                            `${msgs.gives(itemSummary(msgs, trade.gives))} · ${msgs.wants(itemSummary(msgs, trade.wants))}`,
                        ]
                    ),
                    h.div(
                        [h.Class("font-mono text-base text-gray-500")],
                        [msgs.expires(longDate(language, trade.expiresAt))]
                    ),
                ]
            ),
            h.span([h.Class("font-pixel shrink-0 text-[0.6rem] text-gray-500")], [msgs.viewTrade]),
        ]
    );

const tradesSection = (
    h: HtmlBuilder<AppMessage>,
    msgs: TradesMessages,
    language: Language,
    model: TradesModel
): Html => {
    const list = (trades: ReadonlyArray<Trade>): Html =>
        trades.length === 0
            ? h.p([h.Class("font-mono text-xl text-gray-600")], [msgs.emptyTrades])
            : h.div(
                  [h.Class("flex flex-col gap-4")],
                  trades.map((trade) => tradeCard(h, msgs, language, trade))
              );

    return h.section(
        [h.Class(card)],
        [
            h.h2([h.Class("font-pixel mb-6 text-lg text-gray-800")], [msgs.tradesHeading]),
            AsyncData.match(model.trades, {
                onIdle: () => h.p([h.Class("font-mono text-xl text-gray-600")], [msgs.loading]),
                onLoading: () => h.p([h.Class("font-mono text-xl text-gray-600")], [msgs.loading]),
                onFailure: () => h.p([h.Class("font-mono text-xl text-red-700")], [msgs.loadFailed]),
                onRefreshing: list,
                onStale: ({ data }) => list(data),
                onSuccess: list,
            }),
        ]
    );
};

export const tradesView = (
    h: HtmlBuilder<AppMessage>,
    msgs: TradesMessages,
    language: Language,
    model: TradesModel,
    towers: LinkedTowers
): Html =>
    h.div(
        [h.Class("relative z-10 flex min-h-screen flex-col items-center p-8 pt-24")],
        [
            appBackLink(h, "/", msgs.backToHome),
            h.div(
                [h.Class("flex w-full max-w-2xl flex-col gap-6")],
                [
                    h.h1([h.Class("font-pixel text-dark-blue text-lg")], [msgs.heading]),
                    h.p([h.Class("font-mono text-lg text-gray-600")], [msgs.tagline]),
                    ...Option.match(model.notice, {
                        onSome: (notice) => [banner(h, "notice", msgs.notices[notice])],
                        onNone: () => [],
                    }),
                    ...Option.match(model.problem, {
                        onSome: (problem) => [banner(h, "problem", msgs.problems[problem])],
                        onNone: () => [],
                    }),
                    AsyncData.match(model.grant, {
                        onIdle: () => h.empty,
                        onLoading: () => h.empty,
                        onFailure: () => h.empty,
                        onRefreshing: (grant) => connectSection(h, msgs, grant),
                        onStale: ({ data }) => connectSection(h, msgs, data),
                        onSuccess: (grant) => connectSection(h, msgs, grant),
                    }),
                    proposeSection(h, msgs, model, towers),
                    tradesSection(h, msgs, language, model),
                ]
            ),
        ]
    );

// DETAIL VIEW

const legRow = (h: HtmlBuilder<AppMessage>, msgs: TradesMessages, leg: Detail["legs"][number]): Html =>
    h.div(
        [h.Class("flex flex-wrap items-center gap-3 rounded-lg border-2 border-gray-300 bg-white px-4 py-3")],
        [
            h.div(
                [h.Class("min-w-0 flex-1")],
                [
                    h.div([h.Class("font-mono text-xl text-gray-800")], [`${leg.fromPlayerId} → ${leg.toPlayerId}`]),
                    h.div([h.Class("font-mono text-base wrap-break-word text-gray-500")], [leg.item]),
                ]
            ),
            h.span(
                [h.Class("font-pixel bg-sky-dark rounded px-2 py-1 text-[0.5rem] text-white")],
                [msgs.legStates[leg.state]]
            ),
        ]
    );

const historyRow = (
    h: HtmlBuilder<AppMessage>,
    language: Language,
    entry: Detail["ledger"][number],
    index: number
): Html =>
    h.keyed("div")(
        `${index}`,
        [
            h.Class(
                "font-mono flex flex-wrap justify-between gap-2 border-b border-gray-200 py-2 text-base text-gray-600"
            ),
        ],
        [h.span([], [entry.event]), h.span([h.Class("text-gray-400")], [longDate(language, entry.at)])]
    );

const detailActions = (
    h: HtmlBuilder<AppMessage>,
    msgs: TradesMessages,
    model: TradesModel,
    detail: Detail,
    towers: LinkedTowers
): Html => {
    const trade = detail.trade;
    const busy = Option.contains(model.busy, trade.id);

    const cancellable =
        trade.role !== undefined &&
        (trade.state === "proposed" ||
            trade.state === "accepted" ||
            trade.state === "awaiting_confirmation" ||
            trade.state === "escrowing" ||
            trade.state === "escrowed");

    const acceptable = trade.state === "proposed" && trade.role !== "proposer";

    const myConfirmation =
        trade.role === "proposer"
            ? trade.proposerConfirmedAt
            : trade.role === "counterparty"
              ? trade.counterpartyConfirmedAt
              : undefined;
    const confirmable =
        trade.mechanism === "splice" &&
        trade.state === "awaiting_confirmation" &&
        trade.role !== undefined &&
        myConfirmation === undefined;
    const waitingOnOther =
        trade.mechanism === "splice" &&
        trade.state === "awaiting_confirmation" &&
        trade.role !== undefined &&
        myConfirmation !== undefined;

    return h.div(
        [h.Class("flex flex-col gap-4")],
        [
            ...(acceptable && trade.counterpartyPlayerId !== undefined
                ? // A directed trade already names the tower it is for; one
                  // click accepts as it, nothing to type.
                  [
                      h.button(
                          [
                              h.Type("button"),
                              h.Class(primaryButton),
                              h.Disabled(busy),
                              h.OnClick(
                                  TradesMessage.ClickedAccept({
                                      tradeId: trade.id,
                                      playerId: trade.counterpartyPlayerId,
                                  })
                              ),
                          ],
                          [busy ? msgs.accepting : msgs.acceptButton]
                      ),
                  ]
                : []),
            ...(acceptable && trade.counterpartyPlayerId === undefined
                ? // An open offer needs to know which of the caller's towers
                  // takes it: chips when the linked list is at hand, typed
                  // fallback when it is not.
                  [
                      h.div(
                          [h.Class("flex flex-col gap-2")],
                          [
                              h.span([h.Class(labelClass)], [msgs.acceptPlayerLabel]),
                              ...(() => {
                                  const linked = heldTowers(towers);
                                  return linked !== undefined && linked.length > 0
                                      ? [
                                            h.div(
                                                [h.Class("flex flex-wrap gap-2")],
                                                linked.map((tower) =>
                                                    chip(
                                                        h,
                                                        tower.playerId,
                                                        model.acceptPlayerId === tower.playerId,
                                                        TradesMessage.ChangedAcceptPlayer({ value: tower.playerId })
                                                    )
                                                )
                                            ),
                                        ]
                                      : [
                                            h.input([
                                                h.Type("text"),
                                                h.Class(inputClass),
                                                h.Value(model.acceptPlayerId),
                                                h.OnInput((value) => TradesMessage.ChangedAcceptPlayer({ value })),
                                            ]),
                                        ];
                              })(),
                              h.button(
                                  [
                                      h.Type("button"),
                                      h.Class(primaryButton),
                                      h.Disabled(busy || model.acceptPlayerId === ""),
                                      h.OnClick(
                                          TradesMessage.ClickedAccept({
                                              tradeId: trade.id,
                                              playerId: model.acceptPlayerId,
                                          })
                                      ),
                                  ],
                                  [busy ? msgs.accepting : msgs.acceptButton]
                              ),
                          ]
                      ),
                  ]
                : []),
            ...(confirmable
                ? [
                      h.div(
                          [h.Class("flex flex-col gap-3")],
                          [
                              banner(h, "problem", msgs.confirmWarning),
                              h.button(
                                  [
                                      h.Type("button"),
                                      h.Class(primaryButton),
                                      h.Disabled(busy),
                                      h.OnClick(TradesMessage.ClickedConfirm({ tradeId: trade.id })),
                                  ],
                                  [msgs.confirmButton]
                              ),
                          ]
                      ),
                  ]
                : []),
            ...(waitingOnOther ? [banner(h, "notice", msgs.awaitingOther)] : []),
            ...(cancellable
                ? [
                      h.button(
                          [
                              h.Type("button"),
                              h.Class(dangerButton),
                              h.Disabled(busy),
                              h.OnClick(TradesMessage.ClickedCancel({ tradeId: trade.id })),
                          ],
                          [msgs.cancelButton]
                      ),
                  ]
                : []),
        ]
    );
};

export const tradeDetailView = (
    h: HtmlBuilder<AppMessage>,
    msgs: TradesMessages,
    language: Language,
    model: TradesModel,
    towers: LinkedTowers
): Html => {
    const body = (detail: Detail): Html => {
        const trade = detail.trade;
        return h.div(
            [h.Class("flex w-full max-w-2xl flex-col gap-6")],
            [
                h.h1(
                    [h.Class("font-pixel text-dark-blue text-lg")],
                    [`${trade.proposerPlayerId} ⇄ ${trade.counterpartyPlayerId ?? msgs.openOffer}`]
                ),
                h.div(
                    [h.Class("flex flex-wrap items-center gap-2")],
                    [
                        stateChip(h, msgs, trade.state),
                        h.span(
                            [
                                h.Class(
                                    "font-pixel rounded border-2 border-gray-300 px-2 py-1 text-[0.5rem] text-gray-600"
                                ),
                            ],
                            [msgs.mechanisms[trade.mechanism]]
                        ),
                    ]
                ),
                ...Option.match(model.notice, {
                    onSome: (notice) => [banner(h, "notice", msgs.notices[notice])],
                    onNone: () => [],
                }),
                ...Option.match(model.problem, {
                    onSome: (problem) => [banner(h, "problem", msgs.problems[problem])],
                    onNone: () => [],
                }),
                h.section(
                    [h.Class(card)],
                    [
                        h.div(
                            [h.Class("font-mono flex flex-col gap-1 text-lg text-gray-600")],
                            [
                                h.span([], [msgs.gives(itemSummary(msgs, trade.gives))]),
                                h.span([], [msgs.wants(itemSummary(msgs, trade.wants))]),
                                h.span([], [msgs.expires(longDate(language, trade.expiresAt))]),
                                ...(trade.failureReason === undefined
                                    ? []
                                    : [h.span([h.Class("text-red-700")], [msgs.failureReason(trade.failureReason)])]),
                            ]
                        ),
                    ]
                ),
                detailActions(h, msgs, model, detail, towers),
                ...(detail.legs.length === 0
                    ? []
                    : [
                          h.section(
                              [h.Class(card)],
                              [
                                  h.h2([h.Class("font-pixel mb-4 text-lg text-gray-800")], [msgs.legsHeading]),
                                  h.div(
                                      [h.Class("flex flex-col gap-3")],
                                      detail.legs.map((leg) => legRow(h, msgs, leg))
                                  ),
                              ]
                          ),
                      ]),
                ...(detail.ledger.length === 0
                    ? []
                    : [
                          h.section(
                              [h.Class(card)],
                              [
                                  h.h2([h.Class("font-pixel mb-4 text-lg text-gray-800")], [msgs.historyHeading]),
                                  h.div(
                                      [h.Class("flex flex-col")],
                                      detail.ledger.map((entry, index) => historyRow(h, language, entry, index))
                                  ),
                              ]
                          ),
                      ]),
            ]
        );
    };

    return h.div(
        [h.Class("relative z-10 flex min-h-screen flex-col items-center p-8 pt-24")],
        [
            appBackLink(h, "/trades", msgs.backToTrades),
            AsyncData.match(model.detail, {
                onIdle: () => h.p([h.Class("font-mono text-xl text-gray-600")], [msgs.loading]),
                onLoading: () => h.p([h.Class("font-mono text-xl text-gray-600")], [msgs.loading]),
                onFailure: () => h.p([h.Class("font-mono text-xl text-red-700")], [msgs.loadFailed]),
                onRefreshing: body,
                onStale: ({ data }) => body(data),
                onSuccess: body,
            }),
        ]
    );
};
