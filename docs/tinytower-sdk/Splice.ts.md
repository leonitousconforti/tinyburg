---
title: Splice.ts
nav_order: 4
parent: "@tinyburg/tinytower-sdk"
---

## Splice.ts overview

Moving one thing out of a tower and into another.

An escrow holds an item by taking it out of its owner's save and keeping it
until a trade settles, then putting it into somebody else's. Both halves are
expressed here as `SaveDiffer.SavePatch` values: `extract` returns
the patch it applied alongside the `Holding` to keep, and `insert`
turns a holding back into a patch. Nothing here talks to the network or a
database, so the risky part of a trade is a pure function that can be tested
against real saves.

## What can move

A `Selector` names something in a save; the matching `Holding` is
what escrow keeps. Floors, bitizens, costumes, pets, the roof/lift/lobby
fittings a player has collected, and currency.

## Refusing rather than guessing

`SaveDiffer` will make any edit asked of it. This module is the layer that
says no, and it says no whenever the result would be a save that contradicts
itself: a tower with no lobby, a bitizen whose home does not exist, a costume
removed from a wardrobe while somebody is still wearing it, a fitting sold
out from under the tower using it, a balance spent past zero, an item
delivered to a tower that already owns one, where the second copy would
add nothing, or an item with an empty name, which names nothing.

What it does _not_ encode is whether a thing ought to be tradeable at all.
That is a marketplace decision and belongs further up. One consequence worth
stating plainly: `bux` and `gold` are bought with real money in NimbleBit's
own storefront, and standing in for that revenue is the fastest route to a
cease and desist. Moving them is mechanically sound and implemented here;
allowing players to trade them is a separate decision, and not one this
module makes.

## Which bitizens travel with a floor

A bitizen names the floor they live on and the floor they work on by _type_
(`homeIndex` and `workIndex` are positions in the `Floors.floors` catalogue,
not positions in the tower), and every bitizen observed so far has a home
while plenty have no job. That gives one rule that keeps every reference
valid on both sides of a trade:

> A bitizen travels if and only if their home travels.

So a residential floor leaves with its residents, who arrive jobless because
the floor they worked on stayed behind. A commercial floor leaves empty, and
the bitizens who worked there stay in their homes and become jobless. The
alternative, sending workers along with a shop, would land them in a tower
with no home to point at, which is exactly the sort of half-understood edit
this module refuses to make. A bitizen moved on their own is the same rule
read backwards: the receiving tower must already have their home floor.

Every bitizen arrives laid off and undressed, alone or with a floor: no job,
not placed in their dream job, no costume (an empty one, the way the game
writes none) and no pet. The costume and pet belong to the old tower's
wardrobe, and arriving without them is what keeps the new tower from holding
something it never owned.

How many bitizens a residential floor houses is not checked. The surveyed
towers house at most five per apartment floor in saves from game version
4.1.0 and earlier, but six or seven in many later ones, so the save alone
gives no single limit to enforce.

## Two of a kind

Because the reference is by type, a tower holding two floors of the same type
gives no way to say which of them a bitizen belongs to, and extraction
refuses with `AmbiguousFloor`. Real towers almost never hit this (of thirty
three surveyed, one had duplicates and they were all empty construction
sites), but insertion does not stop a trade from creating the situation, so a
player who accepts a second Regal Apts. can no longer trade either of them.
Fixing that needs a rule about which copy owns whom, which is a game design
question rather than a parsing one.

Since v1.0.0

---

## Exports Grouped by Category

