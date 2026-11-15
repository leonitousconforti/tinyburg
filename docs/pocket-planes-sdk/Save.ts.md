---
title: Save.ts
nav_order: 3
parent: "@tinyburg/pocket-planes-sdk"
---

## Save.ts overview

Pocket Planes's save (game version 2.17.3).

The save is the JSON string `PPSave.ToJson` makes with Newtonsoft.Json:
`Player.saveJson()` returns it, `Player._Save` keeps it in PlayerPrefs under
`Player.SaveKey`, and `Player.FromJSON` loads it. Its keys are `PPSave`'s
field names (the coins and bux `Currency` fields are written as the numbers
`c` and `b`), and the item schemas below keep the names of the game's
classes and fields.

For the sync server, `NBSync.pushToServer` sends `NBSync.encodeSave` of
`Player.saveJson()`, and the `/sync/pull/` and `/friend/pull_game/`
responses go through `NBSync.decodeSave` before `Player.FromJSON`. Those two
call the game's Java `NBSync.compress` and `NBSync.decompress`: UTF-8, zlib
(`java.util.zip.Deflater` at its default level) and base64. So the bytes the
SDK's sync pull returns (`data` after base64) are the zlib-compressed save,
which `SaveDataFromBytes` reads.

How this was determined: saves taken from the game on an emulator with a
Frida agent (`Player.saveJson()` of a fresh game, of one grown through the
game's own methods, and of crafted content loaded with `Player.FromJSON`),
the field types the game's classes declare, and the game's code
(disassembly of `NBSync`, `Player._Save`, `PaintColor.ToString` and
`BitizenInfo.ToDict`, and the Java `NBSync` class). The test fixtures are
those saves, with the player's id and auth salt replaced by fakes.

Decoding drops nothing: a key the schemas do not model (one a newer game
version adds, say) is kept on its object as a `JsonValue` and written
back. C# `long` and `ulong` fields decode to `bigint`, since some hold
`DateTime` ticks (`nFBT` and `nPCT` are `DateTime.UtcNow.Ticks` plus a
delay), which a JSON number loses digits of.

Round trips: encoding a decoded save gives back the string it was decoded
from, byte for byte, for a save the game wrote (each fixture does), with two
exceptions:

- A JavaScript object puts keys that are array indexes (integers from 0 to
  4294967294, written without a sign or leading zeros) before all other
  keys, in ascending order. So a dictionary keyed by them comes back sorted
  if the game wrote it in another order: the integer keys of
  `carrierPorts` (both levels), `cityJobsAdWatched`, `eventCounts` and the
  inner dictionaries of `refresh`, the days that key `dailyStats`, and any
  such key the schemas do not model or that is inside a value they do not
  model.
- A key the schemas do not model comes back after the keys they do model
  on the same object, wherever the game wrote it.

Numbers are written the way the game writes them, so they come back as
read: a C# `double` with .NET's `ToString("R")` as Unity's runtime does it
(15 significant digits when those read back as the same value, 17
otherwise), a `float` likewise with 7 or 9 digits of its 32-bit value,
exponent notation (`1E-05`, `1E+15`) for an exponent below -4 or at least
the digit count, and `.0` after a whole number (`843.0`). Strings get
Newtonsoft.Json's escaping. Input the game would not write (whitespace,
other escapes or number spellings) decodes, and encodes the way the game
would write it, except that a number with a decimal point or exponent in a
value the schemas do not model is written back as it was spelled.

Since v1.0.0

---

## Exports Grouped by Category

