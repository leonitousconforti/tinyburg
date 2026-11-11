---
title: Save.ts
nav_order: 3
parent: "@tinyburg/bitcity-sdk"
---

## Save.ts overview

Bit City's save: the game's `GameState` object as JSON, written by
Newtonsoft.Json.

`Player.Save()` builds a `GameState`, serializes it with
`JsonConvert.SerializeObject` and stores the string under the PlayerPrefs key
`bitcity3` (`Player.SaveKey`). `Player.LoadFromDisk()` reads that key back and
deserializes it into a `GameState`. The game only stores a save whose
`pTaps` is at least 1, so a fresh install still in its tutorial has none.

The cloud copy (`/sync/pull/bc/...`, see `BitCity.sync_pullSave`) is the
same JSON without the `playerS` and `playerE` keys, zlib-compressed: the
game's `NBSync.decodeSave` turns the pulled base64 `data` into the save
string by base64-decoding and inflating it. `SaveDataFromBytes` reads
those bytes.

Determined against Bit City 1.6.0 on an Android emulator with Frida: by
hooking `JsonConvert.SerializeObject`, `PlayerPrefs.SetString` and
`NBSync.decodeSave` while the game saved and pulled its save from the
server, by reading the calls `Player.Save()` and `Player.LoadFromDisk()`
make, and by growing a city with the game's own methods (buying and building
lots, upgrades, vehicles and missions) to see every key filled in. The test
fixtures are those saves, with the player's id and secret replaced.

The JSON is decoded losslessly: numbers keep their exact text until a field's
schema reads them, so C# `long` values above 2^53 (`cLastEarnTime`, in
`DateTime` ticks) survive. Keys this module does not model, which a newer
game version could add to the save, its lots or its progressive rewards, are
kept as they were read, as `JsonValue`s (numbers as their source text;
typed `unknown` on the decoded side), and written back; encoding checks their
values against `JsonValue` again. The player's auth salt (`playerS`)
and email (`playerE`) decode to `Redacted` values, so printing or logging a
decoded save does not show them. This needs `JSON.parse` source text access
and `JSON.rawJSON` (Node.js 21 and later).

Encoding writes JSON the way the game does: no whitespace, Newtonsoft's
string escapes (`\"`, `\\`, `\b`, `\t`, `\n`, `\f`, `\r`, `\u00XX` for other
control characters, and `\u0085`, `\u2028`, `\u2029`; everything else as
is), and doubles as the game's Mono runtime formats them (`50000.0`,
`1E+15`, 17 digits when 15 do not round-trip). Encoding a decoded save the
game wrote gives back the same string, byte for byte, with these exceptions:

- Keys that look like array indexes ("0", "1", ...) come first in their
  object, in ascending order, as JavaScript objects order such keys.