- [Errors](#errors)
  - [SpliceError (class)](#spliceerror-class)
  - [SpliceErrorReason (type alias)](#spliceerrorreason-type-alias)
- [Models](#models)
  - [BitizenHolding](#bitizenholding)
  - [BitizenHolding (interface)](#bitizenholding-interface)
  - [CURRENCIES](#currencies)
  - [CostumeHolding](#costumeholding)
  - [CostumeHolding (interface)](#costumeholding-interface)
  - [Currency (type alias)](#currency-type-alias)
  - [CurrencyHolding](#currencyholding)
  - [CurrencyHolding (interface)](#currencyholding-interface)
  - [Extraction (interface)](#extraction-interface)
  - [FITTING_KINDS](#fitting_kinds)
  - [FittingHolding](#fittingholding)
  - [FittingHolding (interface)](#fittingholding-interface)
  - [FittingKind (type alias)](#fittingkind-type-alias)
  - [FloorBundle (type alias)](#floorbundle-type-alias)
  - [FloorHolding](#floorholding)
  - [FloorHolding (interface)](#floorholding-interface)
  - [Holding](#holding)
  - [Holding (type alias)](#holding-type-alias)
  - [Owned (type alias)](#owned-type-alias)
  - [PetHolding](#petholding)
  - [PetHolding (interface)](#petholding-interface)
  - [Selector](#selector)
  - [Selector (type alias)](#selector-type-alias)
- [Splice](#splice)
  - [extract](#extract)
  - [extractFloor](#extractfloor)
  - [holdingPatch](#holdingpatch)
  - [insert](#insert)
  - [insertFloor](#insertfloor)
- [Utilities](#utilities)
  - [canExtract](#canextract)
  - [catalogIndex](#catalogindex)
  - [inUse](#inuse)

---

# Errors

## SpliceError (class)

A refused splice.

**Signature**

```ts
declare class SpliceError
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/Splice.ts#L122)

Since v1.0.0

## SpliceErrorReason (type alias)

Why a splice was refused.

Every one of these means "this edit was not attempted", never "this edit was
half applied".

**Signature**

```ts
type SpliceErrorReason =
  | "FloorNotFound"
  | "FloorNotTradeable"
  | "UnknownFloor"
  | "AmbiguousFloor"
  | "TowerTooTall"
  | "BundleMismatch"
  | "BitizenNotFound"
  | "NoHomeFloor"
  | "NotOwned"
  | "InvalidItem"
  | "AlreadyOwned"
  | "InUse"
  | "InvalidAmount"
  | "InsufficientFunds"
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/Splice.ts#L100)

Since v1.0.0

# Models

## BitizenHolding

One bitizen, travelling alone.

**Signature**

```ts
declare const BitizenHolding: BitizenHolding
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/Splice.ts#L204)

Since v1.0.0

## BitizenHolding (interface)

The type of the `BitizenHolding` schema.

**Signature**

```ts
export interface BitizenHolding extends Schema.TaggedStruct<"Bitizen", { readonly bitizen: typeof Bitizens.Bitizen }> {}
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/Splice.ts#L196)

Since v1.0.0

## CURRENCIES

The currencies a tower holds. `gold` is golden tickets.

**Signature**

```ts
declare const CURRENCIES: readonly ["coins", "bux", "gold"]
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/Splice.ts#L157)

Since v1.0.0

## CostumeHolding

A costume, named the way the save names it.

Not checked against `Costumes.costumes`: real wardrobes hold around three
hundred costumes while the catalogue generated from the current build lists
two hundred and thirty nine, so an unrecognised name means the catalogue is
behind, not that the save is wrong.

**Signature**

```ts
declare const CostumeHolding: CostumeHolding
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/Splice.ts#L227)

Since v1.0.0

## CostumeHolding (interface)

The type of the `CostumeHolding` schema.

**Signature**

```ts
export interface CostumeHolding extends Schema.TaggedStruct<"Costume", { readonly costume: Schema.String }> {}
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/Splice.ts#L214)

Since v1.0.0

## Currency (type alias)

**Signature**

```ts
type Currency = (typeof CURRENCIES)[number]
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/Splice.ts#L163)

Since v1.0.0

## CurrencyHolding

An amount of one currency: a whole number above zero.

**Signature**

```ts
declare const CurrencyHolding: CurrencyHolding
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/Splice.ts#L288)

Since v1.0.0

## CurrencyHolding (interface)

The type of the `CurrencyHolding` schema.

**Signature**

```ts
export interface CurrencyHolding extends Schema.TaggedStruct<
  "Currency",
  { readonly currency: Schema.Literals<typeof CURRENCIES>; readonly amount: Schema.Int }
> {}
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/Splice.ts#L277)

Since v1.0.0

## Extraction (interface)

The result of taking something out of a save.

**Signature**

```ts
export interface Extraction {
  /** The owner's tower with the item gone. */
  readonly save: SaveDiffer.SaveData
  /** What to put in escrow. */
  readonly holding: Holding
  /** The edit that was applied, worth keeping for an audit trail. */
  readonly patch: SaveDiffer.SavePatch
}
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/Splice.ts#L371)

Since v1.0.0

## FITTING_KINDS

The three fittings a tower wears: its roof, its elevator, and its lobby.

Each is a pair of save fields: the collection of ones owned, and the id of
the one currently installed.

**Signature**

```ts
declare const FITTING_KINDS: readonly ["roof", "lift", "lobby"]
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/Splice.ts#L136)

Since v1.0.0

## FittingHolding

A roof, elevator or lobby that is owned but not installed.

**Signature**

```ts
declare const FittingHolding: FittingHolding
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/Splice.ts#L266)

Since v1.0.0

## FittingHolding (interface)

The type of the `FittingHolding` schema.

**Signature**

```ts
export interface FittingHolding extends Schema.TaggedStruct<
  "Fitting",
  { readonly fitting: Schema.Literals<typeof FITTING_KINDS>; readonly id: Schema.String }
> {}
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/Splice.ts#L255)

Since v1.0.0

## FittingKind (type alias)

**Signature**

```ts
type FittingKind = (typeof FITTING_KINDS)[number]
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/Splice.ts#L142)

Since v1.0.0

## FloorBundle (type alias)

Kept for the floor case, which is the one with a payload worth naming.

**Signature**

```ts
type FloorBundle = Schema.Schema.Type<typeof FloorHolding>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/Splice.ts#L323)

Since v1.0.0

## FloorHolding

A floor and the bitizens that came with it.

The floor's `storyHeight` is normalised to `0`, because where it used to sit
in its old tower means nothing in its new one.

**Signature**

```ts
declare const FloorHolding: FloorHolding
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/Splice.ts#L185)

Since v1.0.0

## FloorHolding (interface)

The type of the `FloorHolding` schema.

**Signature**

```ts
export interface FloorHolding extends Schema.TaggedStruct<
  "Floor",
  { readonly floor: typeof Floors.Floor; readonly bitizens: Schema.$Array<typeof Bitizens.Bitizen> }
> {}
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/Splice.ts#L171)

Since v1.0.0

## Holding

What an escrow holds between a deposit and a withdrawal.

One schema for every kind of tradeable, so an escrow row needs one column and
one decoder no matter what is in it.

**Signature**

```ts
declare const Holding: Schema.Union<
  readonly [FloorHolding, BitizenHolding, CostumeHolding, PetHolding, FittingHolding, CurrencyHolding]
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/Splice.ts#L302)

Since v1.0.0

## Holding (type alias)

**Signature**

```ts
type Holding = Schema.Schema.Type<typeof Holding>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/Splice.ts#L315)

Since v1.0.0

## Owned (type alias)

A thing a tower owns in a collection and can be using: a costume, a pet or
a fitting. Selecting one and holding one look the same.

**Signature**

```ts
type Owned = Extract<Holding, { readonly _tag: "Costume" | "Pet" | "Fitting" }>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/Splice.ts#L332)

Since v1.0.0

## PetHolding

A pet.

**Signature**

```ts
declare const PetHolding: PetHolding
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/Splice.ts#L245)

Since v1.0.0

## PetHolding (interface)

The type of the `PetHolding` schema.

**Signature**

```ts
export interface PetHolding extends Schema.TaggedStruct<"Pet", { readonly pet: Schema.String }> {}
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/Splice.ts#L237)

Since v1.0.0

## Selector

Names the thing to take out of a save.

Floors and bitizens are addressed by position because that is how a player
points at one; everything else is addressed by identity.

**Signature**

```ts
declare const Selector: Schema.Union<
  readonly [
    Schema.TaggedStruct<"Floor", { readonly storyHeight: Schema.Int }>,
    Schema.TaggedStruct<"Bitizen", { readonly index: Schema.Int }>,
    CostumeHolding,
    PetHolding,
    FittingHolding,
    CurrencyHolding
  ]
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/Splice.ts#L350)

Since v1.0.0

## Selector (type alias)

**Signature**

```ts
type Selector = Schema.Schema.Type<typeof Selector>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/Splice.ts#L363)

Since v1.0.0

# Splice

## extract

Takes something out of a save, leaving a tower that still makes sense.

**Signature**

```ts
declare const extract: (save: SaveDiffer.SaveData, selector: Selector) => Effect.Effect<Extraction, SpliceError, never>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/Splice.ts#L729)

Since v1.0.0

## extractFloor

Takes a floor out of a save, along with any bitizen whose home it was.

A convenience over `extract` for the case v1 is built around.

**Signature**

```ts
declare const extractFloor: (
  save: SaveDiffer.SaveData,
  storyHeight: number
) => Effect.Effect<Extraction, SpliceError, never>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/Splice.ts#L890)

Since v1.0.0

## holdingPatch

The patch that puts a holding into a tower.

Every operation it produces is position-free, so it means the same thing
against any save: a floor lands on top, an item joins a collection, a balance
moves up by what was taken. That is what makes a holding replayable into a
tower other than the one it came from, and it is why the patch can be written
out to a database and applied days later without being recomputed. Bitizens
in it arrive laid off and undressed, however the holding carried them.

**Signature**

```ts
declare const holdingPatch: (holding: Holding) => SaveDiffer.SavePatch
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/Splice.ts#L765)

Since v1.0.0

## insert

Puts an escrowed holding into a save.

A floor lands on top of the tower, the way the game places a newly built one.

Aimed back at the original owner it serves as a refund, with two caveats.
Bitizens come back laid off and undressed, as they would arrive anywhere.
And a costume, pet or fitting is refused with `AlreadyOwned` whenever the
tower already holds a copy, which the original owner does if they held more
than one (extraction takes a single copy of a duplicate) or have got it again
since. To put that copy back, apply `holdingPatch` with
`SaveDiffer.differ.patch`, which grants it without checking.

**Signature**

```ts
declare const insert: (
  save: SaveDiffer.SaveData,
  holding: Holding,
  options?: { readonly maxStories?: number | undefined }
) => Effect.Effect<SaveDiffer.SaveData, SpliceError, never>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/Splice.ts#L810)

Since v1.0.0

## insertFloor

Puts an escrowed floor bundle into a save.

A convenience over `insert`.

**Signature**

```ts
declare const insertFloor: (
  save: SaveDiffer.SaveData,
  bundle: FloorBundle,
  options?: { readonly maxStories?: number | undefined }
) => Effect.Effect<SaveDiffer.SaveData, SpliceError, never>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/Splice.ts#L903)

Since v1.0.0

# Utilities

## canExtract

Whether `extract` would take a costume, pet or fitting out of a tower:
it has a name, the tower owns a copy, and nothing in the tower is using it.
Anything listing what a player could offer should filter by this, so that
the list and the extraction follow one rule.

**Signature**

```ts
declare const canExtract: (save: SaveDiffer.SaveData, item: Owned) => boolean
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/Splice.ts#L675)

Since v1.0.0

## catalogIndex

Recovers the catalogue position a decoded `floorId` came from.

`Floors.Floor` decodes that position into a `{ name, type }` pair, and no two
catalogue entries share a pair, so this is exact. It matches from the end
because that is the direction the schema itself encodes in.

**Signature**

```ts
declare const catalogIndex: (floorId: { readonly name: string; readonly type: string }) => Option.Option<number>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/Splice.ts#L417)

Since v1.0.0

## inUse

Whether a tower is using something it owns: a costume somebody wears, a pet
somebody keeps, or the fitting currently installed. `extract` refuses
to take such a thing with `InUse`. An empty name is never in use, even
though every undressed bitizen wears an empty costume, because it names no
costume at all. To list what a player could offer, use `canExtract`,
which checks this and everything else `extract` does.

**Signature**

```ts
declare const inUse: (save: SaveDiffer.SaveData, item: Owned) => boolean
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/Splice.ts#L486)

Since v1.0.0
