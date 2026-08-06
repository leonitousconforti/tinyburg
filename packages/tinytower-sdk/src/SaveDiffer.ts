/**
 * Patch based editing of TinyTower save data.
 *
 * Rewriting a save in place is how an escrow moves something between two
 * players, and doing it by hand is how saves get corrupted. This module makes
 * the edit itself a value: a {@link SavePatch} is an ordered list of small,
 * serializable operations, and {@link differ} knows how to compute one, combine
 * two, and apply one.
 *
 * Modelling the edit as data rather than a function buys three things escrow
 * needs. A patch can be written to a database and applied later (that is what
 * "holding" an item means). A patch can be inspected and logged, so a support
 * request has an audit trail. And `diff` answers "what changed under us?" when
 * a player keeps playing between our download and our upload.
 *
 * ## What can be edited
 *
 * Four kinds of thing, grouped by how they behave rather than by what type they
 * happen to hold:
 *
 * - The ordered collections, `stories` (floors) and `bzns` (bitizens), plus the
 *   doorman, who is a bitizen kept outside the list.
 * - Collections of owned things — costumes, pets, roofs, lifts, lobbies —
 *   through {@link ItemsGranted} and {@link ItemsRevoked}.
 * - Counters, through {@link CounterAdjusted}, which moves a number by a
 *   distance instead of overwriting it. All three currencies are counters:
 *   `coins`, `bux`, and `gold`, which is golden tickets.
 * - Everything else scalar, through {@link FieldSet}, which takes its value as
 *   text the way the save itself stores it. That covers the fields `SaveData`
 *   names and the many it does not: a real save carries around sixty further
 *   raw entries, including at least eight more event currencies, and they are
 *   reachable by the same two operations as everything else.
 *
 * Two properties are deliberate rather than incidental. {@link ItemsGranted},
 * {@link ItemsRevoked} and {@link FieldSet} are **idempotent**, so a deposit
 * that crashes partway and gets retried cannot duplicate anything. And
 * {@link CounterAdjusted}, {@link ItemsGranted} and {@link FloorAppended} are
 * **position-free**, so a patch holding them means the same thing against any
 * save — which is what lets an escrow replay one into a tower that is not the
 * one it came from.
 *
 * Operations describe *what* to change, never *whether* it is allowed. Refusing
 * an edit that would corrupt a save is `Splice`'s job, and deciding what may be
 * traded at all belongs further up still.
 *
 * @since 1.0.0
 * @category Differ
 */

import type * as Differ from "effect/Differ";

import * as Array from "effect/Array";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

import type * as TinyTower from "./TinyTower.ts";

import * as Bitizens from "./Bitizens.ts";
import * as Floors from "./Floors.ts";

/**
 * A decoded save, as produced by `TinyTower.SaveData`.
 *
 * @since 1.0.0
 * @category Models
 */
export type SaveData = Schema.Schema.Type<typeof TinyTower.SaveData>;

/**
 * A decoded floor, as it appears in a save's `stories`.
 *
 * @since 1.0.0
 * @category Models
 */
export type Floor = Schema.Schema.Type<typeof Floors.Floor>;

/**
 * A decoded bitizen, as it appears in a save's `bzns`.
 *
 * @since 1.0.0
 * @category Models
 */
export type Bitizen = Schema.Schema.Type<typeof Bitizens.Bitizen>;

/**
 * Adds a floor to the top of the tower.
 *
 * This operation carries no position, which is what makes it safe to replay
 * against a save other than the one it came from: a floor always lands on top,
 * following the game's own rule for where a new floor goes. Escrow relies on
 * that, since the tower a floor is withdrawn into is never the tower it was
 * deposited from.
 *
 * @since 1.0.0
 * @category Operations
 */
export const FloorAppended = Schema.TaggedStruct("FloorAppended", {
    floor: Floors.Floor,
});

/**
 * Removes the floor at `storyHeight`, closing the gap underneath everything
 * above it.
 *
 * Unlike {@link FloorAppended} this names a position, so it only means
 * something against the exact save it was computed from.
 *
 * @since 1.0.0
 * @category Operations
 */
export const FloorRemoved = Schema.TaggedStruct("FloorRemoved", {
    storyHeight: Schema.Number,
});

/**
 * Adds a bitizen to the save.
 *
 * Position-free, and therefore replayable against another player's save.
 *
 * @since 1.0.0
 * @category Operations
 */
