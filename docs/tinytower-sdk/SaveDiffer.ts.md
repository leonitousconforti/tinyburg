---
title: SaveDiffer.ts
nav_order: 2
parent: "@tinyburg/tinytower-sdk"
---

## SaveDiffer.ts overview

Patch based editing of TinyTower save data.

Rewriting a save in place is how an escrow moves something between two
players, and doing it by hand is how saves get corrupted. This module makes
the edit itself a value: a `SavePatch` is an ordered list of small,
serializable operations, and `differ` knows how to compute one, combine
two, and apply one.

Modelling the edit as data rather than a function buys three things escrow
needs. A patch can be written to a database and applied later (that is what
"holding" an item means). A patch can be inspected and logged, so a support
request has an audit trail. And `diff` answers "what changed under us?" when
a player keeps playing between our download and our upload.

## What can be edited

Everything a decoded save holds, grouped by how it behaves rather than by
what type it happens to hold:

- The ordered lists, `stories` (floors) and `bzns` (bitizens), plus the
  doorman, who is a bitizen kept outside the list. A floor or bitizen can be
  added, removed, or overwritten where it stands.
- Collections of owned things (costumes, pets, roofs, lifts, lobbies) and
  the rolling histories, through `ItemsGranted` and
  `ItemsRevoked`. A collection is a multiset: saves do occasionally list
  the same roof twice, and each copy counts.
- Counters, through `CounterAdjusted`, which moves a number by a
  distance instead of overwriting it. The three currencies are counters
  (`coins`, `bux`, and `gold`, which is golden tickets), and so are the
  running totals `buxBought` and `totalPoints`.
- Everything else scalar, through `FieldSet` and `FieldUnset`,
  which take values as text the way the save itself stores them. That covers
  the fields `SaveData` names and the many it does not: a real save carries
  around sixty further raw entries, including at least eight more event
  currencies, and `RawEntrySet` adds one where the file keeps it.
- The structured fields no trade touches (the current mission, the friend
  list and the Bitbook feed), which are only ever replaced whole.

## Properties

`diff` is exact: for any two decoded saves, `patch(a, diff(a, b))` is `b`,
except that a collection comes back holding the same items in a possibly
different order. The edits a player makes while playing come out small and
meaningful: a floor built on top is one `FloorAppended`, a floor
levelled, restocked or rebuilt is one `FloorReplaced`, a removed floor
or bitizen is one removal wherever it stood, and a bitizen who changed is one
`BitizenReplaced`.

`CounterAdjusted`, `ItemsGranted`, `ItemsRevoked`,
`FloorAppended` and `BitizenAdded` are **position-free**, so a
patch holding only them means the same thing against any save, which is what
lets an escrow replay one into a tower that is not the one it came from.

The operations that set or overwrite something are idempotent, but the rest
are not: applying the same patch twice grants an item twice, moves a counter
twice and removes a second floor. A retry has to start again from the save
it started from, never replay onto one that already took the patch.

Operations describe _what_ to change, never _whether_ it is allowed. Refusing
an edit that would corrupt a save is `Splice`'s job, and deciding what may be
traded at all belongs further up still.

Since v1.0.0

---

## Exports Grouped by Category

