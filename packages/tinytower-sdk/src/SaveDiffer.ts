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
 * Everything a decoded save holds, grouped by how it behaves rather than by
 * what type it happens to hold:
 *
 * - The ordered lists, `stories` (floors) and `bzns` (bitizens), plus the
 *   doorman, who is a bitizen kept outside the list. A floor or bitizen can be
 *   added, removed, or overwritten where it stands.
 * - Collections of owned things (costumes, pets, roofs, lifts, lobbies) and
 *   the rolling histories, through {@link ItemsGranted} and
 *   {@link ItemsRevoked}. A collection is a multiset: saves do occasionally list
 *   the same roof twice, and each copy counts.
 * - Counters, through {@link CounterAdjusted}, which moves a number by a
 *   distance instead of overwriting it. The three currencies are counters
 *   (`coins`, `bux`, and `gold`, which is golden tickets), and so are the
 *   running totals `buxBought` and `totalPoints`.
 * - Everything else scalar, through {@link FieldSet} and {@link FieldUnset},
 *   which take values as text the way the save itself stores them. That covers
 *   the fields `SaveData` names and the many it does not: a real save carries
 *   around sixty further raw entries, including at least eight more event
 *   currencies, and {@link RawEntrySet} adds one where the file keeps it.
 * - The structured fields no trade touches (the current mission, the friend
 *   list and the Bitbook feed), which are only ever replaced whole.
 *
 * ## Properties
 *
 * `diff` is exact: for any two decoded saves, `patch(a, diff(a, b))` is `b`,
 * except that a collection comes back holding the same items in a possibly
 * different order. The edits a player makes while playing come out small and
 * meaningful: a floor built on top is one {@link FloorAppended}, a floor
 * levelled, restocked or rebuilt is one {@link FloorReplaced}, a removed floor
 * or bitizen is one removal wherever it stood, and a bitizen who changed is one
 * {@link BitizenReplaced}.
 *
 * {@link CounterAdjusted}, {@link ItemsGranted}, {@link ItemsRevoked},
 * {@link FloorAppended} and {@link BitizenAdded} are **position-free**, so a
 * patch holding only them means the same thing against any save, which is what
 * lets an escrow replay one into a tower that is not the one it came from.
 *
 * The operations that set or overwrite something are idempotent, but the rest
 * are not: applying the same patch twice grants an item twice, moves a counter
 * twice and removes a second floor. A retry has to start again from the save
 * it started from, never replay onto one that already took the patch.
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
import * as Function from "effect/Function";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import * as SchemaAST from "effect/SchemaAST";

import * as BitbookPosts from "./BitbookPosts.ts";
import * as Bitizens from "./Bitizens.ts";
import * as Floors from "./Floors.ts";
import * as Missions from "./Missions.ts";
import * as TinyTower from "./TinyTower.ts";

/**
 * A decoded save, as produced by `TinyTower.SaveData`.
 *
 * @since 1.0.0
 * @category Models
 */
export interface SaveData extends Schema.Schema.Type<typeof TinyTower.SaveData> {}

/**
 * A decoded floor, as it appears in a save's `stories`.
 *
 * @since 1.0.0
 * @category Models
 */
export interface Floor extends Schema.Schema.Type<typeof Floors.Floor> {}

/**
 * A decoded bitizen, as it appears in a save's `bzns`.
 *
 * @since 1.0.0
 * @category Models
 */
export interface Bitizen extends Schema.Schema.Type<typeof Bitizens.Bitizen> {}

/**
 * A position in `stories` or `bzns`.
 *
 * @internal
 */
const Position = Schema.Int.check(Schema.isGreaterThanOrEqualTo(0));

/**
 * The type of the {@link FloorAppended} schema.
 *
 * @since 1.0.0
 * @category Operations
 */
export interface FloorAppended extends Schema.TaggedStruct<"FloorAppended", { readonly floor: typeof Floors.Floor }> {}

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
export const FloorAppended: FloorAppended = Schema.TaggedStruct("FloorAppended", {
    floor: Floors.Floor,
});

/**
 * The type of the {@link FloorRemoved} schema.
 *
 * @since 1.0.0
 * @category Operations
 */
export interface FloorRemoved extends Schema.TaggedStruct<"FloorRemoved", { readonly storyHeight: Schema.Int }> {}

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
export const FloorRemoved: FloorRemoved = Schema.TaggedStruct("FloorRemoved", {
    storyHeight: Position,
});

/**
 * The type of the {@link FloorReplaced} schema.
 *
 * @since 1.0.0
 * @category Operations
 */
export interface FloorReplaced extends Schema.TaggedStruct<
    "FloorReplaced",
    { readonly storyHeight: Schema.Int; readonly floor: typeof Floors.Floor }
> {}

/**
 * Overwrites the floor at `storyHeight`, leaving every other floor where it
 * is.
 *
 * This is what levelling, restocking or rebuilding a floor looks like. The
 * floor is written exactly as given, `storyHeight` included, and like
 * {@link FloorRemoved} it only means something against the save it came from.
 *
 * @since 1.0.0
 * @category Operations
 */
export const FloorReplaced: FloorReplaced = Schema.TaggedStruct("FloorReplaced", {
    storyHeight: Position,
    floor: Floors.Floor,
});

/**
 * The type of the {@link BitizenAdded} schema.
 *
 * @since 1.0.0
 * @category Operations
 */
export interface BitizenAdded extends Schema.TaggedStruct<
    "BitizenAdded",
    { readonly bitizen: typeof Bitizens.Bitizen }
> {}

/**
 * Adds a bitizen to the save.
 *
 * Position-free, and therefore replayable against another player's save.
 *
 * @since 1.0.0
 * @category Operations
 */
export const BitizenAdded: BitizenAdded = Schema.TaggedStruct("BitizenAdded", {
    bitizen: Bitizens.Bitizen,
});

/**
 * The type of the {@link BitizenRemoved} schema.
 *
 * @since 1.0.0
 * @category Operations
 */
export interface BitizenRemoved extends Schema.TaggedStruct<"BitizenRemoved", { readonly index: Schema.Int }> {}

/**
 * Removes the bitizen at `index`.
 *
 * @since 1.0.0
 * @category Operations
 */
export const BitizenRemoved: BitizenRemoved = Schema.TaggedStruct("BitizenRemoved", {
    index: Position,
});

/**
 * The type of the {@link BitizenReplaced} schema.
 *
 * @since 1.0.0
 * @category Operations
 */