- [Models](#models)
  - [JsonDouble (class)](#jsondouble-class)
    - [value (property)](#value-property)
    - [single (property)](#single-property)
    - [text (property)](#text-property)
  - [JsonValue (type alias)](#jsonvalue-type-alias)
- [Primitives](#primitives)
  - [DateTimeString](#datetimestring)
  - [Double](#double)
  - [Float](#float)
  - [IntKey](#intkey)
  - [JsonValue](#jsonvalue)
  - [Long](#long)
- [Schemas](#schemas)
  - [BBEntry](#bbentry)
  - [BitizenAttributes](#bitizenattributes)
  - [BitizenData](#bitizendata)
  - [Cargo](#cargo)
  - [CargoDetails](#cargodetails)
  - [CargoLog](#cargolog)
  - [CityInfo](#cityinfo)
  - [CrateInfo](#crateinfo)
  - [Currency](#currency)
  - [GlobalEventProgress](#globaleventprogress)
  - [GlobalEventReward](#globaleventreward)
  - [PPFriend](#ppfriend)
  - [PPSave](#ppsave)
  - [Paint](#paint)
  - [Part](#part)
  - [PlaneInfo](#planeinfo)
  - [SaveData](#savedata)
  - [SaveDataFromBytes](#savedatafrombytes)
  - [ShopLogItem](#shoplogitem)
  - [Trip](#trip)
  - [TripLeg](#tripleg)

---

# Models

## JsonDouble (class)

A JSON number written with a decimal point or an exponent. Newtonsoft.Json
writes a C# `double` or `float` that way even when it holds a whole number
(`843.0`), where an integer holding the same value is `843`, so the reader
keeps such a number in this wrapper. `text` is the number as the save
spelled it, which the writer writes back as is; without it, the writer
spells `value` the way the game does, as a C# `float` when `single` is set
and as a `double` otherwise.

**Signature**

```ts
declare class JsonDouble {
  constructor(value: number, single = false, text?: string)
}
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/pocket-planes-sdk/src/Save.ts#L104)

Since v1.0.0

### value (property)

**Signature**

```ts
readonly value: number
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/pocket-planes-sdk/src/Save.ts#L105)

### single (property)

**Signature**

```ts
readonly single: boolean
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/pocket-planes-sdk/src/Save.ts#L106)

### text (property)

**Signature**

```ts
readonly text: string | undefined
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/pocket-planes-sdk/src/Save.ts#L107)

## JsonValue (type alias)

A JSON value as this module reads one: what `JSON.parse` gives, except that
an integer too large for a double to hold exactly (a C# `long` such as
`DateTime` ticks) is a `bigint`, so no digit is lost, and a number written
with a decimal point or an exponent is a `JsonDouble`.

**Signature**

```ts
type JsonValue =
  | null
  | boolean
  | number
  | bigint
  | JsonDouble
  | string
  | ReadonlyArray<JsonValue>
  | { readonly [key: string]: JsonValue }
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/pocket-planes-sdk/src/Save.ts#L82)

Since v1.0.0

# Primitives

## DateTimeString

A C# `DateTime` as Newtonsoft.Json writes it (ISO 8601 with up to seven
fractional digits, and `Z`, an offset or nothing depending on the value's
`DateTimeKind`). Kept as the string so it writes back unchanged.

**Signature**

```ts
declare const DateTimeString: Schema.String
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/pocket-planes-sdk/src/Save.ts#L510)

Since v1.0.0

## Double

A C# `double` (`System.Double`). It decodes to a number and encodes to a
`JsonDouble`, so that it writes back the way the game writes it: a
whole number as `843.0`, and 17 significant digits when 15 do not read
back as the same value.

**Signature**

```ts
declare const Double: Schema.decodeTo<
  Schema.Finite,
  Schema.Union<readonly [Schema.instanceOf<JsonDouble, unknown>, Schema.Finite]>,
  never,
  never
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/pocket-planes-sdk/src/Save.ts#L428)

Since v1.0.0

## Float

A C# `float` (`System.Single`), like `Double` but written the way the
game writes a float: 7 significant digits of the value as a 32-bit float,
or 9 when 7 do not read back as the same float.

**Signature**

```ts
declare const Float: Schema.decodeTo<
  Schema.Finite,
  Schema.Union<readonly [Schema.instanceOf<JsonDouble, unknown>, Schema.Finite]>,
  never,
  never
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/pocket-planes-sdk/src/Save.ts#L446)

Since v1.0.0

## IntKey

A key of a C# `Dictionary<int, ...>`, which JSON writes as a string. A
JavaScript object puts keys from "0" to "4294967294" first, in ascending
order, so a dictionary keyed by them encodes in that order, whatever order
the game wrote them in.

**Signature**

```ts
declare const IntKey: Schema.String
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/pocket-planes-sdk/src/Save.ts#L500)

Since v1.0.0

## JsonValue

Any JSON value, for keys the schemas do not model (from a newer game
version, say). A number with a decimal point stays a `JsonDouble`
with its text, so it writes back as it was read.

**Signature**

```ts
declare const JsonValue: Schema.Codec<JsonValue, JsonValue, never, never>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/pocket-planes-sdk/src/Save.ts#L405)

Since v1.0.0

## Long

A C# `long` or `ulong` (`System.Int64`, `System.UInt64`), decoded to a
`bigint` so that values past 2^53, such as `DateTime` ticks, survive. It
reads a JSON number or the `bigint` this module's reader makes of a large
integer, and writes a number whenever a double can hold the value exactly.

**Signature**

```ts
declare const Long: Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/pocket-planes-sdk/src/Save.ts#L481)

Since v1.0.0

# Schemas

## BBEntry

A Bitbook post (the game's `BBEntry`): `b` is the bitizen who posted it.

**Signature**

```ts
declare const BBEntry: Schema.StructWithRest<
  Schema.Struct<{
    readonly i: Schema.Int
    readonly l: Schema.Int
    readonly d: Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
    readonly m: Schema.NullOr<Schema.String>
    readonly b: Schema.NullOr<
      Schema.StructWithRest<
        Schema.Struct<{
          readonly c: Schema.String
          readonly BA: Schema.decodeTo<
            Schema.Struct<
              {
                male: Schema.compose<
                  Schema.Boolean,
                  Schema.Union<
                    readonly [
                      Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                      Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                    ]
                  >
                >
                firstNameIdx: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                lastNameIdx: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                bmonth: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                bday: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                skinColorIdx: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                hairColorIdx: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                shoeColorIdx: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                pantsColor: Schema.decodeTo<
                  Schema.Struct<{ readonly r: Schema.Int; readonly g: Schema.Int; readonly b: Schema.Int }>,
                  Schema.TemplateLiteralParser<
                    readonly [Schema.FiniteFromString, ":", Schema.FiniteFromString, ":", Schema.FiniteFromString]
                  >,
                  never,
                  never
                >
                shirtColor: Schema.decodeTo<
                  Schema.Struct<{ readonly r: Schema.Int; readonly g: Schema.Int; readonly b: Schema.Int }>,
                  Schema.TemplateLiteralParser<
                    readonly [Schema.FiniteFromString, ":", Schema.FiniteFromString, ":", Schema.FiniteFromString]
                  >,
                  never,
                  never
                >
                hasGlasses: Schema.compose<
                  Schema.Boolean,
                  Schema.Union<
                    readonly [
                      Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                      Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                    ]
                  >
                >
                glasses: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                hasTie: Schema.compose<
                  Schema.Boolean,
                  Schema.Union<
                    readonly [
                      Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                      Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                    ]
                  >
                >
                tieColor: Schema.decodeTo<
                  Schema.Struct<{ readonly r: Schema.Int; readonly g: Schema.Int; readonly b: Schema.Int }>,
                  Schema.TemplateLiteralParser<
                    readonly [Schema.FiniteFromString, ":", Schema.FiniteFromString, ":", Schema.FiniteFromString]
                  >,
                  never,
                  never
                >
                hasHairAcc: Schema.compose<
                  Schema.Boolean,
                  Schema.Union<
                    readonly [
                      Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                      Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                    ]
                  >
                >
                hairAcc: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                hasBHat: Schema.compose<
                  Schema.Boolean,
                  Schema.Union<
                    readonly [
                      Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                      Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                    ]
                  >
                >
                hasMhat: Schema.compose<
                  Schema.Boolean,
                  Schema.Union<
                    readonly [
                      Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                      Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                    ]
                  >
                >
                hasFHat: Schema.compose<
                  Schema.Boolean,
                  Schema.Union<
                    readonly [
                      Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                      Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                    ]
                  >
                >
                hat: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                hatColor: Schema.decodeTo<
                  Schema.Struct<{ readonly r: Schema.Int; readonly g: Schema.Int; readonly b: Schema.Int }>,
                  Schema.TemplateLiteralParser<
                    readonly [Schema.FiniteFromString, ":", Schema.FiniteFromString, ":", Schema.FiniteFromString]
                  >,
                  never,
                  never
                >
                hasEarrings: Schema.compose<
                  Schema.Boolean,
                  Schema.Union<
                    readonly [
                      Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                      Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                    ]
                  >
                >
                earringColor: Schema.decodeTo<
                  Schema.Struct<{ readonly r: Schema.Int; readonly g: Schema.Int; readonly b: Schema.Int }>,
                  Schema.TemplateLiteralParser<
                    readonly [Schema.FiniteFromString, ":", Schema.FiniteFromString, ":", Schema.FiniteFromString]
                  >,
                  never,
                  never
                >
                hair: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
              } & { readonly $unknown: Schema.$Array<Schema.String> }
            >,
            Schema.String,
            never,
            never
          >
          readonly v: Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
        }>,
        readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
      >
    >
  }>,
  readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/pocket-planes-sdk/src/Save.ts#L782)

Since v1.0.0

## BitizenAttributes

A bitizen's looks (the `BA` entry of a bitizen's data): the game's
`BitizenInfo` fields in the order `BitizenInfo.ToDict` joins them with `,`.
Colors are `r:g:b`. `firstNameIdx` indexes `Bitizens.maleNames` or
`Bitizens.femaleNames` by `male`, and `lastNameIdx` indexes
`Bitizens.lastNames`. Items past the known ones are kept in `$unknown`.

**Signature**

```ts
declare const BitizenAttributes: Schema.decodeTo<
  Schema.Struct<
    {
      male: Schema.compose<
        Schema.Boolean,
        Schema.Union<
          readonly [
            Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
            Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
          ]
        >
      >
      firstNameIdx: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
      lastNameIdx: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
      bmonth: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
      bday: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
      skinColorIdx: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
      hairColorIdx: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
      shoeColorIdx: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
      pantsColor: Schema.decodeTo<
        Schema.Struct<{ readonly r: Schema.Int; readonly g: Schema.Int; readonly b: Schema.Int }>,
        Schema.TemplateLiteralParser<
          readonly [Schema.FiniteFromString, ":", Schema.FiniteFromString, ":", Schema.FiniteFromString]
        >,
        never,
        never
      >
      shirtColor: Schema.decodeTo<
        Schema.Struct<{ readonly r: Schema.Int; readonly g: Schema.Int; readonly b: Schema.Int }>,
        Schema.TemplateLiteralParser<
          readonly [Schema.FiniteFromString, ":", Schema.FiniteFromString, ":", Schema.FiniteFromString]
        >,
        never,
        never
      >
      hasGlasses: Schema.compose<
        Schema.Boolean,
        Schema.Union<
          readonly [
            Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
            Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
          ]
        >
      >
      glasses: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
      hasTie: Schema.compose<
        Schema.Boolean,
        Schema.Union<
          readonly [
            Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
            Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
          ]
        >
      >
      tieColor: Schema.decodeTo<
        Schema.Struct<{ readonly r: Schema.Int; readonly g: Schema.Int; readonly b: Schema.Int }>,
        Schema.TemplateLiteralParser<
          readonly [Schema.FiniteFromString, ":", Schema.FiniteFromString, ":", Schema.FiniteFromString]
        >,
        never,
        never
      >
      hasHairAcc: Schema.compose<
        Schema.Boolean,
        Schema.Union<
          readonly [
            Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
            Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
          ]
        >
      >
      hairAcc: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
      hasBHat: Schema.compose<
        Schema.Boolean,
        Schema.Union<
          readonly [
            Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
            Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
          ]
        >
      >
      hasMhat: Schema.compose<
        Schema.Boolean,
        Schema.Union<
          readonly [
            Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
            Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
          ]
        >
      >
      hasFHat: Schema.compose<
        Schema.Boolean,
        Schema.Union<
          readonly [
            Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
            Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
          ]
        >
      >
      hat: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
      hatColor: Schema.decodeTo<
        Schema.Struct<{ readonly r: Schema.Int; readonly g: Schema.Int; readonly b: Schema.Int }>,
        Schema.TemplateLiteralParser<
          readonly [Schema.FiniteFromString, ":", Schema.FiniteFromString, ":", Schema.FiniteFromString]
        >,
        never,
        never
      >
      hasEarrings: Schema.compose<
        Schema.Boolean,
        Schema.Union<
          readonly [
            Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
            Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
          ]
        >
      >
      earringColor: Schema.decodeTo<
        Schema.Struct<{ readonly r: Schema.Int; readonly g: Schema.Int; readonly b: Schema.Int }>,
        Schema.TemplateLiteralParser<
          readonly [Schema.FiniteFromString, ":", Schema.FiniteFromString, ":", Schema.FiniteFromString]
        >,
        never,
        never
      >
      hair: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
    } & { readonly $unknown: Schema.$Array<Schema.String> }
  >,
  Schema.String,
  never,
  never
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/pocket-planes-sdk/src/Save.ts#L676)

Since v1.0.0

## BitizenData

A bitizen as the save keeps it (the `Dictionary<string, object>` that
`BitizenInfo.ToDict` makes): `c` is the costume (empty for none), `BA` the
looks and `v` the VIP type (0 for none). A plane's `Pilot` and a Bitbook
post's `b` (which `BBEntry.set_bit` fills from `ToDict`) have this shape; a
passenger's `CargoDetails.b` is assumed to.

**Signature**

```ts
declare const BitizenData: Schema.StructWithRest<
  Schema.Struct<{
    readonly c: Schema.String
    readonly BA: Schema.decodeTo<
      Schema.Struct<
        {
          male: Schema.compose<
            Schema.Boolean,
            Schema.Union<
              readonly [
                Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
              ]
            >
          >
          firstNameIdx: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
          lastNameIdx: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
          bmonth: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
          bday: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
          skinColorIdx: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
          hairColorIdx: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
          shoeColorIdx: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
          pantsColor: Schema.decodeTo<
            Schema.Struct<{ readonly r: Schema.Int; readonly g: Schema.Int; readonly b: Schema.Int }>,
            Schema.TemplateLiteralParser<
              readonly [Schema.FiniteFromString, ":", Schema.FiniteFromString, ":", Schema.FiniteFromString]
            >,
            never,
            never
          >
          shirtColor: Schema.decodeTo<
            Schema.Struct<{ readonly r: Schema.Int; readonly g: Schema.Int; readonly b: Schema.Int }>,
            Schema.TemplateLiteralParser<
              readonly [Schema.FiniteFromString, ":", Schema.FiniteFromString, ":", Schema.FiniteFromString]
            >,
            never,
            never
          >
          hasGlasses: Schema.compose<
            Schema.Boolean,
            Schema.Union<
              readonly [
                Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
              ]
            >
          >
          glasses: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
          hasTie: Schema.compose<
            Schema.Boolean,
            Schema.Union<
              readonly [
                Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
              ]
            >
          >
          tieColor: Schema.decodeTo<
            Schema.Struct<{ readonly r: Schema.Int; readonly g: Schema.Int; readonly b: Schema.Int }>,
            Schema.TemplateLiteralParser<
              readonly [Schema.FiniteFromString, ":", Schema.FiniteFromString, ":", Schema.FiniteFromString]
            >,
            never,
            never
          >
          hasHairAcc: Schema.compose<
            Schema.Boolean,
            Schema.Union<
              readonly [
                Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
              ]
            >
          >
          hairAcc: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
          hasBHat: Schema.compose<
            Schema.Boolean,
            Schema.Union<
              readonly [
                Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
              ]
            >
          >
          hasMhat: Schema.compose<
            Schema.Boolean,
            Schema.Union<
              readonly [
                Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
              ]
            >
          >
          hasFHat: Schema.compose<
            Schema.Boolean,
            Schema.Union<
              readonly [
                Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
              ]
            >
          >
          hat: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
          hatColor: Schema.decodeTo<
            Schema.Struct<{ readonly r: Schema.Int; readonly g: Schema.Int; readonly b: Schema.Int }>,
            Schema.TemplateLiteralParser<
              readonly [Schema.FiniteFromString, ":", Schema.FiniteFromString, ":", Schema.FiniteFromString]
            >,
            never,
            never
          >
          hasEarrings: Schema.compose<
            Schema.Boolean,
            Schema.Union<
              readonly [
                Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
              ]
            >
          >
          earringColor: Schema.decodeTo<
            Schema.Struct<{ readonly r: Schema.Int; readonly g: Schema.Int; readonly b: Schema.Int }>,
            Schema.TemplateLiteralParser<
              readonly [Schema.FiniteFromString, ":", Schema.FiniteFromString, ":", Schema.FiniteFromString]
            >,
            never,
            never
          >
          hair: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
        } & { readonly $unknown: Schema.$Array<Schema.String> }
      >,
      Schema.String,
      never,
      never
    >
    readonly v: Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
  }>,
  readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/pocket-planes-sdk/src/Save.ts#L713)

Since v1.0.0

## Cargo

A job, waiting in a city or loaded on a plane (the game's `Cargo`).

**Signature**

```ts
declare const Cargo: Schema.StructWithRest<
  Schema.Struct<{
    readonly start_city: Schema.Int
    readonly end_city: Schema.Int
    readonly is_vip: Schema.Boolean
    readonly num_hops: Schema.Int
    readonly first_board: Schema.decodeTo<
      Schema.BigInt,
      Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
      never,
      never
    >
    readonly details: Schema.StructWithRest<
      Schema.Struct<{
        readonly t: Schema.NullOr<Schema.String>
        readonly b: Schema.NullOr<
          Schema.StructWithRest<
            Schema.Struct<{
              readonly c: Schema.String
              readonly BA: Schema.decodeTo<
                Schema.Struct<
                  {
                    male: Schema.compose<
                      Schema.Boolean,
                      Schema.Union<
                        readonly [
                          Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                          Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                        ]
                      >
                    >
                    firstNameIdx: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                    lastNameIdx: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                    bmonth: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                    bday: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                    skinColorIdx: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                    hairColorIdx: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                    shoeColorIdx: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                    pantsColor: Schema.decodeTo<
                      Schema.Struct<{ readonly r: Schema.Int; readonly g: Schema.Int; readonly b: Schema.Int }>,
                      Schema.TemplateLiteralParser<
                        readonly [Schema.FiniteFromString, ":", Schema.FiniteFromString, ":", Schema.FiniteFromString]
                      >,
                      never,
                      never
                    >
                    shirtColor: Schema.decodeTo<
                      Schema.Struct<{ readonly r: Schema.Int; readonly g: Schema.Int; readonly b: Schema.Int }>,
                      Schema.TemplateLiteralParser<
                        readonly [Schema.FiniteFromString, ":", Schema.FiniteFromString, ":", Schema.FiniteFromString]
                      >,
                      never,
                      never
                    >
                    hasGlasses: Schema.compose<
                      Schema.Boolean,
                      Schema.Union<
                        readonly [
                          Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                          Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                        ]
                      >
                    >
                    glasses: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                    hasTie: Schema.compose<
                      Schema.Boolean,
                      Schema.Union<
                        readonly [
                          Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                          Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                        ]
                      >
                    >
                    tieColor: Schema.decodeTo<
                      Schema.Struct<{ readonly r: Schema.Int; readonly g: Schema.Int; readonly b: Schema.Int }>,
                      Schema.TemplateLiteralParser<
                        readonly [Schema.FiniteFromString, ":", Schema.FiniteFromString, ":", Schema.FiniteFromString]
                      >,
                      never,
                      never
                    >
                    hasHairAcc: Schema.compose<
                      Schema.Boolean,
                      Schema.Union<
                        readonly [
                          Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                          Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                        ]
                      >
                    >
                    hairAcc: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                    hasBHat: Schema.compose<
                      Schema.Boolean,
                      Schema.Union<
                        readonly [
                          Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                          Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                        ]
                      >
                    >
                    hasMhat: Schema.compose<
                      Schema.Boolean,
                      Schema.Union<
                        readonly [
                          Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                          Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                        ]
                      >
                    >
                    hasFHat: Schema.compose<
                      Schema.Boolean,
                      Schema.Union<
                        readonly [
                          Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                          Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                        ]
                      >
                    >
                    hat: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                    hatColor: Schema.decodeTo<
                      Schema.Struct<{ readonly r: Schema.Int; readonly g: Schema.Int; readonly b: Schema.Int }>,
                      Schema.TemplateLiteralParser<
                        readonly [Schema.FiniteFromString, ":", Schema.FiniteFromString, ":", Schema.FiniteFromString]
                      >,
                      never,
                      never
                    >
                    hasEarrings: Schema.compose<
                      Schema.Boolean,
                      Schema.Union<
                        readonly [
                          Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                          Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                        ]
                      >
                    >
                    earringColor: Schema.decodeTo<
                      Schema.Struct<{ readonly r: Schema.Int; readonly g: Schema.Int; readonly b: Schema.Int }>,
                      Schema.TemplateLiteralParser<
                        readonly [Schema.FiniteFromString, ":", Schema.FiniteFromString, ":", Schema.FiniteFromString]
                      >,
                      never,
                      never
                    >
                    hair: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                  } & { readonly $unknown: Schema.$Array<Schema.String> }
                >,
                Schema.String,
                never,
                never
              >
              readonly v: Schema.decodeTo<
                Schema.BigInt,
                Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
                never,
                never
              >
            }>,
            readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
          >
        >
        readonly c: Schema.NullOr<
          Schema.StructWithRest<
            Schema.Struct<{
              readonly p: Schema.Int
              readonly n: Schema.NullOr<Schema.String>
              readonly i: Schema.Int
              readonly c: Schema.NullOr<Schema.String>
              readonly ni: Schema.Int
              readonly s: Schema.Int
            }>,
            readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
          >
        >
        readonly s: Schema.Int
      }>,
      readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
    >
  }>,
  readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/pocket-planes-sdk/src/Save.ts#L755)

Since v1.0.0

## CargoDetails

What a job carries (the game's `CargoDetails`): a passenger in `b` or a
crate in `c`.

**Signature**

```ts
declare const CargoDetails: Schema.StructWithRest<
  Schema.Struct<{
    readonly t: Schema.NullOr<Schema.String>
    readonly b: Schema.NullOr<
      Schema.StructWithRest<
        Schema.Struct<{
          readonly c: Schema.String
          readonly BA: Schema.decodeTo<
            Schema.Struct<
              {
                male: Schema.compose<
                  Schema.Boolean,
                  Schema.Union<
                    readonly [
                      Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                      Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                    ]
                  >
                >
                firstNameIdx: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                lastNameIdx: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                bmonth: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                bday: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                skinColorIdx: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                hairColorIdx: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                shoeColorIdx: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                pantsColor: Schema.decodeTo<
                  Schema.Struct<{ readonly r: Schema.Int; readonly g: Schema.Int; readonly b: Schema.Int }>,
                  Schema.TemplateLiteralParser<
                    readonly [Schema.FiniteFromString, ":", Schema.FiniteFromString, ":", Schema.FiniteFromString]
                  >,
                  never,
                  never
                >
                shirtColor: Schema.decodeTo<
                  Schema.Struct<{ readonly r: Schema.Int; readonly g: Schema.Int; readonly b: Schema.Int }>,
                  Schema.TemplateLiteralParser<
                    readonly [Schema.FiniteFromString, ":", Schema.FiniteFromString, ":", Schema.FiniteFromString]
                  >,
                  never,
                  never
                >
                hasGlasses: Schema.compose<
                  Schema.Boolean,
                  Schema.Union<
                    readonly [
                      Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                      Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                    ]
                  >
                >
                glasses: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                hasTie: Schema.compose<
                  Schema.Boolean,
                  Schema.Union<
                    readonly [
                      Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                      Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                    ]
                  >
                >
                tieColor: Schema.decodeTo<
                  Schema.Struct<{ readonly r: Schema.Int; readonly g: Schema.Int; readonly b: Schema.Int }>,
                  Schema.TemplateLiteralParser<
                    readonly [Schema.FiniteFromString, ":", Schema.FiniteFromString, ":", Schema.FiniteFromString]
                  >,
                  never,
                  never
                >
                hasHairAcc: Schema.compose<
                  Schema.Boolean,
                  Schema.Union<
                    readonly [
                      Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                      Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                    ]
                  >
                >
                hairAcc: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                hasBHat: Schema.compose<
                  Schema.Boolean,
                  Schema.Union<
                    readonly [
                      Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                      Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                    ]
                  >
                >
                hasMhat: Schema.compose<
                  Schema.Boolean,
                  Schema.Union<
                    readonly [
                      Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                      Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                    ]
                  >
                >
                hasFHat: Schema.compose<
                  Schema.Boolean,
                  Schema.Union<
                    readonly [
                      Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                      Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                    ]
                  >
                >
                hat: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                hatColor: Schema.decodeTo<
                  Schema.Struct<{ readonly r: Schema.Int; readonly g: Schema.Int; readonly b: Schema.Int }>,
                  Schema.TemplateLiteralParser<
                    readonly [Schema.FiniteFromString, ":", Schema.FiniteFromString, ":", Schema.FiniteFromString]
                  >,
                  never,
                  never
                >
                hasEarrings: Schema.compose<
                  Schema.Boolean,
                  Schema.Union<
                    readonly [
                      Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                      Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                    ]
                  >
                >
                earringColor: Schema.decodeTo<
                  Schema.Struct<{ readonly r: Schema.Int; readonly g: Schema.Int; readonly b: Schema.Int }>,
                  Schema.TemplateLiteralParser<
                    readonly [Schema.FiniteFromString, ":", Schema.FiniteFromString, ":", Schema.FiniteFromString]
                  >,
                  never,
                  never
                >
                hair: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
              } & { readonly $unknown: Schema.$Array<Schema.String> }
            >,
            Schema.String,
            never,
            never
          >
          readonly v: Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
        }>,
        readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
      >
    >
    readonly c: Schema.NullOr<
      Schema.StructWithRest<
        Schema.Struct<{
          readonly p: Schema.Int
          readonly n: Schema.NullOr<Schema.String>
          readonly i: Schema.Int
          readonly c: Schema.NullOr<Schema.String>
          readonly ni: Schema.Int
          readonly s: Schema.Int
        }>,
        readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
      >
    >
    readonly s: Schema.Int
  }>,
  readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/pocket-planes-sdk/src/Save.ts#L742)

Since v1.0.0

## CargoLog

A delivered job (the game's `CargoLog`).

**Signature**

```ts
declare const CargoLog: Schema.StructWithRest<
  Schema.Struct<{
    readonly c: Schema.Int
    readonly ts: Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
    readonly details: Schema.StructWithRest<
      Schema.Struct<{
        readonly t: Schema.NullOr<Schema.String>
        readonly b: Schema.NullOr<
          Schema.StructWithRest<
            Schema.Struct<{
              readonly c: Schema.String
              readonly BA: Schema.decodeTo<
                Schema.Struct<
                  {
                    male: Schema.compose<
                      Schema.Boolean,
                      Schema.Union<
                        readonly [
                          Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                          Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                        ]
                      >
                    >
                    firstNameIdx: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                    lastNameIdx: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                    bmonth: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                    bday: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                    skinColorIdx: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                    hairColorIdx: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                    shoeColorIdx: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                    pantsColor: Schema.decodeTo<
                      Schema.Struct<{ readonly r: Schema.Int; readonly g: Schema.Int; readonly b: Schema.Int }>,
                      Schema.TemplateLiteralParser<
                        readonly [Schema.FiniteFromString, ":", Schema.FiniteFromString, ":", Schema.FiniteFromString]
                      >,
                      never,
                      never
                    >
                    shirtColor: Schema.decodeTo<
                      Schema.Struct<{ readonly r: Schema.Int; readonly g: Schema.Int; readonly b: Schema.Int }>,
                      Schema.TemplateLiteralParser<
                        readonly [Schema.FiniteFromString, ":", Schema.FiniteFromString, ":", Schema.FiniteFromString]
                      >,
                      never,
                      never
                    >
                    hasGlasses: Schema.compose<
                      Schema.Boolean,
                      Schema.Union<
                        readonly [
                          Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                          Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                        ]
                      >
                    >
                    glasses: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                    hasTie: Schema.compose<
                      Schema.Boolean,
                      Schema.Union<
                        readonly [
                          Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                          Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                        ]
                      >
                    >
                    tieColor: Schema.decodeTo<
                      Schema.Struct<{ readonly r: Schema.Int; readonly g: Schema.Int; readonly b: Schema.Int }>,
                      Schema.TemplateLiteralParser<
                        readonly [Schema.FiniteFromString, ":", Schema.FiniteFromString, ":", Schema.FiniteFromString]
                      >,
                      never,
                      never
                    >
                    hasHairAcc: Schema.compose<
                      Schema.Boolean,
                      Schema.Union<
                        readonly [
                          Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                          Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                        ]
                      >
                    >
                    hairAcc: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                    hasBHat: Schema.compose<
                      Schema.Boolean,
                      Schema.Union<
                        readonly [
                          Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                          Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                        ]
                      >
                    >
                    hasMhat: Schema.compose<
                      Schema.Boolean,
                      Schema.Union<
                        readonly [
                          Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                          Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                        ]
                      >
                    >
                    hasFHat: Schema.compose<
                      Schema.Boolean,
                      Schema.Union<
                        readonly [
                          Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                          Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                        ]
                      >
                    >
                    hat: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                    hatColor: Schema.decodeTo<
                      Schema.Struct<{ readonly r: Schema.Int; readonly g: Schema.Int; readonly b: Schema.Int }>,
                      Schema.TemplateLiteralParser<
                        readonly [Schema.FiniteFromString, ":", Schema.FiniteFromString, ":", Schema.FiniteFromString]
                      >,
                      never,
                      never
                    >
                    hasEarrings: Schema.compose<
                      Schema.Boolean,
                      Schema.Union<
                        readonly [
                          Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                          Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                        ]
                      >
                    >
                    earringColor: Schema.decodeTo<
                      Schema.Struct<{ readonly r: Schema.Int; readonly g: Schema.Int; readonly b: Schema.Int }>,
                      Schema.TemplateLiteralParser<
                        readonly [Schema.FiniteFromString, ":", Schema.FiniteFromString, ":", Schema.FiniteFromString]
                      >,
                      never,
                      never
                    >
                    hair: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                  } & { readonly $unknown: Schema.$Array<Schema.String> }
                >,
                Schema.String,
                never,
                never
              >
              readonly v: Schema.decodeTo<
                Schema.BigInt,
                Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
                never,
                never
              >
            }>,
            readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
          >
        >
        readonly c: Schema.NullOr<
          Schema.StructWithRest<
            Schema.Struct<{
              readonly p: Schema.Int
              readonly n: Schema.NullOr<Schema.String>
              readonly i: Schema.Int
              readonly c: Schema.NullOr<Schema.String>
              readonly ni: Schema.Int
              readonly s: Schema.Int
            }>,
            readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
          >
        >
        readonly s: Schema.Int
      }>,
      readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
    >
  }>,
  readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/pocket-planes-sdk/src/Save.ts#L770)

Since v1.0.0

## CityInfo

A city the player has unlocked (the game's `CityInfo`). `campaign` is when
an advertising campaign started, in Unix seconds. `isClosed` is a read-only
property the game writes but does not read back.

**Signature**

```ts
declare const CityInfo: Schema.StructWithRest<
  Schema.Struct<{
    readonly city_id: Schema.Int
    readonly level: Schema.Int
    readonly flight_out: Schema.decodeTo<
      Schema.BigInt,
      Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
      never,
      never
    >
    readonly pass_out: Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
    readonly cargo_out: Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
    readonly flight_in: Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
    readonly pass_in: Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
    readonly cargo_in: Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
    readonly closure: Schema.Int
    readonly deploy_x: Schema.Int
    readonly deploy_y: Schema.Int
    readonly campaign: Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
    readonly Cargo: Schema.$Array<
      Schema.StructWithRest<
        Schema.Struct<{
          readonly start_city: Schema.Int
          readonly end_city: Schema.Int
          readonly is_vip: Schema.Boolean
          readonly num_hops: Schema.Int
          readonly first_board: Schema.decodeTo<
            Schema.BigInt,
            Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
            never,
            never
          >
          readonly details: Schema.StructWithRest<
            Schema.Struct<{
              readonly t: Schema.NullOr<Schema.String>
              readonly b: Schema.NullOr<
                Schema.StructWithRest<
                  Schema.Struct<{
                    readonly c: Schema.String
                    readonly BA: Schema.decodeTo<
                      Schema.Struct<
                        {
                          male: Schema.compose<
                            Schema.Boolean,
                            Schema.Union<
                              readonly [
                                Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                              ]
                            >
                          >
                          firstNameIdx: Schema.compose<
                            Schema.compose<Schema.Int, Schema.NumberFromString>,
                            Schema.String
                          >
                          lastNameIdx: Schema.compose<
                            Schema.compose<Schema.Int, Schema.NumberFromString>,
                            Schema.String
                          >
                          bmonth: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                          bday: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                          skinColorIdx: Schema.compose<
                            Schema.compose<Schema.Int, Schema.NumberFromString>,
                            Schema.String
                          >
                          hairColorIdx: Schema.compose<
                            Schema.compose<Schema.Int, Schema.NumberFromString>,
                            Schema.String
                          >
                          shoeColorIdx: Schema.compose<
                            Schema.compose<Schema.Int, Schema.NumberFromString>,
                            Schema.String
                          >
                          pantsColor: Schema.decodeTo<
                            Schema.Struct<{ readonly r: Schema.Int; readonly g: Schema.Int; readonly b: Schema.Int }>,
                            Schema.TemplateLiteralParser<
                              readonly [
                                Schema.FiniteFromString,
                                ":",
                                Schema.FiniteFromString,
                                ":",
                                Schema.FiniteFromString
                              ]
                            >,
                            never,
                            never
                          >
                          shirtColor: Schema.decodeTo<
                            Schema.Struct<{ readonly r: Schema.Int; readonly g: Schema.Int; readonly b: Schema.Int }>,
                            Schema.TemplateLiteralParser<
                              readonly [
                                Schema.FiniteFromString,
                                ":",
                                Schema.FiniteFromString,
                                ":",
                                Schema.FiniteFromString
                              ]
                            >,
                            never,
                            never
                          >
                          hasGlasses: Schema.compose<
                            Schema.Boolean,
                            Schema.Union<
                              readonly [
                                Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                              ]
                            >
                          >
                          glasses: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                          hasTie: Schema.compose<
                            Schema.Boolean,
                            Schema.Union<
                              readonly [
                                Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                              ]
                            >
                          >
                          tieColor: Schema.decodeTo<
                            Schema.Struct<{ readonly r: Schema.Int; readonly g: Schema.Int; readonly b: Schema.Int }>,
                            Schema.TemplateLiteralParser<
                              readonly [
                                Schema.FiniteFromString,
                                ":",
                                Schema.FiniteFromString,
                                ":",
                                Schema.FiniteFromString
                              ]
                            >,
                            never,
                            never
                          >
                          hasHairAcc: Schema.compose<
                            Schema.Boolean,
                            Schema.Union<
                              readonly [
                                Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                              ]
                            >
                          >
                          hairAcc: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                          hasBHat: Schema.compose<
                            Schema.Boolean,
                            Schema.Union<
                              readonly [
                                Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                              ]
                            >
                          >
                          hasMhat: Schema.compose<
                            Schema.Boolean,
                            Schema.Union<
                              readonly [
                                Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                              ]
                            >
                          >
                          hasFHat: Schema.compose<
                            Schema.Boolean,
                            Schema.Union<
                              readonly [
                                Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                              ]
                            >
                          >
                          hat: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                          hatColor: Schema.decodeTo<
                            Schema.Struct<{ readonly r: Schema.Int; readonly g: Schema.Int; readonly b: Schema.Int }>,
                            Schema.TemplateLiteralParser<
                              readonly [
                                Schema.FiniteFromString,
                                ":",
                                Schema.FiniteFromString,
                                ":",
                                Schema.FiniteFromString
                              ]
                            >,
                            never,
                            never
                          >
                          hasEarrings: Schema.compose<
                            Schema.Boolean,
                            Schema.Union<
                              readonly [
                                Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                              ]
                            >
                          >
                          earringColor: Schema.decodeTo<
                            Schema.Struct<{ readonly r: Schema.Int; readonly g: Schema.Int; readonly b: Schema.Int }>,
                            Schema.TemplateLiteralParser<
                              readonly [
                                Schema.FiniteFromString,
                                ":",
                                Schema.FiniteFromString,
                                ":",
                                Schema.FiniteFromString
                              ]
                            >,
                            never,
                            never
                          >
                          hair: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                        } & { readonly $unknown: Schema.$Array<Schema.String> }
                      >,
                      Schema.String,
                      never,
                      never
                    >
                    readonly v: Schema.decodeTo<
                      Schema.BigInt,
                      Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
                      never,
                      never
                    >
                  }>,
                  readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
                >
              >
              readonly c: Schema.NullOr<
                Schema.StructWithRest<
                  Schema.Struct<{
                    readonly p: Schema.Int
                    readonly n: Schema.NullOr<Schema.String>
                    readonly i: Schema.Int
                    readonly c: Schema.NullOr<Schema.String>
                    readonly ni: Schema.Int
                    readonly s: Schema.Int
                  }>,
                  readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
                >
              >
              readonly s: Schema.Int
            }>,
            readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
          >
        }>,
        readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
      >
    >
    readonly isClosed: Schema.Boolean
  }>,
  readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/pocket-planes-sdk/src/Save.ts#L835)

Since v1.0.0

## CrateInfo

A crate of cargo (the game's `CrateInfo`): `n` is its package name, from
`Cargo.packageNames` or `Cargo.vipPackageNames`.

**Signature**

```ts
declare const CrateInfo: Schema.StructWithRest<
  Schema.Struct<{
    readonly p: Schema.Int
    readonly n: Schema.NullOr<Schema.String>
    readonly i: Schema.Int
    readonly c: Schema.NullOr<Schema.String>
    readonly ni: Schema.Int
    readonly s: Schema.Int
  }>,
  readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/pocket-planes-sdk/src/Save.ts#L726)

Since v1.0.0

## Currency

An amount of a currency (the game's `Currency`), as the save writes
`wheelTickets`. `type` is the game's `Currency.Type` (`Bux`, `Coins`,
`WheelTickets`, in that order; wheel tickets are 2).

**Signature**

```ts
declare const Currency: Schema.StructWithRest<
  Schema.Struct<{
    readonly amount: Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
    readonly type: Schema.Int
  }>,
  readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/pocket-planes-sdk/src/Save.ts#L586)

Since v1.0.0

## GlobalEventProgress

The player's progress in a global event (the game's `GlobalEventProgress`).
`b` and `u` are the event's start in Unix seconds, `c` its city and `r` its
rewards.

**Signature**

```ts
declare const GlobalEventProgress: Schema.StructWithRest<
  Schema.Struct<{
    readonly b: Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
    readonly u: Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
    readonly j: Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
    readonly c: Schema.Int
    readonly r1: Schema.Boolean
    readonly r2: Schema.Boolean
    readonly r3: Schema.Boolean
    readonly r4: Schema.Boolean
    readonly r5: Schema.Boolean
    readonly r: Schema.$Array<
      Schema.Union<
        readonly [
          Schema.Struct<{ readonly Key: Schema.Literal<0>; readonly Value: Schema.Int }>,
          Schema.Struct<{ readonly Key: Schema.Literal<1>; readonly Value: Schema.Int }>,
          Schema.Struct<{
            readonly Key: Schema.Literal<2>
            readonly Value: Schema.StructWithRest<
              Schema.Struct<{ readonly plane_id: Schema.Int; readonly part_type: Schema.Int }>,
              readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
            >
          }>,
          Schema.Struct<{ readonly Key: Schema.Literal<3>; readonly Value: Schema.String }>
        ]
      >
    >
  }>,
  readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/pocket-planes-sdk/src/Save.ts#L814)

Since v1.0.0

## GlobalEventReward

A global event reward (a `KeyValuePair<GlobalEventRewardType, object>`,
which Newtonsoft.Json writes as `{ Key, Value }`): bux (`Key` 0) or coins (1)
with an amount, a plane part (2) or a skin id (3). A reward of a type this
module does not know fails to decode.

**Signature**

```ts
declare const GlobalEventReward: Schema.Union<
  readonly [
    Schema.Struct<{ readonly Key: Schema.Literal<0>; readonly Value: Schema.Int }>,
    Schema.Struct<{ readonly Key: Schema.Literal<1>; readonly Value: Schema.Int }>,
    Schema.Struct<{
      readonly Key: Schema.Literal<2>
      readonly Value: Schema.StructWithRest<
        Schema.Struct<{ readonly plane_id: Schema.Int; readonly part_type: Schema.Int }>,
        readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
      >
    }>,
    Schema.Struct<{ readonly Key: Schema.Literal<3>; readonly Value: Schema.String }>
  ]
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/pocket-planes-sdk/src/Save.ts#L799)

Since v1.0.0

## PPFriend

A friend the player follows (the game's `PPFriend`).

**Signature**

```ts
declare const PPFriend: Schema.StructWithRest<
  Schema.Struct<{
    readonly name: Schema.NullOr<Schema.String>
    readonly player_id: Schema.String
    readonly gc: Schema.NullOr<Schema.String>
  }>,
  readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/pocket-planes-sdk/src/Save.ts#L653)

Since v1.0.0

## PPSave

The save as a JSON object (the game's `PPSave`), in the game's key order.
`c` and `b` are the coins and bux. `playerI`, `playerS` and `playerE` are
the player's id, auth salt and email, the last two `Redacted`. Times, where
the game's code or a probe showed the unit: `nFBT` and `nPCT` are
`DateTime` ticks, `nMST` is Unix seconds, `jobPoolStart` and the keys of
`refresh` are seconds since 0001-01-01, and the keys of `dailyStats` are
the Unix seconds a day starts at. `events` holds a JSON string of its own
(`"null"` when there are none). `mapX`, `mapY`, `mapZ`, `mmapZ` and
`planeListY` are C# `float`s.

Like every object schema in this module, it keeps the keys it does not
model as `JsonValue`s and encodes them after the ones it does.

**Signature**

```ts
declare const PPSave: Schema.StructWithRest<
  Schema.Struct<{
    readonly c: Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
    readonly b: Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
    readonly wheelTickets: Schema.StructWithRest<
      Schema.Struct<{
        readonly amount: Schema.decodeTo<
          Schema.BigInt,
          Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
          never,
          never
        >
        readonly type: Schema.Int
      }>,
      readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
    >
    readonly firstLoad: Schema.Boolean
    readonly hasCrew: Schema.Boolean
    readonly playerR: Schema.Boolean
    readonly vi: Schema.Boolean
    readonly vipPlaneOwned: Schema.Boolean
    readonly coinsCollectedFree: Schema.decodeTo<
      Schema.BigInt,
      Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
      never,
      never
    >
    readonly buxCollectedFree: Schema.decodeTo<
      Schema.BigInt,
      Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
      never,
      never
    >
    readonly bbBadge: Schema.Int
    readonly eventCount: Schema.Int
    readonly globalEvent: Schema.Int
    readonly homeCity: Schema.Int
    readonly lastPlane: Schema.Int
    readonly level: Schema.Int
    readonly lfb: Schema.Int
    readonly resetCount: Schema.Int
    readonly slots: Schema.Int
    readonly mapX: Schema.decodeTo<
      Schema.Finite,
      Schema.Union<readonly [Schema.instanceOf<JsonDouble, unknown>, Schema.Finite]>,
      never,
      never
    >
    readonly mapY: Schema.decodeTo<
      Schema.Finite,
      Schema.Union<readonly [Schema.instanceOf<JsonDouble, unknown>, Schema.Finite]>,
      never,
      never
    >
    readonly mapZ: Schema.decodeTo<
      Schema.Finite,
      Schema.Union<readonly [Schema.instanceOf<JsonDouble, unknown>, Schema.Finite]>,
      never,
      never
    >
    readonly mmapZ: Schema.decodeTo<
      Schema.Finite,
      Schema.Union<readonly [Schema.instanceOf<JsonDouble, unknown>, Schema.Finite]>,
      never,
      never
    >
    readonly planeListY: Schema.decodeTo<
      Schema.Finite,
      Schema.Union<readonly [Schema.instanceOf<JsonDouble, unknown>, Schema.Finite]>,
      never,
      never
    >
    readonly mapPlanesHidden: Schema.NullOr<Schema.Boolean>
    readonly lastPlaneCount: Schema.decodeTo<
      Schema.BigInt,
      Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
      never,
      never
    >
    readonly timeInGame: Schema.decodeTo<
      Schema.BigInt,
      Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
      never,
      never
    >
    readonly tp: Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
    readonly xp: Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
    readonly achieve: Schema.NullOr<Schema.String>
    readonly airlineName: Schema.NullOr<Schema.String>
    readonly bbEntries: Schema.NullOr<Schema.String>
    readonly landingAlerts: Schema.NullOr<Schema.String>
    readonly playerE: Schema.NullOr<Schema.brand<Schema.RedactedFromValue<Schema.String>, "PlayerEmail">>
    readonly playerI: Schema.NullOr<Schema.brand<Schema.String, "PlayerId">>
    readonly playerS: Schema.NullOr<Schema.brand<Schema.RedactedFromValue<Schema.String>, "PlayerAuthKey">>
    readonly shownTips: Schema.NullOr<Schema.String>
    readonly sounds: Schema.NullOr<Schema.String>
    readonly v: Schema.String
    readonly events: Schema.NullOr<Schema.String>
    readonly cityUnlock: Schema.$Array<Schema.Int>
    readonly localEvents: Schema.$Array<Schema.Int>
    readonly bb: Schema.$Array<
      Schema.StructWithRest<
        Schema.Struct<{
          readonly i: Schema.Int
          readonly l: Schema.Int
          readonly d: Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
          readonly m: Schema.NullOr<Schema.String>
          readonly b: Schema.NullOr<
            Schema.StructWithRest<
              Schema.Struct<{
                readonly c: Schema.String
                readonly BA: Schema.decodeTo<
                  Schema.Struct<
                    {
                      male: Schema.compose<
                        Schema.Boolean,
                        Schema.Union<
                          readonly [
                            Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                            Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                          ]
                        >
                      >
                      firstNameIdx: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                      lastNameIdx: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                      bmonth: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                      bday: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                      skinColorIdx: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                      hairColorIdx: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                      shoeColorIdx: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                      pantsColor: Schema.decodeTo<
                        Schema.Struct<{ readonly r: Schema.Int; readonly g: Schema.Int; readonly b: Schema.Int }>,
                        Schema.TemplateLiteralParser<
                          readonly [Schema.FiniteFromString, ":", Schema.FiniteFromString, ":", Schema.FiniteFromString]
                        >,
                        never,
                        never
                      >
                      shirtColor: Schema.decodeTo<
                        Schema.Struct<{ readonly r: Schema.Int; readonly g: Schema.Int; readonly b: Schema.Int }>,
                        Schema.TemplateLiteralParser<
                          readonly [Schema.FiniteFromString, ":", Schema.FiniteFromString, ":", Schema.FiniteFromString]
                        >,
                        never,
                        never
                      >
                      hasGlasses: Schema.compose<
                        Schema.Boolean,
                        Schema.Union<
                          readonly [
                            Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                            Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                          ]
                        >
                      >
                      glasses: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                      hasTie: Schema.compose<
                        Schema.Boolean,
                        Schema.Union<
                          readonly [
                            Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                            Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                          ]
                        >
                      >
                      tieColor: Schema.decodeTo<
                        Schema.Struct<{ readonly r: Schema.Int; readonly g: Schema.Int; readonly b: Schema.Int }>,
                        Schema.TemplateLiteralParser<
                          readonly [Schema.FiniteFromString, ":", Schema.FiniteFromString, ":", Schema.FiniteFromString]
                        >,
                        never,
                        never
                      >
                      hasHairAcc: Schema.compose<
                        Schema.Boolean,
                        Schema.Union<
                          readonly [
                            Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                            Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                          ]
                        >
                      >
                      hairAcc: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                      hasBHat: Schema.compose<
                        Schema.Boolean,
                        Schema.Union<
                          readonly [
                            Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                            Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                          ]
                        >
                      >
                      hasMhat: Schema.compose<
                        Schema.Boolean,
                        Schema.Union<
                          readonly [
                            Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                            Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                          ]
                        >
                      >
                      hasFHat: Schema.compose<
                        Schema.Boolean,
                        Schema.Union<
                          readonly [
                            Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                            Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                          ]
                        >
                      >
                      hat: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                      hatColor: Schema.decodeTo<
                        Schema.Struct<{ readonly r: Schema.Int; readonly g: Schema.Int; readonly b: Schema.Int }>,
                        Schema.TemplateLiteralParser<
                          readonly [Schema.FiniteFromString, ":", Schema.FiniteFromString, ":", Schema.FiniteFromString]
                        >,
                        never,
                        never
                      >
                      hasEarrings: Schema.compose<
                        Schema.Boolean,
                        Schema.Union<
                          readonly [
                            Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                            Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                          ]
                        >
                      >
                      earringColor: Schema.decodeTo<
                        Schema.Struct<{ readonly r: Schema.Int; readonly g: Schema.Int; readonly b: Schema.Int }>,
                        Schema.TemplateLiteralParser<
                          readonly [Schema.FiniteFromString, ":", Schema.FiniteFromString, ":", Schema.FiniteFromString]
                        >,
                        never,
                        never
                      >
                      hair: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                    } & { readonly $unknown: Schema.$Array<Schema.String> }
                  >,
                  Schema.String,
                  never,
                  never
                >
                readonly v: Schema.decodeTo<
                  Schema.BigInt,
                  Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
                  never,
                  never
                >
              }>,
              readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
            >
          >
        }>,
        readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
      >
    >
    readonly CargoLog: Schema.$Array<
      Schema.StructWithRest<
        Schema.Struct<{
          readonly c: Schema.Int
          readonly ts: Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
          readonly details: Schema.StructWithRest<
            Schema.Struct<{
              readonly t: Schema.NullOr<Schema.String>
              readonly b: Schema.NullOr<
                Schema.StructWithRest<
                  Schema.Struct<{
                    readonly c: Schema.String
                    readonly BA: Schema.decodeTo<
                      Schema.Struct<
                        {
                          male: Schema.compose<
                            Schema.Boolean,
                            Schema.Union<
                              readonly [
                                Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                              ]
                            >
                          >
                          firstNameIdx: Schema.compose<
                            Schema.compose<Schema.Int, Schema.NumberFromString>,
                            Schema.String
                          >
                          lastNameIdx: Schema.compose<
                            Schema.compose<Schema.Int, Schema.NumberFromString>,
                            Schema.String
                          >
                          bmonth: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                          bday: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                          skinColorIdx: Schema.compose<
                            Schema.compose<Schema.Int, Schema.NumberFromString>,
                            Schema.String
                          >
                          hairColorIdx: Schema.compose<
                            Schema.compose<Schema.Int, Schema.NumberFromString>,
                            Schema.String
                          >
                          shoeColorIdx: Schema.compose<
                            Schema.compose<Schema.Int, Schema.NumberFromString>,
                            Schema.String
                          >
                          pantsColor: Schema.decodeTo<
                            Schema.Struct<{ readonly r: Schema.Int; readonly g: Schema.Int; readonly b: Schema.Int }>,
                            Schema.TemplateLiteralParser<
                              readonly [
                                Schema.FiniteFromString,
                                ":",
                                Schema.FiniteFromString,
                                ":",
                                Schema.FiniteFromString
                              ]
                            >,
                            never,
                            never
                          >
                          shirtColor: Schema.decodeTo<
                            Schema.Struct<{ readonly r: Schema.Int; readonly g: Schema.Int; readonly b: Schema.Int }>,
                            Schema.TemplateLiteralParser<
                              readonly [
                                Schema.FiniteFromString,
                                ":",
                                Schema.FiniteFromString,
                                ":",
                                Schema.FiniteFromString
                              ]
                            >,
                            never,
                            never
                          >
                          hasGlasses: Schema.compose<
                            Schema.Boolean,
                            Schema.Union<
                              readonly [
                                Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                              ]
                            >
                          >
                          glasses: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                          hasTie: Schema.compose<
                            Schema.Boolean,
                            Schema.Union<
                              readonly [
                                Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                              ]
                            >
                          >
                          tieColor: Schema.decodeTo<
                            Schema.Struct<{ readonly r: Schema.Int; readonly g: Schema.Int; readonly b: Schema.Int }>,
                            Schema.TemplateLiteralParser<
                              readonly [
                                Schema.FiniteFromString,
                                ":",
                                Schema.FiniteFromString,
                                ":",
                                Schema.FiniteFromString
                              ]
                            >,
                            never,
                            never
                          >
                          hasHairAcc: Schema.compose<
                            Schema.Boolean,
                            Schema.Union<
                              readonly [
                                Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                              ]
                            >
                          >
                          hairAcc: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                          hasBHat: Schema.compose<
                            Schema.Boolean,
                            Schema.Union<
                              readonly [
                                Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                              ]
                            >
                          >
                          hasMhat: Schema.compose<
                            Schema.Boolean,
                            Schema.Union<
                              readonly [
                                Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                              ]
                            >
                          >
                          hasFHat: Schema.compose<
                            Schema.Boolean,
                            Schema.Union<
                              readonly [
                                Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                              ]
                            >
                          >
                          hat: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                          hatColor: Schema.decodeTo<
                            Schema.Struct<{ readonly r: Schema.Int; readonly g: Schema.Int; readonly b: Schema.Int }>,
                            Schema.TemplateLiteralParser<
                              readonly [
                                Schema.FiniteFromString,
                                ":",
                                Schema.FiniteFromString,
                                ":",
                                Schema.FiniteFromString
                              ]
                            >,
                            never,
                            never
                          >
                          hasEarrings: Schema.compose<
                            Schema.Boolean,
                            Schema.Union<
                              readonly [
                                Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                              ]
                            >
                          >
                          earringColor: Schema.decodeTo<
                            Schema.Struct<{ readonly r: Schema.Int; readonly g: Schema.Int; readonly b: Schema.Int }>,
                            Schema.TemplateLiteralParser<
                              readonly [
                                Schema.FiniteFromString,
                                ":",
                                Schema.FiniteFromString,
                                ":",
                                Schema.FiniteFromString
                              ]
                            >,
                            never,
                            never
                          >
                          hair: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                        } & { readonly $unknown: Schema.$Array<Schema.String> }
                      >,
                      Schema.String,
                      never,
                      never
                    >
                    readonly v: Schema.decodeTo<
                      Schema.BigInt,
                      Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
                      never,
                      never
                    >
                  }>,
                  readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
                >
              >
              readonly c: Schema.NullOr<
                Schema.StructWithRest<
                  Schema.Struct<{
                    readonly p: Schema.Int
                    readonly n: Schema.NullOr<Schema.String>
                    readonly i: Schema.Int
                    readonly c: Schema.NullOr<Schema.String>
                    readonly ni: Schema.Int
                    readonly s: Schema.Int
                  }>,
                  readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
                >
              >
              readonly s: Schema.Int
            }>,
            readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
          >
        }>,
        readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
      >
    >
    readonly Cities: Schema.$Array<
      Schema.StructWithRest<
        Schema.Struct<{
          readonly city_id: Schema.Int
          readonly level: Schema.Int
          readonly flight_out: Schema.decodeTo<
            Schema.BigInt,
            Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
            never,
            never
          >
          readonly pass_out: Schema.decodeTo<
            Schema.BigInt,
            Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
            never,
            never
          >
          readonly cargo_out: Schema.decodeTo<
            Schema.BigInt,
            Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
            never,
            never
          >
          readonly flight_in: Schema.decodeTo<
            Schema.BigInt,
            Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
            never,
            never
          >
          readonly pass_in: Schema.decodeTo<
            Schema.BigInt,
            Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
            never,
            never
          >
          readonly cargo_in: Schema.decodeTo<
            Schema.BigInt,
            Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
            never,
            never
          >
          readonly closure: Schema.Int
          readonly deploy_x: Schema.Int
          readonly deploy_y: Schema.Int
          readonly campaign: Schema.decodeTo<
            Schema.BigInt,
            Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
            never,
            never
          >
          readonly Cargo: Schema.$Array<
            Schema.StructWithRest<
              Schema.Struct<{
                readonly start_city: Schema.Int
                readonly end_city: Schema.Int
                readonly is_vip: Schema.Boolean
                readonly num_hops: Schema.Int
                readonly first_board: Schema.decodeTo<
                  Schema.BigInt,
                  Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
                  never,
                  never
                >
                readonly details: Schema.StructWithRest<
                  Schema.Struct<{
                    readonly t: Schema.NullOr<Schema.String>
                    readonly b: Schema.NullOr<
                      Schema.StructWithRest<
                        Schema.Struct<{
                          readonly c: Schema.String
                          readonly BA: Schema.decodeTo<
                            Schema.Struct<
                              {
                                male: Schema.compose<
                                  Schema.Boolean,
                                  Schema.Union<
                                    readonly [
                                      Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                      Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                                    ]
                                  >
                                >
                                firstNameIdx: Schema.compose<
                                  Schema.compose<Schema.Int, Schema.NumberFromString>,
                                  Schema.String
                                >
                                lastNameIdx: Schema.compose<
                                  Schema.compose<Schema.Int, Schema.NumberFromString>,
                                  Schema.String
                                >
                                bmonth: Schema.compose<
                                  Schema.compose<Schema.Int, Schema.NumberFromString>,
                                  Schema.String
                                >
                                bday: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                                skinColorIdx: Schema.compose<
                                  Schema.compose<Schema.Int, Schema.NumberFromString>,
                                  Schema.String
                                >
                                hairColorIdx: Schema.compose<
                                  Schema.compose<Schema.Int, Schema.NumberFromString>,
                                  Schema.String
                                >
                                shoeColorIdx: Schema.compose<
                                  Schema.compose<Schema.Int, Schema.NumberFromString>,
                                  Schema.String
                                >
                                pantsColor: Schema.decodeTo<
                                  Schema.Struct<{
                                    readonly r: Schema.Int
                                    readonly g: Schema.Int
                                    readonly b: Schema.Int
                                  }>,
                                  Schema.TemplateLiteralParser<
                                    readonly [
                                      Schema.FiniteFromString,
                                      ":",
                                      Schema.FiniteFromString,
                                      ":",
                                      Schema.FiniteFromString
                                    ]
                                  >,
                                  never,
                                  never
                                >
                                shirtColor: Schema.decodeTo<
                                  Schema.Struct<{
                                    readonly r: Schema.Int
                                    readonly g: Schema.Int
                                    readonly b: Schema.Int
                                  }>,
                                  Schema.TemplateLiteralParser<
                                    readonly [
                                      Schema.FiniteFromString,
                                      ":",
                                      Schema.FiniteFromString,
                                      ":",
                                      Schema.FiniteFromString
                                    ]
                                  >,
                                  never,
                                  never
                                >
                                hasGlasses: Schema.compose<
                                  Schema.Boolean,
                                  Schema.Union<
                                    readonly [
                                      Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                      Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                                    ]
                                  >
                                >
                                glasses: Schema.compose<
                                  Schema.compose<Schema.Int, Schema.NumberFromString>,
                                  Schema.String
                                >
                                hasTie: Schema.compose<
                                  Schema.Boolean,
                                  Schema.Union<
                                    readonly [
                                      Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                      Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                                    ]
                                  >
                                >
                                tieColor: Schema.decodeTo<
                                  Schema.Struct<{
                                    readonly r: Schema.Int
                                    readonly g: Schema.Int
                                    readonly b: Schema.Int
                                  }>,
                                  Schema.TemplateLiteralParser<
                                    readonly [
                                      Schema.FiniteFromString,
                                      ":",
                                      Schema.FiniteFromString,
                                      ":",
                                      Schema.FiniteFromString
                                    ]
                                  >,
                                  never,
                                  never
                                >
                                hasHairAcc: Schema.compose<
                                  Schema.Boolean,
                                  Schema.Union<
                                    readonly [
                                      Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                      Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                                    ]
                                  >
                                >
                                hairAcc: Schema.compose<
                                  Schema.compose<Schema.Int, Schema.NumberFromString>,
                                  Schema.String
                                >
                                hasBHat: Schema.compose<
                                  Schema.Boolean,
                                  Schema.Union<
                                    readonly [
                                      Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                      Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                                    ]
                                  >
                                >
                                hasMhat: Schema.compose<
                                  Schema.Boolean,
                                  Schema.Union<
                                    readonly [
                                      Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                      Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                                    ]
                                  >
                                >
                                hasFHat: Schema.compose<
                                  Schema.Boolean,
                                  Schema.Union<
                                    readonly [
                                      Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                      Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                                    ]
                                  >
                                >
                                hat: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                                hatColor: Schema.decodeTo<
                                  Schema.Struct<{
                                    readonly r: Schema.Int
                                    readonly g: Schema.Int
                                    readonly b: Schema.Int
                                  }>,
                                  Schema.TemplateLiteralParser<
                                    readonly [
                                      Schema.FiniteFromString,
                                      ":",
                                      Schema.FiniteFromString,
                                      ":",
                                      Schema.FiniteFromString
                                    ]
                                  >,
                                  never,
                                  never
                                >
                                hasEarrings: Schema.compose<
                                  Schema.Boolean,
                                  Schema.Union<
                                    readonly [
                                      Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                      Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                                    ]
                                  >
                                >
                                earringColor: Schema.decodeTo<
                                  Schema.Struct<{
                                    readonly r: Schema.Int
                                    readonly g: Schema.Int
                                    readonly b: Schema.Int
                                  }>,
                                  Schema.TemplateLiteralParser<
                                    readonly [
                                      Schema.FiniteFromString,
                                      ":",
                                      Schema.FiniteFromString,
                                      ":",
                                      Schema.FiniteFromString
                                    ]
                                  >,
                                  never,
                                  never
                                >
                                hair: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                              } & { readonly $unknown: Schema.$Array<Schema.String> }
                            >,
                            Schema.String,
                            never,
                            never
                          >
                          readonly v: Schema.decodeTo<
                            Schema.BigInt,
                            Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
                            never,
                            never
                          >
                        }>,
                        readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
                      >
                    >
                    readonly c: Schema.NullOr<
                      Schema.StructWithRest<
                        Schema.Struct<{
                          readonly p: Schema.Int
                          readonly n: Schema.NullOr<Schema.String>
                          readonly i: Schema.Int
                          readonly c: Schema.NullOr<Schema.String>
                          readonly ni: Schema.Int
                          readonly s: Schema.Int
                        }>,
                        readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
                      >
                    >
                    readonly s: Schema.Int
                  }>,
                  readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
                >
              }>,
              readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
            >
          >
          readonly isClosed: Schema.Boolean
        }>,
        readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
      >
    >
    readonly jobPoolStart: Schema.decodeTo<
      Schema.BigInt,
      Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
      never,
      never
    >
    readonly jobPoolCityIds: Schema.$Array<Schema.Int>
    readonly lfParts: Schema.$Array<
      Schema.StructWithRest<
        Schema.Struct<{ readonly plane_id: Schema.Int; readonly part_type: Schema.Int }>,
        readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
      >
    >
    readonly Parts: Schema.$Array<
      Schema.StructWithRest<
        Schema.Struct<{ readonly plane_id: Schema.Int; readonly part_type: Schema.Int }>,
        readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
      >
    >
    readonly Hangar: Schema.$Array<
      Schema.StructWithRest<
        Schema.Struct<{
          readonly plane_id: Schema.Int
          readonly eUpgrade: Schema.Int
          readonly tUpgrade: Schema.Int
          readonly wUpgrade: Schema.Int
          readonly paint: Schema.decodeTo<
            Schema.Struct<{
              readonly r1: Schema.Int
              readonly g1: Schema.Int
              readonly b1: Schema.Int
              readonly r2: Schema.Int
              readonly g2: Schema.Int
              readonly b2: Schema.Int
              readonly r3: Schema.Int
              readonly g3: Schema.Int
              readonly b3: Schema.Int
            }>,
            Schema.String,
            never,
            never
          >
          readonly skin: Schema.NullOr<Schema.String>
          readonly trips: Schema.decodeTo<
            Schema.BigInt,
            Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
            never,
            never
          >
          readonly distance: Schema.decodeTo<
            Schema.BigInt,
            Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
            never,
            never
          >
          readonly longest_flight: Schema.Int
          readonly most_hops: Schema.Int
          readonly most_profit: Schema.Int
          readonly hotdog: Schema.Int
          readonly Pilot: Schema.StructWithRest<
            Schema.Struct<{
              readonly c: Schema.String
              readonly BA: Schema.decodeTo<
                Schema.Struct<
                  {
                    male: Schema.compose<
                      Schema.Boolean,
                      Schema.Union<
                        readonly [
                          Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                          Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                        ]
                      >
                    >
                    firstNameIdx: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                    lastNameIdx: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                    bmonth: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                    bday: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                    skinColorIdx: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                    hairColorIdx: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                    shoeColorIdx: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                    pantsColor: Schema.decodeTo<
                      Schema.Struct<{ readonly r: Schema.Int; readonly g: Schema.Int; readonly b: Schema.Int }>,
                      Schema.TemplateLiteralParser<
                        readonly [Schema.FiniteFromString, ":", Schema.FiniteFromString, ":", Schema.FiniteFromString]
                      >,
                      never,
                      never
                    >
                    shirtColor: Schema.decodeTo<
                      Schema.Struct<{ readonly r: Schema.Int; readonly g: Schema.Int; readonly b: Schema.Int }>,
                      Schema.TemplateLiteralParser<
                        readonly [Schema.FiniteFromString, ":", Schema.FiniteFromString, ":", Schema.FiniteFromString]
                      >,
                      never,
                      never
                    >
                    hasGlasses: Schema.compose<
                      Schema.Boolean,
                      Schema.Union<
                        readonly [
                          Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                          Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                        ]
                      >
                    >
                    glasses: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                    hasTie: Schema.compose<
                      Schema.Boolean,
                      Schema.Union<
                        readonly [
                          Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                          Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                        ]
                      >
                    >
                    tieColor: Schema.decodeTo<
                      Schema.Struct<{ readonly r: Schema.Int; readonly g: Schema.Int; readonly b: Schema.Int }>,
                      Schema.TemplateLiteralParser<
                        readonly [Schema.FiniteFromString, ":", Schema.FiniteFromString, ":", Schema.FiniteFromString]
                      >,
                      never,
                      never
                    >
                    hasHairAcc: Schema.compose<
                      Schema.Boolean,
                      Schema.Union<
                        readonly [
                          Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                          Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                        ]
                      >
                    >
                    hairAcc: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                    hasBHat: Schema.compose<
                      Schema.Boolean,
                      Schema.Union<
                        readonly [
                          Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                          Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                        ]
                      >
                    >
                    hasMhat: Schema.compose<
                      Schema.Boolean,
                      Schema.Union<
                        readonly [
                          Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                          Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                        ]
                      >
                    >
                    hasFHat: Schema.compose<
                      Schema.Boolean,
                      Schema.Union<
                        readonly [
                          Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                          Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                        ]
                      >
                    >
                    hat: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                    hatColor: Schema.decodeTo<
                      Schema.Struct<{ readonly r: Schema.Int; readonly g: Schema.Int; readonly b: Schema.Int }>,
                      Schema.TemplateLiteralParser<
                        readonly [Schema.FiniteFromString, ":", Schema.FiniteFromString, ":", Schema.FiniteFromString]
                      >,
                      never,
                      never
                    >
                    hasEarrings: Schema.compose<
                      Schema.Boolean,
                      Schema.Union<
                        readonly [
                          Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                          Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                        ]
                      >
                    >
                    earringColor: Schema.decodeTo<
                      Schema.Struct<{ readonly r: Schema.Int; readonly g: Schema.Int; readonly b: Schema.Int }>,
                      Schema.TemplateLiteralParser<
                        readonly [Schema.FiniteFromString, ":", Schema.FiniteFromString, ":", Schema.FiniteFromString]
                      >,
                      never,
                      never
                    >
                    hair: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                  } & { readonly $unknown: Schema.$Array<Schema.String> }
                >,
                Schema.String,
                never,
                never
              >
              readonly v: Schema.decodeTo<
                Schema.BigInt,
                Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
                never,
                never
              >
            }>,
            readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
          >
          readonly costumes: Schema.$Array<Schema.String>
          readonly name: Schema.String
          readonly total_flight_time: Schema.decodeTo<
            Schema.BigInt,
            Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
            never,
            never
          >
          readonly total_revenue: Schema.decodeTo<
            Schema.BigInt,
            Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
            never,
            never
          >
          readonly total_profit: Schema.decodeTo<
            Schema.BigInt,
            Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
            never,
            never
          >
          readonly Cargo: Schema.$Array<
            Schema.StructWithRest<
              Schema.Struct<{
                readonly start_city: Schema.Int
                readonly end_city: Schema.Int
                readonly is_vip: Schema.Boolean
                readonly num_hops: Schema.Int
                readonly first_board: Schema.decodeTo<
                  Schema.BigInt,
                  Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
                  never,
                  never
                >
                readonly details: Schema.StructWithRest<
                  Schema.Struct<{
                    readonly t: Schema.NullOr<Schema.String>
                    readonly b: Schema.NullOr<
                      Schema.StructWithRest<
                        Schema.Struct<{
                          readonly c: Schema.String
                          readonly BA: Schema.decodeTo<
                            Schema.Struct<
                              {
                                male: Schema.compose<
                                  Schema.Boolean,
                                  Schema.Union<
                                    readonly [
                                      Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                      Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                                    ]
                                  >
                                >
                                firstNameIdx: Schema.compose<
                                  Schema.compose<Schema.Int, Schema.NumberFromString>,
                                  Schema.String
                                >
                                lastNameIdx: Schema.compose<
                                  Schema.compose<Schema.Int, Schema.NumberFromString>,
                                  Schema.String
                                >
                                bmonth: Schema.compose<
                                  Schema.compose<Schema.Int, Schema.NumberFromString>,
                                  Schema.String
                                >
                                bday: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                                skinColorIdx: Schema.compose<
                                  Schema.compose<Schema.Int, Schema.NumberFromString>,
                                  Schema.String
                                >
                                hairColorIdx: Schema.compose<
                                  Schema.compose<Schema.Int, Schema.NumberFromString>,
                                  Schema.String
                                >
                                shoeColorIdx: Schema.compose<
                                  Schema.compose<Schema.Int, Schema.NumberFromString>,
                                  Schema.String
                                >
                                pantsColor: Schema.decodeTo<
                                  Schema.Struct<{
                                    readonly r: Schema.Int
                                    readonly g: Schema.Int
                                    readonly b: Schema.Int
                                  }>,
                                  Schema.TemplateLiteralParser<
                                    readonly [
                                      Schema.FiniteFromString,
                                      ":",
                                      Schema.FiniteFromString,
                                      ":",
                                      Schema.FiniteFromString
                                    ]
                                  >,
                                  never,
                                  never
                                >
                                shirtColor: Schema.decodeTo<
                                  Schema.Struct<{
                                    readonly r: Schema.Int
                                    readonly g: Schema.Int
                                    readonly b: Schema.Int
                                  }>,
                                  Schema.TemplateLiteralParser<
                                    readonly [
                                      Schema.FiniteFromString,
                                      ":",
                                      Schema.FiniteFromString,
                                      ":",
                                      Schema.FiniteFromString
                                    ]
                                  >,
                                  never,
                                  never
                                >
                                hasGlasses: Schema.compose<
                                  Schema.Boolean,
                                  Schema.Union<
                                    readonly [
                                      Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                      Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                                    ]
                                  >
                                >
                                glasses: Schema.compose<
                                  Schema.compose<Schema.Int, Schema.NumberFromString>,
                                  Schema.String
                                >
                                hasTie: Schema.compose<
                                  Schema.Boolean,
                                  Schema.Union<
                                    readonly [
                                      Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                      Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                                    ]
                                  >
                                >
                                tieColor: Schema.decodeTo<
                                  Schema.Struct<{
                                    readonly r: Schema.Int
                                    readonly g: Schema.Int
                                    readonly b: Schema.Int
                                  }>,
                                  Schema.TemplateLiteralParser<
                                    readonly [
                                      Schema.FiniteFromString,
                                      ":",
                                      Schema.FiniteFromString,
                                      ":",
                                      Schema.FiniteFromString
                                    ]
                                  >,
                                  never,
                                  never
                                >
                                hasHairAcc: Schema.compose<
                                  Schema.Boolean,
                                  Schema.Union<
                                    readonly [
                                      Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                      Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                                    ]
                                  >
                                >
                                hairAcc: Schema.compose<
                                  Schema.compose<Schema.Int, Schema.NumberFromString>,
                                  Schema.String
                                >
                                hasBHat: Schema.compose<
                                  Schema.Boolean,
                                  Schema.Union<
                                    readonly [
                                      Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                      Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                                    ]
                                  >
                                >
                                hasMhat: Schema.compose<
                                  Schema.Boolean,
                                  Schema.Union<
                                    readonly [
                                      Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                      Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                                    ]
                                  >
                                >
                                hasFHat: Schema.compose<
                                  Schema.Boolean,
                                  Schema.Union<
                                    readonly [
                                      Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                      Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                                    ]
                                  >
                                >
                                hat: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                                hatColor: Schema.decodeTo<
                                  Schema.Struct<{
                                    readonly r: Schema.Int
                                    readonly g: Schema.Int
                                    readonly b: Schema.Int
                                  }>,
                                  Schema.TemplateLiteralParser<
                                    readonly [
                                      Schema.FiniteFromString,
                                      ":",
                                      Schema.FiniteFromString,
                                      ":",
                                      Schema.FiniteFromString
                                    ]
                                  >,
                                  never,
                                  never
                                >
                                hasEarrings: Schema.compose<
                                  Schema.Boolean,
                                  Schema.Union<
                                    readonly [
                                      Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                      Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                                    ]
                                  >
                                >
                                earringColor: Schema.decodeTo<
                                  Schema.Struct<{
                                    readonly r: Schema.Int
                                    readonly g: Schema.Int
                                    readonly b: Schema.Int
                                  }>,
                                  Schema.TemplateLiteralParser<
                                    readonly [
                                      Schema.FiniteFromString,
                                      ":",
                                      Schema.FiniteFromString,
                                      ":",
                                      Schema.FiniteFromString
                                    ]
                                  >,
                                  never,
                                  never
                                >
                                hair: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                              } & { readonly $unknown: Schema.$Array<Schema.String> }
                            >,
                            Schema.String,
                            never,
                            never
                          >
                          readonly v: Schema.decodeTo<
                            Schema.BigInt,
                            Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
                            never,
                            never
                          >
                        }>,
                        readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
                      >
                    >
                    readonly c: Schema.NullOr<
                      Schema.StructWithRest<
                        Schema.Struct<{
                          readonly p: Schema.Int
                          readonly n: Schema.NullOr<Schema.String>
                          readonly i: Schema.Int
                          readonly c: Schema.NullOr<Schema.String>
                          readonly ni: Schema.Int
                          readonly s: Schema.Int
                        }>,
                        readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
                      >
                    >
                    readonly s: Schema.Int
                  }>,
                  readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
                >
              }>,
              readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
            >
          >
          readonly Trip: Schema.StructWithRest<
            Schema.Struct<{
              readonly evaluated: Schema.Boolean
              readonly is_complete: Schema.Boolean
              readonly offload_complete: Schema.Boolean
              readonly start_time: Schema.decodeTo<
                Schema.BigInt,
                Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
                never,
                never
              >
              readonly Legs: Schema.$Array<
                Schema.StructWithRest<
                  Schema.Struct<{
                    readonly is_complete: Schema.Boolean
                    readonly offload_complete: Schema.Boolean
                    readonly start_city: Schema.Int
                    readonly end_city: Schema.Int
                    readonly distance: Schema.decodeTo<
                      Schema.Finite,
                      Schema.Union<readonly [Schema.instanceOf<JsonDouble, unknown>, Schema.Finite]>,
                      never,
                      never
                    >
                    readonly speed_bonus: Schema.decodeTo<
                      Schema.Finite,
                      Schema.Union<readonly [Schema.instanceOf<JsonDouble, unknown>, Schema.Finite]>,
                      never,
                      never
                    >
                  }>,
                  readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
                >
              >
              readonly arrivedLegsCount: Schema.Int
            }>,
            readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
          >
          readonly l: Schema.Boolean
        }>,
        readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
      >
    >
    readonly Planes: Schema.$Array<
      Schema.StructWithRest<
        Schema.Struct<{
          readonly plane_id: Schema.Int
          readonly eUpgrade: Schema.Int
          readonly tUpgrade: Schema.Int
          readonly wUpgrade: Schema.Int
          readonly paint: Schema.decodeTo<
            Schema.Struct<{
              readonly r1: Schema.Int
              readonly g1: Schema.Int
              readonly b1: Schema.Int
              readonly r2: Schema.Int
              readonly g2: Schema.Int
              readonly b2: Schema.Int
              readonly r3: Schema.Int
              readonly g3: Schema.Int
              readonly b3: Schema.Int
            }>,
            Schema.String,
            never,
            never
          >
          readonly skin: Schema.NullOr<Schema.String>
          readonly trips: Schema.decodeTo<
            Schema.BigInt,
            Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
            never,
            never
          >
          readonly distance: Schema.decodeTo<
            Schema.BigInt,
            Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
            never,
            never
          >
          readonly longest_flight: Schema.Int
          readonly most_hops: Schema.Int
          readonly most_profit: Schema.Int
          readonly hotdog: Schema.Int
          readonly Pilot: Schema.StructWithRest<
            Schema.Struct<{
              readonly c: Schema.String
              readonly BA: Schema.decodeTo<
                Schema.Struct<
                  {
                    male: Schema.compose<
                      Schema.Boolean,
                      Schema.Union<
                        readonly [
                          Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                          Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                        ]
                      >
                    >
                    firstNameIdx: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                    lastNameIdx: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                    bmonth: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                    bday: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                    skinColorIdx: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                    hairColorIdx: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                    shoeColorIdx: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                    pantsColor: Schema.decodeTo<
                      Schema.Struct<{ readonly r: Schema.Int; readonly g: Schema.Int; readonly b: Schema.Int }>,
                      Schema.TemplateLiteralParser<
                        readonly [Schema.FiniteFromString, ":", Schema.FiniteFromString, ":", Schema.FiniteFromString]
                      >,
                      never,
                      never
                    >
                    shirtColor: Schema.decodeTo<
                      Schema.Struct<{ readonly r: Schema.Int; readonly g: Schema.Int; readonly b: Schema.Int }>,
                      Schema.TemplateLiteralParser<
                        readonly [Schema.FiniteFromString, ":", Schema.FiniteFromString, ":", Schema.FiniteFromString]
                      >,
                      never,
                      never
                    >
                    hasGlasses: Schema.compose<
                      Schema.Boolean,
                      Schema.Union<
                        readonly [
                          Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                          Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                        ]
                      >
                    >
                    glasses: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                    hasTie: Schema.compose<
                      Schema.Boolean,
                      Schema.Union<
                        readonly [
                          Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                          Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                        ]
                      >
                    >
                    tieColor: Schema.decodeTo<
                      Schema.Struct<{ readonly r: Schema.Int; readonly g: Schema.Int; readonly b: Schema.Int }>,
                      Schema.TemplateLiteralParser<
                        readonly [Schema.FiniteFromString, ":", Schema.FiniteFromString, ":", Schema.FiniteFromString]
                      >,
                      never,
                      never
                    >
                    hasHairAcc: Schema.compose<
                      Schema.Boolean,
                      Schema.Union<
                        readonly [
                          Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                          Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                        ]
                      >
                    >
                    hairAcc: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                    hasBHat: Schema.compose<
                      Schema.Boolean,
                      Schema.Union<
                        readonly [
                          Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                          Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                        ]
                      >
                    >
                    hasMhat: Schema.compose<
                      Schema.Boolean,
                      Schema.Union<
                        readonly [
                          Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                          Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                        ]
                      >
                    >
                    hasFHat: Schema.compose<
                      Schema.Boolean,
                      Schema.Union<
                        readonly [
                          Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                          Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                        ]
                      >
                    >
                    hat: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                    hatColor: Schema.decodeTo<
                      Schema.Struct<{ readonly r: Schema.Int; readonly g: Schema.Int; readonly b: Schema.Int }>,
                      Schema.TemplateLiteralParser<
                        readonly [Schema.FiniteFromString, ":", Schema.FiniteFromString, ":", Schema.FiniteFromString]
                      >,
                      never,
                      never
                    >
                    hasEarrings: Schema.compose<
                      Schema.Boolean,
                      Schema.Union<
                        readonly [
                          Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                          Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                        ]
                      >
                    >
                    earringColor: Schema.decodeTo<
                      Schema.Struct<{ readonly r: Schema.Int; readonly g: Schema.Int; readonly b: Schema.Int }>,
                      Schema.TemplateLiteralParser<
                        readonly [Schema.FiniteFromString, ":", Schema.FiniteFromString, ":", Schema.FiniteFromString]
                      >,
                      never,
                      never
                    >
                    hair: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                  } & { readonly $unknown: Schema.$Array<Schema.String> }
                >,
                Schema.String,
                never,
                never
              >
              readonly v: Schema.decodeTo<
                Schema.BigInt,
                Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
                never,
                never
              >
            }>,
            readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
          >
          readonly costumes: Schema.$Array<Schema.String>
          readonly name: Schema.String
          readonly total_flight_time: Schema.decodeTo<
            Schema.BigInt,
            Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
            never,
            never
          >
          readonly total_revenue: Schema.decodeTo<
            Schema.BigInt,
            Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
            never,
            never
          >
          readonly total_profit: Schema.decodeTo<
            Schema.BigInt,
            Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
            never,
            never
          >
          readonly Cargo: Schema.$Array<
            Schema.StructWithRest<
              Schema.Struct<{
                readonly start_city: Schema.Int
                readonly end_city: Schema.Int
                readonly is_vip: Schema.Boolean
                readonly num_hops: Schema.Int
                readonly first_board: Schema.decodeTo<
                  Schema.BigInt,
                  Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
                  never,
                  never
                >
                readonly details: Schema.StructWithRest<
                  Schema.Struct<{
                    readonly t: Schema.NullOr<Schema.String>
                    readonly b: Schema.NullOr<
                      Schema.StructWithRest<
                        Schema.Struct<{
                          readonly c: Schema.String
                          readonly BA: Schema.decodeTo<
                            Schema.Struct<
                              {
                                male: Schema.compose<
                                  Schema.Boolean,
                                  Schema.Union<
                                    readonly [
                                      Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                      Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                                    ]
                                  >
                                >
                                firstNameIdx: Schema.compose<
                                  Schema.compose<Schema.Int, Schema.NumberFromString>,
                                  Schema.String
                                >
                                lastNameIdx: Schema.compose<
                                  Schema.compose<Schema.Int, Schema.NumberFromString>,
                                  Schema.String
                                >
                                bmonth: Schema.compose<
                                  Schema.compose<Schema.Int, Schema.NumberFromString>,
                                  Schema.String
                                >
                                bday: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                                skinColorIdx: Schema.compose<
                                  Schema.compose<Schema.Int, Schema.NumberFromString>,
                                  Schema.String
                                >
                                hairColorIdx: Schema.compose<
                                  Schema.compose<Schema.Int, Schema.NumberFromString>,
                                  Schema.String
                                >
                                shoeColorIdx: Schema.compose<
                                  Schema.compose<Schema.Int, Schema.NumberFromString>,
                                  Schema.String
                                >
                                pantsColor: Schema.decodeTo<
                                  Schema.Struct<{
                                    readonly r: Schema.Int
                                    readonly g: Schema.Int
                                    readonly b: Schema.Int
                                  }>,
                                  Schema.TemplateLiteralParser<
                                    readonly [
                                      Schema.FiniteFromString,
                                      ":",
                                      Schema.FiniteFromString,
                                      ":",
                                      Schema.FiniteFromString
                                    ]
                                  >,
                                  never,
                                  never
                                >
                                shirtColor: Schema.decodeTo<
                                  Schema.Struct<{
                                    readonly r: Schema.Int
                                    readonly g: Schema.Int
                                    readonly b: Schema.Int
                                  }>,
                                  Schema.TemplateLiteralParser<
                                    readonly [
                                      Schema.FiniteFromString,
                                      ":",
                                      Schema.FiniteFromString,
                                      ":",
                                      Schema.FiniteFromString
                                    ]
                                  >,
                                  never,
                                  never
                                >
                                hasGlasses: Schema.compose<
                                  Schema.Boolean,
                                  Schema.Union<
                                    readonly [
                                      Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                      Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                                    ]
                                  >
                                >
                                glasses: Schema.compose<
                                  Schema.compose<Schema.Int, Schema.NumberFromString>,
                                  Schema.String
                                >
                                hasTie: Schema.compose<
                                  Schema.Boolean,
                                  Schema.Union<
                                    readonly [
                                      Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                      Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                                    ]
                                  >
                                >
                                tieColor: Schema.decodeTo<
                                  Schema.Struct<{
                                    readonly r: Schema.Int
                                    readonly g: Schema.Int
                                    readonly b: Schema.Int
                                  }>,
                                  Schema.TemplateLiteralParser<
                                    readonly [
                                      Schema.FiniteFromString,
                                      ":",
                                      Schema.FiniteFromString,
                                      ":",
                                      Schema.FiniteFromString
                                    ]
                                  >,
                                  never,
                                  never
                                >
                                hasHairAcc: Schema.compose<
                                  Schema.Boolean,
                                  Schema.Union<
                                    readonly [
                                      Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                      Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                                    ]
                                  >
                                >
                                hairAcc: Schema.compose<
                                  Schema.compose<Schema.Int, Schema.NumberFromString>,
                                  Schema.String
                                >
                                hasBHat: Schema.compose<
                                  Schema.Boolean,
                                  Schema.Union<
                                    readonly [
                                      Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                      Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                                    ]
                                  >
                                >
                                hasMhat: Schema.compose<
                                  Schema.Boolean,
                                  Schema.Union<
                                    readonly [
                                      Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                      Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                                    ]
                                  >
                                >
                                hasFHat: Schema.compose<
                                  Schema.Boolean,
                                  Schema.Union<
                                    readonly [
                                      Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                      Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                                    ]
                                  >
                                >
                                hat: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                                hatColor: Schema.decodeTo<
                                  Schema.Struct<{
                                    readonly r: Schema.Int
                                    readonly g: Schema.Int
                                    readonly b: Schema.Int
                                  }>,
                                  Schema.TemplateLiteralParser<
                                    readonly [
                                      Schema.FiniteFromString,
                                      ":",
                                      Schema.FiniteFromString,
                                      ":",
                                      Schema.FiniteFromString
                                    ]
                                  >,
                                  never,
                                  never
                                >
                                hasEarrings: Schema.compose<
                                  Schema.Boolean,
                                  Schema.Union<
                                    readonly [
                                      Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                      Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                                    ]
                                  >
                                >
                                earringColor: Schema.decodeTo<
                                  Schema.Struct<{
                                    readonly r: Schema.Int
                                    readonly g: Schema.Int
                                    readonly b: Schema.Int
                                  }>,
                                  Schema.TemplateLiteralParser<
                                    readonly [
                                      Schema.FiniteFromString,
                                      ":",
                                      Schema.FiniteFromString,
                                      ":",
                                      Schema.FiniteFromString
                                    ]
                                  >,
                                  never,
                                  never
                                >
                                hair: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                              } & { readonly $unknown: Schema.$Array<Schema.String> }
                            >,
                            Schema.String,
                            never,
                            never
                          >
                          readonly v: Schema.decodeTo<
                            Schema.BigInt,
                            Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
                            never,
                            never
                          >
                        }>,
                        readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
                      >
                    >
                    readonly c: Schema.NullOr<
                      Schema.StructWithRest<
                        Schema.Struct<{
                          readonly p: Schema.Int
                          readonly n: Schema.NullOr<Schema.String>
                          readonly i: Schema.Int
                          readonly c: Schema.NullOr<Schema.String>
                          readonly ni: Schema.Int
                          readonly s: Schema.Int
                        }>,
                        readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
                      >
                    >
                    readonly s: Schema.Int
                  }>,
                  readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
                >
              }>,
              readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
            >
          >
          readonly Trip: Schema.StructWithRest<
            Schema.Struct<{
              readonly evaluated: Schema.Boolean
              readonly is_complete: Schema.Boolean
              readonly offload_complete: Schema.Boolean
              readonly start_time: Schema.decodeTo<
                Schema.BigInt,
                Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
                never,
                never
              >
              readonly Legs: Schema.$Array<
                Schema.StructWithRest<
                  Schema.Struct<{
                    readonly is_complete: Schema.Boolean
                    readonly offload_complete: Schema.Boolean
                    readonly start_city: Schema.Int
                    readonly end_city: Schema.Int
                    readonly distance: Schema.decodeTo<
                      Schema.Finite,
                      Schema.Union<readonly [Schema.instanceOf<JsonDouble, unknown>, Schema.Finite]>,
                      never,
                      never
                    >
                    readonly speed_bonus: Schema.decodeTo<
                      Schema.Finite,
                      Schema.Union<readonly [Schema.instanceOf<JsonDouble, unknown>, Schema.Finite]>,
                      never,
                      never
                    >
                  }>,
                  readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
                >
              >
              readonly arrivedLegsCount: Schema.Int
            }>,
            readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
          >
          readonly l: Schema.Boolean
        }>,
        readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
      >
    >
    readonly f: Schema.$Array<
      Schema.StructWithRest<
        Schema.Struct<{
          readonly name: Schema.NullOr<Schema.String>
          readonly player_id: Schema.String
          readonly gc: Schema.NullOr<Schema.String>
        }>,
        readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
      >
    >
    readonly ShopLog: Schema.$Array<
      Schema.StructWithRest<
        Schema.Struct<{
          readonly ts: Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
          readonly seed: Schema.Int
        }>,
        readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
      >
    >
    readonly refresh: Schema.$Record<Schema.String, Schema.$Record<Schema.String, Schema.Int>>
    readonly dailyStats: Schema.$Record<
      Schema.String,
      Schema.$Record<
        Schema.String,
        Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
      >
    >
    readonly eventCounts: Schema.$Record<Schema.String, Schema.Int>
    readonly globalStats: Schema.$Record<
      Schema.String,
      Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
    >
    readonly speedUpFlightAdWatched: Schema.$Array<Schema.String>
    readonly cityJobsAdWatched: Schema.$Record<Schema.String, Schema.$Array<Schema.String>>
    readonly cPC: Schema.Int
    readonly cPRI: Schema.Int
    readonly nFBT: Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
    readonly nPCT: Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
    readonly g: Schema.NullOr<
      Schema.StructWithRest<
        Schema.Struct<{
          readonly b: Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
          readonly u: Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
          readonly j: Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
          readonly c: Schema.Int
          readonly r1: Schema.Boolean
          readonly r2: Schema.Boolean
          readonly r3: Schema.Boolean
          readonly r4: Schema.Boolean
          readonly r5: Schema.Boolean
          readonly r: Schema.$Array<
            Schema.Union<
              readonly [
                Schema.Struct<{ readonly Key: Schema.Literal<0>; readonly Value: Schema.Int }>,
                Schema.Struct<{ readonly Key: Schema.Literal<1>; readonly Value: Schema.Int }>,
                Schema.Struct<{
                  readonly Key: Schema.Literal<2>
                  readonly Value: Schema.StructWithRest<
                    Schema.Struct<{ readonly plane_id: Schema.Int; readonly part_type: Schema.Int }>,
                    readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
                  >
                }>,
                Schema.Struct<{ readonly Key: Schema.Literal<3>; readonly Value: Schema.String }>
              ]
            >
          >
        }>,
        readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
      >
    >
    readonly pg: Schema.NullOr<
      Schema.StructWithRest<
        Schema.Struct<{
          readonly b: Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
          readonly u: Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
          readonly j: Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
          readonly c: Schema.Int
          readonly r1: Schema.Boolean
          readonly r2: Schema.Boolean
          readonly r3: Schema.Boolean
          readonly r4: Schema.Boolean
          readonly r5: Schema.Boolean
          readonly r: Schema.$Array<
            Schema.Union<
              readonly [
                Schema.Struct<{ readonly Key: Schema.Literal<0>; readonly Value: Schema.Int }>,
                Schema.Struct<{ readonly Key: Schema.Literal<1>; readonly Value: Schema.Int }>,
                Schema.Struct<{
                  readonly Key: Schema.Literal<2>
                  readonly Value: Schema.StructWithRest<
                    Schema.Struct<{ readonly plane_id: Schema.Int; readonly part_type: Schema.Int }>,
                    readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
                  >
                }>,
                Schema.Struct<{ readonly Key: Schema.Literal<3>; readonly Value: Schema.String }>
              ]
            >
          >
        }>,
        readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
      >
    >
    readonly carrierPorts: Schema.$Record<
      Schema.String,
      Schema.$Record<
        Schema.String,
        Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
      >
    >
    readonly skins: Schema.$Array<Schema.String>
    readonly skinPass: Schema.Boolean
    readonly adSkips: Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
    readonly nMST: Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
    readonly mJL: Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
    readonly bldHQ: Schema.Int
    readonly bldPRem: Schema.Int
    readonly bldCRem: Schema.Int
  }>,
  readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/pocket-planes-sdk/src/Save.ts#L900)

Since v1.0.0

## Paint

A plane's paint job (the game's `PaintColor`), which `PlaneInfo.paint`
writes as three `r,g,b` colors joined by `:`.

**Signature**

```ts
declare const Paint: Schema.decodeTo<
  Schema.Struct<{
    readonly r1: Schema.Int
    readonly g1: Schema.Int
    readonly b1: Schema.Int
    readonly r2: Schema.Int
    readonly g2: Schema.Int
    readonly b2: Schema.Int
    readonly r3: Schema.Int
    readonly g3: Schema.Int
    readonly b3: Schema.Int
  }>,
  Schema.String,
  never,
  never
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/pocket-planes-sdk/src/Save.ts#L529)

Since v1.0.0

## Part

A plane part (the game's `Part`). `part_type` is the game's `PartType`
(`body`, `controls`, `engine`, in that order).

**Signature**

```ts
declare const Part: Schema.StructWithRest<
  Schema.Struct<{ readonly plane_id: Schema.Int; readonly part_type: Schema.Int }>,
  readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/pocket-planes-sdk/src/Save.ts#L598)

Since v1.0.0

## PlaneInfo

A plane the player owns (the game's `PlaneInfo`), flying in `Planes` or
parked in `Hangar`.

**Signature**

```ts
declare const PlaneInfo: Schema.StructWithRest<
  Schema.Struct<{
    readonly plane_id: Schema.Int
    readonly eUpgrade: Schema.Int
    readonly tUpgrade: Schema.Int
    readonly wUpgrade: Schema.Int
    readonly paint: Schema.decodeTo<
      Schema.Struct<{
        readonly r1: Schema.Int
        readonly g1: Schema.Int
        readonly b1: Schema.Int
        readonly r2: Schema.Int
        readonly g2: Schema.Int
        readonly b2: Schema.Int
        readonly r3: Schema.Int
        readonly g3: Schema.Int
        readonly b3: Schema.Int
      }>,
      Schema.String,
      never,
      never
    >
    readonly skin: Schema.NullOr<Schema.String>
    readonly trips: Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
    readonly distance: Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
    readonly longest_flight: Schema.Int
    readonly most_hops: Schema.Int
    readonly most_profit: Schema.Int
    readonly hotdog: Schema.Int
    readonly Pilot: Schema.StructWithRest<
      Schema.Struct<{
        readonly c: Schema.String
        readonly BA: Schema.decodeTo<
          Schema.Struct<
            {
              male: Schema.compose<
                Schema.Boolean,
                Schema.Union<
                  readonly [
                    Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                    Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                  ]
                >
              >
              firstNameIdx: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
              lastNameIdx: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
              bmonth: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
              bday: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
              skinColorIdx: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
              hairColorIdx: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
              shoeColorIdx: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
              pantsColor: Schema.decodeTo<
                Schema.Struct<{ readonly r: Schema.Int; readonly g: Schema.Int; readonly b: Schema.Int }>,
                Schema.TemplateLiteralParser<
                  readonly [Schema.FiniteFromString, ":", Schema.FiniteFromString, ":", Schema.FiniteFromString]
                >,
                never,
                never
              >
              shirtColor: Schema.decodeTo<
                Schema.Struct<{ readonly r: Schema.Int; readonly g: Schema.Int; readonly b: Schema.Int }>,
                Schema.TemplateLiteralParser<
                  readonly [Schema.FiniteFromString, ":", Schema.FiniteFromString, ":", Schema.FiniteFromString]
                >,
                never,
                never
              >
              hasGlasses: Schema.compose<
                Schema.Boolean,
                Schema.Union<
                  readonly [
                    Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                    Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                  ]
                >
              >
              glasses: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
              hasTie: Schema.compose<
                Schema.Boolean,
                Schema.Union<
                  readonly [
                    Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                    Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                  ]
                >
              >
              tieColor: Schema.decodeTo<
                Schema.Struct<{ readonly r: Schema.Int; readonly g: Schema.Int; readonly b: Schema.Int }>,
                Schema.TemplateLiteralParser<
                  readonly [Schema.FiniteFromString, ":", Schema.FiniteFromString, ":", Schema.FiniteFromString]
                >,
                never,
                never
              >
              hasHairAcc: Schema.compose<
                Schema.Boolean,
                Schema.Union<
                  readonly [
                    Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                    Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                  ]
                >
              >
              hairAcc: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
              hasBHat: Schema.compose<
                Schema.Boolean,
                Schema.Union<
                  readonly [
                    Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                    Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                  ]
                >
              >
              hasMhat: Schema.compose<
                Schema.Boolean,
                Schema.Union<
                  readonly [
                    Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                    Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                  ]
                >
              >
              hasFHat: Schema.compose<
                Schema.Boolean,
                Schema.Union<
                  readonly [
                    Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                    Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                  ]
                >
              >
              hat: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
              hatColor: Schema.decodeTo<
                Schema.Struct<{ readonly r: Schema.Int; readonly g: Schema.Int; readonly b: Schema.Int }>,
                Schema.TemplateLiteralParser<
                  readonly [Schema.FiniteFromString, ":", Schema.FiniteFromString, ":", Schema.FiniteFromString]
                >,
                never,
                never
              >
              hasEarrings: Schema.compose<
                Schema.Boolean,
                Schema.Union<
                  readonly [
                    Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                    Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                  ]
                >
              >
              earringColor: Schema.decodeTo<
                Schema.Struct<{ readonly r: Schema.Int; readonly g: Schema.Int; readonly b: Schema.Int }>,
                Schema.TemplateLiteralParser<
                  readonly [Schema.FiniteFromString, ":", Schema.FiniteFromString, ":", Schema.FiniteFromString]
                >,
                never,
                never
              >
              hair: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
            } & { readonly $unknown: Schema.$Array<Schema.String> }
          >,
          Schema.String,
          never,
          never
        >
        readonly v: Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
      }>,
      readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
    >
    readonly costumes: Schema.$Array<Schema.String>
    readonly name: Schema.String
    readonly total_flight_time: Schema.decodeTo<
      Schema.BigInt,
      Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
      never,
      never
    >
    readonly total_revenue: Schema.decodeTo<
      Schema.BigInt,
      Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
      never,
      never
    >
    readonly total_profit: Schema.decodeTo<
      Schema.BigInt,
      Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
      never,
      never
    >
    readonly Cargo: Schema.$Array<
      Schema.StructWithRest<
        Schema.Struct<{
          readonly start_city: Schema.Int
          readonly end_city: Schema.Int
          readonly is_vip: Schema.Boolean
          readonly num_hops: Schema.Int
          readonly first_board: Schema.decodeTo<
            Schema.BigInt,
            Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
            never,
            never
          >
          readonly details: Schema.StructWithRest<
            Schema.Struct<{
              readonly t: Schema.NullOr<Schema.String>
              readonly b: Schema.NullOr<
                Schema.StructWithRest<
                  Schema.Struct<{
                    readonly c: Schema.String
                    readonly BA: Schema.decodeTo<
                      Schema.Struct<
                        {
                          male: Schema.compose<
                            Schema.Boolean,
                            Schema.Union<
                              readonly [
                                Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                              ]
                            >
                          >
                          firstNameIdx: Schema.compose<
                            Schema.compose<Schema.Int, Schema.NumberFromString>,
                            Schema.String
                          >
                          lastNameIdx: Schema.compose<
                            Schema.compose<Schema.Int, Schema.NumberFromString>,
                            Schema.String
                          >
                          bmonth: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                          bday: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                          skinColorIdx: Schema.compose<
                            Schema.compose<Schema.Int, Schema.NumberFromString>,
                            Schema.String
                          >
                          hairColorIdx: Schema.compose<
                            Schema.compose<Schema.Int, Schema.NumberFromString>,
                            Schema.String
                          >
                          shoeColorIdx: Schema.compose<
                            Schema.compose<Schema.Int, Schema.NumberFromString>,
                            Schema.String
                          >
                          pantsColor: Schema.decodeTo<
                            Schema.Struct<{ readonly r: Schema.Int; readonly g: Schema.Int; readonly b: Schema.Int }>,
                            Schema.TemplateLiteralParser<
                              readonly [
                                Schema.FiniteFromString,
                                ":",
                                Schema.FiniteFromString,
                                ":",
                                Schema.FiniteFromString
                              ]
                            >,
                            never,
                            never
                          >
                          shirtColor: Schema.decodeTo<
                            Schema.Struct<{ readonly r: Schema.Int; readonly g: Schema.Int; readonly b: Schema.Int }>,
                            Schema.TemplateLiteralParser<
                              readonly [
                                Schema.FiniteFromString,
                                ":",
                                Schema.FiniteFromString,
                                ":",
                                Schema.FiniteFromString
                              ]
                            >,
                            never,
                            never
                          >
                          hasGlasses: Schema.compose<
                            Schema.Boolean,
                            Schema.Union<
                              readonly [
                                Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                              ]
                            >
                          >
                          glasses: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                          hasTie: Schema.compose<
                            Schema.Boolean,
                            Schema.Union<
                              readonly [
                                Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                              ]
                            >
                          >
                          tieColor: Schema.decodeTo<
                            Schema.Struct<{ readonly r: Schema.Int; readonly g: Schema.Int; readonly b: Schema.Int }>,
                            Schema.TemplateLiteralParser<
                              readonly [
                                Schema.FiniteFromString,
                                ":",
                                Schema.FiniteFromString,
                                ":",
                                Schema.FiniteFromString
                              ]
                            >,
                            never,
                            never
                          >
                          hasHairAcc: Schema.compose<
                            Schema.Boolean,
                            Schema.Union<
                              readonly [
                                Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                              ]
                            >
                          >
                          hairAcc: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                          hasBHat: Schema.compose<
                            Schema.Boolean,
                            Schema.Union<
                              readonly [
                                Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                              ]
                            >
                          >
                          hasMhat: Schema.compose<
                            Schema.Boolean,
                            Schema.Union<
                              readonly [
                                Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                              ]
                            >
                          >
                          hasFHat: Schema.compose<
                            Schema.Boolean,
                            Schema.Union<
                              readonly [
                                Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                              ]
                            >
                          >
                          hat: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                          hatColor: Schema.decodeTo<
                            Schema.Struct<{ readonly r: Schema.Int; readonly g: Schema.Int; readonly b: Schema.Int }>,
                            Schema.TemplateLiteralParser<
                              readonly [
                                Schema.FiniteFromString,
                                ":",
                                Schema.FiniteFromString,
                                ":",
                                Schema.FiniteFromString
                              ]
                            >,
                            never,
                            never
                          >
                          hasEarrings: Schema.compose<
                            Schema.Boolean,
                            Schema.Union<
                              readonly [
                                Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                              ]
                            >
                          >
                          earringColor: Schema.decodeTo<
                            Schema.Struct<{ readonly r: Schema.Int; readonly g: Schema.Int; readonly b: Schema.Int }>,
                            Schema.TemplateLiteralParser<
                              readonly [
                                Schema.FiniteFromString,
                                ":",
                                Schema.FiniteFromString,
                                ":",
                                Schema.FiniteFromString
                              ]
                            >,
                            never,
                            never
                          >
                          hair: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                        } & { readonly $unknown: Schema.$Array<Schema.String> }
                      >,
                      Schema.String,
                      never,
                      never
                    >
                    readonly v: Schema.decodeTo<
                      Schema.BigInt,
                      Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
                      never,
                      never
                    >
                  }>,
                  readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
                >
              >
              readonly c: Schema.NullOr<
                Schema.StructWithRest<
                  Schema.Struct<{
                    readonly p: Schema.Int
                    readonly n: Schema.NullOr<Schema.String>
                    readonly i: Schema.Int
                    readonly c: Schema.NullOr<Schema.String>
                    readonly ni: Schema.Int
                    readonly s: Schema.Int
                  }>,
                  readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
                >
              >
              readonly s: Schema.Int
            }>,
            readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
          >
        }>,
        readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
      >
    >
    readonly Trip: Schema.StructWithRest<
      Schema.Struct<{
        readonly evaluated: Schema.Boolean
        readonly is_complete: Schema.Boolean
        readonly offload_complete: Schema.Boolean
        readonly start_time: Schema.decodeTo<
          Schema.BigInt,
          Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
          never,
          never
        >
        readonly Legs: Schema.$Array<
          Schema.StructWithRest<
            Schema.Struct<{
              readonly is_complete: Schema.Boolean
              readonly offload_complete: Schema.Boolean
              readonly start_city: Schema.Int
              readonly end_city: Schema.Int
              readonly distance: Schema.decodeTo<
                Schema.Finite,
                Schema.Union<readonly [Schema.instanceOf<JsonDouble, unknown>, Schema.Finite]>,
                never,
                never
              >
              readonly speed_bonus: Schema.decodeTo<
                Schema.Finite,
                Schema.Union<readonly [Schema.instanceOf<JsonDouble, unknown>, Schema.Finite]>,
                never,
                never
              >
            }>,
            readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
          >
        >
        readonly arrivedLegsCount: Schema.Int
      }>,
      readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
    >
    readonly l: Schema.Boolean
  }>,
  readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/pocket-planes-sdk/src/Save.ts#L859)

Since v1.0.0

## SaveData

The save string, as `Player.saveJson()` returns it and `Player.FromJSON`
loads it, decoded to a `PPSave`. Keys the schemas do not model are kept
and written back. Encoding gives back the string the game wrote, byte for
byte, except that dictionary keys from "0" to "4294967294" come back first
and in ascending order (the integer keys of `carrierPorts`,
`cityJobsAdWatched`, `eventCounts` and `refresh`'s inner dictionaries, and
the days of `dailyStats`), and keys the schemas do not model come back
after the modeled keys of their object; see the module docs.

**Signature**

```ts
declare const SaveData: Schema.decodeTo<
  Schema.StructWithRest<
    Schema.Struct<{
      readonly c: Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
      readonly b: Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
      readonly wheelTickets: Schema.StructWithRest<
        Schema.Struct<{
          readonly amount: Schema.decodeTo<
            Schema.BigInt,
            Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
            never,
            never
          >
          readonly type: Schema.Int
        }>,
        readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
      >
      readonly firstLoad: Schema.Boolean
      readonly hasCrew: Schema.Boolean
      readonly playerR: Schema.Boolean
      readonly vi: Schema.Boolean
      readonly vipPlaneOwned: Schema.Boolean
      readonly coinsCollectedFree: Schema.decodeTo<
        Schema.BigInt,
        Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
        never,
        never
      >
      readonly buxCollectedFree: Schema.decodeTo<
        Schema.BigInt,
        Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
        never,
        never
      >
      readonly bbBadge: Schema.Int
      readonly eventCount: Schema.Int
      readonly globalEvent: Schema.Int
      readonly homeCity: Schema.Int
      readonly lastPlane: Schema.Int
      readonly level: Schema.Int
      readonly lfb: Schema.Int
      readonly resetCount: Schema.Int
      readonly slots: Schema.Int
      readonly mapX: Schema.decodeTo<
        Schema.Finite,
        Schema.Union<readonly [Schema.instanceOf<JsonDouble, unknown>, Schema.Finite]>,
        never,
        never
      >
      readonly mapY: Schema.decodeTo<
        Schema.Finite,
        Schema.Union<readonly [Schema.instanceOf<JsonDouble, unknown>, Schema.Finite]>,
        never,
        never
      >
      readonly mapZ: Schema.decodeTo<
        Schema.Finite,
        Schema.Union<readonly [Schema.instanceOf<JsonDouble, unknown>, Schema.Finite]>,
        never,
        never
      >
      readonly mmapZ: Schema.decodeTo<
        Schema.Finite,
        Schema.Union<readonly [Schema.instanceOf<JsonDouble, unknown>, Schema.Finite]>,
        never,
        never
      >
      readonly planeListY: Schema.decodeTo<
        Schema.Finite,
        Schema.Union<readonly [Schema.instanceOf<JsonDouble, unknown>, Schema.Finite]>,
        never,
        never
      >
      readonly mapPlanesHidden: Schema.NullOr<Schema.Boolean>
      readonly lastPlaneCount: Schema.decodeTo<
        Schema.BigInt,
        Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
        never,
        never
      >
      readonly timeInGame: Schema.decodeTo<
        Schema.BigInt,
        Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
        never,
        never
      >
      readonly tp: Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
      readonly xp: Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
      readonly achieve: Schema.NullOr<Schema.String>
      readonly airlineName: Schema.NullOr<Schema.String>
      readonly bbEntries: Schema.NullOr<Schema.String>
      readonly landingAlerts: Schema.NullOr<Schema.String>
      readonly playerE: Schema.NullOr<Schema.brand<Schema.RedactedFromValue<Schema.String>, "PlayerEmail">>
      readonly playerI: Schema.NullOr<Schema.brand<Schema.String, "PlayerId">>
      readonly playerS: Schema.NullOr<Schema.brand<Schema.RedactedFromValue<Schema.String>, "PlayerAuthKey">>
      readonly shownTips: Schema.NullOr<Schema.String>
      readonly sounds: Schema.NullOr<Schema.String>
      readonly v: Schema.String
      readonly events: Schema.NullOr<Schema.String>
      readonly cityUnlock: Schema.$Array<Schema.Int>
      readonly localEvents: Schema.$Array<Schema.Int>
      readonly bb: Schema.$Array<
        Schema.StructWithRest<
          Schema.Struct<{
            readonly i: Schema.Int
            readonly l: Schema.Int
            readonly d: Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
            readonly m: Schema.NullOr<Schema.String>
            readonly b: Schema.NullOr<
              Schema.StructWithRest<
                Schema.Struct<{
                  readonly c: Schema.String
                  readonly BA: Schema.decodeTo<
                    Schema.Struct<
                      {
                        male: Schema.compose<
                          Schema.Boolean,
                          Schema.Union<
                            readonly [
                              Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                              Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                            ]
                          >
                        >
                        firstNameIdx: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                        lastNameIdx: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                        bmonth: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                        bday: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                        skinColorIdx: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                        hairColorIdx: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                        shoeColorIdx: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                        pantsColor: Schema.decodeTo<
                          Schema.Struct<{ readonly r: Schema.Int; readonly g: Schema.Int; readonly b: Schema.Int }>,
                          Schema.TemplateLiteralParser<
                            readonly [
                              Schema.FiniteFromString,
                              ":",
                              Schema.FiniteFromString,
                              ":",
                              Schema.FiniteFromString
                            ]
                          >,
                          never,
                          never
                        >
                        shirtColor: Schema.decodeTo<
                          Schema.Struct<{ readonly r: Schema.Int; readonly g: Schema.Int; readonly b: Schema.Int }>,
                          Schema.TemplateLiteralParser<
                            readonly [
                              Schema.FiniteFromString,
                              ":",
                              Schema.FiniteFromString,
                              ":",
                              Schema.FiniteFromString
                            ]
                          >,
                          never,
                          never
                        >
                        hasGlasses: Schema.compose<
                          Schema.Boolean,
                          Schema.Union<
                            readonly [
                              Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                              Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                            ]
                          >
                        >
                        glasses: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                        hasTie: Schema.compose<
                          Schema.Boolean,
                          Schema.Union<
                            readonly [
                              Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                              Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                            ]
                          >
                        >
                        tieColor: Schema.decodeTo<
                          Schema.Struct<{ readonly r: Schema.Int; readonly g: Schema.Int; readonly b: Schema.Int }>,
                          Schema.TemplateLiteralParser<
                            readonly [
                              Schema.FiniteFromString,
                              ":",
                              Schema.FiniteFromString,
                              ":",
                              Schema.FiniteFromString
                            ]
                          >,
                          never,
                          never
                        >
                        hasHairAcc: Schema.compose<
                          Schema.Boolean,
                          Schema.Union<
                            readonly [
                              Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                              Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                            ]
                          >
                        >
                        hairAcc: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                        hasBHat: Schema.compose<
                          Schema.Boolean,
                          Schema.Union<
                            readonly [
                              Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                              Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                            ]
                          >
                        >
                        hasMhat: Schema.compose<
                          Schema.Boolean,
                          Schema.Union<
                            readonly [
                              Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                              Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                            ]
                          >
                        >
                        hasFHat: Schema.compose<
                          Schema.Boolean,
                          Schema.Union<
                            readonly [
                              Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                              Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                            ]
                          >
                        >
                        hat: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                        hatColor: Schema.decodeTo<
                          Schema.Struct<{ readonly r: Schema.Int; readonly g: Schema.Int; readonly b: Schema.Int }>,
                          Schema.TemplateLiteralParser<
                            readonly [
                              Schema.FiniteFromString,
                              ":",
                              Schema.FiniteFromString,
                              ":",
                              Schema.FiniteFromString
                            ]
                          >,
                          never,
                          never
                        >
                        hasEarrings: Schema.compose<
                          Schema.Boolean,
                          Schema.Union<
                            readonly [
                              Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                              Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                            ]
                          >
                        >
                        earringColor: Schema.decodeTo<
                          Schema.Struct<{ readonly r: Schema.Int; readonly g: Schema.Int; readonly b: Schema.Int }>,
                          Schema.TemplateLiteralParser<
                            readonly [
                              Schema.FiniteFromString,
                              ":",
                              Schema.FiniteFromString,
                              ":",
                              Schema.FiniteFromString
                            ]
                          >,
                          never,
                          never
                        >
                        hair: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                      } & { readonly $unknown: Schema.$Array<Schema.String> }
                    >,
                    Schema.String,
                    never,
                    never
                  >
                  readonly v: Schema.decodeTo<
                    Schema.BigInt,
                    Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
                    never,
                    never
                  >
                }>,
                readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
              >
            >
          }>,
          readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
        >
      >
      readonly CargoLog: Schema.$Array<
        Schema.StructWithRest<
          Schema.Struct<{
            readonly c: Schema.Int
            readonly ts: Schema.decodeTo<
              Schema.BigInt,
              Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
              never,
              never
            >
            readonly details: Schema.StructWithRest<
              Schema.Struct<{
                readonly t: Schema.NullOr<Schema.String>
                readonly b: Schema.NullOr<
                  Schema.StructWithRest<
                    Schema.Struct<{
                      readonly c: Schema.String
                      readonly BA: Schema.decodeTo<
                        Schema.Struct<
                          {
                            male: Schema.compose<
                              Schema.Boolean,
                              Schema.Union<
                                readonly [
                                  Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                  Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                                ]
                              >
                            >
                            firstNameIdx: Schema.compose<
                              Schema.compose<Schema.Int, Schema.NumberFromString>,
                              Schema.String
                            >
                            lastNameIdx: Schema.compose<
                              Schema.compose<Schema.Int, Schema.NumberFromString>,
                              Schema.String
                            >
                            bmonth: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                            bday: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                            skinColorIdx: Schema.compose<
                              Schema.compose<Schema.Int, Schema.NumberFromString>,
                              Schema.String
                            >
                            hairColorIdx: Schema.compose<
                              Schema.compose<Schema.Int, Schema.NumberFromString>,
                              Schema.String
                            >
                            shoeColorIdx: Schema.compose<
                              Schema.compose<Schema.Int, Schema.NumberFromString>,
                              Schema.String
                            >
                            pantsColor: Schema.decodeTo<
                              Schema.Struct<{ readonly r: Schema.Int; readonly g: Schema.Int; readonly b: Schema.Int }>,
                              Schema.TemplateLiteralParser<
                                readonly [
                                  Schema.FiniteFromString,
                                  ":",
                                  Schema.FiniteFromString,
                                  ":",
                                  Schema.FiniteFromString
                                ]
                              >,
                              never,
                              never
                            >
                            shirtColor: Schema.decodeTo<
                              Schema.Struct<{ readonly r: Schema.Int; readonly g: Schema.Int; readonly b: Schema.Int }>,
                              Schema.TemplateLiteralParser<
                                readonly [
                                  Schema.FiniteFromString,
                                  ":",
                                  Schema.FiniteFromString,
                                  ":",
                                  Schema.FiniteFromString
                                ]
                              >,
                              never,
                              never
                            >
                            hasGlasses: Schema.compose<
                              Schema.Boolean,
                              Schema.Union<
                                readonly [
                                  Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                  Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                                ]
                              >
                            >
                            glasses: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                            hasTie: Schema.compose<
                              Schema.Boolean,
                              Schema.Union<
                                readonly [
                                  Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                  Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                                ]
                              >
                            >
                            tieColor: Schema.decodeTo<
                              Schema.Struct<{ readonly r: Schema.Int; readonly g: Schema.Int; readonly b: Schema.Int }>,
                              Schema.TemplateLiteralParser<
                                readonly [
                                  Schema.FiniteFromString,
                                  ":",
                                  Schema.FiniteFromString,
                                  ":",
                                  Schema.FiniteFromString
                                ]
                              >,
                              never,
                              never
                            >
                            hasHairAcc: Schema.compose<
                              Schema.Boolean,
                              Schema.Union<
                                readonly [
                                  Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                  Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                                ]
                              >
                            >
                            hairAcc: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                            hasBHat: Schema.compose<
                              Schema.Boolean,
                              Schema.Union<
                                readonly [
                                  Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                  Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                                ]
                              >
                            >
                            hasMhat: Schema.compose<
                              Schema.Boolean,
                              Schema.Union<
                                readonly [
                                  Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                  Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                                ]
                              >
                            >
                            hasFHat: Schema.compose<
                              Schema.Boolean,
                              Schema.Union<
                                readonly [
                                  Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                  Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                                ]
                              >
                            >
                            hat: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                            hatColor: Schema.decodeTo<
                              Schema.Struct<{ readonly r: Schema.Int; readonly g: Schema.Int; readonly b: Schema.Int }>,
                              Schema.TemplateLiteralParser<
                                readonly [
                                  Schema.FiniteFromString,
                                  ":",
                                  Schema.FiniteFromString,
                                  ":",
                                  Schema.FiniteFromString
                                ]
                              >,
                              never,
                              never
                            >
                            hasEarrings: Schema.compose<
                              Schema.Boolean,
                              Schema.Union<
                                readonly [
                                  Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                  Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                                ]
                              >
                            >
                            earringColor: Schema.decodeTo<
                              Schema.Struct<{ readonly r: Schema.Int; readonly g: Schema.Int; readonly b: Schema.Int }>,
                              Schema.TemplateLiteralParser<
                                readonly [
                                  Schema.FiniteFromString,
                                  ":",
                                  Schema.FiniteFromString,
                                  ":",
                                  Schema.FiniteFromString
                                ]
                              >,
                              never,
                              never
                            >
                            hair: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                          } & { readonly $unknown: Schema.$Array<Schema.String> }
                        >,
                        Schema.String,
                        never,
                        never
                      >
                      readonly v: Schema.decodeTo<
                        Schema.BigInt,
                        Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
                        never,
                        never
                      >
                    }>,
                    readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
                  >
                >
                readonly c: Schema.NullOr<
                  Schema.StructWithRest<
                    Schema.Struct<{
                      readonly p: Schema.Int
                      readonly n: Schema.NullOr<Schema.String>
                      readonly i: Schema.Int
                      readonly c: Schema.NullOr<Schema.String>
                      readonly ni: Schema.Int
                      readonly s: Schema.Int
                    }>,
                    readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
                  >
                >
                readonly s: Schema.Int
              }>,
              readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
            >
          }>,
          readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
        >
      >
      readonly Cities: Schema.$Array<
        Schema.StructWithRest<
          Schema.Struct<{
            readonly city_id: Schema.Int
            readonly level: Schema.Int
            readonly flight_out: Schema.decodeTo<
              Schema.BigInt,
              Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
              never,
              never
            >
            readonly pass_out: Schema.decodeTo<
              Schema.BigInt,
              Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
              never,
              never
            >
            readonly cargo_out: Schema.decodeTo<
              Schema.BigInt,
              Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
              never,
              never
            >
            readonly flight_in: Schema.decodeTo<
              Schema.BigInt,
              Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
              never,
              never
            >
            readonly pass_in: Schema.decodeTo<
              Schema.BigInt,
              Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
              never,
              never
            >
            readonly cargo_in: Schema.decodeTo<
              Schema.BigInt,
              Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
              never,
              never
            >
            readonly closure: Schema.Int
            readonly deploy_x: Schema.Int
            readonly deploy_y: Schema.Int
            readonly campaign: Schema.decodeTo<
              Schema.BigInt,
              Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
              never,
              never
            >
            readonly Cargo: Schema.$Array<
              Schema.StructWithRest<
                Schema.Struct<{
                  readonly start_city: Schema.Int
                  readonly end_city: Schema.Int
                  readonly is_vip: Schema.Boolean
                  readonly num_hops: Schema.Int
                  readonly first_board: Schema.decodeTo<
                    Schema.BigInt,
                    Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
                    never,
                    never
                  >
                  readonly details: Schema.StructWithRest<
                    Schema.Struct<{
                      readonly t: Schema.NullOr<Schema.String>
                      readonly b: Schema.NullOr<
                        Schema.StructWithRest<
                          Schema.Struct<{
                            readonly c: Schema.String
                            readonly BA: Schema.decodeTo<
                              Schema.Struct<
                                {
                                  male: Schema.compose<
                                    Schema.Boolean,
                                    Schema.Union<
                                      readonly [
                                        Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                        Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                                      ]
                                    >
                                  >
                                  firstNameIdx: Schema.compose<
                                    Schema.compose<Schema.Int, Schema.NumberFromString>,
                                    Schema.String
                                  >
                                  lastNameIdx: Schema.compose<
                                    Schema.compose<Schema.Int, Schema.NumberFromString>,
                                    Schema.String
                                  >
                                  bmonth: Schema.compose<
                                    Schema.compose<Schema.Int, Schema.NumberFromString>,
                                    Schema.String
                                  >
                                  bday: Schema.compose<
                                    Schema.compose<Schema.Int, Schema.NumberFromString>,
                                    Schema.String
                                  >
                                  skinColorIdx: Schema.compose<
                                    Schema.compose<Schema.Int, Schema.NumberFromString>,
                                    Schema.String
                                  >
                                  hairColorIdx: Schema.compose<
                                    Schema.compose<Schema.Int, Schema.NumberFromString>,
                                    Schema.String
                                  >
                                  shoeColorIdx: Schema.compose<
                                    Schema.compose<Schema.Int, Schema.NumberFromString>,
                                    Schema.String
                                  >
                                  pantsColor: Schema.decodeTo<
                                    Schema.Struct<{
                                      readonly r: Schema.Int
                                      readonly g: Schema.Int
                                      readonly b: Schema.Int
                                    }>,
                                    Schema.TemplateLiteralParser<
                                      readonly [
                                        Schema.FiniteFromString,
                                        ":",
                                        Schema.FiniteFromString,
                                        ":",
                                        Schema.FiniteFromString
                                      ]
                                    >,
                                    never,
                                    never
                                  >
                                  shirtColor: Schema.decodeTo<
                                    Schema.Struct<{
                                      readonly r: Schema.Int
                                      readonly g: Schema.Int
                                      readonly b: Schema.Int
                                    }>,
                                    Schema.TemplateLiteralParser<
                                      readonly [
                                        Schema.FiniteFromString,
                                        ":",
                                        Schema.FiniteFromString,
                                        ":",
                                        Schema.FiniteFromString
                                      ]
                                    >,
                                    never,
                                    never
                                  >
                                  hasGlasses: Schema.compose<
                                    Schema.Boolean,
                                    Schema.Union<
                                      readonly [
                                        Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                        Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                                      ]
                                    >
                                  >
                                  glasses: Schema.compose<
                                    Schema.compose<Schema.Int, Schema.NumberFromString>,
                                    Schema.String
                                  >
                                  hasTie: Schema.compose<
                                    Schema.Boolean,
                                    Schema.Union<
                                      readonly [
                                        Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                        Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                                      ]
                                    >
                                  >
                                  tieColor: Schema.decodeTo<
                                    Schema.Struct<{
                                      readonly r: Schema.Int
                                      readonly g: Schema.Int
                                      readonly b: Schema.Int
                                    }>,
                                    Schema.TemplateLiteralParser<
                                      readonly [
                                        Schema.FiniteFromString,
                                        ":",
                                        Schema.FiniteFromString,
                                        ":",
                                        Schema.FiniteFromString
                                      ]
                                    >,
                                    never,
                                    never
                                  >
                                  hasHairAcc: Schema.compose<
                                    Schema.Boolean,
                                    Schema.Union<
                                      readonly [
                                        Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                        Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                                      ]
                                    >
                                  >
                                  hairAcc: Schema.compose<
                                    Schema.compose<Schema.Int, Schema.NumberFromString>,
                                    Schema.String
                                  >
                                  hasBHat: Schema.compose<
                                    Schema.Boolean,
                                    Schema.Union<
                                      readonly [
                                        Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                        Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                                      ]
                                    >
                                  >
                                  hasMhat: Schema.compose<
                                    Schema.Boolean,
                                    Schema.Union<
                                      readonly [
                                        Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                        Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                                      ]
                                    >
                                  >
                                  hasFHat: Schema.compose<
                                    Schema.Boolean,
                                    Schema.Union<
                                      readonly [
                                        Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                        Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                                      ]
                                    >
                                  >
                                  hat: Schema.compose<
                                    Schema.compose<Schema.Int, Schema.NumberFromString>,
                                    Schema.String
                                  >
                                  hatColor: Schema.decodeTo<
                                    Schema.Struct<{
                                      readonly r: Schema.Int
                                      readonly g: Schema.Int
                                      readonly b: Schema.Int
                                    }>,
                                    Schema.TemplateLiteralParser<
                                      readonly [
                                        Schema.FiniteFromString,
                                        ":",
                                        Schema.FiniteFromString,
                                        ":",
                                        Schema.FiniteFromString
                                      ]
                                    >,
                                    never,
                                    never
                                  >
                                  hasEarrings: Schema.compose<
                                    Schema.Boolean,
                                    Schema.Union<
                                      readonly [
                                        Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                        Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                                      ]
                                    >
                                  >
                                  earringColor: Schema.decodeTo<
                                    Schema.Struct<{
                                      readonly r: Schema.Int
                                      readonly g: Schema.Int
                                      readonly b: Schema.Int
                                    }>,
                                    Schema.TemplateLiteralParser<
                                      readonly [
                                        Schema.FiniteFromString,
                                        ":",
                                        Schema.FiniteFromString,
                                        ":",
                                        Schema.FiniteFromString
                                      ]
                                    >,
                                    never,
                                    never
                                  >
                                  hair: Schema.compose<
                                    Schema.compose<Schema.Int, Schema.NumberFromString>,
                                    Schema.String
                                  >
                                } & { readonly $unknown: Schema.$Array<Schema.String> }
                              >,
                              Schema.String,
                              never,
                              never
                            >
                            readonly v: Schema.decodeTo<
                              Schema.BigInt,
                              Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
                              never,
                              never
                            >
                          }>,
                          readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
                        >
                      >
                      readonly c: Schema.NullOr<
                        Schema.StructWithRest<
                          Schema.Struct<{
                            readonly p: Schema.Int
                            readonly n: Schema.NullOr<Schema.String>
                            readonly i: Schema.Int
                            readonly c: Schema.NullOr<Schema.String>
                            readonly ni: Schema.Int
                            readonly s: Schema.Int
                          }>,
                          readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
                        >
                      >
                      readonly s: Schema.Int
                    }>,
                    readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
                  >
                }>,
                readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
              >
            >
            readonly isClosed: Schema.Boolean
          }>,
          readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
        >
      >
      readonly jobPoolStart: Schema.decodeTo<
        Schema.BigInt,
        Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
        never,
        never
      >
      readonly jobPoolCityIds: Schema.$Array<Schema.Int>
      readonly lfParts: Schema.$Array<
        Schema.StructWithRest<
          Schema.Struct<{ readonly plane_id: Schema.Int; readonly part_type: Schema.Int }>,
          readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
        >
      >
      readonly Parts: Schema.$Array<
        Schema.StructWithRest<
          Schema.Struct<{ readonly plane_id: Schema.Int; readonly part_type: Schema.Int }>,
          readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
        >
      >
      readonly Hangar: Schema.$Array<
        Schema.StructWithRest<
          Schema.Struct<{
            readonly plane_id: Schema.Int
            readonly eUpgrade: Schema.Int
            readonly tUpgrade: Schema.Int
            readonly wUpgrade: Schema.Int
            readonly paint: Schema.decodeTo<
              Schema.Struct<{
                readonly r1: Schema.Int
                readonly g1: Schema.Int
                readonly b1: Schema.Int
                readonly r2: Schema.Int
                readonly g2: Schema.Int
                readonly b2: Schema.Int
                readonly r3: Schema.Int
                readonly g3: Schema.Int
                readonly b3: Schema.Int
              }>,
              Schema.String,
              never,
              never
            >
            readonly skin: Schema.NullOr<Schema.String>
            readonly trips: Schema.decodeTo<
              Schema.BigInt,
              Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
              never,
              never
            >
            readonly distance: Schema.decodeTo<
              Schema.BigInt,
              Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
              never,
              never
            >
            readonly longest_flight: Schema.Int
            readonly most_hops: Schema.Int
            readonly most_profit: Schema.Int
            readonly hotdog: Schema.Int
            readonly Pilot: Schema.StructWithRest<
              Schema.Struct<{
                readonly c: Schema.String
                readonly BA: Schema.decodeTo<
                  Schema.Struct<
                    {
                      male: Schema.compose<
                        Schema.Boolean,
                        Schema.Union<
                          readonly [
                            Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                            Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                          ]
                        >
                      >
                      firstNameIdx: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                      lastNameIdx: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                      bmonth: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                      bday: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                      skinColorIdx: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                      hairColorIdx: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                      shoeColorIdx: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                      pantsColor: Schema.decodeTo<
                        Schema.Struct<{ readonly r: Schema.Int; readonly g: Schema.Int; readonly b: Schema.Int }>,
                        Schema.TemplateLiteralParser<
                          readonly [Schema.FiniteFromString, ":", Schema.FiniteFromString, ":", Schema.FiniteFromString]
                        >,
                        never,
                        never
                      >
                      shirtColor: Schema.decodeTo<
                        Schema.Struct<{ readonly r: Schema.Int; readonly g: Schema.Int; readonly b: Schema.Int }>,
                        Schema.TemplateLiteralParser<
                          readonly [Schema.FiniteFromString, ":", Schema.FiniteFromString, ":", Schema.FiniteFromString]
                        >,
                        never,
                        never
                      >
                      hasGlasses: Schema.compose<
                        Schema.Boolean,
                        Schema.Union<
                          readonly [
                            Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                            Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                          ]
                        >
                      >
                      glasses: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                      hasTie: Schema.compose<
                        Schema.Boolean,
                        Schema.Union<
                          readonly [
                            Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                            Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                          ]
                        >
                      >
                      tieColor: Schema.decodeTo<
                        Schema.Struct<{ readonly r: Schema.Int; readonly g: Schema.Int; readonly b: Schema.Int }>,
                        Schema.TemplateLiteralParser<
                          readonly [Schema.FiniteFromString, ":", Schema.FiniteFromString, ":", Schema.FiniteFromString]
                        >,
                        never,
                        never
                      >
                      hasHairAcc: Schema.compose<
                        Schema.Boolean,
                        Schema.Union<
                          readonly [
                            Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                            Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                          ]
                        >
                      >
                      hairAcc: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                      hasBHat: Schema.compose<
                        Schema.Boolean,
                        Schema.Union<
                          readonly [
                            Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                            Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                          ]
                        >
                      >
                      hasMhat: Schema.compose<
                        Schema.Boolean,
                        Schema.Union<
                          readonly [
                            Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                            Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                          ]
                        >
                      >
                      hasFHat: Schema.compose<
                        Schema.Boolean,
                        Schema.Union<
                          readonly [
                            Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                            Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                          ]
                        >
                      >
                      hat: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                      hatColor: Schema.decodeTo<
                        Schema.Struct<{ readonly r: Schema.Int; readonly g: Schema.Int; readonly b: Schema.Int }>,
                        Schema.TemplateLiteralParser<
                          readonly [Schema.FiniteFromString, ":", Schema.FiniteFromString, ":", Schema.FiniteFromString]
                        >,
                        never,
                        never
                      >
                      hasEarrings: Schema.compose<
                        Schema.Boolean,
                        Schema.Union<
                          readonly [
                            Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                            Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                          ]
                        >
                      >
                      earringColor: Schema.decodeTo<
                        Schema.Struct<{ readonly r: Schema.Int; readonly g: Schema.Int; readonly b: Schema.Int }>,
                        Schema.TemplateLiteralParser<
                          readonly [Schema.FiniteFromString, ":", Schema.FiniteFromString, ":", Schema.FiniteFromString]
                        >,
                        never,
                        never
                      >
                      hair: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                    } & { readonly $unknown: Schema.$Array<Schema.String> }
                  >,
                  Schema.String,
                  never,
                  never
                >
                readonly v: Schema.decodeTo<
                  Schema.BigInt,
                  Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
                  never,
                  never
                >
              }>,
              readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
            >
            readonly costumes: Schema.$Array<Schema.String>
            readonly name: Schema.String
            readonly total_flight_time: Schema.decodeTo<
              Schema.BigInt,
              Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
              never,
              never
            >
            readonly total_revenue: Schema.decodeTo<
              Schema.BigInt,
              Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
              never,
              never
            >
            readonly total_profit: Schema.decodeTo<
              Schema.BigInt,
              Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
              never,
              never
            >
            readonly Cargo: Schema.$Array<
              Schema.StructWithRest<
                Schema.Struct<{
                  readonly start_city: Schema.Int
                  readonly end_city: Schema.Int
                  readonly is_vip: Schema.Boolean
                  readonly num_hops: Schema.Int
                  readonly first_board: Schema.decodeTo<
                    Schema.BigInt,
                    Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
                    never,
                    never
                  >
                  readonly details: Schema.StructWithRest<
                    Schema.Struct<{
                      readonly t: Schema.NullOr<Schema.String>
                      readonly b: Schema.NullOr<
                        Schema.StructWithRest<
                          Schema.Struct<{
                            readonly c: Schema.String
                            readonly BA: Schema.decodeTo<
                              Schema.Struct<
                                {
                                  male: Schema.compose<
                                    Schema.Boolean,
                                    Schema.Union<
                                      readonly [
                                        Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                        Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                                      ]
                                    >
                                  >
                                  firstNameIdx: Schema.compose<
                                    Schema.compose<Schema.Int, Schema.NumberFromString>,
                                    Schema.String
                                  >
                                  lastNameIdx: Schema.compose<
                                    Schema.compose<Schema.Int, Schema.NumberFromString>,
                                    Schema.String
                                  >
                                  bmonth: Schema.compose<
                                    Schema.compose<Schema.Int, Schema.NumberFromString>,
                                    Schema.String
                                  >
                                  bday: Schema.compose<
                                    Schema.compose<Schema.Int, Schema.NumberFromString>,
                                    Schema.String
                                  >
                                  skinColorIdx: Schema.compose<
                                    Schema.compose<Schema.Int, Schema.NumberFromString>,
                                    Schema.String
                                  >
                                  hairColorIdx: Schema.compose<
                                    Schema.compose<Schema.Int, Schema.NumberFromString>,
                                    Schema.String
                                  >
                                  shoeColorIdx: Schema.compose<
                                    Schema.compose<Schema.Int, Schema.NumberFromString>,
                                    Schema.String
                                  >
                                  pantsColor: Schema.decodeTo<
                                    Schema.Struct<{
                                      readonly r: Schema.Int
                                      readonly g: Schema.Int
                                      readonly b: Schema.Int
                                    }>,
                                    Schema.TemplateLiteralParser<
                                      readonly [
                                        Schema.FiniteFromString,
                                        ":",
                                        Schema.FiniteFromString,
                                        ":",
                                        Schema.FiniteFromString
                                      ]
                                    >,
                                    never,
                                    never
                                  >
                                  shirtColor: Schema.decodeTo<
                                    Schema.Struct<{
                                      readonly r: Schema.Int
                                      readonly g: Schema.Int
                                      readonly b: Schema.Int
                                    }>,
                                    Schema.TemplateLiteralParser<
                                      readonly [
                                        Schema.FiniteFromString,
                                        ":",
                                        Schema.FiniteFromString,
                                        ":",
                                        Schema.FiniteFromString
                                      ]
                                    >,
                                    never,
                                    never
                                  >
                                  hasGlasses: Schema.compose<
                                    Schema.Boolean,
                                    Schema.Union<
                                      readonly [
                                        Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                        Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                                      ]
                                    >
                                  >
                                  glasses: Schema.compose<
                                    Schema.compose<Schema.Int, Schema.NumberFromString>,
                                    Schema.String
                                  >
                                  hasTie: Schema.compose<
                                    Schema.Boolean,
                                    Schema.Union<
                                      readonly [
                                        Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                        Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                                      ]
                                    >
                                  >
                                  tieColor: Schema.decodeTo<
                                    Schema.Struct<{
                                      readonly r: Schema.Int
                                      readonly g: Schema.Int
                                      readonly b: Schema.Int
                                    }>,
                                    Schema.TemplateLiteralParser<
                                      readonly [
                                        Schema.FiniteFromString,
                                        ":",
                                        Schema.FiniteFromString,
                                        ":",
                                        Schema.FiniteFromString
                                      ]
                                    >,
                                    never,
                                    never
                                  >
                                  hasHairAcc: Schema.compose<
                                    Schema.Boolean,
                                    Schema.Union<
                                      readonly [
                                        Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                        Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                                      ]
                                    >
                                  >
                                  hairAcc: Schema.compose<
                                    Schema.compose<Schema.Int, Schema.NumberFromString>,
                                    Schema.String
                                  >
                                  hasBHat: Schema.compose<
                                    Schema.Boolean,
                                    Schema.Union<
                                      readonly [
                                        Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                        Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                                      ]
                                    >
                                  >
                                  hasMhat: Schema.compose<
                                    Schema.Boolean,
                                    Schema.Union<
                                      readonly [
                                        Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                        Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                                      ]
                                    >
                                  >
                                  hasFHat: Schema.compose<
                                    Schema.Boolean,
                                    Schema.Union<
                                      readonly [
                                        Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                        Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                                      ]
                                    >
                                  >
                                  hat: Schema.compose<
                                    Schema.compose<Schema.Int, Schema.NumberFromString>,
                                    Schema.String
                                  >
                                  hatColor: Schema.decodeTo<
                                    Schema.Struct<{
                                      readonly r: Schema.Int
                                      readonly g: Schema.Int
                                      readonly b: Schema.Int
                                    }>,
                                    Schema.TemplateLiteralParser<
                                      readonly [
                                        Schema.FiniteFromString,
                                        ":",
                                        Schema.FiniteFromString,
                                        ":",
                                        Schema.FiniteFromString
                                      ]
                                    >,
                                    never,
                                    never
                                  >
                                  hasEarrings: Schema.compose<
                                    Schema.Boolean,
                                    Schema.Union<
                                      readonly [
                                        Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                        Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                                      ]
                                    >
                                  >
                                  earringColor: Schema.decodeTo<
                                    Schema.Struct<{
                                      readonly r: Schema.Int
                                      readonly g: Schema.Int
                                      readonly b: Schema.Int
                                    }>,
                                    Schema.TemplateLiteralParser<
                                      readonly [
                                        Schema.FiniteFromString,
                                        ":",
                                        Schema.FiniteFromString,
                                        ":",
                                        Schema.FiniteFromString
                                      ]
                                    >,
                                    never,
                                    never
                                  >
                                  hair: Schema.compose<
                                    Schema.compose<Schema.Int, Schema.NumberFromString>,
                                    Schema.String
                                  >
                                } & { readonly $unknown: Schema.$Array<Schema.String> }
                              >,
                              Schema.String,
                              never,
                              never
                            >
                            readonly v: Schema.decodeTo<
                              Schema.BigInt,
                              Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
                              never,
                              never
                            >
                          }>,
                          readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
                        >
                      >
                      readonly c: Schema.NullOr<
                        Schema.StructWithRest<
                          Schema.Struct<{
                            readonly p: Schema.Int
                            readonly n: Schema.NullOr<Schema.String>
                            readonly i: Schema.Int
                            readonly c: Schema.NullOr<Schema.String>
                            readonly ni: Schema.Int
                            readonly s: Schema.Int
                          }>,
                          readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
                        >
                      >
                      readonly s: Schema.Int
                    }>,
                    readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
                  >
                }>,
                readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
              >
            >
            readonly Trip: Schema.StructWithRest<
              Schema.Struct<{
                readonly evaluated: Schema.Boolean
                readonly is_complete: Schema.Boolean
                readonly offload_complete: Schema.Boolean
                readonly start_time: Schema.decodeTo<
                  Schema.BigInt,
                  Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
                  never,
                  never
                >
                readonly Legs: Schema.$Array<
                  Schema.StructWithRest<
                    Schema.Struct<{
                      readonly is_complete: Schema.Boolean
                      readonly offload_complete: Schema.Boolean
                      readonly start_city: Schema.Int
                      readonly end_city: Schema.Int
                      readonly distance: Schema.decodeTo<
                        Schema.Finite,
                        Schema.Union<readonly [Schema.instanceOf<JsonDouble, unknown>, Schema.Finite]>,
                        never,
                        never
                      >
                      readonly speed_bonus: Schema.decodeTo<
                        Schema.Finite,
                        Schema.Union<readonly [Schema.instanceOf<JsonDouble, unknown>, Schema.Finite]>,
                        never,
                        never
                      >
                    }>,
                    readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
                  >
                >
                readonly arrivedLegsCount: Schema.Int
              }>,
              readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
            >
            readonly l: Schema.Boolean
          }>,
          readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
        >
      >
      readonly Planes: Schema.$Array<
        Schema.StructWithRest<
          Schema.Struct<{
            readonly plane_id: Schema.Int
            readonly eUpgrade: Schema.Int
            readonly tUpgrade: Schema.Int
            readonly wUpgrade: Schema.Int
            readonly paint: Schema.decodeTo<
              Schema.Struct<{
                readonly r1: Schema.Int
                readonly g1: Schema.Int
                readonly b1: Schema.Int
                readonly r2: Schema.Int
                readonly g2: Schema.Int
                readonly b2: Schema.Int
                readonly r3: Schema.Int
                readonly g3: Schema.Int
                readonly b3: Schema.Int
              }>,
              Schema.String,
              never,
              never
            >
            readonly skin: Schema.NullOr<Schema.String>
            readonly trips: Schema.decodeTo<
              Schema.BigInt,
              Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
              never,
              never
            >
            readonly distance: Schema.decodeTo<
              Schema.BigInt,
              Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
              never,
              never
            >
            readonly longest_flight: Schema.Int
            readonly most_hops: Schema.Int
            readonly most_profit: Schema.Int
            readonly hotdog: Schema.Int
            readonly Pilot: Schema.StructWithRest<
              Schema.Struct<{
                readonly c: Schema.String
                readonly BA: Schema.decodeTo<
                  Schema.Struct<
                    {
                      male: Schema.compose<
                        Schema.Boolean,
                        Schema.Union<
                          readonly [
                            Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                            Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                          ]
                        >
                      >
                      firstNameIdx: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                      lastNameIdx: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                      bmonth: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                      bday: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                      skinColorIdx: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                      hairColorIdx: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                      shoeColorIdx: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                      pantsColor: Schema.decodeTo<
                        Schema.Struct<{ readonly r: Schema.Int; readonly g: Schema.Int; readonly b: Schema.Int }>,
                        Schema.TemplateLiteralParser<
                          readonly [Schema.FiniteFromString, ":", Schema.FiniteFromString, ":", Schema.FiniteFromString]
                        >,
                        never,
                        never
                      >
                      shirtColor: Schema.decodeTo<
                        Schema.Struct<{ readonly r: Schema.Int; readonly g: Schema.Int; readonly b: Schema.Int }>,
                        Schema.TemplateLiteralParser<
                          readonly [Schema.FiniteFromString, ":", Schema.FiniteFromString, ":", Schema.FiniteFromString]
                        >,
                        never,
                        never
                      >
                      hasGlasses: Schema.compose<
                        Schema.Boolean,
                        Schema.Union<
                          readonly [
                            Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                            Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                          ]
                        >
                      >
                      glasses: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                      hasTie: Schema.compose<
                        Schema.Boolean,
                        Schema.Union<
                          readonly [
                            Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                            Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                          ]
                        >
                      >
                      tieColor: Schema.decodeTo<
                        Schema.Struct<{ readonly r: Schema.Int; readonly g: Schema.Int; readonly b: Schema.Int }>,
                        Schema.TemplateLiteralParser<
                          readonly [Schema.FiniteFromString, ":", Schema.FiniteFromString, ":", Schema.FiniteFromString]
                        >,
                        never,
                        never
                      >
                      hasHairAcc: Schema.compose<
                        Schema.Boolean,
                        Schema.Union<
                          readonly [
                            Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                            Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                          ]
                        >
                      >
                      hairAcc: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                      hasBHat: Schema.compose<
                        Schema.Boolean,
                        Schema.Union<
                          readonly [
                            Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                            Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                          ]
                        >
                      >
                      hasMhat: Schema.compose<
                        Schema.Boolean,
                        Schema.Union<
                          readonly [
                            Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                            Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                          ]
                        >
                      >
                      hasFHat: Schema.compose<
                        Schema.Boolean,
                        Schema.Union<
                          readonly [
                            Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                            Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                          ]
                        >
                      >
                      hat: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                      hatColor: Schema.decodeTo<
                        Schema.Struct<{ readonly r: Schema.Int; readonly g: Schema.Int; readonly b: Schema.Int }>,
                        Schema.TemplateLiteralParser<
                          readonly [Schema.FiniteFromString, ":", Schema.FiniteFromString, ":", Schema.FiniteFromString]
                        >,
                        never,
                        never
                      >
                      hasEarrings: Schema.compose<
                        Schema.Boolean,
                        Schema.Union<
                          readonly [
                            Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                            Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                          ]
                        >
                      >
                      earringColor: Schema.decodeTo<
                        Schema.Struct<{ readonly r: Schema.Int; readonly g: Schema.Int; readonly b: Schema.Int }>,
                        Schema.TemplateLiteralParser<
                          readonly [Schema.FiniteFromString, ":", Schema.FiniteFromString, ":", Schema.FiniteFromString]
                        >,
                        never,
                        never
                      >
                      hair: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                    } & { readonly $unknown: Schema.$Array<Schema.String> }
                  >,
                  Schema.String,
                  never,
                  never
                >
                readonly v: Schema.decodeTo<
                  Schema.BigInt,
                  Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
                  never,
                  never
                >
              }>,
              readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
            >
            readonly costumes: Schema.$Array<Schema.String>
            readonly name: Schema.String
            readonly total_flight_time: Schema.decodeTo<
              Schema.BigInt,
              Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
              never,
              never
            >
            readonly total_revenue: Schema.decodeTo<
              Schema.BigInt,
              Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
              never,
              never
            >
            readonly total_profit: Schema.decodeTo<
              Schema.BigInt,
              Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
              never,
              never
            >
            readonly Cargo: Schema.$Array<
              Schema.StructWithRest<
                Schema.Struct<{
                  readonly start_city: Schema.Int
                  readonly end_city: Schema.Int
                  readonly is_vip: Schema.Boolean
                  readonly num_hops: Schema.Int
                  readonly first_board: Schema.decodeTo<
                    Schema.BigInt,
                    Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
                    never,
                    never
                  >
                  readonly details: Schema.StructWithRest<
                    Schema.Struct<{
                      readonly t: Schema.NullOr<Schema.String>
                      readonly b: Schema.NullOr<
                        Schema.StructWithRest<
                          Schema.Struct<{
                            readonly c: Schema.String
                            readonly BA: Schema.decodeTo<
                              Schema.Struct<
                                {
                                  male: Schema.compose<
                                    Schema.Boolean,
                                    Schema.Union<
                                      readonly [
                                        Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                        Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                                      ]
                                    >
                                  >
                                  firstNameIdx: Schema.compose<
                                    Schema.compose<Schema.Int, Schema.NumberFromString>,
                                    Schema.String
                                  >
                                  lastNameIdx: Schema.compose<
                                    Schema.compose<Schema.Int, Schema.NumberFromString>,
                                    Schema.String
                                  >
                                  bmonth: Schema.compose<
                                    Schema.compose<Schema.Int, Schema.NumberFromString>,
                                    Schema.String
                                  >
                                  bday: Schema.compose<
                                    Schema.compose<Schema.Int, Schema.NumberFromString>,
                                    Schema.String
                                  >
                                  skinColorIdx: Schema.compose<
                                    Schema.compose<Schema.Int, Schema.NumberFromString>,
                                    Schema.String
                                  >
                                  hairColorIdx: Schema.compose<
                                    Schema.compose<Schema.Int, Schema.NumberFromString>,
                                    Schema.String
                                  >
                                  shoeColorIdx: Schema.compose<
                                    Schema.compose<Schema.Int, Schema.NumberFromString>,
                                    Schema.String
                                  >
                                  pantsColor: Schema.decodeTo<
                                    Schema.Struct<{
                                      readonly r: Schema.Int
                                      readonly g: Schema.Int
                                      readonly b: Schema.Int
                                    }>,
                                    Schema.TemplateLiteralParser<
                                      readonly [
                                        Schema.FiniteFromString,
                                        ":",
                                        Schema.FiniteFromString,
                                        ":",
                                        Schema.FiniteFromString
                                      ]
                                    >,
                                    never,
                                    never
                                  >
                                  shirtColor: Schema.decodeTo<
                                    Schema.Struct<{
                                      readonly r: Schema.Int
                                      readonly g: Schema.Int
                                      readonly b: Schema.Int
                                    }>,
                                    Schema.TemplateLiteralParser<
                                      readonly [
                                        Schema.FiniteFromString,
                                        ":",
                                        Schema.FiniteFromString,
                                        ":",
                                        Schema.FiniteFromString
                                      ]
                                    >,
                                    never,
                                    never
                                  >
                                  hasGlasses: Schema.compose<
                                    Schema.Boolean,
                                    Schema.Union<
                                      readonly [
                                        Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                        Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                                      ]
                                    >
                                  >
                                  glasses: Schema.compose<
                                    Schema.compose<Schema.Int, Schema.NumberFromString>,
                                    Schema.String
                                  >
                                  hasTie: Schema.compose<
                                    Schema.Boolean,
                                    Schema.Union<
                                      readonly [
                                        Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                        Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                                      ]
                                    >
                                  >
                                  tieColor: Schema.decodeTo<
                                    Schema.Struct<{
                                      readonly r: Schema.Int
                                      readonly g: Schema.Int
                                      readonly b: Schema.Int
                                    }>,
                                    Schema.TemplateLiteralParser<
                                      readonly [
                                        Schema.FiniteFromString,
                                        ":",
                                        Schema.FiniteFromString,
                                        ":",
                                        Schema.FiniteFromString
                                      ]
                                    >,
                                    never,
                                    never
                                  >
                                  hasHairAcc: Schema.compose<
                                    Schema.Boolean,
                                    Schema.Union<
                                      readonly [
                                        Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                        Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                                      ]
                                    >
                                  >
                                  hairAcc: Schema.compose<
                                    Schema.compose<Schema.Int, Schema.NumberFromString>,
                                    Schema.String
                                  >
                                  hasBHat: Schema.compose<
                                    Schema.Boolean,
                                    Schema.Union<
                                      readonly [
                                        Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                        Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                                      ]
                                    >
                                  >
                                  hasMhat: Schema.compose<
                                    Schema.Boolean,
                                    Schema.Union<
                                      readonly [
                                        Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                        Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                                      ]
                                    >
                                  >
                                  hasFHat: Schema.compose<
                                    Schema.Boolean,
                                    Schema.Union<
                                      readonly [
                                        Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                        Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                                      ]
                                    >
                                  >
                                  hat: Schema.compose<
                                    Schema.compose<Schema.Int, Schema.NumberFromString>,
                                    Schema.String
                                  >
                                  hatColor: Schema.decodeTo<
                                    Schema.Struct<{
                                      readonly r: Schema.Int
                                      readonly g: Schema.Int
                                      readonly b: Schema.Int
                                    }>,
                                    Schema.TemplateLiteralParser<
                                      readonly [
                                        Schema.FiniteFromString,
                                        ":",
                                        Schema.FiniteFromString,
                                        ":",
                                        Schema.FiniteFromString
                                      ]
                                    >,
                                    never,
                                    never
                                  >
                                  hasEarrings: Schema.compose<
                                    Schema.Boolean,
                                    Schema.Union<
                                      readonly [
                                        Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                        Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                                      ]
                                    >
                                  >
                                  earringColor: Schema.decodeTo<
                                    Schema.Struct<{
                                      readonly r: Schema.Int
                                      readonly g: Schema.Int
                                      readonly b: Schema.Int
                                    }>,
                                    Schema.TemplateLiteralParser<
                                      readonly [
                                        Schema.FiniteFromString,
                                        ":",
                                        Schema.FiniteFromString,
                                        ":",
                                        Schema.FiniteFromString
                                      ]
                                    >,
                                    never,
                                    never
                                  >
                                  hair: Schema.compose<
                                    Schema.compose<Schema.Int, Schema.NumberFromString>,
                                    Schema.String
                                  >
                                } & { readonly $unknown: Schema.$Array<Schema.String> }
                              >,
                              Schema.String,
                              never,
                              never
                            >
                            readonly v: Schema.decodeTo<
                              Schema.BigInt,
                              Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
                              never,
                              never
                            >
                          }>,
                          readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
                        >
                      >
                      readonly c: Schema.NullOr<
                        Schema.StructWithRest<
                          Schema.Struct<{
                            readonly p: Schema.Int
                            readonly n: Schema.NullOr<Schema.String>
                            readonly i: Schema.Int
                            readonly c: Schema.NullOr<Schema.String>
                            readonly ni: Schema.Int
                            readonly s: Schema.Int
                          }>,
                          readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
                        >
                      >
                      readonly s: Schema.Int
                    }>,
                    readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
                  >
                }>,
                readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
              >
            >
            readonly Trip: Schema.StructWithRest<
              Schema.Struct<{
                readonly evaluated: Schema.Boolean
                readonly is_complete: Schema.Boolean
                readonly offload_complete: Schema.Boolean
                readonly start_time: Schema.decodeTo<
                  Schema.BigInt,
                  Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
                  never,
                  never
                >
                readonly Legs: Schema.$Array<
                  Schema.StructWithRest<
                    Schema.Struct<{
                      readonly is_complete: Schema.Boolean
                      readonly offload_complete: Schema.Boolean
                      readonly start_city: Schema.Int
                      readonly end_city: Schema.Int
                      readonly distance: Schema.decodeTo<
                        Schema.Finite,
                        Schema.Union<readonly [Schema.instanceOf<JsonDouble, unknown>, Schema.Finite]>,
                        never,
                        never
                      >
                      readonly speed_bonus: Schema.decodeTo<
                        Schema.Finite,
                        Schema.Union<readonly [Schema.instanceOf<JsonDouble, unknown>, Schema.Finite]>,
                        never,
                        never
                      >
                    }>,
                    readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
                  >
                >
                readonly arrivedLegsCount: Schema.Int
              }>,
              readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
            >
            readonly l: Schema.Boolean
          }>,
          readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
        >
      >
      readonly f: Schema.$Array<
        Schema.StructWithRest<
          Schema.Struct<{
            readonly name: Schema.NullOr<Schema.String>
            readonly player_id: Schema.String
            readonly gc: Schema.NullOr<Schema.String>
          }>,
          readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
        >
      >
      readonly ShopLog: Schema.$Array<
        Schema.StructWithRest<
          Schema.Struct<{
            readonly ts: Schema.decodeTo<
              Schema.BigInt,
              Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
              never,
              never
            >
            readonly seed: Schema.Int
          }>,
          readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
        >
      >
      readonly refresh: Schema.$Record<Schema.String, Schema.$Record<Schema.String, Schema.Int>>
      readonly dailyStats: Schema.$Record<
        Schema.String,
        Schema.$Record<
          Schema.String,
          Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
        >
      >
      readonly eventCounts: Schema.$Record<Schema.String, Schema.Int>
      readonly globalStats: Schema.$Record<
        Schema.String,
        Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
      >
      readonly speedUpFlightAdWatched: Schema.$Array<Schema.String>
      readonly cityJobsAdWatched: Schema.$Record<Schema.String, Schema.$Array<Schema.String>>
      readonly cPC: Schema.Int
      readonly cPRI: Schema.Int
      readonly nFBT: Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
      readonly nPCT: Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
      readonly g: Schema.NullOr<
        Schema.StructWithRest<
          Schema.Struct<{
            readonly b: Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
            readonly u: Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
            readonly j: Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
            readonly c: Schema.Int
            readonly r1: Schema.Boolean
            readonly r2: Schema.Boolean
            readonly r3: Schema.Boolean
            readonly r4: Schema.Boolean
            readonly r5: Schema.Boolean
            readonly r: Schema.$Array<
              Schema.Union<
                readonly [
                  Schema.Struct<{ readonly Key: Schema.Literal<0>; readonly Value: Schema.Int }>,
                  Schema.Struct<{ readonly Key: Schema.Literal<1>; readonly Value: Schema.Int }>,
                  Schema.Struct<{
                    readonly Key: Schema.Literal<2>
                    readonly Value: Schema.StructWithRest<
                      Schema.Struct<{ readonly plane_id: Schema.Int; readonly part_type: Schema.Int }>,
                      readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
                    >
                  }>,
                  Schema.Struct<{ readonly Key: Schema.Literal<3>; readonly Value: Schema.String }>
                ]
              >
            >
          }>,
          readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
        >
      >
      readonly pg: Schema.NullOr<
        Schema.StructWithRest<
          Schema.Struct<{
            readonly b: Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
            readonly u: Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
            readonly j: Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
            readonly c: Schema.Int
            readonly r1: Schema.Boolean
            readonly r2: Schema.Boolean
            readonly r3: Schema.Boolean
            readonly r4: Schema.Boolean
            readonly r5: Schema.Boolean
            readonly r: Schema.$Array<
              Schema.Union<
                readonly [
                  Schema.Struct<{ readonly Key: Schema.Literal<0>; readonly Value: Schema.Int }>,
                  Schema.Struct<{ readonly Key: Schema.Literal<1>; readonly Value: Schema.Int }>,
                  Schema.Struct<{
                    readonly Key: Schema.Literal<2>
                    readonly Value: Schema.StructWithRest<
                      Schema.Struct<{ readonly plane_id: Schema.Int; readonly part_type: Schema.Int }>,
                      readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
                    >
                  }>,
                  Schema.Struct<{ readonly Key: Schema.Literal<3>; readonly Value: Schema.String }>
                ]
              >
            >
          }>,
          readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
        >
      >
      readonly carrierPorts: Schema.$Record<
        Schema.String,
        Schema.$Record<
          Schema.String,
          Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
        >
      >
      readonly skins: Schema.$Array<Schema.String>
      readonly skinPass: Schema.Boolean
      readonly adSkips: Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
      readonly nMST: Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
      readonly mJL: Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
      readonly bldHQ: Schema.Int
      readonly bldPRem: Schema.Int
      readonly bldCRem: Schema.Int
    }>,
    readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
  >,
  Schema.String,
  never,
  never
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/pocket-planes-sdk/src/Save.ts#L1012)

Since v1.0.0

## SaveDataFromBytes

The save as the sync server holds it: the bytes of the base64 `data` that
`/sync/pull/` and `/friend/pull_game/` return (what `sync_pullSave` gives),
which are the zlib-compressed UTF-8 save string. It decompresses with the
platform's `DecompressionStream`, so it only decodes and encodes with the
Effect or Promise APIs, not the sync ones. Compressing again need not give
the same bytes as the game's zlib, only bytes the game reads.

**Signature**

```ts
declare const SaveDataFromBytes: Schema.decodeTo<
  Schema.decodeTo<
    Schema.StructWithRest<
      Schema.Struct<{
        readonly c: Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
        readonly b: Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
        readonly wheelTickets: Schema.StructWithRest<
          Schema.Struct<{
            readonly amount: Schema.decodeTo<
              Schema.BigInt,
              Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
              never,
              never
            >
            readonly type: Schema.Int
          }>,
          readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
        >
        readonly firstLoad: Schema.Boolean
        readonly hasCrew: Schema.Boolean
        readonly playerR: Schema.Boolean
        readonly vi: Schema.Boolean
        readonly vipPlaneOwned: Schema.Boolean
        readonly coinsCollectedFree: Schema.decodeTo<
          Schema.BigInt,
          Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
          never,
          never
        >
        readonly buxCollectedFree: Schema.decodeTo<
          Schema.BigInt,
          Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
          never,
          never
        >
        readonly bbBadge: Schema.Int
        readonly eventCount: Schema.Int
        readonly globalEvent: Schema.Int
        readonly homeCity: Schema.Int
        readonly lastPlane: Schema.Int
        readonly level: Schema.Int
        readonly lfb: Schema.Int
        readonly resetCount: Schema.Int
        readonly slots: Schema.Int
        readonly mapX: Schema.decodeTo<
          Schema.Finite,
          Schema.Union<readonly [Schema.instanceOf<JsonDouble, unknown>, Schema.Finite]>,
          never,
          never
        >
        readonly mapY: Schema.decodeTo<
          Schema.Finite,
          Schema.Union<readonly [Schema.instanceOf<JsonDouble, unknown>, Schema.Finite]>,
          never,
          never
        >
        readonly mapZ: Schema.decodeTo<
          Schema.Finite,
          Schema.Union<readonly [Schema.instanceOf<JsonDouble, unknown>, Schema.Finite]>,
          never,
          never
        >
        readonly mmapZ: Schema.decodeTo<
          Schema.Finite,
          Schema.Union<readonly [Schema.instanceOf<JsonDouble, unknown>, Schema.Finite]>,
          never,
          never
        >
        readonly planeListY: Schema.decodeTo<
          Schema.Finite,
          Schema.Union<readonly [Schema.instanceOf<JsonDouble, unknown>, Schema.Finite]>,
          never,
          never
        >
        readonly mapPlanesHidden: Schema.NullOr<Schema.Boolean>
        readonly lastPlaneCount: Schema.decodeTo<
          Schema.BigInt,
          Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
          never,
          never
        >
        readonly timeInGame: Schema.decodeTo<
          Schema.BigInt,
          Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
          never,
          never
        >
        readonly tp: Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
        readonly xp: Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
        readonly achieve: Schema.NullOr<Schema.String>
        readonly airlineName: Schema.NullOr<Schema.String>
        readonly bbEntries: Schema.NullOr<Schema.String>
        readonly landingAlerts: Schema.NullOr<Schema.String>
        readonly playerE: Schema.NullOr<Schema.brand<Schema.RedactedFromValue<Schema.String>, "PlayerEmail">>
        readonly playerI: Schema.NullOr<Schema.brand<Schema.String, "PlayerId">>
        readonly playerS: Schema.NullOr<Schema.brand<Schema.RedactedFromValue<Schema.String>, "PlayerAuthKey">>
        readonly shownTips: Schema.NullOr<Schema.String>
        readonly sounds: Schema.NullOr<Schema.String>
        readonly v: Schema.String
        readonly events: Schema.NullOr<Schema.String>
        readonly cityUnlock: Schema.$Array<Schema.Int>
        readonly localEvents: Schema.$Array<Schema.Int>
        readonly bb: Schema.$Array<
          Schema.StructWithRest<
            Schema.Struct<{
              readonly i: Schema.Int
              readonly l: Schema.Int
              readonly d: Schema.decodeTo<
                Schema.BigInt,
                Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
                never,
                never
              >
              readonly m: Schema.NullOr<Schema.String>
              readonly b: Schema.NullOr<
                Schema.StructWithRest<
                  Schema.Struct<{
                    readonly c: Schema.String
                    readonly BA: Schema.decodeTo<
                      Schema.Struct<
                        {
                          male: Schema.compose<
                            Schema.Boolean,
                            Schema.Union<
                              readonly [
                                Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                              ]
                            >
                          >
                          firstNameIdx: Schema.compose<
                            Schema.compose<Schema.Int, Schema.NumberFromString>,
                            Schema.String
                          >
                          lastNameIdx: Schema.compose<
                            Schema.compose<Schema.Int, Schema.NumberFromString>,
                            Schema.String
                          >
                          bmonth: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                          bday: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                          skinColorIdx: Schema.compose<
                            Schema.compose<Schema.Int, Schema.NumberFromString>,
                            Schema.String
                          >
                          hairColorIdx: Schema.compose<
                            Schema.compose<Schema.Int, Schema.NumberFromString>,
                            Schema.String
                          >
                          shoeColorIdx: Schema.compose<
                            Schema.compose<Schema.Int, Schema.NumberFromString>,
                            Schema.String
                          >
                          pantsColor: Schema.decodeTo<
                            Schema.Struct<{ readonly r: Schema.Int; readonly g: Schema.Int; readonly b: Schema.Int }>,
                            Schema.TemplateLiteralParser<
                              readonly [
                                Schema.FiniteFromString,
                                ":",
                                Schema.FiniteFromString,
                                ":",
                                Schema.FiniteFromString
                              ]
                            >,
                            never,
                            never
                          >
                          shirtColor: Schema.decodeTo<
                            Schema.Struct<{ readonly r: Schema.Int; readonly g: Schema.Int; readonly b: Schema.Int }>,
                            Schema.TemplateLiteralParser<
                              readonly [
                                Schema.FiniteFromString,
                                ":",
                                Schema.FiniteFromString,
                                ":",
                                Schema.FiniteFromString
                              ]
                            >,
                            never,
                            never
                          >
                          hasGlasses: Schema.compose<
                            Schema.Boolean,
                            Schema.Union<
                              readonly [
                                Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                              ]
                            >
                          >
                          glasses: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                          hasTie: Schema.compose<
                            Schema.Boolean,
                            Schema.Union<
                              readonly [
                                Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                              ]
                            >
                          >
                          tieColor: Schema.decodeTo<
                            Schema.Struct<{ readonly r: Schema.Int; readonly g: Schema.Int; readonly b: Schema.Int }>,
                            Schema.TemplateLiteralParser<
                              readonly [
                                Schema.FiniteFromString,
                                ":",
                                Schema.FiniteFromString,
                                ":",
                                Schema.FiniteFromString
                              ]
                            >,
                            never,
                            never
                          >
                          hasHairAcc: Schema.compose<
                            Schema.Boolean,
                            Schema.Union<
                              readonly [
                                Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                              ]
                            >
                          >
                          hairAcc: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                          hasBHat: Schema.compose<
                            Schema.Boolean,
                            Schema.Union<
                              readonly [
                                Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                              ]
                            >
                          >
                          hasMhat: Schema.compose<
                            Schema.Boolean,
                            Schema.Union<
                              readonly [
                                Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                              ]
                            >
                          >
                          hasFHat: Schema.compose<
                            Schema.Boolean,
                            Schema.Union<
                              readonly [
                                Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                              ]
                            >
                          >
                          hat: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                          hatColor: Schema.decodeTo<
                            Schema.Struct<{ readonly r: Schema.Int; readonly g: Schema.Int; readonly b: Schema.Int }>,
                            Schema.TemplateLiteralParser<
                              readonly [
                                Schema.FiniteFromString,
                                ":",
                                Schema.FiniteFromString,
                                ":",
                                Schema.FiniteFromString
                              ]
                            >,
                            never,
                            never
                          >
                          hasEarrings: Schema.compose<
                            Schema.Boolean,
                            Schema.Union<
                              readonly [
                                Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                              ]
                            >
                          >
                          earringColor: Schema.decodeTo<
                            Schema.Struct<{ readonly r: Schema.Int; readonly g: Schema.Int; readonly b: Schema.Int }>,
                            Schema.TemplateLiteralParser<
                              readonly [
                                Schema.FiniteFromString,
                                ":",
                                Schema.FiniteFromString,
                                ":",
                                Schema.FiniteFromString
                              ]
                            >,
                            never,
                            never
                          >
                          hair: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                        } & { readonly $unknown: Schema.$Array<Schema.String> }
                      >,
                      Schema.String,
                      never,
                      never
                    >
                    readonly v: Schema.decodeTo<
                      Schema.BigInt,
                      Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
                      never,
                      never
                    >
                  }>,
                  readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
                >
              >
            }>,
            readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
          >
        >
        readonly CargoLog: Schema.$Array<
          Schema.StructWithRest<
            Schema.Struct<{
              readonly c: Schema.Int
              readonly ts: Schema.decodeTo<
                Schema.BigInt,
                Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
                never,
                never
              >
              readonly details: Schema.StructWithRest<
                Schema.Struct<{
                  readonly t: Schema.NullOr<Schema.String>
                  readonly b: Schema.NullOr<
                    Schema.StructWithRest<
                      Schema.Struct<{
                        readonly c: Schema.String
                        readonly BA: Schema.decodeTo<
                          Schema.Struct<
                            {
                              male: Schema.compose<
                                Schema.Boolean,
                                Schema.Union<
                                  readonly [
                                    Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                    Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                                  ]
                                >
                              >
                              firstNameIdx: Schema.compose<
                                Schema.compose<Schema.Int, Schema.NumberFromString>,
                                Schema.String
                              >
                              lastNameIdx: Schema.compose<
                                Schema.compose<Schema.Int, Schema.NumberFromString>,
                                Schema.String
                              >
                              bmonth: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                              bday: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                              skinColorIdx: Schema.compose<
                                Schema.compose<Schema.Int, Schema.NumberFromString>,
                                Schema.String
                              >
                              hairColorIdx: Schema.compose<
                                Schema.compose<Schema.Int, Schema.NumberFromString>,
                                Schema.String
                              >
                              shoeColorIdx: Schema.compose<
                                Schema.compose<Schema.Int, Schema.NumberFromString>,
                                Schema.String
                              >
                              pantsColor: Schema.decodeTo<
                                Schema.Struct<{
                                  readonly r: Schema.Int
                                  readonly g: Schema.Int
                                  readonly b: Schema.Int
                                }>,
                                Schema.TemplateLiteralParser<
                                  readonly [
                                    Schema.FiniteFromString,
                                    ":",
                                    Schema.FiniteFromString,
                                    ":",
                                    Schema.FiniteFromString
                                  ]
                                >,
                                never,
                                never
                              >
                              shirtColor: Schema.decodeTo<
                                Schema.Struct<{
                                  readonly r: Schema.Int
                                  readonly g: Schema.Int
                                  readonly b: Schema.Int
                                }>,
                                Schema.TemplateLiteralParser<
                                  readonly [
                                    Schema.FiniteFromString,
                                    ":",
                                    Schema.FiniteFromString,
                                    ":",
                                    Schema.FiniteFromString
                                  ]
                                >,
                                never,
                                never
                              >
                              hasGlasses: Schema.compose<
                                Schema.Boolean,
                                Schema.Union<
                                  readonly [
                                    Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                    Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                                  ]
                                >
                              >
                              glasses: Schema.compose<
                                Schema.compose<Schema.Int, Schema.NumberFromString>,
                                Schema.String
                              >
                              hasTie: Schema.compose<
                                Schema.Boolean,
                                Schema.Union<
                                  readonly [
                                    Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                    Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                                  ]
                                >
                              >
                              tieColor: Schema.decodeTo<
                                Schema.Struct<{
                                  readonly r: Schema.Int
                                  readonly g: Schema.Int
                                  readonly b: Schema.Int
                                }>,
                                Schema.TemplateLiteralParser<
                                  readonly [
                                    Schema.FiniteFromString,
                                    ":",
                                    Schema.FiniteFromString,
                                    ":",
                                    Schema.FiniteFromString
                                  ]
                                >,
                                never,
                                never
                              >
                              hasHairAcc: Schema.compose<
                                Schema.Boolean,
                                Schema.Union<
                                  readonly [
                                    Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                    Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                                  ]
                                >
                              >
                              hairAcc: Schema.compose<
                                Schema.compose<Schema.Int, Schema.NumberFromString>,
                                Schema.String
                              >
                              hasBHat: Schema.compose<
                                Schema.Boolean,
                                Schema.Union<
                                  readonly [
                                    Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                    Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                                  ]
                                >
                              >
                              hasMhat: Schema.compose<
                                Schema.Boolean,
                                Schema.Union<
                                  readonly [
                                    Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                    Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                                  ]
                                >
                              >
                              hasFHat: Schema.compose<
                                Schema.Boolean,
                                Schema.Union<
                                  readonly [
                                    Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                    Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                                  ]
                                >
                              >
                              hat: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                              hatColor: Schema.decodeTo<
                                Schema.Struct<{
                                  readonly r: Schema.Int
                                  readonly g: Schema.Int
                                  readonly b: Schema.Int
                                }>,
                                Schema.TemplateLiteralParser<
                                  readonly [
                                    Schema.FiniteFromString,
                                    ":",
                                    Schema.FiniteFromString,
                                    ":",
                                    Schema.FiniteFromString
                                  ]
                                >,
                                never,
                                never
                              >
                              hasEarrings: Schema.compose<
                                Schema.Boolean,
                                Schema.Union<
                                  readonly [
                                    Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                    Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                                  ]
                                >
                              >
                              earringColor: Schema.decodeTo<
                                Schema.Struct<{
                                  readonly r: Schema.Int
                                  readonly g: Schema.Int
                                  readonly b: Schema.Int
                                }>,
                                Schema.TemplateLiteralParser<
                                  readonly [
                                    Schema.FiniteFromString,
                                    ":",
                                    Schema.FiniteFromString,
                                    ":",
                                    Schema.FiniteFromString
                                  ]
                                >,
                                never,
                                never
                              >
                              hair: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                            } & { readonly $unknown: Schema.$Array<Schema.String> }
                          >,
                          Schema.String,
                          never,
                          never
                        >
                        readonly v: Schema.decodeTo<
                          Schema.BigInt,
                          Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
                          never,
                          never
                        >
                      }>,
                      readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
                    >
                  >
                  readonly c: Schema.NullOr<
                    Schema.StructWithRest<
                      Schema.Struct<{
                        readonly p: Schema.Int
                        readonly n: Schema.NullOr<Schema.String>
                        readonly i: Schema.Int
                        readonly c: Schema.NullOr<Schema.String>
                        readonly ni: Schema.Int
                        readonly s: Schema.Int
                      }>,
                      readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
                    >
                  >
                  readonly s: Schema.Int
                }>,
                readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
              >
            }>,
            readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
          >
        >
        readonly Cities: Schema.$Array<
          Schema.StructWithRest<
            Schema.Struct<{
              readonly city_id: Schema.Int
              readonly level: Schema.Int
              readonly flight_out: Schema.decodeTo<
                Schema.BigInt,
                Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
                never,
                never
              >
              readonly pass_out: Schema.decodeTo<
                Schema.BigInt,
                Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
                never,
                never
              >
              readonly cargo_out: Schema.decodeTo<
                Schema.BigInt,
                Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
                never,
                never
              >
              readonly flight_in: Schema.decodeTo<
                Schema.BigInt,
                Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
                never,
                never
              >
              readonly pass_in: Schema.decodeTo<
                Schema.BigInt,
                Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
                never,
                never
              >
              readonly cargo_in: Schema.decodeTo<
                Schema.BigInt,
                Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
                never,
                never
              >
              readonly closure: Schema.Int
              readonly deploy_x: Schema.Int
              readonly deploy_y: Schema.Int
              readonly campaign: Schema.decodeTo<
                Schema.BigInt,
                Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
                never,
                never
              >
              readonly Cargo: Schema.$Array<
                Schema.StructWithRest<
                  Schema.Struct<{
                    readonly start_city: Schema.Int
                    readonly end_city: Schema.Int
                    readonly is_vip: Schema.Boolean
                    readonly num_hops: Schema.Int
                    readonly first_board: Schema.decodeTo<
                      Schema.BigInt,
                      Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
                      never,
                      never
                    >
                    readonly details: Schema.StructWithRest<
                      Schema.Struct<{
                        readonly t: Schema.NullOr<Schema.String>
                        readonly b: Schema.NullOr<
                          Schema.StructWithRest<
                            Schema.Struct<{
                              readonly c: Schema.String
                              readonly BA: Schema.decodeTo<
                                Schema.Struct<
                                  {
                                    male: Schema.compose<
                                      Schema.Boolean,
                                      Schema.Union<
                                        readonly [
                                          Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                          Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                                        ]
                                      >
                                    >
                                    firstNameIdx: Schema.compose<
                                      Schema.compose<Schema.Int, Schema.NumberFromString>,
                                      Schema.String
                                    >
                                    lastNameIdx: Schema.compose<
                                      Schema.compose<Schema.Int, Schema.NumberFromString>,
                                      Schema.String
                                    >
                                    bmonth: Schema.compose<
                                      Schema.compose<Schema.Int, Schema.NumberFromString>,
                                      Schema.String
                                    >
                                    bday: Schema.compose<
                                      Schema.compose<Schema.Int, Schema.NumberFromString>,
                                      Schema.String
                                    >
                                    skinColorIdx: Schema.compose<
                                      Schema.compose<Schema.Int, Schema.NumberFromString>,
                                      Schema.String
                                    >
                                    hairColorIdx: Schema.compose<
                                      Schema.compose<Schema.Int, Schema.NumberFromString>,
                                      Schema.String
                                    >
                                    shoeColorIdx: Schema.compose<
                                      Schema.compose<Schema.Int, Schema.NumberFromString>,
                                      Schema.String
                                    >
                                    pantsColor: Schema.decodeTo<
                                      Schema.Struct<{
                                        readonly r: Schema.Int
                                        readonly g: Schema.Int
                                        readonly b: Schema.Int
                                      }>,
                                      Schema.TemplateLiteralParser<
                                        readonly [
                                          Schema.FiniteFromString,
                                          ":",
                                          Schema.FiniteFromString,
                                          ":",
                                          Schema.FiniteFromString
                                        ]
                                      >,
                                      never,
                                      never
                                    >
                                    shirtColor: Schema.decodeTo<
                                      Schema.Struct<{
                                        readonly r: Schema.Int
                                        readonly g: Schema.Int
                                        readonly b: Schema.Int
                                      }>,
                                      Schema.TemplateLiteralParser<
                                        readonly [
                                          Schema.FiniteFromString,
                                          ":",
                                          Schema.FiniteFromString,
                                          ":",
                                          Schema.FiniteFromString
                                        ]
                                      >,
                                      never,
                                      never
                                    >
                                    hasGlasses: Schema.compose<
                                      Schema.Boolean,
                                      Schema.Union<
                                        readonly [
                                          Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                          Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                                        ]
                                      >
                                    >
                                    glasses: Schema.compose<
                                      Schema.compose<Schema.Int, Schema.NumberFromString>,
                                      Schema.String
                                    >
                                    hasTie: Schema.compose<
                                      Schema.Boolean,
                                      Schema.Union<
                                        readonly [
                                          Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                          Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                                        ]
                                      >
                                    >
                                    tieColor: Schema.decodeTo<
                                      Schema.Struct<{
                                        readonly r: Schema.Int
                                        readonly g: Schema.Int
                                        readonly b: Schema.Int
                                      }>,
                                      Schema.TemplateLiteralParser<
                                        readonly [
                                          Schema.FiniteFromString,
                                          ":",
                                          Schema.FiniteFromString,
                                          ":",
                                          Schema.FiniteFromString
                                        ]
                                      >,
                                      never,
                                      never
                                    >
                                    hasHairAcc: Schema.compose<
                                      Schema.Boolean,
                                      Schema.Union<
                                        readonly [
                                          Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                          Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                                        ]
                                      >
                                    >
                                    hairAcc: Schema.compose<
                                      Schema.compose<Schema.Int, Schema.NumberFromString>,
                                      Schema.String
                                    >
                                    hasBHat: Schema.compose<
                                      Schema.Boolean,
                                      Schema.Union<
                                        readonly [
                                          Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                          Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                                        ]
                                      >
                                    >
                                    hasMhat: Schema.compose<
                                      Schema.Boolean,
                                      Schema.Union<
                                        readonly [
                                          Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                          Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                                        ]
                                      >
                                    >
                                    hasFHat: Schema.compose<
                                      Schema.Boolean,
                                      Schema.Union<
                                        readonly [
                                          Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                          Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                                        ]
                                      >
                                    >
                                    hat: Schema.compose<
                                      Schema.compose<Schema.Int, Schema.NumberFromString>,
                                      Schema.String
                                    >
                                    hatColor: Schema.decodeTo<
                                      Schema.Struct<{
                                        readonly r: Schema.Int
                                        readonly g: Schema.Int
                                        readonly b: Schema.Int
                                      }>,
                                      Schema.TemplateLiteralParser<
                                        readonly [
                                          Schema.FiniteFromString,
                                          ":",
                                          Schema.FiniteFromString,
                                          ":",
                                          Schema.FiniteFromString
                                        ]
                                      >,
                                      never,
                                      never
                                    >
                                    hasEarrings: Schema.compose<
                                      Schema.Boolean,
                                      Schema.Union<
                                        readonly [
                                          Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                          Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                                        ]
                                      >
                                    >
                                    earringColor: Schema.decodeTo<
                                      Schema.Struct<{
                                        readonly r: Schema.Int
                                        readonly g: Schema.Int
                                        readonly b: Schema.Int
                                      }>,
                                      Schema.TemplateLiteralParser<
                                        readonly [
                                          Schema.FiniteFromString,
                                          ":",
                                          Schema.FiniteFromString,
                                          ":",
                                          Schema.FiniteFromString
                                        ]
                                      >,
                                      never,
                                      never
                                    >
                                    hair: Schema.compose<
                                      Schema.compose<Schema.Int, Schema.NumberFromString>,
                                      Schema.String
                                    >
                                  } & { readonly $unknown: Schema.$Array<Schema.String> }
                                >,
                                Schema.String,
                                never,
                                never
                              >
                              readonly v: Schema.decodeTo<
                                Schema.BigInt,
                                Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
                                never,
                                never
                              >
                            }>,
                            readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
                          >
                        >
                        readonly c: Schema.NullOr<
                          Schema.StructWithRest<
                            Schema.Struct<{
                              readonly p: Schema.Int
                              readonly n: Schema.NullOr<Schema.String>
                              readonly i: Schema.Int
                              readonly c: Schema.NullOr<Schema.String>
                              readonly ni: Schema.Int
                              readonly s: Schema.Int
                            }>,
                            readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
                          >
                        >
                        readonly s: Schema.Int
                      }>,
                      readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
                    >
                  }>,
                  readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
                >
              >
              readonly isClosed: Schema.Boolean
            }>,
            readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
          >
        >
        readonly jobPoolStart: Schema.decodeTo<
          Schema.BigInt,
          Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
          never,
          never
        >
        readonly jobPoolCityIds: Schema.$Array<Schema.Int>
        readonly lfParts: Schema.$Array<
          Schema.StructWithRest<
            Schema.Struct<{ readonly plane_id: Schema.Int; readonly part_type: Schema.Int }>,
            readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
          >
        >
        readonly Parts: Schema.$Array<
          Schema.StructWithRest<
            Schema.Struct<{ readonly plane_id: Schema.Int; readonly part_type: Schema.Int }>,
            readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
          >
        >
        readonly Hangar: Schema.$Array<
          Schema.StructWithRest<
            Schema.Struct<{
              readonly plane_id: Schema.Int
              readonly eUpgrade: Schema.Int
              readonly tUpgrade: Schema.Int
              readonly wUpgrade: Schema.Int
              readonly paint: Schema.decodeTo<
                Schema.Struct<{
                  readonly r1: Schema.Int
                  readonly g1: Schema.Int
                  readonly b1: Schema.Int
                  readonly r2: Schema.Int
                  readonly g2: Schema.Int
                  readonly b2: Schema.Int
                  readonly r3: Schema.Int
                  readonly g3: Schema.Int
                  readonly b3: Schema.Int
                }>,
                Schema.String,
                never,
                never
              >
              readonly skin: Schema.NullOr<Schema.String>
              readonly trips: Schema.decodeTo<
                Schema.BigInt,
                Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
                never,
                never
              >
              readonly distance: Schema.decodeTo<
                Schema.BigInt,
                Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
                never,
                never
              >
              readonly longest_flight: Schema.Int
              readonly most_hops: Schema.Int
              readonly most_profit: Schema.Int
              readonly hotdog: Schema.Int
              readonly Pilot: Schema.StructWithRest<
                Schema.Struct<{
                  readonly c: Schema.String
                  readonly BA: Schema.decodeTo<
                    Schema.Struct<
                      {
                        male: Schema.compose<
                          Schema.Boolean,
                          Schema.Union<
                            readonly [
                              Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                              Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                            ]
                          >
                        >
                        firstNameIdx: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                        lastNameIdx: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                        bmonth: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                        bday: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                        skinColorIdx: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                        hairColorIdx: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                        shoeColorIdx: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                        pantsColor: Schema.decodeTo<
                          Schema.Struct<{ readonly r: Schema.Int; readonly g: Schema.Int; readonly b: Schema.Int }>,
                          Schema.TemplateLiteralParser<
                            readonly [
                              Schema.FiniteFromString,
                              ":",
                              Schema.FiniteFromString,
                              ":",
                              Schema.FiniteFromString
                            ]
                          >,
                          never,
                          never
                        >
                        shirtColor: Schema.decodeTo<
                          Schema.Struct<{ readonly r: Schema.Int; readonly g: Schema.Int; readonly b: Schema.Int }>,
                          Schema.TemplateLiteralParser<
                            readonly [
                              Schema.FiniteFromString,
                              ":",
                              Schema.FiniteFromString,
                              ":",
                              Schema.FiniteFromString
                            ]
                          >,
                          never,
                          never
                        >
                        hasGlasses: Schema.compose<
                          Schema.Boolean,
                          Schema.Union<
                            readonly [
                              Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                              Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                            ]
                          >
                        >
                        glasses: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                        hasTie: Schema.compose<
                          Schema.Boolean,
                          Schema.Union<
                            readonly [
                              Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                              Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                            ]
                          >
                        >
                        tieColor: Schema.decodeTo<
                          Schema.Struct<{ readonly r: Schema.Int; readonly g: Schema.Int; readonly b: Schema.Int }>,
                          Schema.TemplateLiteralParser<
                            readonly [
                              Schema.FiniteFromString,
                              ":",
                              Schema.FiniteFromString,
                              ":",
                              Schema.FiniteFromString
                            ]
                          >,
                          never,
                          never
                        >
                        hasHairAcc: Schema.compose<
                          Schema.Boolean,
                          Schema.Union<
                            readonly [
                              Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                              Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                            ]
                          >
                        >
                        hairAcc: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                        hasBHat: Schema.compose<
                          Schema.Boolean,
                          Schema.Union<
                            readonly [
                              Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                              Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                            ]
                          >
                        >
                        hasMhat: Schema.compose<
                          Schema.Boolean,
                          Schema.Union<
                            readonly [
                              Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                              Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                            ]
                          >
                        >
                        hasFHat: Schema.compose<
                          Schema.Boolean,
                          Schema.Union<
                            readonly [
                              Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                              Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                            ]
                          >
                        >
                        hat: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                        hatColor: Schema.decodeTo<
                          Schema.Struct<{ readonly r: Schema.Int; readonly g: Schema.Int; readonly b: Schema.Int }>,
                          Schema.TemplateLiteralParser<
                            readonly [
                              Schema.FiniteFromString,
                              ":",
                              Schema.FiniteFromString,
                              ":",
                              Schema.FiniteFromString
                            ]
                          >,
                          never,
                          never
                        >
                        hasEarrings: Schema.compose<
                          Schema.Boolean,
                          Schema.Union<
                            readonly [
                              Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                              Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                            ]
                          >
                        >
                        earringColor: Schema.decodeTo<
                          Schema.Struct<{ readonly r: Schema.Int; readonly g: Schema.Int; readonly b: Schema.Int }>,
                          Schema.TemplateLiteralParser<
                            readonly [
                              Schema.FiniteFromString,
                              ":",
                              Schema.FiniteFromString,
                              ":",
                              Schema.FiniteFromString
                            ]
                          >,
                          never,
                          never
                        >
                        hair: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                      } & { readonly $unknown: Schema.$Array<Schema.String> }
                    >,
                    Schema.String,
                    never,
                    never
                  >
                  readonly v: Schema.decodeTo<
                    Schema.BigInt,
                    Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
                    never,
                    never
                  >
                }>,
                readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
              >
              readonly costumes: Schema.$Array<Schema.String>
              readonly name: Schema.String
              readonly total_flight_time: Schema.decodeTo<
                Schema.BigInt,
                Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
                never,
                never
              >
              readonly total_revenue: Schema.decodeTo<
                Schema.BigInt,
                Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
                never,
                never
              >
              readonly total_profit: Schema.decodeTo<
                Schema.BigInt,
                Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
                never,
                never
              >
              readonly Cargo: Schema.$Array<
                Schema.StructWithRest<
                  Schema.Struct<{
                    readonly start_city: Schema.Int
                    readonly end_city: Schema.Int
                    readonly is_vip: Schema.Boolean
                    readonly num_hops: Schema.Int
                    readonly first_board: Schema.decodeTo<
                      Schema.BigInt,
                      Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
                      never,
                      never
                    >
                    readonly details: Schema.StructWithRest<
                      Schema.Struct<{
                        readonly t: Schema.NullOr<Schema.String>
                        readonly b: Schema.NullOr<
                          Schema.StructWithRest<
                            Schema.Struct<{
                              readonly c: Schema.String
                              readonly BA: Schema.decodeTo<
                                Schema.Struct<
                                  {
                                    male: Schema.compose<
                                      Schema.Boolean,
                                      Schema.Union<
                                        readonly [
                                          Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                          Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                                        ]
                                      >
                                    >
                                    firstNameIdx: Schema.compose<
                                      Schema.compose<Schema.Int, Schema.NumberFromString>,
                                      Schema.String
                                    >
                                    lastNameIdx: Schema.compose<
                                      Schema.compose<Schema.Int, Schema.NumberFromString>,
                                      Schema.String
                                    >
                                    bmonth: Schema.compose<
                                      Schema.compose<Schema.Int, Schema.NumberFromString>,
                                      Schema.String
                                    >
                                    bday: Schema.compose<
                                      Schema.compose<Schema.Int, Schema.NumberFromString>,
                                      Schema.String
                                    >
                                    skinColorIdx: Schema.compose<
                                      Schema.compose<Schema.Int, Schema.NumberFromString>,
                                      Schema.String
                                    >
                                    hairColorIdx: Schema.compose<
                                      Schema.compose<Schema.Int, Schema.NumberFromString>,
                                      Schema.String
                                    >
                                    shoeColorIdx: Schema.compose<
                                      Schema.compose<Schema.Int, Schema.NumberFromString>,
                                      Schema.String
                                    >
                                    pantsColor: Schema.decodeTo<
                                      Schema.Struct<{
                                        readonly r: Schema.Int
                                        readonly g: Schema.Int
                                        readonly b: Schema.Int
                                      }>,
                                      Schema.TemplateLiteralParser<
                                        readonly [
                                          Schema.FiniteFromString,
                                          ":",
                                          Schema.FiniteFromString,
                                          ":",
                                          Schema.FiniteFromString
                                        ]
                                      >,
                                      never,
                                      never
                                    >
                                    shirtColor: Schema.decodeTo<
                                      Schema.Struct<{
                                        readonly r: Schema.Int
                                        readonly g: Schema.Int
                                        readonly b: Schema.Int
                                      }>,
                                      Schema.TemplateLiteralParser<
                                        readonly [
                                          Schema.FiniteFromString,
                                          ":",
                                          Schema.FiniteFromString,
                                          ":",
                                          Schema.FiniteFromString
                                        ]
                                      >,
                                      never,
                                      never
                                    >
                                    hasGlasses: Schema.compose<
                                      Schema.Boolean,
                                      Schema.Union<
                                        readonly [
                                          Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                          Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                                        ]
                                      >
                                    >
                                    glasses: Schema.compose<
                                      Schema.compose<Schema.Int, Schema.NumberFromString>,
                                      Schema.String
                                    >
                                    hasTie: Schema.compose<
                                      Schema.Boolean,
                                      Schema.Union<
                                        readonly [
                                          Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                          Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                                        ]
                                      >
                                    >
                                    tieColor: Schema.decodeTo<
                                      Schema.Struct<{
                                        readonly r: Schema.Int
                                        readonly g: Schema.Int
                                        readonly b: Schema.Int
                                      }>,
                                      Schema.TemplateLiteralParser<
                                        readonly [
                                          Schema.FiniteFromString,
                                          ":",
                                          Schema.FiniteFromString,
                                          ":",
                                          Schema.FiniteFromString
                                        ]
                                      >,
                                      never,
                                      never
                                    >
                                    hasHairAcc: Schema.compose<
                                      Schema.Boolean,
                                      Schema.Union<
                                        readonly [
                                          Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                          Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                                        ]
                                      >
                                    >
                                    hairAcc: Schema.compose<
                                      Schema.compose<Schema.Int, Schema.NumberFromString>,
                                      Schema.String
                                    >
                                    hasBHat: Schema.compose<
                                      Schema.Boolean,
                                      Schema.Union<
                                        readonly [
                                          Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                          Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                                        ]
                                      >
                                    >
                                    hasMhat: Schema.compose<
                                      Schema.Boolean,
                                      Schema.Union<
                                        readonly [
                                          Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                          Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                                        ]
                                      >
                                    >
                                    hasFHat: Schema.compose<
                                      Schema.Boolean,
                                      Schema.Union<
                                        readonly [
                                          Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                          Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                                        ]
                                      >
                                    >
                                    hat: Schema.compose<
                                      Schema.compose<Schema.Int, Schema.NumberFromString>,
                                      Schema.String
                                    >
                                    hatColor: Schema.decodeTo<
                                      Schema.Struct<{
                                        readonly r: Schema.Int
                                        readonly g: Schema.Int
                                        readonly b: Schema.Int
                                      }>,
                                      Schema.TemplateLiteralParser<
                                        readonly [
                                          Schema.FiniteFromString,
                                          ":",
                                          Schema.FiniteFromString,
                                          ":",
                                          Schema.FiniteFromString
                                        ]
                                      >,
                                      never,
                                      never
                                    >
                                    hasEarrings: Schema.compose<
                                      Schema.Boolean,
                                      Schema.Union<
                                        readonly [
                                          Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                          Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                                        ]
                                      >
                                    >
                                    earringColor: Schema.decodeTo<
                                      Schema.Struct<{
                                        readonly r: Schema.Int
                                        readonly g: Schema.Int
                                        readonly b: Schema.Int
                                      }>,
                                      Schema.TemplateLiteralParser<
                                        readonly [
                                          Schema.FiniteFromString,
                                          ":",
                                          Schema.FiniteFromString,
                                          ":",
                                          Schema.FiniteFromString
                                        ]
                                      >,
                                      never,
                                      never
                                    >
                                    hair: Schema.compose<
                                      Schema.compose<Schema.Int, Schema.NumberFromString>,
                                      Schema.String
                                    >
                                  } & { readonly $unknown: Schema.$Array<Schema.String> }
                                >,
                                Schema.String,
                                never,
                                never
                              >
                              readonly v: Schema.decodeTo<
                                Schema.BigInt,
                                Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
                                never,
                                never
                              >
                            }>,
                            readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
                          >
                        >
                        readonly c: Schema.NullOr<
                          Schema.StructWithRest<
                            Schema.Struct<{
                              readonly p: Schema.Int
                              readonly n: Schema.NullOr<Schema.String>
                              readonly i: Schema.Int
                              readonly c: Schema.NullOr<Schema.String>
                              readonly ni: Schema.Int
                              readonly s: Schema.Int
                            }>,
                            readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
                          >
                        >
                        readonly s: Schema.Int
                      }>,
                      readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
                    >
                  }>,
                  readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
                >
              >
              readonly Trip: Schema.StructWithRest<
                Schema.Struct<{
                  readonly evaluated: Schema.Boolean
                  readonly is_complete: Schema.Boolean
                  readonly offload_complete: Schema.Boolean
                  readonly start_time: Schema.decodeTo<
                    Schema.BigInt,
                    Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
                    never,
                    never
                  >
                  readonly Legs: Schema.$Array<
                    Schema.StructWithRest<
                      Schema.Struct<{
                        readonly is_complete: Schema.Boolean
                        readonly offload_complete: Schema.Boolean
                        readonly start_city: Schema.Int
                        readonly end_city: Schema.Int
                        readonly distance: Schema.decodeTo<
                          Schema.Finite,
                          Schema.Union<readonly [Schema.instanceOf<JsonDouble, unknown>, Schema.Finite]>,
                          never,
                          never
                        >
                        readonly speed_bonus: Schema.decodeTo<
                          Schema.Finite,
                          Schema.Union<readonly [Schema.instanceOf<JsonDouble, unknown>, Schema.Finite]>,
                          never,
                          never
                        >
                      }>,
                      readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
                    >
                  >
                  readonly arrivedLegsCount: Schema.Int
                }>,
                readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
              >
              readonly l: Schema.Boolean
            }>,
            readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
          >
        >
        readonly Planes: Schema.$Array<
          Schema.StructWithRest<
            Schema.Struct<{
              readonly plane_id: Schema.Int
              readonly eUpgrade: Schema.Int
              readonly tUpgrade: Schema.Int
              readonly wUpgrade: Schema.Int
              readonly paint: Schema.decodeTo<
                Schema.Struct<{
                  readonly r1: Schema.Int
                  readonly g1: Schema.Int
                  readonly b1: Schema.Int
                  readonly r2: Schema.Int
                  readonly g2: Schema.Int
                  readonly b2: Schema.Int
                  readonly r3: Schema.Int
                  readonly g3: Schema.Int
                  readonly b3: Schema.Int
                }>,
                Schema.String,
                never,
                never
              >
              readonly skin: Schema.NullOr<Schema.String>
              readonly trips: Schema.decodeTo<
                Schema.BigInt,
                Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
                never,
                never
              >
              readonly distance: Schema.decodeTo<
                Schema.BigInt,
                Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
                never,
                never
              >
              readonly longest_flight: Schema.Int
              readonly most_hops: Schema.Int
              readonly most_profit: Schema.Int
              readonly hotdog: Schema.Int
              readonly Pilot: Schema.StructWithRest<
                Schema.Struct<{
                  readonly c: Schema.String
                  readonly BA: Schema.decodeTo<
                    Schema.Struct<
                      {
                        male: Schema.compose<
                          Schema.Boolean,
                          Schema.Union<
                            readonly [
                              Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                              Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                            ]
                          >
                        >
                        firstNameIdx: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                        lastNameIdx: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                        bmonth: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                        bday: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                        skinColorIdx: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                        hairColorIdx: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                        shoeColorIdx: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                        pantsColor: Schema.decodeTo<
                          Schema.Struct<{ readonly r: Schema.Int; readonly g: Schema.Int; readonly b: Schema.Int }>,
                          Schema.TemplateLiteralParser<
                            readonly [
                              Schema.FiniteFromString,
                              ":",
                              Schema.FiniteFromString,
                              ":",
                              Schema.FiniteFromString
                            ]
                          >,
                          never,
                          never
                        >
                        shirtColor: Schema.decodeTo<
                          Schema.Struct<{ readonly r: Schema.Int; readonly g: Schema.Int; readonly b: Schema.Int }>,
                          Schema.TemplateLiteralParser<
                            readonly [
                              Schema.FiniteFromString,
                              ":",
                              Schema.FiniteFromString,
                              ":",
                              Schema.FiniteFromString
                            ]
                          >,
                          never,
                          never
                        >
                        hasGlasses: Schema.compose<
                          Schema.Boolean,
                          Schema.Union<
                            readonly [
                              Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                              Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                            ]
                          >
                        >
                        glasses: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                        hasTie: Schema.compose<
                          Schema.Boolean,
                          Schema.Union<
                            readonly [
                              Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                              Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                            ]
                          >
                        >
                        tieColor: Schema.decodeTo<
                          Schema.Struct<{ readonly r: Schema.Int; readonly g: Schema.Int; readonly b: Schema.Int }>,
                          Schema.TemplateLiteralParser<
                            readonly [
                              Schema.FiniteFromString,
                              ":",
                              Schema.FiniteFromString,
                              ":",
                              Schema.FiniteFromString
                            ]
                          >,
                          never,
                          never
                        >
                        hasHairAcc: Schema.compose<
                          Schema.Boolean,
                          Schema.Union<
                            readonly [
                              Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                              Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                            ]
                          >
                        >
                        hairAcc: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                        hasBHat: Schema.compose<
                          Schema.Boolean,
                          Schema.Union<
                            readonly [
                              Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                              Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                            ]
                          >
                        >
                        hasMhat: Schema.compose<
                          Schema.Boolean,
                          Schema.Union<
                            readonly [
                              Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                              Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                            ]
                          >
                        >
                        hasFHat: Schema.compose<
                          Schema.Boolean,
                          Schema.Union<
                            readonly [
                              Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                              Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                            ]
                          >
                        >
                        hat: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                        hatColor: Schema.decodeTo<
                          Schema.Struct<{ readonly r: Schema.Int; readonly g: Schema.Int; readonly b: Schema.Int }>,
                          Schema.TemplateLiteralParser<
                            readonly [
                              Schema.FiniteFromString,
                              ":",
                              Schema.FiniteFromString,
                              ":",
                              Schema.FiniteFromString
                            ]
                          >,
                          never,
                          never
                        >
                        hasEarrings: Schema.compose<
                          Schema.Boolean,
                          Schema.Union<
                            readonly [
                              Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                              Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                            ]
                          >
                        >
                        earringColor: Schema.decodeTo<
                          Schema.Struct<{ readonly r: Schema.Int; readonly g: Schema.Int; readonly b: Schema.Int }>,
                          Schema.TemplateLiteralParser<
                            readonly [
                              Schema.FiniteFromString,
                              ":",
                              Schema.FiniteFromString,
                              ":",
                              Schema.FiniteFromString
                            ]
                          >,
                          never,
                          never
                        >
                        hair: Schema.compose<Schema.compose<Schema.Int, Schema.NumberFromString>, Schema.String>
                      } & { readonly $unknown: Schema.$Array<Schema.String> }
                    >,
                    Schema.String,
                    never,
                    never
                  >
                  readonly v: Schema.decodeTo<
                    Schema.BigInt,
                    Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
                    never,
                    never
                  >
                }>,
                readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
              >
              readonly costumes: Schema.$Array<Schema.String>
              readonly name: Schema.String
              readonly total_flight_time: Schema.decodeTo<
                Schema.BigInt,
                Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
                never,
                never
              >
              readonly total_revenue: Schema.decodeTo<
                Schema.BigInt,
                Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
                never,
                never
              >
              readonly total_profit: Schema.decodeTo<
                Schema.BigInt,
                Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
                never,
                never
              >
              readonly Cargo: Schema.$Array<
                Schema.StructWithRest<
                  Schema.Struct<{
                    readonly start_city: Schema.Int
                    readonly end_city: Schema.Int
                    readonly is_vip: Schema.Boolean
                    readonly num_hops: Schema.Int
                    readonly first_board: Schema.decodeTo<
                      Schema.BigInt,
                      Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
                      never,
                      never
                    >
                    readonly details: Schema.StructWithRest<
                      Schema.Struct<{
                        readonly t: Schema.NullOr<Schema.String>
                        readonly b: Schema.NullOr<
                          Schema.StructWithRest<
                            Schema.Struct<{
                              readonly c: Schema.String
                              readonly BA: Schema.decodeTo<
                                Schema.Struct<
                                  {
                                    male: Schema.compose<
                                      Schema.Boolean,
                                      Schema.Union<
                                        readonly [
                                          Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                          Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                                        ]
                                      >
                                    >
                                    firstNameIdx: Schema.compose<
                                      Schema.compose<Schema.Int, Schema.NumberFromString>,
                                      Schema.String
                                    >
                                    lastNameIdx: Schema.compose<
                                      Schema.compose<Schema.Int, Schema.NumberFromString>,
                                      Schema.String
                                    >
                                    bmonth: Schema.compose<
                                      Schema.compose<Schema.Int, Schema.NumberFromString>,
                                      Schema.String
                                    >
                                    bday: Schema.compose<
                                      Schema.compose<Schema.Int, Schema.NumberFromString>,
                                      Schema.String
                                    >
                                    skinColorIdx: Schema.compose<
                                      Schema.compose<Schema.Int, Schema.NumberFromString>,
                                      Schema.String
                                    >
                                    hairColorIdx: Schema.compose<
                                      Schema.compose<Schema.Int, Schema.NumberFromString>,
                                      Schema.String
                                    >
                                    shoeColorIdx: Schema.compose<
                                      Schema.compose<Schema.Int, Schema.NumberFromString>,
                                      Schema.String
                                    >
                                    pantsColor: Schema.decodeTo<
                                      Schema.Struct<{
                                        readonly r: Schema.Int
                                        readonly g: Schema.Int
                                        readonly b: Schema.Int
                                      }>,
                                      Schema.TemplateLiteralParser<
                                        readonly [
                                          Schema.FiniteFromString,
                                          ":",
                                          Schema.FiniteFromString,
                                          ":",
                                          Schema.FiniteFromString
                                        ]
                                      >,
                                      never,
                                      never
                                    >
                                    shirtColor: Schema.decodeTo<
                                      Schema.Struct<{
                                        readonly r: Schema.Int
                                        readonly g: Schema.Int
                                        readonly b: Schema.Int
                                      }>,
                                      Schema.TemplateLiteralParser<
                                        readonly [
                                          Schema.FiniteFromString,
                                          ":",
                                          Schema.FiniteFromString,
                                          ":",
                                          Schema.FiniteFromString
                                        ]
                                      >,
                                      never,
                                      never
                                    >
                                    hasGlasses: Schema.compose<
                                      Schema.Boolean,
                                      Schema.Union<
                                        readonly [
                                          Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                          Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                                        ]
                                      >
                                    >
                                    glasses: Schema.compose<
                                      Schema.compose<Schema.Int, Schema.NumberFromString>,
                                      Schema.String
                                    >
                                    hasTie: Schema.compose<
                                      Schema.Boolean,
                                      Schema.Union<
                                        readonly [
                                          Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                          Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                                        ]
                                      >
                                    >
                                    tieColor: Schema.decodeTo<
                                      Schema.Struct<{
                                        readonly r: Schema.Int
                                        readonly g: Schema.Int
                                        readonly b: Schema.Int
                                      }>,
                                      Schema.TemplateLiteralParser<
                                        readonly [
                                          Schema.FiniteFromString,
                                          ":",
                                          Schema.FiniteFromString,
                                          ":",
                                          Schema.FiniteFromString
                                        ]
                                      >,
                                      never,
                                      never
                                    >
                                    hasHairAcc: Schema.compose<
                                      Schema.Boolean,
                                      Schema.Union<
                                        readonly [
                                          Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                          Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                                        ]
                                      >
                                    >
                                    hairAcc: Schema.compose<
                                      Schema.compose<Schema.Int, Schema.NumberFromString>,
                                      Schema.String
                                    >
                                    hasBHat: Schema.compose<
                                      Schema.Boolean,
                                      Schema.Union<
                                        readonly [
                                          Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                          Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                                        ]
                                      >
                                    >
                                    hasMhat: Schema.compose<
                                      Schema.Boolean,
                                      Schema.Union<
                                        readonly [
                                          Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                          Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                                        ]
                                      >
                                    >
                                    hasFHat: Schema.compose<
                                      Schema.Boolean,
                                      Schema.Union<
                                        readonly [
                                          Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                          Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                                        ]
                                      >
                                    >
                                    hat: Schema.compose<
                                      Schema.compose<Schema.Int, Schema.NumberFromString>,
                                      Schema.String
                                    >
                                    hatColor: Schema.decodeTo<
                                      Schema.Struct<{
                                        readonly r: Schema.Int
                                        readonly g: Schema.Int
                                        readonly b: Schema.Int
                                      }>,
                                      Schema.TemplateLiteralParser<
                                        readonly [
                                          Schema.FiniteFromString,
                                          ":",
                                          Schema.FiniteFromString,
                                          ":",
                                          Schema.FiniteFromString
                                        ]
                                      >,
                                      never,
                                      never
                                    >
                                    hasEarrings: Schema.compose<
                                      Schema.Boolean,
                                      Schema.Union<
                                        readonly [
                                          Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                          Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                                        ]
                                      >
                                    >
                                    earringColor: Schema.decodeTo<
                                      Schema.Struct<{
                                        readonly r: Schema.Int
                                        readonly g: Schema.Int
                                        readonly b: Schema.Int
                                      }>,
                                      Schema.TemplateLiteralParser<
                                        readonly [
                                          Schema.FiniteFromString,
                                          ":",
                                          Schema.FiniteFromString,
                                          ":",
                                          Schema.FiniteFromString
                                        ]
                                      >,
                                      never,
                                      never
                                    >
                                    hair: Schema.compose<
                                      Schema.compose<Schema.Int, Schema.NumberFromString>,
                                      Schema.String
                                    >
                                  } & { readonly $unknown: Schema.$Array<Schema.String> }
                                >,
                                Schema.String,
                                never,
                                never
                              >
                              readonly v: Schema.decodeTo<
                                Schema.BigInt,
                                Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
                                never,
                                never
                              >
                            }>,
                            readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
                          >
                        >
                        readonly c: Schema.NullOr<
                          Schema.StructWithRest<
                            Schema.Struct<{
                              readonly p: Schema.Int
                              readonly n: Schema.NullOr<Schema.String>
                              readonly i: Schema.Int
                              readonly c: Schema.NullOr<Schema.String>
                              readonly ni: Schema.Int
                              readonly s: Schema.Int
                            }>,
                            readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
                          >
                        >
                        readonly s: Schema.Int
                      }>,
                      readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
                    >
                  }>,
                  readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
                >
              >
              readonly Trip: Schema.StructWithRest<
                Schema.Struct<{
                  readonly evaluated: Schema.Boolean
                  readonly is_complete: Schema.Boolean
                  readonly offload_complete: Schema.Boolean
                  readonly start_time: Schema.decodeTo<
                    Schema.BigInt,
                    Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
                    never,
                    never
                  >
                  readonly Legs: Schema.$Array<
                    Schema.StructWithRest<
                      Schema.Struct<{
                        readonly is_complete: Schema.Boolean
                        readonly offload_complete: Schema.Boolean
                        readonly start_city: Schema.Int
                        readonly end_city: Schema.Int
                        readonly distance: Schema.decodeTo<
                          Schema.Finite,
                          Schema.Union<readonly [Schema.instanceOf<JsonDouble, unknown>, Schema.Finite]>,
                          never,
                          never
                        >
                        readonly speed_bonus: Schema.decodeTo<
                          Schema.Finite,
                          Schema.Union<readonly [Schema.instanceOf<JsonDouble, unknown>, Schema.Finite]>,
                          never,
                          never
                        >
                      }>,
                      readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
                    >
                  >
                  readonly arrivedLegsCount: Schema.Int
                }>,
                readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
              >
              readonly l: Schema.Boolean
            }>,
            readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
          >
        >
        readonly f: Schema.$Array<
          Schema.StructWithRest<
            Schema.Struct<{
              readonly name: Schema.NullOr<Schema.String>
              readonly player_id: Schema.String
              readonly gc: Schema.NullOr<Schema.String>
            }>,
            readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
          >
        >
        readonly ShopLog: Schema.$Array<
          Schema.StructWithRest<
            Schema.Struct<{
              readonly ts: Schema.decodeTo<
                Schema.BigInt,
                Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
                never,
                never
              >
              readonly seed: Schema.Int
            }>,
            readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
          >
        >
        readonly refresh: Schema.$Record<Schema.String, Schema.$Record<Schema.String, Schema.Int>>
        readonly dailyStats: Schema.$Record<
          Schema.String,
          Schema.$Record<
            Schema.String,
            Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
          >
        >
        readonly eventCounts: Schema.$Record<Schema.String, Schema.Int>
        readonly globalStats: Schema.$Record<
          Schema.String,
          Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
        >
        readonly speedUpFlightAdWatched: Schema.$Array<Schema.String>
        readonly cityJobsAdWatched: Schema.$Record<Schema.String, Schema.$Array<Schema.String>>
        readonly cPC: Schema.Int
        readonly cPRI: Schema.Int
        readonly nFBT: Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
        readonly nPCT: Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
        readonly g: Schema.NullOr<
          Schema.StructWithRest<
            Schema.Struct<{
              readonly b: Schema.decodeTo<
                Schema.BigInt,
                Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
                never,
                never
              >
              readonly u: Schema.decodeTo<
                Schema.BigInt,
                Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
                never,
                never
              >
              readonly j: Schema.decodeTo<
                Schema.BigInt,
                Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
                never,
                never
              >
              readonly c: Schema.Int
              readonly r1: Schema.Boolean
              readonly r2: Schema.Boolean
              readonly r3: Schema.Boolean
              readonly r4: Schema.Boolean
              readonly r5: Schema.Boolean
              readonly r: Schema.$Array<
                Schema.Union<
                  readonly [
                    Schema.Struct<{ readonly Key: Schema.Literal<0>; readonly Value: Schema.Int }>,
                    Schema.Struct<{ readonly Key: Schema.Literal<1>; readonly Value: Schema.Int }>,
                    Schema.Struct<{
                      readonly Key: Schema.Literal<2>
                      readonly Value: Schema.StructWithRest<
                        Schema.Struct<{ readonly plane_id: Schema.Int; readonly part_type: Schema.Int }>,
                        readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
                      >
                    }>,
                    Schema.Struct<{ readonly Key: Schema.Literal<3>; readonly Value: Schema.String }>
                  ]
                >
              >
            }>,
            readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
          >
        >
        readonly pg: Schema.NullOr<
          Schema.StructWithRest<
            Schema.Struct<{
              readonly b: Schema.decodeTo<
                Schema.BigInt,
                Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
                never,
                never
              >
              readonly u: Schema.decodeTo<
                Schema.BigInt,
                Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
                never,
                never
              >
              readonly j: Schema.decodeTo<
                Schema.BigInt,
                Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
                never,
                never
              >
              readonly c: Schema.Int
              readonly r1: Schema.Boolean
              readonly r2: Schema.Boolean
              readonly r3: Schema.Boolean
              readonly r4: Schema.Boolean
              readonly r5: Schema.Boolean
              readonly r: Schema.$Array<
                Schema.Union<
                  readonly [
                    Schema.Struct<{ readonly Key: Schema.Literal<0>; readonly Value: Schema.Int }>,
                    Schema.Struct<{ readonly Key: Schema.Literal<1>; readonly Value: Schema.Int }>,
                    Schema.Struct<{
                      readonly Key: Schema.Literal<2>
                      readonly Value: Schema.StructWithRest<
                        Schema.Struct<{ readonly plane_id: Schema.Int; readonly part_type: Schema.Int }>,
                        readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
                      >
                    }>,
                    Schema.Struct<{ readonly Key: Schema.Literal<3>; readonly Value: Schema.String }>
                  ]
                >
              >
            }>,
            readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
          >
        >
        readonly carrierPorts: Schema.$Record<
          Schema.String,
          Schema.$Record<
            Schema.String,
            Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
          >
        >
        readonly skins: Schema.$Array<Schema.String>
        readonly skinPass: Schema.Boolean
        readonly adSkips: Schema.decodeTo<
          Schema.BigInt,
          Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
          never,
          never
        >
        readonly nMST: Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
        readonly mJL: Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
        readonly bldHQ: Schema.Int
        readonly bldPRem: Schema.Int
        readonly bldCRem: Schema.Int
      }>,
      readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
    >,
    Schema.String,
    never,
    never
  >,
  Schema.Uint8Array,
  never,
  never
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/pocket-planes-sdk/src/Save.ts#L1059)

Since v1.0.0

## ShopLogItem

A market refresh the player has seen (the game's `ShopLogItem`). `ts` is in
seconds since 0001-01-01 (`DateTime.Ticks` / 10^7).

**Signature**

```ts
declare const ShopLogItem: Schema.StructWithRest<
  Schema.Struct<{
    readonly ts: Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
    readonly seed: Schema.Int
  }>,
  readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/pocket-planes-sdk/src/Save.ts#L642)

Since v1.0.0

## Trip

A plane's current or last trip (the game's `Trip`). `start_time` is in Unix
seconds.

**Signature**

```ts
declare const Trip: Schema.StructWithRest<
  Schema.Struct<{
    readonly evaluated: Schema.Boolean
    readonly is_complete: Schema.Boolean
    readonly offload_complete: Schema.Boolean
    readonly start_time: Schema.decodeTo<
      Schema.BigInt,
      Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
      never,
      never
    >
    readonly Legs: Schema.$Array<
      Schema.StructWithRest<
        Schema.Struct<{
          readonly is_complete: Schema.Boolean
          readonly offload_complete: Schema.Boolean
          readonly start_city: Schema.Int
          readonly end_city: Schema.Int
          readonly distance: Schema.decodeTo<
            Schema.Finite,
            Schema.Union<readonly [Schema.instanceOf<JsonDouble, unknown>, Schema.Finite]>,
            never,
            never
          >
          readonly speed_bonus: Schema.decodeTo<
            Schema.Finite,
            Schema.Union<readonly [Schema.instanceOf<JsonDouble, unknown>, Schema.Finite]>,
            never,
            never
          >
        }>,
        readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
      >
    >
    readonly arrivedLegsCount: Schema.Int
  }>,
  readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/pocket-planes-sdk/src/Save.ts#L626)

Since v1.0.0

## TripLeg

One leg of a trip (the game's `TripLeg`). `distance` is a C# `double` and
`speed_bonus` a `float`.

**Signature**

```ts
declare const TripLeg: Schema.StructWithRest<
  Schema.Struct<{
    readonly is_complete: Schema.Boolean
    readonly offload_complete: Schema.Boolean
    readonly start_city: Schema.Int
    readonly end_city: Schema.Int
    readonly distance: Schema.decodeTo<
      Schema.Finite,
      Schema.Union<readonly [Schema.instanceOf<JsonDouble, unknown>, Schema.Finite]>,
      never,
      never
    >
    readonly speed_bonus: Schema.decodeTo<
      Schema.Finite,
      Schema.Union<readonly [Schema.instanceOf<JsonDouble, unknown>, Schema.Finite]>,
      never,
      never
    >
  }>,
  readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/pocket-planes-sdk/src/Save.ts#L610)

Since v1.0.0