- [Differ](#differ)
  - [differ](#differ-1)
- [Fields](#fields)
  - [COLLECTION_FIELDS](#collection_fields)
  - [CURRENCIES](#currencies)
  - [CollectionField (type alias)](#collectionfield-type-alias)
  - [ScalarField (type alias)](#scalarfield-type-alias)
- [Models](#models)
  - [Bitizen (interface)](#bitizen-interface)
  - [Floor (interface)](#floor-interface)
  - [SaveData (interface)](#savedata-interface)
  - [SavePatch](#savepatch)
  - [SavePatch (interface)](#savepatch-interface)
- [Operations](#operations)
  - [BitbookPostsSet](#bitbookpostsset)
  - [BitbookPostsSet (interface)](#bitbookpostsset-interface)
  - [BitizenAdded](#bitizenadded)
  - [BitizenAdded (interface)](#bitizenadded-interface)
  - [BitizenRemoved](#bitizenremoved)
  - [BitizenRemoved (interface)](#bitizenremoved-interface)
  - [BitizenReplaced](#bitizenreplaced)
  - [BitizenReplaced (interface)](#bitizenreplaced-interface)
  - [CounterAdjusted](#counteradjusted)
  - [CounterAdjusted (interface)](#counteradjusted-interface)
  - [DoormanSet](#doormanset)
  - [DoormanSet (interface)](#doormanset-interface)
  - [FieldSet](#fieldset)
  - [FieldSet (interface)](#fieldset-interface)
  - [FieldUnset](#fieldunset)
  - [FieldUnset (interface)](#fieldunset-interface)
  - [FloorAppended](#floorappended)
  - [FloorAppended (interface)](#floorappended-interface)
  - [FloorRemoved](#floorremoved)
  - [FloorRemoved (interface)](#floorremoved-interface)
  - [FloorReplaced](#floorreplaced)
  - [FloorReplaced (interface)](#floorreplaced-interface)
  - [FriendsSet](#friendsset)
  - [FriendsSet (interface)](#friendsset-interface)
  - [ItemsGranted](#itemsgranted)
  - [ItemsGranted (interface)](#itemsgranted-interface)
  - [ItemsRevoked](#itemsrevoked)
  - [ItemsRevoked (interface)](#itemsrevoked-interface)
  - [MissionSet](#missionset)
  - [MissionSet (interface)](#missionset-interface)
  - [RawEntrySet](#rawentryset)
  - [RawEntrySet (interface)](#rawentryset-interface)
  - [SaveOp](#saveop)
  - [SaveOp (type alias)](#saveop-type-alias)

---

# Differ

## differ

Computes, combines and applies patches over a save.

`patch` is total: an operation naming a position, a collection item or a raw
key that does not exist is a no-op rather than a failure, so a replayed patch
can never truncate a tower or invent a raw entry out of nothing. Nor can it
cost a tower raw entries of its own: a raw entry is always spliced into the
chain the encoder writes them from, never forked off it, and a key the file
cannot hold as one is never set (see `RawEntrySet`).

`diff` compares everything a save holds: the floors, the bitizens, the
doorman, every scalar the schema names, every collection, the mission, the
friend list, the Bitbook feed, and every raw `$unknown` entry. Applying its
result to the older save gives back the newer one exactly, except that a
collection may hold its items in another order, since ownership is what
matters and position is not stable. Exactly, for raw entries, assumes the
newer save holds them in file order with no two following the same thing,
as decoding a file and patching such a save both leave them, and only under
keys `RawEntrySet` accepts, which a decoded file can only break with a
key ending in `[` and a field's tag.

**Signature**

```ts
declare const differ: Differ.Differ<SaveData, SavePatch>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/SaveDiffer.ts#L1543)

Since v1.0.0

# Fields

## COLLECTION_FIELDS

The save's list-valued fields: the things a player collects.

`costumes` and `pets` are wardrobes, `roofs`, `lifts` and `lobbies` are the
fittings owned (as opposed to the one currently in use), and the two `Hist`
fields are capped rolling histories rather than possessions.

**Signature**

```ts
declare const COLLECTION_FIELDS: readonly [
  "costumes",
  "pets",
  "roofs",
  "lifts",
  "lobbies",
  "missionHist",
  "bbHist",
  "bannedFriends"
]
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/SaveDiffer.ts#L550)

Since v1.0.0

## CURRENCIES

The three currencies a tower holds. `gold` is golden tickets.

**Signature**

```ts
declare const CURRENCIES: readonly ["coins", "bux", "gold"]
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/SaveDiffer.ts#L399)

Since v1.0.0

## CollectionField (type alias)

**Signature**

```ts
type CollectionField = (typeof COLLECTION_FIELDS)[number]
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/SaveDiffer.ts#L565)

Since v1.0.0

## ScalarField (type alias)

The name of a scalar field the schema models: one whose value is a number, a
bigint or text, optional or not.

Read off `SaveData` itself rather than off the internal table that sorts the
fields by kind, which the build leaves out of the published declarations.

**Signature**

```ts
type ScalarField = {
  [K in keyof SaveData]-?: NonNullable<SaveData[K]> extends number | bigint | string ? K : never
}[keyof SaveData]
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/SaveDiffer.ts#L280)

Since v1.0.0

# Models

## Bitizen (interface)

A decoded bitizen, as it appears in a save's `bzns`.

**Signature**

```ts
export interface Bitizen extends Schema.Schema.Type<typeof Bitizens.Bitizen> {}
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/SaveDiffer.ts#L104)

Since v1.0.0

## Floor (interface)

A decoded floor, as it appears in a save's `stories`.

**Signature**

```ts
export interface Floor extends Schema.Schema.Type<typeof Floors.Floor> {}
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/SaveDiffer.ts#L96)

Since v1.0.0

## SaveData (interface)

A decoded save, as produced by `TinyTower.SaveData`.

**Signature**

```ts
export interface SaveData extends Schema.Schema.Type<typeof TinyTower.SaveData> {}
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/SaveDiffer.ts#L88)

Since v1.0.0

## SavePatch

An ordered list of edits, applied left to right.

Encodes to plain JSON with floors and bitizens in Nimblebit's own string
format, so a patch can be stored in a database column and read back without
losing anything the game cares about.

**Signature**

```ts
declare const SavePatch: Schema.$Array<
  Schema.Union<
    readonly [
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
      BitbookPostsSet
    ]
  >
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/SaveDiffer.ts#L723)

Since v1.0.0

## SavePatch (interface)

A decoded `SavePatch`. An interface rather than an alias so that
signatures mention it by name instead of spelling out every operation.

**Signature**

```ts
export interface SavePatch extends ReadonlyArray<SaveOp> {}
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/SaveDiffer.ts#L732)

Since v1.0.0

# Operations

## BitbookPostsSet

Replaces the tower's Bitbook feed.

**Signature**

```ts
declare const BitbookPostsSet: BitbookPostsSet
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/SaveDiffer.ts#L678)

Since v1.0.0

## BitbookPostsSet (interface)

The type of the `BitbookPostsSet` schema.

**Signature**

```ts
export interface BitbookPostsSet extends Schema.TaggedStruct<
  "BitbookPostsSet",
  { readonly posts: Schema.$Array<typeof BitbookPosts.BitbookPost> }
> {}
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/SaveDiffer.ts#L667)

Since v1.0.0

## BitizenAdded

Adds a bitizen to the save.

Position-free, and therefore replayable against another player's save.

**Signature**

```ts
declare const BitizenAdded: BitizenAdded
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/SaveDiffer.ts#L205)

Since v1.0.0

## BitizenAdded (interface)

The type of the `BitizenAdded` schema.

**Signature**

```ts
export interface BitizenAdded extends Schema.TaggedStruct<
  "BitizenAdded",
  { readonly bitizen: typeof Bitizens.Bitizen }
> {}
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/SaveDiffer.ts#L192)

Since v1.0.0

## BitizenRemoved

Removes the bitizen at `index`.

**Signature**

```ts
declare const BitizenRemoved: BitizenRemoved
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/SaveDiffer.ts#L223)

Since v1.0.0

## BitizenRemoved (interface)

The type of the `BitizenRemoved` schema.

**Signature**

```ts
export interface BitizenRemoved extends Schema.TaggedStruct<"BitizenRemoved", { readonly index: Schema.Int }> {}
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/SaveDiffer.ts#L215)

Since v1.0.0

## BitizenReplaced

Overwrites the bitizen at `index`.

Used when a bitizen stays put but their situation changes, for example losing
a job because the floor they worked on was traded away.

**Signature**

```ts
declare const BitizenReplaced: BitizenReplaced
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/SaveDiffer.ts#L247)

Since v1.0.0

## BitizenReplaced (interface)

The type of the `BitizenReplaced` schema.

**Signature**

```ts
export interface BitizenReplaced extends Schema.TaggedStruct<
  "BitizenReplaced",
  { readonly index: Schema.Int; readonly bitizen: typeof Bitizens.Bitizen }
> {}
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/SaveDiffer.ts#L233)

Since v1.0.0

## CounterAdjusted

Moves a counter by `by`, which may be negative.

Relative rather than absolute, and that is the whole point. An escrow holds a
patch and replays it against a tower that is not the one it came from, so
"set coins to 95,764,637" is not merely wrong there, it is destructive; "add
a hundred coins" means the same thing everywhere. Deltas also compose, so
combining two patches does the arithmetic for free.

Names a counter, whether the schema models it or it is one of the event
currencies living among the raw entries: `gachaCurrency` and `swapTicket`
adjust exactly like `coins` does. Taking the name as free text is what makes
that possible; the cost is that a misspelled counter is a silent no-op rather
than a type error, so callers with a fixed set to choose from should choose
from `CURRENCIES`. A modelled field that is not a counter, such as the
installed roof, is left alone: set it with `FieldSet` instead.

Nothing here checks that the result is a balance a player could actually
reach. Refusing to spend past zero is `Splice`'s job.

**Signature**

```ts
declare const CounterAdjusted: CounterAdjusted
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/SaveDiffer.ts#L435)

Since v1.0.0

## CounterAdjusted (interface)

The type of the `CounterAdjusted` schema.

**Signature**

```ts
export interface CounterAdjusted extends Schema.TaggedStruct<
  "CounterAdjusted",
  { readonly counter: Schema.String; readonly by: Schema.Int }
> {}
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/SaveDiffer.ts#L407)

Since v1.0.0

## DoormanSet

Replaces the tower's doorman, who is a bitizen living outside `bzns`.

**Signature**

```ts
declare const DoormanSet: DoormanSet
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/SaveDiffer.ts#L266)

Since v1.0.0

## DoormanSet (interface)

The type of the `DoormanSet` schema.

**Signature**

```ts
export interface DoormanSet extends Schema.TaggedStruct<"DoormanSet", { readonly bitizen: typeof Bitizens.Bitizen }> {}
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/SaveDiffer.ts#L258)

Since v1.0.0

## FieldSet

Sets a field to a value, written the way the save itself writes it.

For everything a counter is the wrong tool for: text, ids, settings,
timestamps, and the raw JSON blobs. Taking the value as a string is what lets
one operation cover all of them and the unmodelled fields besides, rather
than needing a variant per JavaScript type.

An optional field the schema models is created if the save lacks it. A raw
entry the save lacks is left alone, because a raw entry needs a place in the
file: `RawEntrySet` is the operation that gives it one.

**Signature**

```ts
declare const FieldSet: FieldSet
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/SaveDiffer.ts#L466)

Since v1.0.0

## FieldSet (interface)

The type of the `FieldSet` schema.

**Signature**

```ts
export interface FieldSet extends Schema.TaggedStruct<
  "FieldSet",
  { readonly field: Schema.String; readonly value: Schema.String }
> {}
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/SaveDiffer.ts#L446)

Since v1.0.0

## FieldUnset

Removes an optional field, or a raw entry.

A field every save has is left alone. Whatever is removed, the raw entries
that followed it in the file keep their place: a raw entry hands its place on
to them, and an optional field passes them to the nearest field before it
that the save still has, behind any raw entries already following that one.
That is where they would sit in the file anyway, and the encoder only writes
raw entries that follow something it writes, so nothing is orphaned.

**Signature**

```ts
declare const FieldUnset: FieldUnset
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/SaveDiffer.ts#L492)

Since v1.0.0

## FieldUnset (interface)

The type of the `FieldUnset` schema.

**Signature**

```ts
export interface FieldUnset extends Schema.TaggedStruct<"FieldUnset", { readonly field: Schema.String }> {}
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/SaveDiffer.ts#L477)

Since v1.0.0

## FloorAppended

Adds a floor to the top of the tower.

This operation carries no position, which is what makes it safe to replay
against a save other than the one it came from: a floor always lands on top,
following the game's own rule for where a new floor goes. Escrow relies on
that, since the tower a floor is withdrawn into is never the tower it was
deposited from.

**Signature**

```ts
declare const FloorAppended: FloorAppended
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/SaveDiffer.ts#L133)

Since v1.0.0

## FloorAppended (interface)

The type of the `FloorAppended` schema.

**Signature**

```ts
export interface FloorAppended extends Schema.TaggedStruct<"FloorAppended", { readonly floor: typeof Floors.Floor }> {}
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/SaveDiffer.ts#L119)

Since v1.0.0

## FloorRemoved

Removes the floor at `storyHeight`, closing the gap underneath everything
above it.

Unlike `FloorAppended` this names a position, so it only means
something against the exact save it was computed from.

**Signature**

```ts
declare const FloorRemoved: FloorRemoved
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/SaveDiffer.ts#L155)

Since v1.0.0

## FloorRemoved (interface)

The type of the `FloorRemoved` schema.

**Signature**

```ts
export interface FloorRemoved extends Schema.TaggedStruct<"FloorRemoved", { readonly storyHeight: Schema.Int }> {}
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/SaveDiffer.ts#L143)

Since v1.0.0

## FloorReplaced

Overwrites the floor at `storyHeight`, leaving every other floor where it
is.

This is what levelling, restocking or rebuilding a floor looks like. The
floor is written exactly as given, `storyHeight` included, and like
`FloorRemoved` it only means something against the save it came from.

**Signature**

```ts
declare const FloorReplaced: FloorReplaced
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/SaveDiffer.ts#L181)

Since v1.0.0

## FloorReplaced (interface)

The type of the `FloorReplaced` schema.

**Signature**

```ts
export interface FloorReplaced extends Schema.TaggedStruct<
  "FloorReplaced",
  { readonly storyHeight: Schema.Int; readonly floor: typeof Floors.Floor }
> {}
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/SaveDiffer.ts#L165)

Since v1.0.0

## FriendsSet

Replaces the tower's friend list.

**Signature**

```ts
declare const FriendsSet: FriendsSet
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/SaveDiffer.ts#L657)

Since v1.0.0

## FriendsSet (interface)

The type of the `FriendsSet` schema.

**Signature**

```ts
export interface FriendsSet extends Schema.TaggedStruct<"FriendsSet", { readonly friends: typeof TinyTower.Friends }> {}
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/SaveDiffer.ts#L649)

Since v1.0.0

## ItemsGranted

Adds items to a collection, one copy per listed item.

Collections are multisets, so granting something already held adds a second
copy. Granting into an optional collection the save lacks creates it, which
is also why granting nothing is not quite a no-op.

**Signature**

```ts
declare const ItemsGranted: ItemsGranted
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/SaveDiffer.ts#L591)

Since v1.0.0

## ItemsGranted (interface)

The type of the `ItemsGranted` schema.

**Signature**

```ts
export interface ItemsGranted extends Schema.TaggedStruct<
  "ItemsGranted",
  {
    readonly collection: Schema.Literals<typeof COLLECTION_FIELDS>
    readonly items: Schema.$Array<Schema.String>
  }
> {}
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/SaveDiffer.ts#L573)

Since v1.0.0

## ItemsRevoked

Removes items from a collection, one copy per listed item.

Saves do occasionally carry a duplicate (one observed tower listed the same
roof twice), and revoking one copy leaves the other where it was. An item
the collection does not hold is skipped.

**Signature**

```ts
declare const ItemsRevoked: ItemsRevoked
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/SaveDiffer.ts#L620)

Since v1.0.0

## ItemsRevoked (interface)

The type of the `ItemsRevoked` schema.

**Signature**

```ts
export interface ItemsRevoked extends Schema.TaggedStruct<
  "ItemsRevoked",
  {
    readonly collection: Schema.Literals<typeof COLLECTION_FIELDS>
    readonly items: Schema.$Array<Schema.String>
  }
> {}
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/SaveDiffer.ts#L602)

Since v1.0.0

## MissionSet

Replaces the tower's current mission.

**Signature**

```ts
declare const MissionSet: MissionSet
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/SaveDiffer.ts#L639)

Since v1.0.0

## MissionSet (interface)

The type of the `MissionSet` schema.

**Signature**

```ts
export interface MissionSet extends Schema.TaggedStruct<"MissionSet", { readonly mission: typeof Missions.Mission }> {}
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/SaveDiffer.ts#L631)

Since v1.0.0

## RawEntrySet

Sets a raw `$unknown` entry along with where in the file it sits, creating
it if the save lacks it.

`after` names the field or raw entry it follows, the way decoding records
it, and `null` is the start of the file, ahead of every field. The entry is
spliced in there: whatever followed that place now follows the entry, and
if the entry stood somewhere else before, the gap it leaves closes up.

Leaving `after` out keeps an entry the save already has where it is, so only
its value changes, and adds a new one at the end of the file. An `after`
naming a modelled field the save lacks puts the entry where that field's own
raw entries would go if it were unset (see `FieldUnset`), and one
naming nothing the save has is treated as left out.

A key the file cannot hold as a raw entry leaves the save as it was: the
name or the Nimblebit tag of a modelled field (`coins`, `Pc`), a key ending
in `[` and such a tag, an empty key, one holding `]`, and `__proto__`. The
encoder would write any of them over a modelled field or lose it.

**Signature**

```ts
declare const RawEntrySet: RawEntrySet
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/SaveDiffer.ts#L534)

Since v1.0.0

## RawEntrySet (interface)

The type of the `RawEntrySet` schema.

**Signature**

```ts
export interface RawEntrySet extends Schema.TaggedStruct<
  "RawEntrySet",
  {
    readonly key: Schema.String
    readonly value: Schema.String
    readonly after: Schema.optionalKey<Schema.NullOr<Schema.String>>
  }
> {}
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/SaveDiffer.ts#L502)

Since v1.0.0

## SaveOp

A single edit to a save.

**Signature**

```ts
declare const SaveOp: Schema.Union<
  readonly [
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
    BitbookPostsSet
  ]
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/SaveDiffer.ts#L688)

Since v1.0.0

## SaveOp (type alias)

**Signature**

```ts
type SaveOp = Schema.Schema.Type<typeof SaveOp>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/SaveDiffer.ts#L711)

Since v1.0.0