export interface BitizenReplaced extends Schema.TaggedStruct<
    "BitizenReplaced",
    { readonly index: Schema.Int; readonly bitizen: typeof Bitizens.Bitizen }
> {}

/**
 * Overwrites the bitizen at `index`.
 *
 * Used when a bitizen stays put but their situation changes, for example losing
 * a job because the floor they worked on was traded away.
 *
 * @since 1.0.0
 * @category Operations
 */
export const BitizenReplaced: BitizenReplaced = Schema.TaggedStruct("BitizenReplaced", {
    index: Position,
    bitizen: Bitizens.Bitizen,
});

/**
 * The type of the {@link DoormanSet} schema.
 *
 * @since 1.0.0
 * @category Operations
 */
export interface DoormanSet extends Schema.TaggedStruct<"DoormanSet", { readonly bitizen: typeof Bitizens.Bitizen }> {}

/**
 * Replaces the tower's doorman, who is a bitizen living outside `bzns`.
 *
 * @since 1.0.0
 * @category Operations
 */
export const DoormanSet: DoormanSet = Schema.TaggedStruct("DoormanSet", {
    bitizen: Bitizens.Bitizen,
});

/**
 * The name of a scalar field the schema models: one whose value is a number, a
 * bigint or text, optional or not.
 *
 * Read off `SaveData` itself rather than off the internal table that sorts the
 * fields by kind, which the build leaves out of the published declarations.
 *
 * @since 1.0.0
 * @category Fields
 */
export type ScalarField = {
    [K in keyof SaveData]-?: NonNullable<SaveData[K]> extends number | bigint | string ? K : never;
}[keyof SaveData];

/**
 * How a scalar field is written and what changing it means.
 *
 * A counter is a quantity the game moves by amounts, so a change to one is
 * recorded as a distance; every other kind is recorded as the value it ended
 * up with. The `big` variants hold a `bigint`.
 *
 * @internal
 */
type FieldKind = "counter" | "bigCounter" | "number" | "bigint" | "text";

/**
 * What sort of value each scalar field of a save holds.
 *
 * One table rather than a list per type, because the split between numbers,
 * counters and text is an implementation detail of *applying* an edit, not
 * something the vocabulary of edits should expose. {@link CounterAdjusted} and
 * {@link FieldSet} both address a field by name and let this decide the rest.
 *
 * Only true counters are counters. The ids of the installed roof, lift and
 * lobby, the settings, the timestamps and the flags are numbers too, but a
 * distance between two of them means nothing in another tower, so they are set
 * outright. The type checker holds this table to exactly the scalar fields
 * `SaveData` has.
 *
 * Anything absent from this table is looked for among the save's raw
 * `$unknown` entries instead, which is how the event currencies and JSON blobs
 * the schema never modelled stay reachable.
 *
 * @internal
 */
const FIELD_KINDS = {
    coins: "counter",
    bux: "counter",
    gold: "counter",
    buxBought: "counter",
    totalPoints: "bigCounter",
    maxGold: "number",
    tip: "number",
    needUpgrade: "number",
    roof: "number",
    lift: "number",
    lobby: "number",
    installTime: "number",
    lastSaleTick: "number",
    raffleID: "number",
    liftSpeed: "number",
    sfx: "number",
    mus: "number",
    notes: "number",
    autoLiftDisable: "number",
    videos: "number",
    vidCheck: "number",
    bbnotes: "number",
    hidechat: "number",
    playerRegistered: "number",
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
} as const satisfies Record<ScalarField, FieldKind>;

/** @internal */
const isScalarField = (field: string): field is ScalarField => Object.hasOwn(FIELD_KINDS, field);

/**
 * Every field of `SaveData` a save may leave out.
 *
 * @internal
 */
type OptionalKey = {
    [K in keyof SaveData]-?: {} extends Pick<SaveData, K> ? K : never;
}[keyof SaveData];

/**
 * The fields {@link FieldUnset} can remove, held by the type checker to
 * exactly the optional fields of `SaveData`.
 *
 * @internal
 */
const OPTIONAL_FIELDS = {
    Ppig: true,
    Pplim: true,
    pets: true,
    missionHist: true,
    bannedFriends: true,
    liftSpeed: true,
    PVF: true,
    PHP: true,
    mission: true,
    friends: true,
} as const satisfies Record<OptionalKey, true>;

/** @internal */
const isOptionalField = (field: string): field is OptionalKey => Object.hasOwn(OPTIONAL_FIELDS, field);

/**
 * The three currencies a tower holds. `gold` is golden tickets.
 *
 * @since 1.0.0
 * @category Fields
 */
export const CURRENCIES = ["coins", "bux", "gold"] as const;

/**
 * The type of the {@link CounterAdjusted} schema.
 *
 * @since 1.0.0
 * @category Operations
 */
export interface CounterAdjusted extends Schema.TaggedStruct<
    "CounterAdjusted",
    { readonly counter: Schema.String; readonly by: Schema.Int }
> {}

/**
 * Moves a counter by `by`, which may be negative.
 *
 * Relative rather than absolute, and that is the whole point. An escrow holds a
 * patch and replays it against a tower that is not the one it came from, so
 * "set coins to 95,764,637" is not merely wrong there, it is destructive; "add
 * a hundred coins" means the same thing everywhere. Deltas also compose, so
 * combining two patches does the arithmetic for free.
 *
 * Names a counter, whether the schema models it or it is one of the event
 * currencies living among the raw entries: `gachaCurrency` and `swapTicket`
 * adjust exactly like `coins` does. Taking the name as free text is what makes
 * that possible; the cost is that a misspelled counter is a silent no-op rather
 * than a type error, so callers with a fixed set to choose from should choose
 * from {@link CURRENCIES}. A modelled field that is not a counter, such as the
 * installed roof, is left alone: set it with {@link FieldSet} instead.
 *
 * Nothing here checks that the result is a balance a player could actually
 * reach. Refusing to spend past zero is `Splice`'s job.
 *
 * @since 1.0.0
 * @category Operations
 */
export const CounterAdjusted: CounterAdjusted = Schema.TaggedStruct("CounterAdjusted", {
    counter: Schema.String,
    by: Schema.Int,
});

/**
 * The type of the {@link FieldSet} schema.
 *
 * @since 1.0.0
 * @category Operations
 */