- In the save, in each lot and in `progressiveRewards`, the keys this module
  models come back in the order it lists them (the game's order), followed
  by the keys it does not model, in the order they were read. Dictionaries
  (`cLots`, `uCounts`, ...) keep their keys in the order they were read.

A string the game would not write (whitespace between tokens, other escapes
such as `\/` or `\u0041`, a double in a modeled field written with other
digits) decodes, and is written back the game's way.

Since v1.0.0

---

## Exports Grouped by Category

- [Models](#models)
  - [JsonValue (type alias)](#jsonvalue-type-alias)
  - [RawJson (interface)](#rawjson-interface)
- [Schemas](#schemas)
  - [GameState](#gamestate)
  - [JsonValue](#jsonvalue)
  - [Lot](#lot)
  - [ProgressiveRewards](#progressiverewards)
  - [SaveData](#savedata)
  - [SaveDataFromBytes](#savedatafrombytes)

---

# Models

## JsonValue (type alias)

A JSON value as this module reads one: what `JSON.parse` gives, except that
every number is a `RawJson` holding its source text, so no digit or
decimal point is lost.

**Signature**

```ts
type JsonValue = null | boolean | string | RawJson | ReadonlyArray<JsonValue> | { readonly [key: string]: JsonValue }
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/bitcity-sdk/src/Save.ts#L86)

Since v1.0.0

## RawJson (interface)

A JSON number exactly as the save wrote it, made by `JSON.rawJSON`:
`rawJSON` is its source text, which encoding writes back unchanged.

**Signature**

```ts
export interface RawJson {
  readonly rawJSON: string
}
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/bitcity-sdk/src/Save.ts#L74)

Since v1.0.0

# Schemas

## GameState

The game's `GameState`, keys in the order the game writes them. `p` keys
come from `Player`, `c` keys from `City`, `u` from `UpgradeDefs`:

- `pCoins`, `pBux`, `pKeys`: currencies; `pKeysSpent`; `pPig`: the piggy
  bank; `pBoostLeft`: double time left.
- `pTaps`: taps so far (the game refuses to save while it is 0).
- `pCityLvl`: the city reached; `pTutStep`: the tutorial step (5 when done).
- `pBuildings`: special buildings owned, by prefab; `pPastEarnRates`.
- `pVer`: the game version that wrote the save; `pCompls`; `pInfinite`.
- `cCarsUnlocked`, `cPlanesUnlocked`, `cBoatsUnlocked`: vehicles bought.
- `cLastEarnTime`: when earnings were last collected; `cTotalEarn`,
  `cBankEarn` (`-1.7976931348623157E+308`, `double.MinValue`, until the bank
  has earned).
- `cLots`: the lots, by the name of their `Lot` object.
- `uCounts`: upgrades bought, by upgrade id (see `Upgrades.upgrades`).
- `cComplMiss`: missions completed, by mission id; `cMissId` and `cMissProg`:
  the current mission and its progress (see `Missions.missions`).
- `playerI`, `playerS`, `playerR`, `playerE`: the player's cloud id, secret
  salt, registered flag (`"0"` or `"1"`) and email, `null` until known. The
  salt and email decode to `Redacted` values (`Redacted.value` reads them).
  The cloud copy has no `playerS` or `playerE` key.
- `progressiveRewards`.

Other keys are kept as `JsonValue`s (typed `unknown`). Meanings come
from the game's field names and from how values changed as a city grew; the
dictionaries left empty by those tests (`pBuildings`, `pPastEarnRates`) are
typed from the game's field types.

**Signature**

```ts
declare const GameState: Schema.StructWithRest<
  Schema.Struct<{
    readonly pCoins: Schema.decodeTo<Schema.Finite, Schema.declare<RawJson, RawJson>, never, never>
    readonly pBux: Schema.decodeTo<Schema.Finite, Schema.declare<RawJson, RawJson>, never, never>
    readonly pPig: Schema.decodeTo<Schema.Finite, Schema.declare<RawJson, RawJson>, never, never>
    readonly pKeys: Schema.decodeTo<Schema.Finite, Schema.declare<RawJson, RawJson>, never, never>
    readonly pKeysSpent: Schema.decodeTo<Schema.Finite, Schema.declare<RawJson, RawJson>, never, never>
    readonly pBoostLeft: Schema.decodeTo<Schema.Finite, Schema.declare<RawJson, RawJson>, never, never>
    readonly pTaps: Schema.decodeTo<Schema.Int, Schema.declare<RawJson, RawJson>, never, never>
    readonly pCityLvl: Schema.decodeTo<Schema.Int, Schema.declare<RawJson, RawJson>, never, never>
    readonly pTutStep: Schema.decodeTo<Schema.Int, Schema.declare<RawJson, RawJson>, never, never>
    readonly pBuildings: Schema.$Record<
      Schema.String,
      Schema.decodeTo<Schema.Int, Schema.declare<RawJson, RawJson>, never, never>
    >
    readonly pVer: Schema.String
    readonly pCompls: Schema.decodeTo<Schema.Int, Schema.declare<RawJson, RawJson>, never, never>
    readonly pInfinite: Schema.Boolean
    readonly pPastEarnRates: Schema.$Record<
      Schema.String,
      Schema.decodeTo<Schema.Finite, Schema.declare<RawJson, RawJson>, never, never>
    >
    readonly cCarsUnlocked: Schema.decodeTo<Schema.Int, Schema.declare<RawJson, RawJson>, never, never>
    readonly cPlanesUnlocked: Schema.decodeTo<Schema.Int, Schema.declare<RawJson, RawJson>, never, never>
    readonly cBoatsUnlocked: Schema.decodeTo<Schema.Int, Schema.declare<RawJson, RawJson>, never, never>
    readonly cLastEarnTime: Schema.compose<
      Schema.decodeTo<
        Schema.Union<
          readonly [
            Schema.DateTimeUtc,
            Schema.Struct<{ readonly date: Schema.DateTimeUtc; readonly extraTicks: Schema.BigInt }>
          ]
        >,
        Schema.BigInt,
        never,
        never
      >,
      Schema.decodeTo<Schema.BigInt, Schema.declare<RawJson, RawJson>, never, never>
    >
    readonly cTotalEarn: Schema.decodeTo<Schema.Finite, Schema.declare<RawJson, RawJson>, never, never>
    readonly cBankEarn: Schema.decodeTo<Schema.Finite, Schema.declare<RawJson, RawJson>, never, never>
    readonly cLots: Schema.$Record<
      Schema.String,
      Schema.StructWithRest<
        Schema.Struct<{
          readonly l: Schema.decodeTo<Schema.Int, Schema.declare<RawJson, RawJson>, never, never>
          readonly z: Schema.decodeTo<
            Schema.Literals<
              Array<
                | "None"
                | "Business"
                | "Residential"
                | "Service"
                | "Construction"
                | "Bank"
                | "Cityhall"
                | "Power"
                | "Parking"
                | "Airport"
                | "Port"
              >
            >,
            Schema.decodeTo<Schema.Int, Schema.declare<RawJson, RawJson>, never, never>,
            never,
            never
          >
          readonly f: Schema.String
          readonly r: Schema.decodeTo<Schema.Finite, Schema.declare<RawJson, RawJson>, never, never>
          readonly b: Schema.decodeTo<Schema.BigInt, Schema.declare<RawJson, RawJson>, never, never>
          readonly h: Schema.Boolean
        }>,
        readonly [
          Schema.$Record<
            Schema.String,
            Schema.decodeTo<Schema.Unknown, Schema.Codec<JsonValue, JsonValue, never, never>, never, never>
          >
        ]
      >
    >
    readonly uCounts: Schema.$Record<
      Schema.String,
      Schema.decodeTo<Schema.Int, Schema.declare<RawJson, RawJson>, never, never>
    >
    readonly cComplMiss: Schema.$Record<
      Schema.String,
      Schema.decodeTo<Schema.Int, Schema.declare<RawJson, RawJson>, never, never>
    >
    readonly cMissId: Schema.String
    readonly cMissProg: Schema.decodeTo<Schema.Finite, Schema.declare<RawJson, RawJson>, never, never>
    readonly playerI: Schema.NullOr<Schema.brand<Schema.String, "PlayerId">>
    readonly playerS: Schema.optionalKey<
      Schema.NullOr<Schema.brand<Schema.RedactedFromValue<Schema.String>, "PlayerAuthKey">>
    >
    readonly playerR: Schema.NullOr<Schema.String>
    readonly playerE: Schema.optionalKey<
      Schema.NullOr<Schema.brand<Schema.RedactedFromValue<Schema.String>, "PlayerEmail">>
    >
    readonly progressiveRewards: Schema.StructWithRest<
      Schema.Struct<{
        readonly currentCycleIndex: Schema.decodeTo<Schema.Int, Schema.declare<RawJson, RawJson>, never, never>
        readonly currentCycleRewardIndex: Schema.decodeTo<Schema.Int, Schema.declare<RawJson, RawJson>, never, never>
        readonly lastCycle: Schema.Union<
          readonly [
            Schema.compose<
              Schema.decodeTo<
                Schema.Union<
                  readonly [
                    Schema.DateTimeUtc,
                    Schema.Struct<{ readonly date: Schema.DateTimeUtc; readonly extraTicks: Schema.BigInt }>
                  ]
                >,
                Schema.BigInt,
                never,
                never
              >,
              Schema.decodeTo<Schema.BigInt, Schema.String, never, never>
            >,
            Schema.String
          ]
        >
        readonly lastFreeReward: Schema.Union<
          readonly [
            Schema.compose<
              Schema.decodeTo<
                Schema.Union<
                  readonly [
                    Schema.DateTimeUtc,
                    Schema.Struct<{ readonly date: Schema.DateTimeUtc; readonly extraTicks: Schema.BigInt }>
                  ]
                >,
                Schema.BigInt,
                never,
                never
              >,
              Schema.decodeTo<Schema.BigInt, Schema.String, never, never>
            >,
            Schema.String
          ]
        >
      }>,
      readonly [
        Schema.$Record<
          Schema.String,
          Schema.decodeTo<Schema.Unknown, Schema.Codec<JsonValue, JsonValue, never, never>, never, never>
        >
      ]
    >
  }>,
  readonly [
    Schema.$Record<
      Schema.String,
      Schema.decodeTo<Schema.Unknown, Schema.Codec<JsonValue, JsonValue, never, never>, never, never>
    >
  ]
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/bitcity-sdk/src/Save.ts#L428)

Since v1.0.0

## JsonValue

Any `JsonValue`, for the keys of the save that this module does not
model. Decoding and encoding leave it as it is.

**Signature**

```ts
declare const JsonValue: Schema.Codec<JsonValue, JsonValue, never, never>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/bitcity-sdk/src/Save.ts#L122)

Since v1.0.0

## Lot

One lot of the city (`GameState.cLots`), the game's `DSO` dictionary for a
`Lot`. Keys:

- `l`: the lot's level.
- `z`: its zone, the `ZoneType` enum written as its number.
- `f`: the prefab of the building on it (see `Buildings.buildings`, plus
  `power_N` for the power plant), or `""` while the lot is empty.
- `r`: the building's rotation in degrees.
- `b`: a time in ticks counted from the game's `GameState.RefDateTicks`
  (2016-11-01), set when a building goes up and `0` on lots never built on.
  What exactly it times is inferred, not confirmed.
- `h`: whether the building is historical.

Other keys are kept as `JsonValue`s (typed `unknown`).

**Signature**

```ts
declare const Lot: Schema.StructWithRest<
  Schema.Struct<{
    readonly l: Schema.decodeTo<Schema.Int, Schema.declare<RawJson, RawJson>, never, never>
    readonly z: Schema.decodeTo<
      Schema.Literals<
        Array<
          | "None"
          | "Business"
          | "Residential"
          | "Service"
          | "Construction"
          | "Bank"
          | "Cityhall"
          | "Power"
          | "Parking"
          | "Airport"
          | "Port"
        >
      >,
      Schema.decodeTo<Schema.Int, Schema.declare<RawJson, RawJson>, never, never>,
      never,
      never
    >
    readonly f: Schema.String
    readonly r: Schema.decodeTo<Schema.Finite, Schema.declare<RawJson, RawJson>, never, never>
    readonly b: Schema.decodeTo<Schema.BigInt, Schema.declare<RawJson, RawJson>, never, never>
    readonly h: Schema.Boolean
  }>,
  readonly [
    Schema.$Record<
      Schema.String,
      Schema.decodeTo<Schema.Unknown, Schema.Codec<JsonValue, JsonValue, never, never>, never, never>
    >
  ]
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/bitcity-sdk/src/Save.ts#L372)

Since v1.0.0

## ProgressiveRewards

The state of the progressive (ad and free) rewards, the game's
`ProgressiveRewards`. Only these four properties are saved; other keys are
kept as `JsonValue`s (typed `unknown`).

**Signature**

```ts
declare const ProgressiveRewards: Schema.StructWithRest<
  Schema.Struct<{
    readonly currentCycleIndex: Schema.decodeTo<Schema.Int, Schema.declare<RawJson, RawJson>, never, never>
    readonly currentCycleRewardIndex: Schema.decodeTo<Schema.Int, Schema.declare<RawJson, RawJson>, never, never>
    readonly lastCycle: Schema.Union<
      readonly [
        Schema.compose<
          Schema.decodeTo<
            Schema.Union<
              readonly [
                Schema.DateTimeUtc,
                Schema.Struct<{ readonly date: Schema.DateTimeUtc; readonly extraTicks: Schema.BigInt }>
              ]
            >,
            Schema.BigInt,
            never,
            never
          >,
          Schema.decodeTo<Schema.BigInt, Schema.String, never, never>
        >,
        Schema.String
      ]
    >
    readonly lastFreeReward: Schema.Union<
      readonly [
        Schema.compose<
          Schema.decodeTo<
            Schema.Union<
              readonly [
                Schema.DateTimeUtc,
                Schema.Struct<{ readonly date: Schema.DateTimeUtc; readonly extraTicks: Schema.BigInt }>
              ]
            >,
            Schema.BigInt,
            never,
            never
          >,
          Schema.decodeTo<Schema.BigInt, Schema.String, never, never>
        >,
        Schema.String
      ]
    >
  }>,
  readonly [
    Schema.$Record<
      Schema.String,
      Schema.decodeTo<Schema.Unknown, Schema.Codec<JsonValue, JsonValue, never, never>, never, never>
    >
  ]
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/bitcity-sdk/src/Save.ts#L389)

Since v1.0.0

## SaveData

Bit City's save: the string the game stores under the PlayerPrefs key
`bitcity3` (and that `Player.LoadFromDisk()` reads), or the inflated cloud
copy, decoded into a `GameState`.

Encoding a decoded save the game wrote gives back the same string, byte for
byte, with two exceptions: keys that look like array indexes ("0", "1", ...)
come first in their object, in ascending order; and in the save, each lot and
`progressiveRewards`, the keys this module models come back in its order (the
game's), followed by the keys it does not model, in the order they were
read. A string the game would not write decodes and is written back the
game's way (see the module documentation).

**Signature**

```ts
declare const SaveData: Schema.decodeTo<
  Schema.StructWithRest<
    Schema.Struct<{
      readonly pCoins: Schema.decodeTo<Schema.Finite, Schema.declare<RawJson, RawJson>, never, never>
      readonly pBux: Schema.decodeTo<Schema.Finite, Schema.declare<RawJson, RawJson>, never, never>
      readonly pPig: Schema.decodeTo<Schema.Finite, Schema.declare<RawJson, RawJson>, never, never>
      readonly pKeys: Schema.decodeTo<Schema.Finite, Schema.declare<RawJson, RawJson>, never, never>
      readonly pKeysSpent: Schema.decodeTo<Schema.Finite, Schema.declare<RawJson, RawJson>, never, never>
      readonly pBoostLeft: Schema.decodeTo<Schema.Finite, Schema.declare<RawJson, RawJson>, never, never>
      readonly pTaps: Schema.decodeTo<Schema.Int, Schema.declare<RawJson, RawJson>, never, never>
      readonly pCityLvl: Schema.decodeTo<Schema.Int, Schema.declare<RawJson, RawJson>, never, never>
      readonly pTutStep: Schema.decodeTo<Schema.Int, Schema.declare<RawJson, RawJson>, never, never>
      readonly pBuildings: Schema.$Record<
        Schema.String,
        Schema.decodeTo<Schema.Int, Schema.declare<RawJson, RawJson>, never, never>
      >
      readonly pVer: Schema.String
      readonly pCompls: Schema.decodeTo<Schema.Int, Schema.declare<RawJson, RawJson>, never, never>
      readonly pInfinite: Schema.Boolean
      readonly pPastEarnRates: Schema.$Record<
        Schema.String,
        Schema.decodeTo<Schema.Finite, Schema.declare<RawJson, RawJson>, never, never>
      >
      readonly cCarsUnlocked: Schema.decodeTo<Schema.Int, Schema.declare<RawJson, RawJson>, never, never>
      readonly cPlanesUnlocked: Schema.decodeTo<Schema.Int, Schema.declare<RawJson, RawJson>, never, never>
      readonly cBoatsUnlocked: Schema.decodeTo<Schema.Int, Schema.declare<RawJson, RawJson>, never, never>
      readonly cLastEarnTime: Schema.compose<
        Schema.decodeTo<
          Schema.Union<
            readonly [
              Schema.DateTimeUtc,
              Schema.Struct<{ readonly date: Schema.DateTimeUtc; readonly extraTicks: Schema.BigInt }>
            ]
          >,
          Schema.BigInt,
          never,
          never
        >,
        Schema.decodeTo<Schema.BigInt, Schema.declare<RawJson, RawJson>, never, never>
      >
      readonly cTotalEarn: Schema.decodeTo<Schema.Finite, Schema.declare<RawJson, RawJson>, never, never>
      readonly cBankEarn: Schema.decodeTo<Schema.Finite, Schema.declare<RawJson, RawJson>, never, never>
      readonly cLots: Schema.$Record<
        Schema.String,
        Schema.StructWithRest<
          Schema.Struct<{
            readonly l: Schema.decodeTo<Schema.Int, Schema.declare<RawJson, RawJson>, never, never>
            readonly z: Schema.decodeTo<
              Schema.Literals<
                Array<
                  | "None"
                  | "Business"
                  | "Residential"
                  | "Service"
                  | "Construction"
                  | "Bank"
                  | "Cityhall"
                  | "Power"
                  | "Parking"
                  | "Airport"
                  | "Port"
                >
              >,
              Schema.decodeTo<Schema.Int, Schema.declare<RawJson, RawJson>, never, never>,
              never,
              never
            >
            readonly f: Schema.String
            readonly r: Schema.decodeTo<Schema.Finite, Schema.declare<RawJson, RawJson>, never, never>
            readonly b: Schema.decodeTo<Schema.BigInt, Schema.declare<RawJson, RawJson>, never, never>
            readonly h: Schema.Boolean
          }>,
          readonly [
            Schema.$Record<
              Schema.String,
              Schema.decodeTo<Schema.Unknown, Schema.Codec<JsonValue, JsonValue, never, never>, never, never>
            >
          ]
        >
      >
      readonly uCounts: Schema.$Record<
        Schema.String,
        Schema.decodeTo<Schema.Int, Schema.declare<RawJson, RawJson>, never, never>
      >
      readonly cComplMiss: Schema.$Record<
        Schema.String,
        Schema.decodeTo<Schema.Int, Schema.declare<RawJson, RawJson>, never, never>
      >
      readonly cMissId: Schema.String
      readonly cMissProg: Schema.decodeTo<Schema.Finite, Schema.declare<RawJson, RawJson>, never, never>
      readonly playerI: Schema.NullOr<Schema.brand<Schema.String, "PlayerId">>
      readonly playerS: Schema.optionalKey<
        Schema.NullOr<Schema.brand<Schema.RedactedFromValue<Schema.String>, "PlayerAuthKey">>
      >
      readonly playerR: Schema.NullOr<Schema.String>
      readonly playerE: Schema.optionalKey<
        Schema.NullOr<Schema.brand<Schema.RedactedFromValue<Schema.String>, "PlayerEmail">>
      >
      readonly progressiveRewards: Schema.StructWithRest<
        Schema.Struct<{
          readonly currentCycleIndex: Schema.decodeTo<Schema.Int, Schema.declare<RawJson, RawJson>, never, never>
          readonly currentCycleRewardIndex: Schema.decodeTo<Schema.Int, Schema.declare<RawJson, RawJson>, never, never>
          readonly lastCycle: Schema.Union<
            readonly [
              Schema.compose<
                Schema.decodeTo<
                  Schema.Union<
                    readonly [
                      Schema.DateTimeUtc,
                      Schema.Struct<{ readonly date: Schema.DateTimeUtc; readonly extraTicks: Schema.BigInt }>
                    ]
                  >,
                  Schema.BigInt,
                  never,
                  never
                >,
                Schema.decodeTo<Schema.BigInt, Schema.String, never, never>
              >,
              Schema.String
            ]
          >
          readonly lastFreeReward: Schema.Union<
            readonly [
              Schema.compose<
                Schema.decodeTo<
                  Schema.Union<
                    readonly [
                      Schema.DateTimeUtc,
                      Schema.Struct<{ readonly date: Schema.DateTimeUtc; readonly extraTicks: Schema.BigInt }>
                    ]
                  >,
                  Schema.BigInt,
                  never,
                  never
                >,
                Schema.decodeTo<Schema.BigInt, Schema.String, never, never>
              >,
              Schema.String
            ]
          >
        }>,
        readonly [
          Schema.$Record<
            Schema.String,
            Schema.decodeTo<Schema.Unknown, Schema.Codec<JsonValue, JsonValue, never, never>, never, never>
          >
        ]
      >
    }>,
    readonly [
      Schema.$Record<
        Schema.String,
        Schema.decodeTo<Schema.Unknown, Schema.Codec<JsonValue, JsonValue, never, never>, never, never>
      >
    ]
  >,
  Schema.String,
  never,
  never
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/bitcity-sdk/src/Save.ts#L536)

Since v1.0.0

## SaveDataFromBytes

Bit City's cloud save: the bytes of the base64 `data` the server returns for
`/sync/pull/bc/...` (what `BitCity.sync_pullSave` returns), which are the
save string without its `playerS` and `playerE` keys, zlib-compressed.

Verified by inflating the `data` the game pulled and comparing it with the
string `NBSync.decodeSave` returned for it. Encoding compresses with the
runtime's zlib at its default level, which gave back the server's exact
bytes on Node.js. Leave `playerS` and `playerE` out to match what the game
uploads.

**Signature**

```ts
declare const SaveDataFromBytes: Schema.decodeTo<
  Schema.decodeTo<
    Schema.StructWithRest<
      Schema.Struct<{
        readonly pCoins: Schema.decodeTo<Schema.Finite, Schema.declare<RawJson, RawJson>, never, never>
        readonly pBux: Schema.decodeTo<Schema.Finite, Schema.declare<RawJson, RawJson>, never, never>
        readonly pPig: Schema.decodeTo<Schema.Finite, Schema.declare<RawJson, RawJson>, never, never>
        readonly pKeys: Schema.decodeTo<Schema.Finite, Schema.declare<RawJson, RawJson>, never, never>
        readonly pKeysSpent: Schema.decodeTo<Schema.Finite, Schema.declare<RawJson, RawJson>, never, never>
        readonly pBoostLeft: Schema.decodeTo<Schema.Finite, Schema.declare<RawJson, RawJson>, never, never>
        readonly pTaps: Schema.decodeTo<Schema.Int, Schema.declare<RawJson, RawJson>, never, never>
        readonly pCityLvl: Schema.decodeTo<Schema.Int, Schema.declare<RawJson, RawJson>, never, never>
        readonly pTutStep: Schema.decodeTo<Schema.Int, Schema.declare<RawJson, RawJson>, never, never>
        readonly pBuildings: Schema.$Record<
          Schema.String,
          Schema.decodeTo<Schema.Int, Schema.declare<RawJson, RawJson>, never, never>
        >
        readonly pVer: Schema.String
        readonly pCompls: Schema.decodeTo<Schema.Int, Schema.declare<RawJson, RawJson>, never, never>
        readonly pInfinite: Schema.Boolean
        readonly pPastEarnRates: Schema.$Record<
          Schema.String,
          Schema.decodeTo<Schema.Finite, Schema.declare<RawJson, RawJson>, never, never>
        >
        readonly cCarsUnlocked: Schema.decodeTo<Schema.Int, Schema.declare<RawJson, RawJson>, never, never>
        readonly cPlanesUnlocked: Schema.decodeTo<Schema.Int, Schema.declare<RawJson, RawJson>, never, never>
        readonly cBoatsUnlocked: Schema.decodeTo<Schema.Int, Schema.declare<RawJson, RawJson>, never, never>
        readonly cLastEarnTime: Schema.compose<
          Schema.decodeTo<
            Schema.Union<
              readonly [
                Schema.DateTimeUtc,
                Schema.Struct<{ readonly date: Schema.DateTimeUtc; readonly extraTicks: Schema.BigInt }>
              ]
            >,
            Schema.BigInt,
            never,
            never
          >,
          Schema.decodeTo<Schema.BigInt, Schema.declare<RawJson, RawJson>, never, never>
        >
        readonly cTotalEarn: Schema.decodeTo<Schema.Finite, Schema.declare<RawJson, RawJson>, never, never>
        readonly cBankEarn: Schema.decodeTo<Schema.Finite, Schema.declare<RawJson, RawJson>, never, never>
        readonly cLots: Schema.$Record<
          Schema.String,
          Schema.StructWithRest<
            Schema.Struct<{
              readonly l: Schema.decodeTo<Schema.Int, Schema.declare<RawJson, RawJson>, never, never>
              readonly z: Schema.decodeTo<
                Schema.Literals<
                  Array<
                    | "None"
                    | "Business"
                    | "Residential"
                    | "Service"
                    | "Construction"
                    | "Bank"
                    | "Cityhall"
                    | "Power"
                    | "Parking"
                    | "Airport"
                    | "Port"
                  >
                >,
                Schema.decodeTo<Schema.Int, Schema.declare<RawJson, RawJson>, never, never>,
                never,
                never
              >
              readonly f: Schema.String
              readonly r: Schema.decodeTo<Schema.Finite, Schema.declare<RawJson, RawJson>, never, never>
              readonly b: Schema.decodeTo<Schema.BigInt, Schema.declare<RawJson, RawJson>, never, never>
              readonly h: Schema.Boolean
            }>,
            readonly [
              Schema.$Record<
                Schema.String,
                Schema.decodeTo<Schema.Unknown, Schema.Codec<JsonValue, JsonValue, never, never>, never, never>
              >
            ]
          >
        >
        readonly uCounts: Schema.$Record<
          Schema.String,
          Schema.decodeTo<Schema.Int, Schema.declare<RawJson, RawJson>, never, never>
        >
        readonly cComplMiss: Schema.$Record<
          Schema.String,
          Schema.decodeTo<Schema.Int, Schema.declare<RawJson, RawJson>, never, never>
        >
        readonly cMissId: Schema.String
        readonly cMissProg: Schema.decodeTo<Schema.Finite, Schema.declare<RawJson, RawJson>, never, never>
        readonly playerI: Schema.NullOr<Schema.brand<Schema.String, "PlayerId">>
        readonly playerS: Schema.optionalKey<
          Schema.NullOr<Schema.brand<Schema.RedactedFromValue<Schema.String>, "PlayerAuthKey">>
        >
        readonly playerR: Schema.NullOr<Schema.String>
        readonly playerE: Schema.optionalKey<
          Schema.NullOr<Schema.brand<Schema.RedactedFromValue<Schema.String>, "PlayerEmail">>
        >
        readonly progressiveRewards: Schema.StructWithRest<
          Schema.Struct<{
            readonly currentCycleIndex: Schema.decodeTo<Schema.Int, Schema.declare<RawJson, RawJson>, never, never>
            readonly currentCycleRewardIndex: Schema.decodeTo<
              Schema.Int,
              Schema.declare<RawJson, RawJson>,
              never,
              never
            >
            readonly lastCycle: Schema.Union<
              readonly [
                Schema.compose<
                  Schema.decodeTo<
                    Schema.Union<
                      readonly [
                        Schema.DateTimeUtc,
                        Schema.Struct<{ readonly date: Schema.DateTimeUtc; readonly extraTicks: Schema.BigInt }>
                      ]
                    >,
                    Schema.BigInt,
                    never,
                    never
                  >,
                  Schema.decodeTo<Schema.BigInt, Schema.String, never, never>
                >,
                Schema.String
              ]
            >
            readonly lastFreeReward: Schema.Union<
              readonly [
                Schema.compose<
                  Schema.decodeTo<
                    Schema.Union<
                      readonly [
                        Schema.DateTimeUtc,
                        Schema.Struct<{ readonly date: Schema.DateTimeUtc; readonly extraTicks: Schema.BigInt }>
                      ]
                    >,
                    Schema.BigInt,
                    never,
                    never
                  >,
                  Schema.decodeTo<Schema.BigInt, Schema.String, never, never>
                >,
                Schema.String
              ]
            >
          }>,
          readonly [
            Schema.$Record<
              Schema.String,
              Schema.decodeTo<Schema.Unknown, Schema.Codec<JsonValue, JsonValue, never, never>, never, never>
            >
          ]
        >
      }>,
      readonly [
        Schema.$Record<
          Schema.String,
          Schema.decodeTo<Schema.Unknown, Schema.Codec<JsonValue, JsonValue, never, never>, never, never>
        >
      ]
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

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/bitcity-sdk/src/Save.ts#L583)

Since v1.0.0