export const BitizenAdded = Schema.TaggedStruct("BitizenAdded", {
    bitizen: Bitizens.Bitizen,
});

/**
 * Removes the bitizen at `index`.
 *
 * @since 1.0.0
 * @category Operations
 */
export const BitizenRemoved = Schema.TaggedStruct("BitizenRemoved", {
    index: Schema.Number,
});

/**
 * Overwrites the bitizen at `index`.
 *
 * Used when a bitizen stays put but their situation changes, for example losing
 * a job because the floor they worked on was traded away.
 *
 * @since 1.0.0
 * @category Operations
 */
export const BitizenReplaced = Schema.TaggedStruct("BitizenReplaced", {
    index: Schema.Number,
    bitizen: Bitizens.Bitizen,
});

/**
 * Replaces the tower's doorman, who is a bitizen living outside `bzns`.
 *
 * @since 1.0.0
 * @category Operations
 */
export const DoormanSet = Schema.TaggedStruct("DoormanSet", {
    bitizen: Bitizens.Bitizen,
});

/**
 * What sort of value each scalar field of a save holds.
 *
 * One table rather than a list per type, because the split between numbers,
 * counters and text is an implementation detail of *applying* an edit, not
 * something the vocabulary of edits should expose. {@link CounterAdjusted} and
 * {@link FieldSet} both address a field by name and let this decide the rest.
 *
 * Anything absent from this table is looked for among the save's raw
 * `$unknown` entries instead, which is how the event currencies and JSON blobs
 * the schema never modelled stay reachable.
 *
 * @internal
 */
const FIELD_KINDS = {
    coins: "number",
    bux: "number",
    gold: "number",
    maxGold: "number",
    tip: "number",
    needUpgrade: "number",
    roof: "number",
    lift: "number",
    lobby: "number",
    buxBought: "number",
    installTime: "number",
    lastSaleTick: "number",
    raffleID: "number",
    sfx: "number",
    mus: "number",
    notes: "number",
    autoLiftDisable: "number",
    videos: "number",
    vidCheck: "number",
    bbnotes: "number",
    hidechat: "number",
    playerRegistered: "number",
    totalPoints: "bigint",
    vipTrialEnd: "bigint",
    ver: "text",
    lobbyName: "text",
    lrc: "text",
    lfc: "text",
    cfd: "text",
    lbc: "text",
    lbbcp: "text",
    lcmiss: "text",
    lcg: "text",
    tmi: "text",
    playerID: "text",
    bbpost: "text",
    Ppig: "text",
    Pplim: "text",
    PVF: "text",
    PHP: "text",
} as const satisfies Partial<Record<keyof SaveData, "number" | "bigint" | "text">>;

/**
 * The name of a scalar field the schema models.
 *
 * @since 1.0.0
 * @category Fields
 */
export type ScalarField = keyof typeof FIELD_KINDS;

/**
 * The three currencies a tower holds. `gold` is golden tickets.
 *
 * @since 1.0.0
 * @category Fields
 */
export const CURRENCIES = ["coins", "bux", "gold"] as const;

/**
 * Moves a counter by `by`, which may be negative.
 *
 * Relative rather than absolute, and that is the whole point. An escrow holds a
 * patch and replays it against a tower that is not the one it came from, so
 * "set coins to 95,764,637" is not merely wrong there, it is destructive; "add
 * a hundred coins" means the same thing everywhere. Deltas also compose, so
 * combining two patches does the arithmetic for free.
 *
 * Names any numeric field, whether the schema models it or it is one of the
 * event currencies living among the raw entries — `gachaCurrency` and
 * `swapTicket` adjust exactly like `coins` does. Taking the name as free text
 * is what makes that possible; the cost is that a misspelled counter is a
 * silent no-op rather than a type error, so callers with a fixed set to choose
 * from should choose from {@link CURRENCIES}.
 *
 * Nothing here checks that the result is a balance a player could actually
 * reach. Refusing to spend past zero is `Splice`'s job.
 *
 * @since 1.0.0
 * @category Operations
 */
export const CounterAdjusted = Schema.TaggedStruct("CounterAdjusted", {
    counter: Schema.String,
    by: Schema.Number,
});

/**
 * Sets a field to a value, written the way the save itself writes it.
 *
 * For everything a counter is the wrong tool for: text, the two oversized
 * counters, and the raw JSON blobs. Taking the value as a string is what lets
 * one operation cover all of them and the unmodelled fields besides, rather
 * than needing a variant per JavaScript type.
 *
 * A field the save does not already have is left alone. Inventing one would
 * mean guessing where in the file it belongs, and a save is an ordered format.
 *
 * @since 1.0.0
 * @category Operations
 */