export interface FieldSet extends Schema.TaggedStruct<
    "FieldSet",
    { readonly field: Schema.String; readonly value: Schema.String }
> {}

/**
 * Sets a field to a value, written the way the save itself writes it.
 *
 * For everything a counter is the wrong tool for: text, ids, settings,
 * timestamps, and the raw JSON blobs. Taking the value as a string is what lets
 * one operation cover all of them and the unmodelled fields besides, rather
 * than needing a variant per JavaScript type.
 *
 * An optional field the schema models is created if the save lacks it. A raw
 * entry the save lacks is left alone, because a raw entry needs a place in the
 * file: {@link RawEntrySet} is the operation that gives it one.
 *
 * @since 1.0.0
 * @category Operations
 */
export const FieldSet: FieldSet = Schema.TaggedStruct("FieldSet", {
    field: Schema.String,
    value: Schema.String,
});

/**
 * The type of the {@link FieldUnset} schema.
 *
 * @since 1.0.0
 * @category Operations
 */
export interface FieldUnset extends Schema.TaggedStruct<"FieldUnset", { readonly field: Schema.String }> {}

/**
 * Removes an optional field, or a raw entry.
 *
 * A field every save has is left alone. Whatever is removed, the raw entries
 * that followed it in the file keep their place: a raw entry hands its place on
 * to them, and an optional field passes them to the nearest field before it
 * that the save still has, behind any raw entries already following that one.
 * That is where they would sit in the file anyway, and the encoder only writes
 * raw entries that follow something it writes, so nothing is orphaned.
 *
 * @since 1.0.0
 * @category Operations
 */
export const FieldUnset: FieldUnset = Schema.TaggedStruct("FieldUnset", {
    field: Schema.String,
});

/**
 * The type of the {@link RawEntrySet} schema.
 *
 * @since 1.0.0
 * @category Operations
 */
export interface RawEntrySet extends Schema.TaggedStruct<
    "RawEntrySet",
    {
        readonly key: Schema.String;
        readonly value: Schema.String;
        readonly after: Schema.optionalKey<Schema.NullOr<Schema.String>>;
    }
> {}

/**
 * Sets a raw `$unknown` entry along with where in the file it sits, creating
 * it if the save lacks it.
 *
 * `after` names the field or raw entry it follows, the way decoding records
 * it, and `null` is the start of the file, ahead of every field. The entry is
 * spliced in there: whatever followed that place now follows the entry, and
 * if the entry stood somewhere else before, the gap it leaves closes up.
 *
 * Leaving `after` out keeps an entry the save already has where it is, so only
 * its value changes, and adds a new one at the end of the file. An `after`
 * naming a modelled field the save lacks puts the entry where that field's own
 * raw entries would go if it were unset (see {@link FieldUnset}), and one
 * naming nothing the save has is treated as left out.
 *
 * A key the file cannot hold as a raw entry leaves the save as it was: the
 * name or the Nimblebit tag of a modelled field (`coins`, `Pc`), a key ending
 * in `[` and such a tag, an empty key, one holding `]`, and `__proto__`. The
 * encoder would write any of them over a modelled field or lose it.
 *
 * @since 1.0.0
 * @category Operations
 */