export const FieldSet = Schema.TaggedStruct("FieldSet", {
    field: Schema.String,
    value: Schema.String,
});

/**
 * The save's list-valued fields: the things a player collects.
 *
 * `costumes` and `pets` are wardrobes, `roofs`, `lifts` and `lobbies` are the
 * fittings owned (as opposed to the one currently in use), and the two `Hist`
 * fields are capped rolling histories rather than possessions.
 *
 * @since 1.0.0
 * @category Fields
 */
export const COLLECTION_FIELDS = [
    "costumes",
    "pets",
    "roofs",
    "lifts",
    "lobbies",
    "missionHist",
    "bbHist",
    "bannedFriends",
] as const;

/**
 * @since 1.0.0
 * @category Fields
 */
export type CollectionField = (typeof COLLECTION_FIELDS)[number];

/**
 * Adds items to a collection, skipping any already present.
 *
 * Idempotent, which matters more than it sounds: a deposit that crashes partway
 * and gets retried must not leave a player holding two of something.
 *
 * @since 1.0.0
 * @category Operations
 */
export const ItemsGranted = Schema.TaggedStruct("ItemsGranted", {
    collection: Schema.Literals(COLLECTION_FIELDS),
    items: Schema.Array(Schema.String),
});

/**
 * Removes items from a collection.
 *
 * Removes *every* occurrence, so it is idempotent for the same reason
 * {@link ItemsGranted} is. Saves do occasionally carry a duplicate (one
 * observed tower listed the same roof twice), and those collapse to nothing
 * here rather than leaving a stray copy behind.
 *
 * @since 1.0.0
 * @category Operations
 */
export const ItemsRevoked = Schema.TaggedStruct("ItemsRevoked", {
    collection: Schema.Literals(COLLECTION_FIELDS),
    items: Schema.Array(Schema.String),
});

/**
 * A single edit to a save.
 *
 * @since 1.0.0
 * @category Operations
 */
export const SaveOp = Schema.Union([
    FloorAppended,
    FloorRemoved,
    BitizenAdded,
    BitizenRemoved,
    BitizenReplaced,
    DoormanSet,
    ItemsGranted,
    ItemsRevoked,
    CounterAdjusted,
    FieldSet,
]);

/**
 * @since 1.0.0
 * @category Operations
 */
export type SaveOp = Schema.Schema.Type<typeof SaveOp>;

/**
 * An ordered list of edits, applied left to right.
 *
 * Encodes to plain JSON with floors and bitizens in Nimblebit's own string
 * format, so a patch can be stored in a database column and read back without
 * losing anything the game cares about.
 *
 * @since 1.0.0
 * @category Models
 */
export const SavePatch = Schema.Array(SaveOp);

/**
 * @since 1.0.0
 * @category Models
 */
export type SavePatch = Schema.Schema.Type<typeof SavePatch>;

/**
 * Every save observed so far numbers its floors `0, 1, 2, ...` with
 * `storyHeight` matching the position in `stories` exactly. Any structural edit
 * has to restore that, or the tower comes back with a hole in it.
 *
 * @internal
 */
const renumber = (stories: ReadonlyArray<Floor>): ReadonlyArray<Floor> =>
    Array.map(stories, (floor, index) => (floor.storyHeight === index ? floor : { ...floor, storyHeight: index }));

/**
 * Writes one top-level field.
 *
 * The cast is doing real work: a computed key widens the spread's type to a
 * string index, losing the connection between the field and what it holds.
 * `FIELD_KINDS` is where that connection is asserted, so this stays sound as
 * long as that table stays honest.
 *
 * @internal
 */
const setField = (save: SaveData, field: string, value: unknown): SaveData => ({ ...save, [field]: value }) as SaveData;

/**
 * Writes one of the raw entries, keeping the note of where in the file it sat.
 * A key the save does not have is left alone.
 *
 * @internal
 */
const setRaw = (save: SaveData, key: string, value: string): SaveData => {
    const existing = save.$unknown[key];
    return existing === undefined ? save : { ...save, $unknown: { ...save.$unknown, [key]: { ...existing, value } } };
};

/**
 * Reads a counter, whether the schema names it or it is a raw entry holding
 * digits. `undefined` means there is nothing there to move.
 *
 * @internal
 */
const counterValue = (save: SaveData, counter: string): number | undefined => {
    if (FIELD_KINDS[counter as ScalarField] === "number") return save[counter as ScalarField] as number;
    const raw = save.$unknown[counter];
    if (raw === undefined) return undefined;
    const parsed = Number(raw.value);
    return Number.isFinite(parsed) ? parsed : undefined;
};

/**
 * Whether a string is something `BigInt` will accept, since it throws rather
 * than returning a blank on nonsense and `patch` may not throw.
 *
 * @internal
 */
const isDigits = (value: string): boolean => /^-?\d+$/.test(value);

/**
 * What a collection currently holds. The three optional ones are absent rather
 * than empty in some saves, and an absent collection holds nothing.
 *
 * @internal
 */
const collectionItems = (save: SaveData, collection: CollectionField): ReadonlyArray<string> => save[collection] ?? [];

/** @internal */
const applyOp = (save: SaveData, op: SaveOp): SaveData => {
    switch (op._tag) {
        case "FloorAppended": {
            return { ...save, stories: renumber(Array.append(save.stories, op.floor)) };
        }
        case "FloorRemoved": {
            return { ...save, stories: renumber(Array.remove(save.stories, op.storyHeight)) };
        }
        case "BitizenAdded": {
            return { ...save, bzns: Array.append(save.bzns, op.bitizen) };
        }
        case "BitizenRemoved": {
            return { ...save, bzns: Array.remove(save.bzns, op.index) };
        }
        case "BitizenReplaced": {
            return { ...save, bzns: Option.getOrElse(Array.replace(save.bzns, op.index, op.bitizen), () => save.bzns) };
        }
        case "DoormanSet": {
            return { ...save, doorman: op.bitizen };
        }
        case "ItemsGranted": {
            const held = collectionItems(save, op.collection);
            const missing = Array.filter(op.items, (item) => !held.includes(item));
            return missing.length === 0 ? save : setField(save, op.collection, [...held, ...missing]);
        }
        case "ItemsRevoked": {
            const held = collectionItems(save, op.collection);
            const kept = Array.filter(held, (item) => !op.items.includes(item));
            return kept.length === held.length ? save : setField(save, op.collection, kept);
        }
        case "CounterAdjusted": {
            const current = counterValue(save, op.counter);
            if (current === undefined) return save;
            const next = current + op.by;
            return FIELD_KINDS[op.counter as ScalarField] === "number"
                ? setField(save, op.counter, next)
                : setRaw(save, op.counter, String(next));
        }
        case "FieldSet": {
            switch (FIELD_KINDS[op.field as ScalarField]) {
                case "text": {
                    return setField(save, op.field, op.value);
                }
                case "bigint": {
                    return isDigits(op.value) ? setField(save, op.field, BigInt(op.value)) : save;
                }
                case "number": {
                    const parsed = Number(op.value);
                    return Number.isFinite(parsed) ? setField(save, op.field, parsed) : save;
                }
                default: {
                    return setRaw(save, op.field, op.value);
                }
            }
        }
    }
};

/**
 * Identity of a floor or bitizen, for comparison purposes.
 *
 * Decoded saves hold `Date`, `bigint` and `Result` values, so neither `===` nor
 * `Equal.equals` says anything useful about two separately decoded copies of
 * the same floor. Serializing is the cheap way to ask "is this the same thing?"
 * — key order is stable because every value here came out of the same schema.
 *
 * @internal
 */
const identity = (value: unknown): string =>
    JSON.stringify(value, (_key, inner: unknown) => (typeof inner === "bigint" ? `${inner}n` : inner));

/**
 * Matches `newValues` against `oldValues` in order, reporting which positions
 * of the old array are gone and which values are new.
 *
 * Greedy and order-preserving rather than a minimal edit script: an element
 * that survives is matched to the earliest unclaimed copy of itself.
 *
 * @internal
 */
const diffSequence = <A>(
    oldValues: ReadonlyArray<A>,
    newValues: ReadonlyArray<A>
): { readonly removed: ReadonlyArray<number>; readonly added: ReadonlyArray<A> } => {
    const oldPositionsByIdentity = new Map<string, globalThis.Array<number>>();
    oldValues.forEach((value, index) => {
        const key = identity(value);
        const positions = oldPositionsByIdentity.get(key);
        if (positions === undefined) oldPositionsByIdentity.set(key, [index]);
        else positions.push(index);
    });

    const survivors = new Set<number>();
    const added: globalThis.Array<A> = [];
    for (const value of newValues) {
        const positions = oldPositionsByIdentity.get(identity(value));
        const position = positions?.shift();
        if (position === undefined) added.push(value);
        else survivors.add(position);
    }

    const removed = oldValues.flatMap((_, index) => (survivors.has(index) ? [] : [index]));
    return { removed, added };
};