export const RawEntrySet: RawEntrySet = Schema.TaggedStruct("RawEntrySet", {
    key: Schema.String,
    value: Schema.String,
    after: Schema.optionalKey(Schema.NullOr(Schema.String)),
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
 * The type of the {@link ItemsGranted} schema.
 *
 * @since 1.0.0
 * @category Operations
 */
export interface ItemsGranted extends Schema.TaggedStruct<
    "ItemsGranted",
    {
        readonly collection: Schema.Literals<typeof COLLECTION_FIELDS>;
        readonly items: Schema.$Array<Schema.String>;
    }
> {}

/**
 * Adds items to a collection, one copy per listed item.
 *
 * Collections are multisets, so granting something already held adds a second
 * copy. Granting into an optional collection the save lacks creates it, which
 * is also why granting nothing is not quite a no-op.
 *
 * @since 1.0.0
 * @category Operations
 */
export const ItemsGranted: ItemsGranted = Schema.TaggedStruct("ItemsGranted", {
    collection: Schema.Literals(COLLECTION_FIELDS),
    items: Schema.Array(Schema.String),
});

/**
 * The type of the {@link ItemsRevoked} schema.
 *
 * @since 1.0.0
 * @category Operations
 */
export interface ItemsRevoked extends Schema.TaggedStruct<
    "ItemsRevoked",
    {
        readonly collection: Schema.Literals<typeof COLLECTION_FIELDS>;
        readonly items: Schema.$Array<Schema.String>;
    }
> {}

/**
 * Removes items from a collection, one copy per listed item.
 *
 * Saves do occasionally carry a duplicate (one observed tower listed the same
 * roof twice), and revoking one copy leaves the other where it was. An item
 * the collection does not hold is skipped.
 *
 * @since 1.0.0
 * @category Operations
 */
export const ItemsRevoked: ItemsRevoked = Schema.TaggedStruct("ItemsRevoked", {
    collection: Schema.Literals(COLLECTION_FIELDS),
    items: Schema.Array(Schema.String),
});

/**
 * The type of the {@link MissionSet} schema.
 *
 * @since 1.0.0
 * @category Operations
 */
export interface MissionSet extends Schema.TaggedStruct<"MissionSet", { readonly mission: typeof Missions.Mission }> {}

/**
 * Replaces the tower's current mission.
 *
 * @since 1.0.0
 * @category Operations
 */
export const MissionSet: MissionSet = Schema.TaggedStruct("MissionSet", {
    mission: Missions.Mission,
});

/**
 * The type of the {@link FriendsSet} schema.
 *
 * @since 1.0.0
 * @category Operations
 */
export interface FriendsSet extends Schema.TaggedStruct<"FriendsSet", { readonly friends: typeof TinyTower.Friends }> {}

/**
 * Replaces the tower's friend list.
 *
 * @since 1.0.0
 * @category Operations
 */
export const FriendsSet: FriendsSet = Schema.TaggedStruct("FriendsSet", {
    friends: TinyTower.Friends,
});

/**
 * The type of the {@link BitbookPostsSet} schema.
 *
 * @since 1.0.0
 * @category Operations
 */
export interface BitbookPostsSet extends Schema.TaggedStruct<
    "BitbookPostsSet",
    { readonly posts: Schema.$Array<typeof BitbookPosts.BitbookPost> }
> {}

/**
 * Replaces the tower's Bitbook feed.
 *
 * @since 1.0.0
 * @category Operations
 */
export const BitbookPostsSet: BitbookPostsSet = Schema.TaggedStruct("BitbookPostsSet", {
    posts: Schema.Array(BitbookPosts.BitbookPost),
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
    FloorReplaced,
    BitizenAdded,
    BitizenRemoved,
    BitizenReplaced,
    DoormanSet,
    ItemsGranted,
    ItemsRevoked,
    CounterAdjusted,
    FieldSet,
    FieldUnset,
    RawEntrySet,
    MissionSet,
    FriendsSet,
    BitbookPostsSet,
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
 * A decoded {@link SavePatch}. An interface rather than an alias so that
 * signatures mention it by name instead of spelling out every operation.
 *
 * @since 1.0.0
 * @category Models
 */
export interface SavePatch extends ReadonlyArray<SaveOp> {}

/** @internal */
type RawEntries = SaveData["$unknown"];

/**
 * Every save observed so far numbers its floors `0, 1, 2, ...` with
 * `storyHeight` matching the position in `stories` exactly. Removing or
 * appending a floor has to restore that, or the tower comes back with a hole in
 * it.
 *
 * @internal
 */
const renumber = (stories: ReadonlyArray<Floor>): ReadonlyArray<Floor> =>
    Array.map(stories, (floor, index) => (floor.storyHeight === index ? floor : { ...floor, storyHeight: index }));

/**
 * Writes one top-level field. `FIELD_KINDS` and the operation schemas are what
 * keep the value matched to the field.
 *
 * @internal
 */
const setField = <K extends keyof SaveData>(save: SaveData, field: K, value: SaveData[K]): SaveData => ({
    ...save,
    [field]: value,
});

/** @internal */
type RawEntry = RawEntries[string];

/**
 * What a raw entry follows in the file: a modelled field, another raw entry,
 * or `null` for the start of the file. A save put together by hand may leave
 * the note out, which the encoder reads as the start of the file too.
 *
 * @internal
 */
const follows = (entry: RawEntry): string | null => entry.$locationMetadata.after ?? null;

/**
 * Puts raw entries back in file order.
 *
 * Each entry records what it follows, and the encoder writes a run of raw
 * entries after the modelled field the first of them follows, reading the run
 * in iteration order. An entry added or moved out of order would be dropped on
 * the way out, so every edit that places one finishes here.
 *
 * Order cannot rescue two entries that follow the same thing, though: the
 * encoder keeps one run per field and one successor per entry, and the other
 * branch is lost. So no edit may fork the chain; placing an entry splices it
 * in instead (see {@link insertRaw}).
 *
 * @internal
 */
const inFileOrder = (entries: RawEntries): RawEntries => {
    const keys = Object.keys(entries);
    const isRaw = (key: string | null): key is string => key !== null && Object.hasOwn(entries, key);

    const next = new Map<string, string>();
    for (const key of keys) {
        const after = follows(entries[key]);
        if (isRaw(after)) next.set(after, key);
    }

    const ordered: globalThis.Array<string> = [];
    const placed = new Set<string>();
    for (const head of keys) {
        if (isRaw(follows(entries[head]))) continue;
        for (let key: string | undefined = head; key !== undefined && !placed.has(key); key = next.get(key)) {
            placed.add(key);
            ordered.push(key);
        }
    }

    // Entries that only follow each other in a loop have no place in the file,
    // but dropping them would lose data, so they keep their order at the end.
    const stranded = keys.filter((key) => !placed.has(key));
    return Object.fromEntries([...ordered, ...stranded].map((key) => [key, entries[key]] as const));
};

/**
 * One of the save's raw entries. Only its own: a key such as `constructor` is
 * not an entry just because every object answers to it.
 *
 * @internal
 */
const rawEntry = (entries: RawEntries, key: string): RawEntry | undefined =>
    Object.hasOwn(entries, key) ? entries[key] : undefined;

/**
 * Writes one of the raw entries, keeping the note of where in the file it sat.
 * A key the save does not have is left alone.
 *
 * @internal
 */
const setRawValue = (save: SaveData, key: string, value: string): SaveData => {
    const existing = rawEntry(save.$unknown, key);
    return existing === undefined ? save : { ...save, $unknown: { ...save.$unknown, [key]: { ...existing, value } } };
};

/**
 * Points the raw entries that followed `from` at `to` instead. `null` is the
 * start of the file on either side.
 *
 * @internal
 */
const repoint = (entries: RawEntries, from: string | null, to: string | null): RawEntries =>
    Object.fromEntries(
        Object.entries(entries).map(([key, entry]) =>
            follows(entry) === from ? [key, { ...entry, $locationMetadata: { after: to } }] : [key, entry]
        )
    );

/**
 * Removes a raw entry, handing whatever followed it on to whatever it
 * followed, so the chain closes up behind it.
 *
 * @internal
 */
const unsetRaw = (save: SaveData, key: string): SaveData => {
    const removed = rawEntry(save.$unknown, key);
    if (removed === undefined) return save;
    const { [key]: _removed, ...rest } = save.$unknown;
    return { ...save, $unknown: inFileOrder(repoint(rest, key, follows(removed))) };
};

/**
 * Adds a raw entry the save lacks right after `place`, handing whatever
 * followed `place` on to it, so the chain gains a link rather than a fork.
 *
 * @internal
 */
const insertRaw = (save: SaveData, key: string, value: string, place: string | null): SaveData => ({
    ...save,
    $unknown: inFileOrder({
        ...repoint(save.$unknown, place, key),
        [key]: { value, $locationMetadata: { after: place } },
    }),
});

/**
 * The modelled fields in the order the encoder writes them, which is the order
 * `TinyTower.SaveData` declares them in, and the tags the file writes them
 * under. Read from the schema the first time they are needed rather than
 * repeated here, so the two cannot drift apart.
 *
 * @internal
 */
let declared: { readonly fields: ReadonlyArray<string>; readonly tags: ReadonlySet<string> } | undefined;

/** @internal */
const declaredFields = (): NonNullable<typeof declared> => {
    if (declared === undefined) {
        const ast = SchemaAST.toType(TinyTower.SaveData.ast.thunk());
        const signatures = SchemaAST.isObjects(ast)
            ? ast.propertySignatures.filter(({ name }) => name !== "$unknown")
            : [];
        declared = {
            fields: signatures.map(({ name }) => String(name)),
            tags: new Set(
                signatures.map(({ name, type }) => type.context?.annotations?.nimblebitSaveDataKey ?? String(name))
            ),
        };
    }
    return declared;
};

/** @internal */
const fieldsInFileOrder = (): ReadonlyArray<string> => declaredFields().fields;

/**
 * Whether a save can hold `key` as a raw entry. The encoder writes one as
 * `[key]value[key]`, turning a modelled field's name into that field's tag on
 * the way, and decoding reads the first pair of a field's tags it finds as
 * that field and never as a raw entry. So a key naming a modelled field, by
 * name or by tag, would overwrite that field or vanish, and so would one
 * ending in `[` and a tag, since its own tag then holds the field's. An empty
 * key, one holding `]` and `__proto__` do not decode as written either.
 *
 * @internal
 */
const canBeRaw = (key: string): boolean => {
    const { fields, tags } = declaredFields();
    return (
        key !== "" &&
        key !== "__proto__" &&
        !key.includes("]") &&
        !fields.includes(key) &&
        !tags.has(key.slice(key.lastIndexOf("[") + 1))
    );
};

/**
 * The last raw entry of the run that follows `start`, or `start` itself when
 * nothing does. A run that loops back on itself ends where it closes.
 *
 * @internal
 */
const endOfRun = (entries: RawEntries, start: string | null): string | null => {
    const next = new Map<string | null, string>();
    for (const [key, entry] of Object.entries(entries)) next.set(follows(entry), key);
    let end = start;
    const seen = new Set<string>();
    for (let key = next.get(end); key !== undefined && !seen.has(key); key = next.get(key)) {
        seen.add(key);
        end = key;
    }
    return end;
};

/** @internal */
const presentFields = (save: SaveData): ReadonlySet<string> =>
    new Set(Object.entries(save).flatMap(([key, value]) => (value === undefined ? [] : [key])));

/**
 * The end of the run following the last of `fields` the save has, or of the
 * run at the start of the file if it has none of them.
 *
 * @internal
 */
const endOfLastPresent = (save: SaveData, fields: ReadonlyArray<string>): string | null => {
    const present = presentFields(save);
    return endOfRun(save.$unknown, Option.getOrNull(Array.findLast(fields, (field) => present.has(field))));
};

/**
 * Where the raw entries that followed a modelled field go once it is gone:
 * behind the nearest field before it that the save still has, at the end of
 * any raw entries already following that one. Joining the end of that run
 * matters, because the encoder writes one run per field, and a second run
 * starting at the same field would replace the first.
 *
 * `coins` comes first and every save has it, so there is always such a field;
 * the start of the file only answers for a save that somehow lacks it.
 *
 * @internal
 */
const anchorBefore = (save: SaveData, field: string): string | null => {
    const fields = fieldsInFileOrder();
    return endOfLastPresent(save, Array.take(fields, Math.max(0, fields.indexOf(field))));
};

/**
 * Where a {@link RawEntrySet} puts its entry, in a save the entry has already
 * been taken out of. Nothing when `after` is left out or names nothing the
 * save has, which the caller settles.
 *
 * @internal
 */
const placeFor = (save: SaveData, after: string | null | undefined): Option.Option<string | null> => {
    if (after === undefined) return Option.none();
    if (after === null || Object.hasOwn(save.$unknown, after)) return Option.some(after);
    if (!fieldsInFileOrder().includes(after)) return Option.none();
    return Option.some(presentFields(save).has(after) ? after : anchorBefore(save, after));
};

/**
 * Sets a raw entry and its place, splicing it into the chain the encoder
 * writes raw entries from. A key {@link canBeRaw} rules out is left alone.
 *
 * @internal
 */
const placeRaw = (save: SaveData, { key, value, after }: Schema.Schema.Type<typeof RawEntrySet>): SaveData => {
    if (!canBeRaw(key)) return save;
    const existing = rawEntry(save.$unknown, key);
    // Taken out first, so that its new place is read from the rest of the
    // chain, and an entry asked to follow itself finds nothing to follow.
    const without = existing === undefined ? save : unsetRaw(save, key);
    return Option.match(placeFor(without, after), {
        onSome: (place) => insertRaw(without, key, value, place),
        onNone: () =>
            existing === undefined
                ? insertRaw(save, key, value, endOfLastPresent(save, fieldsInFileOrder()))
                : setRawValue(save, key, value),
    });
};

/**
 * Removes an optional modelled field, handing the raw entries that followed it
 * on to {@link anchorBefore}.
 *
 * @internal
 */
const unsetOptional = (save: SaveData, field: OptionalKey): SaveData => {
    if (save[field] === undefined) return save;
    const { [field]: _removed, ...rest } = save;
    const followed = Object.values(save.$unknown).some((entry) => follows(entry) === field);
    return followed
        ? { ...rest, $unknown: inFileOrder(repoint(rest.$unknown, field, anchorBefore(save, field))) }
        : rest;
};

/**
 * Whether a string is something `BigInt` will accept, since it throws rather
 * than returning a blank on nonsense and `patch` may not throw.
 *
 * @internal
 */
const isDigits = (value: string): boolean => /^-?\d+$/.test(value);

/**
 * Reads a number written as text, the way `NumberFromString` would. Text that
 * is not a number reads as nothing rather than as `NaN`.
 *
 * @internal
 */
const parseNumber = (value: string): Option.Option<number> => {
    const parsed = Number(value);
    return value.trim() === "" || (Number.isNaN(parsed) && value !== "NaN") ? Option.none() : Option.some(parsed);
};

/**
 * What a collection currently holds. The three optional ones are absent rather
 * than empty in some saves, and an absent collection holds nothing.
 *
 * @internal
 */
const collectionItems = (save: SaveData, collection: CollectionField): ReadonlyArray<string> => save[collection] ?? [];

/**
 * Removes one copy of each listed item.
 *
 * @internal
 */
const revokeOnce = (held: ReadonlyArray<string>, items: ReadonlyArray<string>): ReadonlyArray<string> =>
    Array.reduce(items, held, (kept, item) =>
        Option.match(
            Array.findFirstIndex(kept, (candidate) => candidate === item),
            {
                onNone: () => kept,
                onSome: (index) => Array.remove(kept, index),
            }
        )
    );

/** @internal */
const adjustCounter = (save: SaveData, counter: string, by: number): SaveData => {
    if (!Number.isSafeInteger(by)) return save;
    if (isScalarField(counter)) {
        const current = save[counter];
        if (FIELD_KINDS[counter] === "counter" && typeof current === "number") {
            return setField(save, counter, current + by);
        }
        if (FIELD_KINDS[counter] === "bigCounter" && typeof current === "bigint") {
            return setField(save, counter, current + BigInt(by));
        }
        return save;
    }

    const raw = rawEntry(save.$unknown, counter);
    return Option.match(raw === undefined ? Option.none() : Option.filter(parseNumber(raw.value), Number.isFinite), {
        onNone: () => save,
        onSome: (current) => setRawValue(save, counter, String(current + by)),
    });
};

/** @internal */
const setScalar = (save: SaveData, field: string, value: string): SaveData => {
    if (!isScalarField(field)) return setRawValue(save, field, value);
    const kind = FIELD_KINDS[field];
    switch (kind) {
        case "text": {
            return setField(save, field, value);
        }
        case "bigint":
        case "bigCounter": {
            return isDigits(value) ? setField(save, field, BigInt(value)) : save;
        }
        case "number":
        case "counter": {
            return Option.match(parseNumber(value), {
                onNone: () => save,
                onSome: (parsed) => setField(save, field, parsed),
            });
        }
        default: {
            return Function.absurd(kind);
        }
    }
};

/** @internal */
const applyOp = (save: SaveData, op: SaveOp): SaveData => {
    switch (op._tag) {
        case "FloorAppended": {
            return { ...save, stories: renumber(Array.append(save.stories, op.floor)) };
        }
        case "FloorRemoved": {
            return { ...save, stories: renumber(Array.remove(save.stories, op.storyHeight)) };
        }
        case "FloorReplaced": {
            return {
                ...save,
                stories: Option.getOrElse(Array.replace(save.stories, op.storyHeight, op.floor), () => save.stories),
            };
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
            return setField(save, op.collection, [...collectionItems(save, op.collection), ...op.items]);
        }
        case "ItemsRevoked": {
            const held = save[op.collection];
            return held === undefined ? save : setField(save, op.collection, revokeOnce(held, op.items));
        }
        case "CounterAdjusted": {
            return adjustCounter(save, op.counter, op.by);
        }
        case "FieldSet": {
            return setScalar(save, op.field, op.value);
        }
        case "FieldUnset": {
            if (isOptionalField(op.field)) return unsetOptional(save, op.field);
            return isScalarField(op.field) ? save : unsetRaw(save, op.field);
        }
        case "RawEntrySet": {
            return placeRaw(save, op);
        }
        case "MissionSet": {
            return setField(save, "mission", op.mission);
        }
        case "FriendsSet": {
            return setField(save, "friends", op.friends);
        }
        case "BitbookPostsSet": {
            return setField(save, "bbPosts", op.posts);
        }
        default: {
            return Function.absurd(op);
        }
    }
};

/**
 * Identity of a floor, bitizen or other decoded value, for comparison
 * purposes.
 *
 * Decoded saves hold `Date`, `bigint` and `Result` values, so neither `===` nor
 * `Equal.equals` says anything useful about two separately decoded copies of
 * the same floor. Serializing is the cheap way to ask "is this the same
 * thing?", and key order is stable because every value here came out of the
 * same schema.
 *
 * JSON has no way to write a `bigint`, and it writes `NaN` and the infinities
 * as `null` and `-0` as `0`, all of which a decoded save can hold. Those are
 * written as tagged objects instead, which no value from the schema could be
 * mistaken for.
 *
 * @internal
 */
const identity = (value: unknown): string =>
    JSON.stringify(value, (_key, inner: unknown) => {
        if (typeof inner === "bigint") return { "#bigint": String(inner) };
        if (typeof inner === "number" && (!Number.isFinite(inner) || Object.is(inner, -0))) {
            return { "#number": Object.is(inner, -0) ? "-0" : String(inner) };
        }
        return inner;
    });

/**
 * A floor's identity apart from where it stands, so that a floor which only
 * moved down because one beneath it left still counts as the same floor.
 *
 * @internal
 */
const floorIdentity = (floor: Floor): string => identity({ ...floor, storyHeight: 0 });

/**
 * How to turn one list into another with removals, overwrites in place, and
 * additions on the end, which are the three things the list operations can do.
 *
 * `removed` holds positions in the old list. `replaced` and `appended` hold
 * positions in the new list; once the removals have run, an element that is
 * overwritten already stands at its new position.
 *
 * @internal
 */
interface Alignment {
    readonly removed: ReadonlyArray<number>;
    readonly replaced: ReadonlyArray<number>;
    readonly appended: ReadonlyArray<number>;
}

/** @internal */
const positions = (from: number, to: number): ReadonlyArray<number> =>
    globalThis.Array.from({ length: Math.max(0, to - from) }, (_, offset) => from + offset);

/**
 * Pairs the lists position by position: overwrite what differs, then add or
 * remove at the end. Always possible, rarely the smallest answer.
 *
 * @internal
 */
const positionalAlignment = (oldKeys: ReadonlyArray<string>, newKeys: ReadonlyArray<string>): Alignment => {
    const shared = Math.min(oldKeys.length, newKeys.length);
    return {
        removed: positions(shared, oldKeys.length),
        replaced: positions(0, shared).filter((index) => oldKeys[index] !== newKeys[index]),
        appended: positions(shared, newKeys.length),
    };
};

/**
 * Lines two lists up so that every element the two have in common stays put.
 *
 * The common prefix and suffix are matched first, which settles every edit a
 * player makes one at a time; whatever is left between them is matched by
 * longest common subsequence. Between two matched elements, leftovers on both
 * sides are paired as overwrites in place, extra old ones are removed, and extra
 * new ones can only be added on the end. When they would have to go anywhere
 * else, which no list operation can do, the lists are paired position by
 * position instead.
 *
 * @internal
 */
const align = (oldKeys: ReadonlyArray<string>, newKeys: ReadonlyArray<string>): Alignment => {
    const oldLength = oldKeys.length;
    const newLength = newKeys.length;

    let prefix = 0;
    while (prefix < oldLength && prefix < newLength && oldKeys[prefix] === newKeys[prefix]) prefix++;
    let suffix = 0;
    while (
        suffix < oldLength - prefix &&
        suffix < newLength - prefix &&
        oldKeys[oldLength - 1 - suffix] === newKeys[newLength - 1 - suffix]
    ) {
        suffix++;
    }

    // `lengths[i * width + j]` is the longest common subsequence of the old
    // middle from `i` and the new middle from `j`.
    const rows = oldLength - prefix - suffix;
    const columns = newLength - prefix - suffix;
    const width = columns + 1;
    const lengths = new Uint32Array((rows + 1) * width);
    for (let i = rows - 1; i >= 0; i--) {
        for (let j = columns - 1; j >= 0; j--) {
            lengths[i * width + j] =
                oldKeys[prefix + i] === newKeys[prefix + j]
                    ? lengths[(i + 1) * width + j + 1] + 1
                    : Math.max(lengths[(i + 1) * width + j], lengths[i * width + j + 1]);
        }
    }

    const anchors: globalThis.Array<readonly [number, number]> = [[prefix - 1, prefix - 1]];
    let i = 0;
    let j = 0;
    while (i < rows && j < columns) {
        if (oldKeys[prefix + i] === newKeys[prefix + j]) {
            anchors.push([prefix + i, prefix + j]);
            i++;
            j++;
        } else if (lengths[(i + 1) * width + j] >= lengths[i * width + j + 1]) {
            i++;
        } else {
            j++;
        }
    }
    anchors.push([oldLength - suffix, newLength - suffix]);

    const removed: globalThis.Array<number> = [];
    const replaced: globalThis.Array<number> = [];
    const appended: globalThis.Array<number> = [];
    for (let anchor = 1; anchor < anchors.length; anchor++) {
        const [oldBefore, newBefore] = anchors[anchor - 1];
        const [oldAfter, newAfter] = anchors[anchor];
        const oldGap = oldAfter - oldBefore - 1;
        const newGap = newAfter - newBefore - 1;
        const paired = Math.min(oldGap, newGap);
        replaced.push(...positions(newBefore + 1, newBefore + 1 + paired));
        removed.push(...positions(oldBefore + 1 + paired, oldAfter));
        if (newGap > paired) {
            if (oldAfter !== oldLength) return positionalAlignment(oldKeys, newKeys);
            appended.push(...positions(newBefore + 1 + paired, newAfter));
        }
    }
    return { removed, replaced, appended };
};

/**
 * The operations an alignment calls for. Removals run highest index first so
 * that each one still points at the element it named once its predecessors
 * have run.
 *
 * @internal
 */
const alignmentOps = <A>(
    alignment: Alignment,
    newValues: ReadonlyArray<A>,
    ops: {
        readonly removed: (index: number) => SaveOp;
        readonly replaced: (index: number, value: A) => SaveOp;
        readonly appended: (value: A) => SaveOp;
    }
): ReadonlyArray<SaveOp> => [
    ...Array.reverse(alignment.removed).map(ops.removed),
    ...alignment.replaced.map((index) => ops.replaced(index, newValues[index])),
    ...alignment.appended.map((index) => ops.appended(newValues[index])),
];

/**
 * The floors are aligned ignoring `storyHeight`, so a floor that only moved
 * because another left is not reported as changed. Removing and appending
 * renumber every floor, and any floor the renumbering does not reproduce exactly
 * is then written outright, which is what keeps `diff` exact.
 *
 * @internal
 */
const diffStories = (oldValue: SaveData, newValue: SaveData): ReadonlyArray<SaveOp> => {
    const planned = alignmentOps(
        align(Array.map(oldValue.stories, floorIdentity), Array.map(newValue.stories, floorIdentity)),
        newValue.stories,
        {
            removed: (storyHeight) => ({ _tag: "FloorRemoved", storyHeight }),
            replaced: (storyHeight, floor) => ({ _tag: "FloorReplaced", storyHeight, floor }),
            appended: (floor) => ({ _tag: "FloorAppended", floor }),
        }
    );

    const landed = Array.reduce(planned, oldValue, applyOp).stories;
    const corrections = newValue.stories.flatMap((floor, storyHeight): ReadonlyArray<SaveOp> =>
        identity(landed[storyHeight]) === identity(floor) ? [] : [{ _tag: "FloorReplaced", storyHeight, floor }]
    );
    return [...planned, ...corrections];
};

/** @internal */
const diffBitizens = (oldValue: SaveData, newValue: SaveData): ReadonlyArray<SaveOp> =>
    alignmentOps(align(Array.map(oldValue.bzns, identity), Array.map(newValue.bzns, identity)), newValue.bzns, {
        removed: (index) => ({ _tag: "BitizenRemoved", index }),
        replaced: (index, bitizen) => ({ _tag: "BitizenReplaced", index, bitizen }),
        appended: (bitizen) => ({ _tag: "BitizenAdded", bitizen }),
    });

/** @internal */
const unset = (field: string): SaveOp => ({ _tag: "FieldUnset", field });

/**
 * The distance between two values of a counter, when adding it back lands on
 * exactly the newer value. Exactly means `Object.is`, so a counter that ended
 * on `-0` is set rather than moved: a sum only comes out as `-0` when both of
 * its sides are.
 *
 * @internal
 */
const distance = (before: unknown, after: unknown): Option.Option<number> => {
    if (typeof before === "number" && typeof after === "number") {
        const by = after - before;
        return Number.isSafeInteger(by) && Object.is(before + by, after) ? Option.some(by) : Option.none();
    }
    if (typeof before === "bigint" && typeof after === "bigint") {
        const by = after - before;
        return by >= BigInt(Number.MIN_SAFE_INTEGER) && by <= BigInt(Number.MAX_SAFE_INTEGER)
            ? Option.some(Number(by))
            : Option.none();
    }
    return Option.none();
};

/**
 * A counter reports the distance moved, so the resulting patch still means
 * something against a tower other than this one. Everything else, and a
 * counter whose distance would not add back exactly, reports where it ended up.
 *
 * @internal
 */
const diffScalar = (oldValue: SaveData, newValue: SaveData, field: ScalarField): ReadonlyArray<SaveOp> => {
    const before = oldValue[field];
    const after = newValue[field];
    if (Object.is(before, after)) return [];
    if (after === undefined) return [unset(field)];
    const kind = FIELD_KINDS[field];
    return Option.match(kind === "counter" || kind === "bigCounter" ? distance(before, after) : Option.none(), {
        onSome: (by): ReadonlyArray<SaveOp> => [{ _tag: "CounterAdjusted", counter: field, by }],
        // `String(-0)` is "0", which would read back as a different number.
        onNone: (): ReadonlyArray<SaveOp> => [
            { _tag: "FieldSet", field, value: Object.is(after, -0) ? "-0" : String(after) },
        ],
    });
};

/**
 * The items of `from` left over once each item of `without` has cancelled one
 * copy of itself.
 *
 * @internal
 */
const multisetDifference = (from: ReadonlyArray<string>, without: ReadonlyArray<string>): ReadonlyArray<string> => {
    const remaining = new Map<string, number>();
    for (const item of without) remaining.set(item, (remaining.get(item) ?? 0) + 1);
    return from.filter((item) => {
        const count = remaining.get(item) ?? 0;
        if (count === 0) return true;
        remaining.set(item, count - 1);
        return false;
    });
};

/** @internal */
const diffCollection = (oldValue: SaveData, newValue: SaveData, collection: CollectionField): ReadonlyArray<SaveOp> => {
    const before = oldValue[collection];
    const after = newValue[collection];
    if (after === undefined) return before === undefined ? [] : [unset(collection)];
    const held = before ?? [];
    const revoked = multisetDifference(held, after);
    const granted = multisetDifference(after, held);
    return [
        ...(revoked.length > 0 ? [{ _tag: "ItemsRevoked", collection, items: revoked } as const] : []),
        ...(granted.length > 0 || before === undefined
            ? [{ _tag: "ItemsGranted", collection, items: granted } as const]
            : []),
    ];
};

/** @internal */
const diffStructured = (oldValue: SaveData, newValue: SaveData): ReadonlyArray<SaveOp> => {
    const { mission, friends, bbPosts } = newValue;
    const changed = (field: "mission" | "friends" | "bbPosts"): boolean =>
        identity(oldValue[field]) !== identity(newValue[field]);
    return [
        ...(changed("mission")
            ? [mission === undefined ? unset("mission") : ({ _tag: "MissionSet", mission } satisfies SaveOp)]
            : []),
        ...(changed("friends")
            ? [friends === undefined ? unset("friends") : ({ _tag: "FriendsSet", friends } satisfies SaveOp)]
            : []),
        ...(changed("bbPosts") ? [{ _tag: "BitbookPostsSet", posts: bbPosts } satisfies SaveOp] : []),
    ];
};

/**
 * What it takes to make one raw entry of the newer save match, given how the
 * patched save holds it so far.
 *
 * @internal
 */
const rawEntryChange = (before: RawEntry | undefined, key: string, entry: RawEntry): ReadonlyArray<SaveOp> => {
    const after = entry.$locationMetadata.after;
    if (before === undefined || before.$locationMetadata.after !== after) {
        return [{ _tag: "RawEntrySet", key, value: entry.value, after: after ?? null }];
    }
    return before.value === entry.value ? [] : [{ _tag: "FieldSet", field: key, value: entry.value }];
};

/**
 * Removing a raw entry or an optional field hands its place in the file to
 * whatever followed it, so `oldValue` here is the save with the rest of the
 * patch already applied, and the removals run before anything is placed.
 *
 * The remaining entries are then settled one at a time in the newer save's
 * file order, each against the save as patched so far, because placing an
 * entry moves whatever followed its new place on behind it. Settled that way,
 * no placement disturbs an entry settled before it, as long as no two entries
 * of the newer save follow the same thing and each comes after whatever it
 * follows (see {@link differ}). Settling them all against the save before any
 * placement would instead report moves the placements make anyway, and miss
 * the ones they undo.
 *
 * @internal
 */
const diffRaw = (oldValue: SaveData, newValue: SaveData): ReadonlyArray<SaveOp> => {
    const removals = Object.keys(oldValue.$unknown)
        .filter((key) => !Object.hasOwn(newValue.$unknown, key))
        .map(unset);

    const ops: globalThis.Array<SaveOp> = [...removals];
    let patched = Array.reduce(removals, oldValue, applyOp);
    for (const [key, entry] of Object.entries(newValue.$unknown)) {
        for (const op of rawEntryChange(rawEntry(patched.$unknown, key), key, entry)) {
            ops.push(op);
            patched = applyOp(patched, op);
        }
    }
    return ops;
};

/**
 * Computes, combines and applies patches over a save.
 *
 * `patch` is total: an operation naming a position, a collection item or a raw
 * key that does not exist is a no-op rather than a failure, so a replayed patch
 * can never truncate a tower or invent a raw entry out of nothing. Nor can it
 * cost a tower raw entries of its own: a raw entry is always spliced into the
 * chain the encoder writes them from, never forked off it, and a key the file
 * cannot hold as one is never set (see {@link RawEntrySet}).
 *
 * `diff` compares everything a save holds: the floors, the bitizens, the
 * doorman, every scalar the schema names, every collection, the mission, the
 * friend list, the Bitbook feed, and every raw `$unknown` entry. Applying its
 * result to the older save gives back the newer one exactly, except that a
 * collection may hold its items in another order, since ownership is what
 * matters and position is not stable. Exactly, for raw entries, assumes the
 * newer save holds them in file order with no two following the same thing,
 * as decoding a file and patching such a save both leave them, and only under
 * keys {@link RawEntrySet} accepts, which a decoded file can only break with a
 * key ending in `[` and a field's tag.
 *
 * @since 1.0.0
 * @category Differ
 */
export const differ: Differ.Differ<SaveData, SavePatch> = {
    empty: [],

    combine: (first, second) => (first.length === 0 ? second : second.length === 0 ? first : [...first, ...second]),

    patch: (oldValue, patch) => Array.reduce(patch, oldValue, applyOp),

    diff: (oldValue, newValue) => {
        const modelled: ReadonlyArray<SaveOp> = [
            ...diffStories(oldValue, newValue),
            ...diffBitizens(oldValue, newValue),
            ...(identity(oldValue.doorman) === identity(newValue.doorman)
                ? []
                : [{ _tag: "DoormanSet", bitizen: newValue.doorman } satisfies SaveOp]),
            ...Object.keys(FIELD_KINDS).flatMap((field) =>
                isScalarField(field) ? diffScalar(oldValue, newValue, field) : []
            ),
            ...COLLECTION_FIELDS.flatMap((collection) => diffCollection(oldValue, newValue, collection)),
            ...diffStructured(oldValue, newValue),
        ];
        return [...modelled, ...diffRaw(Array.reduce(modelled, oldValue, applyOp), newValue)];
    },
};