/**
 * Which items a collection gained and lost, ignoring order and duplicates.
 *
 * @internal
 */
const diffCollection = (
    oldItems: ReadonlyArray<string>,
    newItems: ReadonlyArray<string>
): { readonly granted: ReadonlyArray<string>; readonly revoked: ReadonlyArray<string> } => {
    const before = new Set(oldItems);
    const after = new Set(newItems);
    return {
        granted: Array.filter([...after], (item) => !before.has(item)),
        revoked: Array.filter([...before], (item) => !after.has(item)),
    };
};

/**
 * Computes, combines and applies patches over a save.
 *
 * `patch` is total: an operation naming a position, a collection item or a raw
 * key that does not exist is a no-op rather than a failure, so a replayed patch
 * can never truncate a tower or invent a field.
 *
 * `diff` compares the floors, the bitizens, the doorman, every scalar the
 * schema names, every collection, and every raw `$unknown` value. It
 * reconstructs `newValue` exactly whenever it was reached by the kind of edits
 * this module makes — removing and appending, granting and revoking, setting a
 * field. Three things are deliberately out of scope, because nothing in a trade
 * touches them and each needs its own notion of identity: `mission`, `friends`
 * and `bbPosts`. Reordering a collection also reads as no change, since
 * ownership is what matters and position is not stable.
 *
 * @since 1.0.0
 * @category Differ
 */
export const differ: Differ.Differ<SaveData, SavePatch> = {
    empty: [],

    combine: (first, second) => (first.length === 0 ? second : second.length === 0 ? first : [...first, ...second]),

    patch: (oldValue, patch) => Array.reduce(patch, oldValue, applyOp),

    diff: (oldValue, newValue) => {
        const stories = diffSequence(oldValue.stories, newValue.stories);
        const bitizens = diffSequence(oldValue.bzns, newValue.bzns);

        const collections = COLLECTION_FIELDS.flatMap((collection): ReadonlyArray<SaveOp> => {
            const { granted, revoked } = diffCollection(
                collectionItems(oldValue, collection),
                collectionItems(newValue, collection)
            );
            return [
                ...(revoked.length > 0 ? [{ _tag: "ItemsRevoked", collection, items: revoked } as const] : []),
                ...(granted.length > 0 ? [{ _tag: "ItemsGranted", collection, items: granted } as const] : []),
            ];
        });

        const raw = Object.entries(newValue.$unknown).flatMap(([field, entry]): ReadonlyArray<SaveOp> => {
            const before = oldValue.$unknown[field];
            return before === undefined || before.value === entry.value
                ? []
                : [{ _tag: "FieldSet", field, value: entry.value }];
        });

        // A counter reports the distance moved, so the resulting patch still
        // means something against a tower other than this one.
        const scalars = Object.keys(FIELD_KINDS).flatMap((name): ReadonlyArray<SaveOp> => {
            const field = name as ScalarField;
            const before = oldValue[field];
            const after = newValue[field];
            if (before === after || after === undefined) return [];
            return FIELD_KINDS[field] === "number"
                ? [{ _tag: "CounterAdjusted", counter: field, by: (after as number) - (before as number) }]
                : [{ _tag: "FieldSet", field, value: String(after) }];
        });

        // Removals are emitted highest index first so that each one is still
        // pointing at the element it named once its predecessors have run.
        return [
            ...Array.reverse(stories.removed).map((storyHeight): SaveOp => ({ _tag: "FloorRemoved", storyHeight })),
            ...stories.added.map((floor): SaveOp => ({ _tag: "FloorAppended", floor })),
            ...Array.reverse(bitizens.removed).map((index): SaveOp => ({ _tag: "BitizenRemoved", index })),
            ...bitizens.added.map((bitizen): SaveOp => ({ _tag: "BitizenAdded", bitizen })),
            ...(identity(oldValue.doorman) === identity(newValue.doorman)
                ? []
                : [{ _tag: "DoormanSet", bitizen: newValue.doorman } as const]),
            ...scalars,
            ...collections,
            ...raw,
        ];
    },
};
