---
title: Save.ts
nav_order: 3
parent: Modules
---

## Save.ts overview

LEGO Tower's save. The game (version 1.27.2) keeps it as one JSON string:
`LTPlayer._Save` fills an `LTSave` with `LTPlayer.PlayerDict()` and
`LTowerController.ToDSO()`, serializes it with `LTSave.ToJson`
(Newtonsoft.Json, no indentation) and stores it in PlayerPrefs under
`"LGTower"`; `LTPlayer.LoadFromDisk` reads that string back with
`JsonConvert.DeserializeObject<LTSave>`, and a save pulled from the sync
server reaches `LTPlayer.HandleSyncSave` as the same JSON. The game skips
saving while the intro box of a new tower is up.

Determined on an Android emulator with Frida: the save strings in the test
fixtures are what `LTSave.ToJson` returned when the game's own
`LTPlayer._Save` ran (the PlayerPrefs value read back was identical), on a
tower fresh out of the intro and again after adding pieces, found bux, a
visit, a tip, a blocked code and a friend through the game's `LTPlayer`
methods. Which methods save and load, and the keys of the parts no
captured save held (missions, friend metadata), come from disassembling the
game's IL2CPP binary and its Java code.

Newtonsoft.Json writes a C# `double` with a decimal point (`1000.0`), and
`long`s such as `DateTime` ticks past 2^53, so the save is read with a JSON
reader that keeps both. Decoding drops nothing: keys this module does not
model (a newer game version may add some to the save or to any object in
it) are kept, and encoding writes them back. Encoding a decoded save string
the game wrote gives back the same bytes, except for key order:

- integer-like keys (the piece ids some dictionaries are keyed by) come
  first in their object, in ascending order, because JavaScript objects
  order such keys that way;
- in each object, the other keys this module models are written in the
  order it lists them (the order game version 1.27.2 writes them), and
  the keys it does not model after them, in the order they were read.

Any other JSON that decodes (with whitespace, escapes the game would not
write, or numbers spelled another way, such as `1.50`, or `1000` for a C#
`double`) encodes to the same values written the way the game writes
them, not to the same bytes. The player's sync secret (`playerS`) and email
(`playerE`) decode to `Redacted` values, so printing or logging a decoded
save does not show them; encoding writes them back as they were.

The sync server holds the save zlib-compressed, without the player's
secret and email (`SaveDataFromBytes`): the game's
`com.nimblebit.nbsync.SyncPush` cuts those out and compresses the rest with
`NBSync.compress`, which on the emulator gave the same bytes as zlib's
defaults.

Since v1.0.0

---

## Exports Grouped by Category

- [Models](#models)
  - [JsonDouble (class)](#jsondouble-class)
    - [value (property)](#value-property)
    - [single (property)](#single-property)
  - [JsonValue (type alias)](#jsonvalue-type-alias)
- [Primitives](#primitives)
  - [Double](#double)
  - [Float](#float)
  - [JsonValue](#jsonvalue)
  - [Long](#long)
- [Save items](#save-items)
  - [Floor](#floor)
  - [LTFriend](#ltfriend)
  - [LTFriendMeta](#ltfriendmeta)
  - [LTSave](#ltsave)
  - [Minifig](#minifig)
  - [Mission](#mission)
  - [Player](#player)
  - [Tower](#tower)
- [Schemas](#schemas)
  - [NewtonsoftJson](#newtonsoftjson)
  - [SaveData](#savedata)
  - [SaveDataFromBytes](#savedatafrombytes)

---

# Models

## JsonDouble (class)

A JSON number written with a decimal point or an exponent. Newtonsoft.Json
writes a C# `double` or `float` that way even when it holds a whole number
(`1000.0`), where an integer holding the same value is `1000`, so the
reader keeps such a number in this wrapper and the writer formats it back
the way the game does. `single` marks a C# `float`, whose shortest text can
be shorter than a double's.

**Signature**

```ts
declare class JsonDouble {
  constructor(value: number, single = false)
}
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/lego-tower-sdk/src/Save.ts#L93)

Since v1.0.0

### value (property)

**Signature**

```ts
readonly value: number
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/lego-tower-sdk/src/Save.ts#L94)

### single (property)

**Signature**

```ts
readonly single: boolean
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/lego-tower-sdk/src/Save.ts#L95)

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

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/lego-tower-sdk/src/Save.ts#L72)

Since v1.0.0

# Primitives

## Double

A C# `double` (`System.Double`). It decodes to a number and encodes to a
`JsonDouble`, so that a whole number writes back as `1000.0`.

**Signature**

```ts
declare const Double: Schema.decodeTo<
  Schema.Finite,
  Schema.Union<readonly [Schema.instanceOf<JsonDouble, unknown>, Schema.Finite]>,
  never,
  never
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/lego-tower-sdk/src/Save.ts#L357)

Since v1.0.0

## Float

A C# `float` (`System.Single`), like `Double` but written with the
shortest text that reads back as the same 32-bit float.

**Signature**

```ts
declare const Float: Schema.decodeTo<
  Schema.Finite,
  Schema.Union<readonly [Schema.instanceOf<JsonDouble, unknown>, Schema.Finite]>,
  never,
  never
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/lego-tower-sdk/src/Save.ts#L374)

Since v1.0.0

## JsonValue

Any JSON value, for the parts of the save the game keeps as
`Dictionary<string, object>` with no fixed shape, and for keys a newer game
version adds. A float literal stays a `JsonDouble`, so it writes back
as it was read.

**Signature**

```ts
declare const JsonValue: Schema.Codec<JsonValue, JsonValue, never, never>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/lego-tower-sdk/src/Save.ts#L336)

Since v1.0.0

## Long

A C# `long` (`System.Int64`) that can go past 2^53, such as `DateTime`
ticks, decoded to a `bigint` so that no digit is lost. It encodes to a
number when a double holds the value exactly, and to a `bigint` otherwise.

**Signature**

```ts
declare const Long: Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/lego-tower-sdk/src/Save.ts#L395)

Since v1.0.0

# Save items

## Floor

A floor of the tower, as `LTFloorController.ToDSO` writes it. `content` is
the floor's id in the floors table, `resIds` and `workerIds` are the
`ufid`s of the minifigures living and working there, and `openDate`,
`prodOutTimes` and `stockArrivalTimes` (one per product tier) are C#
`long` times, 0 in every captured save, read as `bigint`s in case they hold
`DateTime` ticks.

**Signature**

```ts
declare const Floor: Schema.StructWithRest<
  Schema.Struct<{
    content: Schema.String
    level: Schema.Int
    gold: Schema.Boolean
    resIds: Schema.$Array<
      Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
    >
    workerIds: Schema.$Array<
      Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
    >
    openDate: Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
    prodOutTimes: Schema.$Array<
      Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
    >
    stockArrivalTimes: Schema.$Array<
      Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
    >
    brickColor: Schema.Int
  }>,
  readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/lego-tower-sdk/src/Save.ts#L524)

Since v1.0.0

## LTFriend

A friend (`LTFriend`): their player id (`i`), the name the player gave them
(`n`), what the server last said about them (`m`), and `l`, a C# `long`
the game leaves 0 for a friend added by code.

**Signature**

```ts
declare const LTFriend: Schema.StructWithRest<
  Schema.Struct<{
    i: Schema.String
    n: Schema.String
    m: Schema.NullOr<
      Schema.StructWithRest<
        Schema.Struct<{
          level: Schema.optionalKey<Schema.Int>
          avatar: Schema.optionalKey<
            Schema.NullOr<Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>>
          >
          vip: Schema.optionalKey<Schema.Int>
          ts: Schema.optionalKey<Schema.Int>
          rpid: Schema.optionalKey<Schema.NullOr<Schema.String>>
          rfid: Schema.optionalKey<Schema.NullOr<Schema.String>>
          mg: Schema.optionalKey<Schema.Int>
          ver: Schema.optionalKey<Schema.NullOr<Schema.String>>
        }>,
        readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
      >
    >
    l: Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
  }>,
  readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/lego-tower-sdk/src/Save.ts#L452)

Since v1.0.0

## LTFriendMeta

What the sync server last told the game about a friend (`LTFriendMeta`):
their level, avatar and game version. Newtonsoft.Json writes the class's
public fields, which these keys are; a friend added by code has none
(`m` is null) until the game fetches it, and no captured save had one, so
every key is optional here.

**Signature**

```ts
declare const LTFriendMeta: Schema.StructWithRest<
  Schema.Struct<{
    level: Schema.optionalKey<Schema.Int>
    avatar: Schema.optionalKey<
      Schema.NullOr<Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>>
    >
    vip: Schema.optionalKey<Schema.Int>
    ts: Schema.optionalKey<Schema.Int>
    rpid: Schema.optionalKey<Schema.NullOr<Schema.String>>
    rfid: Schema.optionalKey<Schema.NullOr<Schema.String>>
    mg: Schema.optionalKey<Schema.Int>
    ver: Schema.optionalKey<Schema.NullOr<Schema.String>>
  }>,
  readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/lego-tower-sdk/src/Save.ts#L433)

Since v1.0.0

## LTSave

The save (`LTSave`): who the player is, their friends and the friends they
visited, tipped and blocked, and the player and tower dictionaries. The
game leaves `playerDict` and `towerDict` null until it first saves a built
tower. `timestamp` is C# `DateTime` ticks.

`playerI` is the player's id and `playerS` their sync secret (`playerE`
their email once registered, null until then), so a save string on the
device should be handled like a credential. `playerS` and `playerE` decode
to `Redacted` values (`NimblebitConfig.PlayerAuthKeySchema` and
`NimblebitConfig.PlayerEmailSchema` from `@tinyburg/nimblebit-sdk`), so
printing or logging a decoded save does not show them, and encode back to
the same strings. `playerS` must be a UUID, as the sync server hands it
out, or null, which is what Newtonsoft.Json writes for a C# string the game
never set (no captured save had a null `playerS`). The copy the game pushes
to the sync server has `playerS` and `playerE` cut out
(`com.nimblebit.nbsync.SyncPush`), which is why they are optional.

**Signature**

```ts
declare const LTSave: Schema.StructWithRest<
  Schema.Struct<{
    playerI: Schema.String
    playerS: Schema.optionalKey<Schema.NullOr<Schema.brand<Schema.RedactedFromValue<Schema.String>, "PlayerAuthKey">>>
    playerR: Schema.Int
    playerE: Schema.optionalKey<Schema.NullOr<Schema.brand<Schema.RedactedFromValue<Schema.String>, "PlayerEmail">>>
    pVer: Schema.String
    timestamp: Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
    friends: Schema.$Array<
      Schema.StructWithRest<
        Schema.Struct<{
          i: Schema.String
          n: Schema.String
          m: Schema.NullOr<
            Schema.StructWithRest<
              Schema.Struct<{
                level: Schema.optionalKey<Schema.Int>
                avatar: Schema.optionalKey<
                  Schema.NullOr<Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>>
                >
                vip: Schema.optionalKey<Schema.Int>
                ts: Schema.optionalKey<Schema.Int>
                rpid: Schema.optionalKey<Schema.NullOr<Schema.String>>
                rfid: Schema.optionalKey<Schema.NullOr<Schema.String>>
                mg: Schema.optionalKey<Schema.Int>
                ver: Schema.optionalKey<Schema.NullOr<Schema.String>>
              }>,
              readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
            >
          >
          l: Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
        }>,
        readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
      >
    >
    visits: Schema.$Record<
      Schema.String,
      Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
    >
    vtips: Schema.$Record<
      Schema.String,
      Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
    >
    blocked: Schema.$Array<Schema.String>
    playerDict: Schema.NullOr<
      Schema.StructWithRest<
        Schema.Struct<{
          tp: Schema.Int
          tut: Schema.Int
          coins: Schema.decodeTo<
            Schema.Finite,
            Schema.Union<readonly [Schema.instanceOf<JsonDouble, unknown>, Schema.Finite]>,
            never,
            never
          >
          bux: Schema.Int
          gold: Schema.Int
          maxgold: Schema.Int
          foundBux: Schema.Int
          ltv: Schema.Int
          foundPieces: Schema.$Record<Schema.String, Schema.Int>
          pieces: Schema.$Record<Schema.String, Schema.Int>
          sets: Schema.$Record<Schema.String, Schema.Boolean>
          foundChars: Schema.$Record<Schema.String, Schema.Boolean>
          charMissions: Schema.$Record<
            Schema.String,
            Schema.StructWithRest<
              Schema.Struct<{
                id: Schema.optionalKey<Schema.String>
                type: Schema.optionalKey<Schema.Int>
                propCount: Schema.optionalKey<Schema.Int>
                sourceUfid: Schema.optionalKey<
                  Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
                >
                missionUfid: Schema.optionalKey<
                  Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
                >
                headTop: Schema.optionalKey<Schema.NullOr<Schema.String>>
                head: Schema.optionalKey<Schema.NullOr<Schema.String>>
                torso: Schema.optionalKey<Schema.NullOr<Schema.String>>
                legs: Schema.optionalKey<Schema.NullOr<Schema.String>>
              }>,
              readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
            >
          >
          charLevels: Schema.$Record<Schema.String, Schema.Int>
          ageEnteredTicks: Schema.decodeTo<
            Schema.BigInt,
            Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
            never,
            never
          >
          isAdult: Schema.Boolean
          clubDayRem: Schema.Int
          playDay: Schema.Int
          playTimeToday: Schema.decodeTo<
            Schema.Finite,
            Schema.Union<readonly [Schema.instanceOf<JsonDouble, unknown>, Schema.Finite]>,
            never,
            never
          >
          totalPlayTime: Schema.decodeTo<
            Schema.Finite,
            Schema.Union<readonly [Schema.instanceOf<JsonDouble, unknown>, Schema.Finite]>,
            never,
            never
          >
          clubTrialed: Schema.Boolean
          infChecked: Schema.Boolean
          starterBought: Schema.Boolean
          reqFloor: Schema.String
          reqPiece: Schema.String
          rHand: Schema.Boolean
          autoLift: Schema.Boolean
          redMot: Schema.Boolean
          muteBB: Schema.Boolean
          muteQS: Schema.Boolean
          buxTip: Schema.Int
          timestamp: Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
          wnShown: Schema.String
          pFees: Schema.$Record<
            Schema.String,
            Schema.decodeTo<
              Schema.Finite,
              Schema.Union<readonly [Schema.instanceOf<JsonDouble, unknown>, Schema.Finite]>,
              never,
              never
            >
          >
        }>,
        readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
      >
    >
    towerDict: Schema.NullOr<
      Schema.StructWithRest<
        Schema.Struct<{
          skyline: Schema.String
          roof: Schema.String
          lift: Schema.String
          liftSpeed: Schema.decodeTo<
            Schema.Finite,
            Schema.Union<readonly [Schema.instanceOf<JsonDouble, unknown>, Schema.Finite]>,
            never,
            never
          >
          topColor: Schema.Int
          lastRentDay: Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
          lastDailyPiece: Schema.decodeTo<
            Schema.BigInt,
            Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
            never,
            never
          >
          nextDailyCol: Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
          nextDailyIndex: Schema.Int
          floors: Schema.$Array<
            Schema.StructWithRest<
              Schema.Struct<{
                content: Schema.String
                level: Schema.Int
                gold: Schema.Boolean
                resIds: Schema.$Array<
                  Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
                >
                workerIds: Schema.$Array<
                  Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
                >
                openDate: Schema.decodeTo<
                  Schema.BigInt,
                  Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
                  never,
                  never
                >
                prodOutTimes: Schema.$Array<
                  Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
                >
                stockArrivalTimes: Schema.$Array<
                  Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
                >
                brickColor: Schema.Int
              }>,
              readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
            >
          >
          doorman: Schema.StructWithRest<
            Schema.Struct<{
              ufid: Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
              fname: Schema.String
              dreamFloor: Schema.String
              homeFloor: Schema.String
              workFloor: Schema.String
              vip: Schema.Int
              skCre: Schema.Int
              skFoo: Schema.Int
              skSer: Schema.Int
              skRec: Schema.Int
              skRet: Schema.Int
              htPiece: Schema.String
              hPiece: Schema.String
              tPiece: Schema.String
              lPiece: Schema.String
              dreamed: Schema.Boolean
              hc: Schema.String
              from: Schema.String
            }>,
            readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
          >
          lifeFigs: Schema.Int
          figs: Schema.$Array<
            Schema.StructWithRest<
              Schema.Struct<{
                ufid: Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
                fname: Schema.String
                dreamFloor: Schema.String
                homeFloor: Schema.String
                workFloor: Schema.String
                vip: Schema.Int
                skCre: Schema.Int
                skFoo: Schema.Int
                skSer: Schema.Int
                skRec: Schema.Int
                skRet: Schema.Int
                htPiece: Schema.String
                hPiece: Schema.String
                tPiece: Schema.String
                lPiece: Schema.String
                dreamed: Schema.Boolean
                hc: Schema.String
                from: Schema.String
              }>,
              readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
            >
          >
          mission: Schema.optionalKey<
            Schema.StructWithRest<
              Schema.Struct<{
                id: Schema.optionalKey<Schema.String>
                type: Schema.optionalKey<Schema.Int>
                propCount: Schema.optionalKey<Schema.Int>
                sourceUfid: Schema.optionalKey<
                  Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
                >
                missionUfid: Schema.optionalKey<
                  Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
                >
                headTop: Schema.optionalKey<Schema.NullOr<Schema.String>>
                head: Schema.optionalKey<Schema.NullOr<Schema.String>>
                torso: Schema.optionalKey<Schema.NullOr<Schema.String>>
                legs: Schema.optionalKey<Schema.NullOr<Schema.String>>
              }>,
              readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
            >
          >
          bbPosts: Schema.$Array<Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>>
          bbUnread: Schema.Int
        }>,
        readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
      >
    >
  }>,
  readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/lego-tower-sdk/src/Save.ts#L636)

Since v1.0.0

## Minifig

A minifigure, as `LTMinifigController.ToDSO` writes it: a resident, worker
or visitor in the tower's `figs`, or the tower's `doorman`. The four piece
ids (`htPiece` head top, `hPiece` head, `tPiece` torso, `lPiece` legs) are
ids from the pieces table, and the floor ids are content ids from the
floors table, empty when the minifigure has no home or job.

**Signature**

```ts
declare const Minifig: Schema.StructWithRest<
  Schema.Struct<{
    ufid: Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
    fname: Schema.String
    dreamFloor: Schema.String
    homeFloor: Schema.String
    workFloor: Schema.String
    vip: Schema.Int
    skCre: Schema.Int
    skFoo: Schema.Int
    skSer: Schema.Int
    skRec: Schema.Int
    skRet: Schema.Int
    htPiece: Schema.String
    hPiece: Schema.String
    tPiece: Schema.String
    lPiece: Schema.String
    dreamed: Schema.Boolean
    hc: Schema.String
    from: Schema.String
  }>,
  readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/lego-tower-sdk/src/Save.ts#L492)

Since v1.0.0

## Mission

A mission, as `LTMissionInfo.ToDict` writes it: a character's mission in
the player's `charMissions`, or the tower's current `mission`. `id` is a
mission id from the missions table and `type` the `LTMissionType` value
(Newtonsoft.Json writes enums as numbers); the rest depends on the kind of
mission. No captured save held a mission, so the keys come from the
game's code and are all optional here.

**Signature**

```ts
declare const Mission: Schema.StructWithRest<
  Schema.Struct<{
    id: Schema.optionalKey<Schema.String>
    type: Schema.optionalKey<Schema.Int>
    propCount: Schema.optionalKey<Schema.Int>
    sourceUfid: Schema.optionalKey<
      Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
    >
    missionUfid: Schema.optionalKey<
      Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
    >
    headTop: Schema.optionalKey<Schema.NullOr<Schema.String>>
    head: Schema.optionalKey<Schema.NullOr<Schema.String>>
    torso: Schema.optionalKey<Schema.NullOr<Schema.String>>
    legs: Schema.optionalKey<Schema.NullOr<Schema.String>>
  }>,
  readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/lego-tower-sdk/src/Save.ts#L470)

Since v1.0.0

## Player

The player's progress, as `LTPlayer.PlayerDict` writes it into the save's
`playerDict`. `pieces` and `foundPieces` count the pieces owned and found
by piece id, `sets` holds the floors, roofs, lifts and skylines unlocked
(by set id), `foundChars`, `charMissions` and `charLevels` the hidden characters
found, their missions and their levels, and `pFees` the parking fees by
vehicle. `ageEnteredTicks` and `timestamp` are C# `DateTime` ticks.

**Signature**

```ts
declare const Player: Schema.StructWithRest<
  Schema.Struct<{
    tp: Schema.Int
    tut: Schema.Int
    coins: Schema.decodeTo<
      Schema.Finite,
      Schema.Union<readonly [Schema.instanceOf<JsonDouble, unknown>, Schema.Finite]>,
      never,
      never
    >
    bux: Schema.Int
    gold: Schema.Int
    maxgold: Schema.Int
    foundBux: Schema.Int
    ltv: Schema.Int
    foundPieces: Schema.$Record<Schema.String, Schema.Int>
    pieces: Schema.$Record<Schema.String, Schema.Int>
    sets: Schema.$Record<Schema.String, Schema.Boolean>
    foundChars: Schema.$Record<Schema.String, Schema.Boolean>
    charMissions: Schema.$Record<
      Schema.String,
      Schema.StructWithRest<
        Schema.Struct<{
          id: Schema.optionalKey<Schema.String>
          type: Schema.optionalKey<Schema.Int>
          propCount: Schema.optionalKey<Schema.Int>
          sourceUfid: Schema.optionalKey<
            Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
          >
          missionUfid: Schema.optionalKey<
            Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
          >
          headTop: Schema.optionalKey<Schema.NullOr<Schema.String>>
          head: Schema.optionalKey<Schema.NullOr<Schema.String>>
          torso: Schema.optionalKey<Schema.NullOr<Schema.String>>
          legs: Schema.optionalKey<Schema.NullOr<Schema.String>>
        }>,
        readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
      >
    >
    charLevels: Schema.$Record<Schema.String, Schema.Int>
    ageEnteredTicks: Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
    isAdult: Schema.Boolean
    clubDayRem: Schema.Int
    playDay: Schema.Int
    playTimeToday: Schema.decodeTo<
      Schema.Finite,
      Schema.Union<readonly [Schema.instanceOf<JsonDouble, unknown>, Schema.Finite]>,
      never,
      never
    >
    totalPlayTime: Schema.decodeTo<
      Schema.Finite,
      Schema.Union<readonly [Schema.instanceOf<JsonDouble, unknown>, Schema.Finite]>,
      never,
      never
    >
    clubTrialed: Schema.Boolean
    infChecked: Schema.Boolean
    starterBought: Schema.Boolean
    reqFloor: Schema.String
    reqPiece: Schema.String
    rHand: Schema.Boolean
    autoLift: Schema.Boolean
    redMot: Schema.Boolean
    muteBB: Schema.Boolean
    muteQS: Schema.Boolean
    buxTip: Schema.Int
    timestamp: Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
    wnShown: Schema.String
    pFees: Schema.$Record<
      Schema.String,
      Schema.decodeTo<
        Schema.Finite,
        Schema.Union<readonly [Schema.instanceOf<JsonDouble, unknown>, Schema.Finite]>,
        never,
        never
      >
    >
  }>,
  readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/lego-tower-sdk/src/Save.ts#L547)

Since v1.0.0

## Tower

The tower, as `LTowerController.ToDSO` writes it into the save's
`towerDict`: the skyline, roof and lift set ids, the floors from the lobby
up, the doorman and the other minifigures, the current mission (only while
one is running) and the BrickBook posts, whose shape this module leaves
open. `liftSpeed` is a C# `float`. `lastRentDay`, `lastDailyPiece` and
`nextDailyCol` are C# `long`s, 0 in every captured save, read as `bigint`s
in case they hold `DateTime` ticks.

**Signature**

```ts
declare const Tower: Schema.StructWithRest<
  Schema.Struct<{
    skyline: Schema.String
    roof: Schema.String
    lift: Schema.String
    liftSpeed: Schema.decodeTo<
      Schema.Finite,
      Schema.Union<readonly [Schema.instanceOf<JsonDouble, unknown>, Schema.Finite]>,
      never,
      never
    >
    topColor: Schema.Int
    lastRentDay: Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
    lastDailyPiece: Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
    nextDailyCol: Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
    nextDailyIndex: Schema.Int
    floors: Schema.$Array<
      Schema.StructWithRest<
        Schema.Struct<{
          content: Schema.String
          level: Schema.Int
          gold: Schema.Boolean
          resIds: Schema.$Array<
            Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
          >
          workerIds: Schema.$Array<
            Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
          >
          openDate: Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
          prodOutTimes: Schema.$Array<
            Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
          >
          stockArrivalTimes: Schema.$Array<
            Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
          >
          brickColor: Schema.Int
        }>,
        readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
      >
    >
    doorman: Schema.StructWithRest<
      Schema.Struct<{
        ufid: Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
        fname: Schema.String
        dreamFloor: Schema.String
        homeFloor: Schema.String
        workFloor: Schema.String
        vip: Schema.Int
        skCre: Schema.Int
        skFoo: Schema.Int
        skSer: Schema.Int
        skRec: Schema.Int
        skRet: Schema.Int
        htPiece: Schema.String
        hPiece: Schema.String
        tPiece: Schema.String
        lPiece: Schema.String
        dreamed: Schema.Boolean
        hc: Schema.String
        from: Schema.String
      }>,
      readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
    >
    lifeFigs: Schema.Int
    figs: Schema.$Array<
      Schema.StructWithRest<
        Schema.Struct<{
          ufid: Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
          fname: Schema.String
          dreamFloor: Schema.String
          homeFloor: Schema.String
          workFloor: Schema.String
          vip: Schema.Int
          skCre: Schema.Int
          skFoo: Schema.Int
          skSer: Schema.Int
          skRec: Schema.Int
          skRet: Schema.Int
          htPiece: Schema.String
          hPiece: Schema.String
          tPiece: Schema.String
          lPiece: Schema.String
          dreamed: Schema.Boolean
          hc: Schema.String
          from: Schema.String
        }>,
        readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
      >
    >
    mission: Schema.optionalKey<
      Schema.StructWithRest<
        Schema.Struct<{
          id: Schema.optionalKey<Schema.String>
          type: Schema.optionalKey<Schema.Int>
          propCount: Schema.optionalKey<Schema.Int>
          sourceUfid: Schema.optionalKey<
            Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
          >
          missionUfid: Schema.optionalKey<
            Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
          >
          headTop: Schema.optionalKey<Schema.NullOr<Schema.String>>
          head: Schema.optionalKey<Schema.NullOr<Schema.String>>
          torso: Schema.optionalKey<Schema.NullOr<Schema.String>>
          legs: Schema.optionalKey<Schema.NullOr<Schema.String>>
        }>,
        readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
      >
    >
    bbPosts: Schema.$Array<Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>>
    bbUnread: Schema.Int
  }>,
  readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/lego-tower-sdk/src/Save.ts#L596)

Since v1.0.0

# Schemas

## NewtonsoftJson

Any JSON text to its `JsonValue` and back, reading and writing
numbers the way Newtonsoft.Json does: C# longs past 2^53 stay whole, and a
number written with a decimal point keeps it.

**Signature**

```ts
declare const NewtonsoftJson: Schema.decodeTo<
  Schema.Codec<JsonValue, JsonValue, never, never>,
  Schema.String,
  never,
  never
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/lego-tower-sdk/src/Save.ts#L677)

Since v1.0.0

## SaveData

LEGO Tower's save string, as `LTSave.ToJson` writes it and
`LTPlayer.LoadFromDisk` reads it back, decoded to an `LTSave`.

Decoding keeps keys the schemas do not model, at the top level and in every
object of the save (friends, missions, minifigures, floors, the player and
tower dictionaries), and encoding writes them back. Encoding a save string
the game wrote gives back the same bytes, except that integer-like keys
(the piece ids some dictionaries are keyed by) come first in their object
in ascending order, and that in each object the keys this module does not
model come after the ones it does, which are written in the order game
version 1.27.2 writes them. Other JSON that decodes (whitespace, other
escapes or number spellings) encodes to the same values in the game's
formatting, not to the same bytes.

**Signature**

```ts
declare const SaveData: Schema.decodeTo<
  Schema.StructWithRest<
    Schema.Struct<{
      playerI: Schema.String
      playerS: Schema.optionalKey<Schema.NullOr<Schema.brand<Schema.RedactedFromValue<Schema.String>, "PlayerAuthKey">>>
      playerR: Schema.Int
      playerE: Schema.optionalKey<Schema.NullOr<Schema.brand<Schema.RedactedFromValue<Schema.String>, "PlayerEmail">>>
      pVer: Schema.String
      timestamp: Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
      friends: Schema.$Array<
        Schema.StructWithRest<
          Schema.Struct<{
            i: Schema.String
            n: Schema.String
            m: Schema.NullOr<
              Schema.StructWithRest<
                Schema.Struct<{
                  level: Schema.optionalKey<Schema.Int>
                  avatar: Schema.optionalKey<
                    Schema.NullOr<Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>>
                  >
                  vip: Schema.optionalKey<Schema.Int>
                  ts: Schema.optionalKey<Schema.Int>
                  rpid: Schema.optionalKey<Schema.NullOr<Schema.String>>
                  rfid: Schema.optionalKey<Schema.NullOr<Schema.String>>
                  mg: Schema.optionalKey<Schema.Int>
                  ver: Schema.optionalKey<Schema.NullOr<Schema.String>>
                }>,
                readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
              >
            >
            l: Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
          }>,
          readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
        >
      >
      visits: Schema.$Record<
        Schema.String,
        Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
      >
      vtips: Schema.$Record<
        Schema.String,
        Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
      >
      blocked: Schema.$Array<Schema.String>
      playerDict: Schema.NullOr<
        Schema.StructWithRest<
          Schema.Struct<{
            tp: Schema.Int
            tut: Schema.Int
            coins: Schema.decodeTo<
              Schema.Finite,
              Schema.Union<readonly [Schema.instanceOf<JsonDouble, unknown>, Schema.Finite]>,
              never,
              never
            >
            bux: Schema.Int
            gold: Schema.Int
            maxgold: Schema.Int
            foundBux: Schema.Int
            ltv: Schema.Int
            foundPieces: Schema.$Record<Schema.String, Schema.Int>
            pieces: Schema.$Record<Schema.String, Schema.Int>
            sets: Schema.$Record<Schema.String, Schema.Boolean>
            foundChars: Schema.$Record<Schema.String, Schema.Boolean>
            charMissions: Schema.$Record<
              Schema.String,
              Schema.StructWithRest<
                Schema.Struct<{
                  id: Schema.optionalKey<Schema.String>
                  type: Schema.optionalKey<Schema.Int>
                  propCount: Schema.optionalKey<Schema.Int>
                  sourceUfid: Schema.optionalKey<
                    Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
                  >
                  missionUfid: Schema.optionalKey<
                    Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
                  >
                  headTop: Schema.optionalKey<Schema.NullOr<Schema.String>>
                  head: Schema.optionalKey<Schema.NullOr<Schema.String>>
                  torso: Schema.optionalKey<Schema.NullOr<Schema.String>>
                  legs: Schema.optionalKey<Schema.NullOr<Schema.String>>
                }>,
                readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
              >
            >
            charLevels: Schema.$Record<Schema.String, Schema.Int>
            ageEnteredTicks: Schema.decodeTo<
              Schema.BigInt,
              Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
              never,
              never
            >
            isAdult: Schema.Boolean
            clubDayRem: Schema.Int
            playDay: Schema.Int
            playTimeToday: Schema.decodeTo<
              Schema.Finite,
              Schema.Union<readonly [Schema.instanceOf<JsonDouble, unknown>, Schema.Finite]>,
              never,
              never
            >
            totalPlayTime: Schema.decodeTo<
              Schema.Finite,
              Schema.Union<readonly [Schema.instanceOf<JsonDouble, unknown>, Schema.Finite]>,
              never,
              never
            >
            clubTrialed: Schema.Boolean
            infChecked: Schema.Boolean
            starterBought: Schema.Boolean
            reqFloor: Schema.String
            reqPiece: Schema.String
            rHand: Schema.Boolean
            autoLift: Schema.Boolean
            redMot: Schema.Boolean
            muteBB: Schema.Boolean
            muteQS: Schema.Boolean
            buxTip: Schema.Int
            timestamp: Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
            wnShown: Schema.String
            pFees: Schema.$Record<
              Schema.String,
              Schema.decodeTo<
                Schema.Finite,
                Schema.Union<readonly [Schema.instanceOf<JsonDouble, unknown>, Schema.Finite]>,
                never,
                never
              >
            >
          }>,
          readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
        >
      >
      towerDict: Schema.NullOr<
        Schema.StructWithRest<
          Schema.Struct<{
            skyline: Schema.String
            roof: Schema.String
            lift: Schema.String
            liftSpeed: Schema.decodeTo<
              Schema.Finite,
              Schema.Union<readonly [Schema.instanceOf<JsonDouble, unknown>, Schema.Finite]>,
              never,
              never
            >
            topColor: Schema.Int
            lastRentDay: Schema.decodeTo<
              Schema.BigInt,
              Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
              never,
              never
            >
            lastDailyPiece: Schema.decodeTo<
              Schema.BigInt,
              Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
              never,
              never
            >
            nextDailyCol: Schema.decodeTo<
              Schema.BigInt,
              Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
              never,
              never
            >
            nextDailyIndex: Schema.Int
            floors: Schema.$Array<
              Schema.StructWithRest<
                Schema.Struct<{
                  content: Schema.String
                  level: Schema.Int
                  gold: Schema.Boolean
                  resIds: Schema.$Array<
                    Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
                  >
                  workerIds: Schema.$Array<
                    Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
                  >
                  openDate: Schema.decodeTo<
                    Schema.BigInt,
                    Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
                    never,
                    never
                  >
                  prodOutTimes: Schema.$Array<
                    Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
                  >
                  stockArrivalTimes: Schema.$Array<
                    Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
                  >
                  brickColor: Schema.Int
                }>,
                readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
              >
            >
            doorman: Schema.StructWithRest<
              Schema.Struct<{
                ufid: Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
                fname: Schema.String
                dreamFloor: Schema.String
                homeFloor: Schema.String
                workFloor: Schema.String
                vip: Schema.Int
                skCre: Schema.Int
                skFoo: Schema.Int
                skSer: Schema.Int
                skRec: Schema.Int
                skRet: Schema.Int
                htPiece: Schema.String
                hPiece: Schema.String
                tPiece: Schema.String
                lPiece: Schema.String
                dreamed: Schema.Boolean
                hc: Schema.String
                from: Schema.String
              }>,
              readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
            >
            lifeFigs: Schema.Int
            figs: Schema.$Array<
              Schema.StructWithRest<
                Schema.Struct<{
                  ufid: Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
                  fname: Schema.String
                  dreamFloor: Schema.String
                  homeFloor: Schema.String
                  workFloor: Schema.String
                  vip: Schema.Int
                  skCre: Schema.Int
                  skFoo: Schema.Int
                  skSer: Schema.Int
                  skRec: Schema.Int
                  skRet: Schema.Int
                  htPiece: Schema.String
                  hPiece: Schema.String
                  tPiece: Schema.String
                  lPiece: Schema.String
                  dreamed: Schema.Boolean
                  hc: Schema.String
                  from: Schema.String
                }>,
                readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
              >
            >
            mission: Schema.optionalKey<
              Schema.StructWithRest<
                Schema.Struct<{
                  id: Schema.optionalKey<Schema.String>
                  type: Schema.optionalKey<Schema.Int>
                  propCount: Schema.optionalKey<Schema.Int>
                  sourceUfid: Schema.optionalKey<
                    Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
                  >
                  missionUfid: Schema.optionalKey<
                    Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
                  >
                  headTop: Schema.optionalKey<Schema.NullOr<Schema.String>>
                  head: Schema.optionalKey<Schema.NullOr<Schema.String>>
                  torso: Schema.optionalKey<Schema.NullOr<Schema.String>>
                  legs: Schema.optionalKey<Schema.NullOr<Schema.String>>
                }>,
                readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
              >
            >
            bbPosts: Schema.$Array<Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>>
            bbUnread: Schema.Int
          }>,
          readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
        >
      >
    }>,
    readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
  >,
  Schema.decodeTo<Schema.Codec<JsonValue, JsonValue, never, never>, Schema.String, never, never>,
  never,
  never
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/lego-tower-sdk/src/Save.ts#L699)

Since v1.0.0

## SaveDataFromBytes

A save as the sync server holds it: the `data` of a sync pull, after
Base64 decoding, is the save string compressed with zlib. The game pushes
it from `com.nimblebit.nbsync.SyncPush`, which reads the save from
PlayerPrefs, cuts out `playerS` and `playerE`, and compresses it with
`NBSync.compress` (`Deflater`, then Base64 with `NO_WRAP`); a pull goes
back through `NBSync.decodeSave` (Base64, `Inflater`) to
`LTPlayer.HandleSyncSave`. The game's `NBSync.encodeSave` gave exactly
Base64 of zlib's default compression on the emulator; no server response
was fetched to compare. Decoding and encoding are asynchronous (they use
the platform's `DecompressionStream` and `CompressionStream`), so use the
effectful or promise based decode and encode functions with it.

**Signature**

```ts
declare const SaveDataFromBytes: Schema.decodeTo<
  Schema.decodeTo<
    Schema.StructWithRest<
      Schema.Struct<{
        playerI: Schema.String
        playerS: Schema.optionalKey<
          Schema.NullOr<Schema.brand<Schema.RedactedFromValue<Schema.String>, "PlayerAuthKey">>
        >
        playerR: Schema.Int
        playerE: Schema.optionalKey<Schema.NullOr<Schema.brand<Schema.RedactedFromValue<Schema.String>, "PlayerEmail">>>
        pVer: Schema.String
        timestamp: Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
        friends: Schema.$Array<
          Schema.StructWithRest<
            Schema.Struct<{
              i: Schema.String
              n: Schema.String
              m: Schema.NullOr<
                Schema.StructWithRest<
                  Schema.Struct<{
                    level: Schema.optionalKey<Schema.Int>
                    avatar: Schema.optionalKey<
                      Schema.NullOr<Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>>
                    >
                    vip: Schema.optionalKey<Schema.Int>
                    ts: Schema.optionalKey<Schema.Int>
                    rpid: Schema.optionalKey<Schema.NullOr<Schema.String>>
                    rfid: Schema.optionalKey<Schema.NullOr<Schema.String>>
                    mg: Schema.optionalKey<Schema.Int>
                    ver: Schema.optionalKey<Schema.NullOr<Schema.String>>
                  }>,
                  readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
                >
              >
              l: Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
            }>,
            readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
          >
        >
        visits: Schema.$Record<
          Schema.String,
          Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
        >
        vtips: Schema.$Record<
          Schema.String,
          Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
        >
        blocked: Schema.$Array<Schema.String>
        playerDict: Schema.NullOr<
          Schema.StructWithRest<
            Schema.Struct<{
              tp: Schema.Int
              tut: Schema.Int
              coins: Schema.decodeTo<
                Schema.Finite,
                Schema.Union<readonly [Schema.instanceOf<JsonDouble, unknown>, Schema.Finite]>,
                never,
                never
              >
              bux: Schema.Int
              gold: Schema.Int
              maxgold: Schema.Int
              foundBux: Schema.Int
              ltv: Schema.Int
              foundPieces: Schema.$Record<Schema.String, Schema.Int>
              pieces: Schema.$Record<Schema.String, Schema.Int>
              sets: Schema.$Record<Schema.String, Schema.Boolean>
              foundChars: Schema.$Record<Schema.String, Schema.Boolean>
              charMissions: Schema.$Record<
                Schema.String,
                Schema.StructWithRest<
                  Schema.Struct<{
                    id: Schema.optionalKey<Schema.String>
                    type: Schema.optionalKey<Schema.Int>
                    propCount: Schema.optionalKey<Schema.Int>
                    sourceUfid: Schema.optionalKey<
                      Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
                    >
                    missionUfid: Schema.optionalKey<
                      Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
                    >
                    headTop: Schema.optionalKey<Schema.NullOr<Schema.String>>
                    head: Schema.optionalKey<Schema.NullOr<Schema.String>>
                    torso: Schema.optionalKey<Schema.NullOr<Schema.String>>
                    legs: Schema.optionalKey<Schema.NullOr<Schema.String>>
                  }>,
                  readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
                >
              >
              charLevels: Schema.$Record<Schema.String, Schema.Int>
              ageEnteredTicks: Schema.decodeTo<
                Schema.BigInt,
                Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
                never,
                never
              >
              isAdult: Schema.Boolean
              clubDayRem: Schema.Int
              playDay: Schema.Int
              playTimeToday: Schema.decodeTo<
                Schema.Finite,
                Schema.Union<readonly [Schema.instanceOf<JsonDouble, unknown>, Schema.Finite]>,
                never,
                never
              >
              totalPlayTime: Schema.decodeTo<
                Schema.Finite,
                Schema.Union<readonly [Schema.instanceOf<JsonDouble, unknown>, Schema.Finite]>,
                never,
                never
              >
              clubTrialed: Schema.Boolean
              infChecked: Schema.Boolean
              starterBought: Schema.Boolean
              reqFloor: Schema.String
              reqPiece: Schema.String
              rHand: Schema.Boolean
              autoLift: Schema.Boolean
              redMot: Schema.Boolean
              muteBB: Schema.Boolean
              muteQS: Schema.Boolean
              buxTip: Schema.Int
              timestamp: Schema.decodeTo<
                Schema.BigInt,
                Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
                never,
                never
              >
              wnShown: Schema.String
              pFees: Schema.$Record<
                Schema.String,
                Schema.decodeTo<
                  Schema.Finite,
                  Schema.Union<readonly [Schema.instanceOf<JsonDouble, unknown>, Schema.Finite]>,
                  never,
                  never
                >
              >
            }>,
            readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
          >
        >
        towerDict: Schema.NullOr<
          Schema.StructWithRest<
            Schema.Struct<{
              skyline: Schema.String
              roof: Schema.String
              lift: Schema.String
              liftSpeed: Schema.decodeTo<
                Schema.Finite,
                Schema.Union<readonly [Schema.instanceOf<JsonDouble, unknown>, Schema.Finite]>,
                never,
                never
              >
              topColor: Schema.Int
              lastRentDay: Schema.decodeTo<
                Schema.BigInt,
                Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
                never,
                never
              >
              lastDailyPiece: Schema.decodeTo<
                Schema.BigInt,
                Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
                never,
                never
              >
              nextDailyCol: Schema.decodeTo<
                Schema.BigInt,
                Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
                never,
                never
              >
              nextDailyIndex: Schema.Int
              floors: Schema.$Array<
                Schema.StructWithRest<
                  Schema.Struct<{
                    content: Schema.String
                    level: Schema.Int
                    gold: Schema.Boolean
                    resIds: Schema.$Array<
                      Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
                    >
                    workerIds: Schema.$Array<
                      Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
                    >
                    openDate: Schema.decodeTo<
                      Schema.BigInt,
                      Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
                      never,
                      never
                    >
                    prodOutTimes: Schema.$Array<
                      Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
                    >
                    stockArrivalTimes: Schema.$Array<
                      Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
                    >
                    brickColor: Schema.Int
                  }>,
                  readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
                >
              >
              doorman: Schema.StructWithRest<
                Schema.Struct<{
                  ufid: Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
                  fname: Schema.String
                  dreamFloor: Schema.String
                  homeFloor: Schema.String
                  workFloor: Schema.String
                  vip: Schema.Int
                  skCre: Schema.Int
                  skFoo: Schema.Int
                  skSer: Schema.Int
                  skRec: Schema.Int
                  skRet: Schema.Int
                  htPiece: Schema.String
                  hPiece: Schema.String
                  tPiece: Schema.String
                  lPiece: Schema.String
                  dreamed: Schema.Boolean
                  hc: Schema.String
                  from: Schema.String
                }>,
                readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
              >
              lifeFigs: Schema.Int
              figs: Schema.$Array<
                Schema.StructWithRest<
                  Schema.Struct<{
                    ufid: Schema.decodeTo<
                      Schema.BigInt,
                      Schema.Union<readonly [Schema.Int, Schema.BigInt]>,
                      never,
                      never
                    >
                    fname: Schema.String
                    dreamFloor: Schema.String
                    homeFloor: Schema.String
                    workFloor: Schema.String
                    vip: Schema.Int
                    skCre: Schema.Int
                    skFoo: Schema.Int
                    skSer: Schema.Int
                    skRec: Schema.Int
                    skRet: Schema.Int
                    htPiece: Schema.String
                    hPiece: Schema.String
                    tPiece: Schema.String
                    lPiece: Schema.String
                    dreamed: Schema.Boolean
                    hc: Schema.String
                    from: Schema.String
                  }>,
                  readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
                >
              >
              mission: Schema.optionalKey<
                Schema.StructWithRest<
                  Schema.Struct<{
                    id: Schema.optionalKey<Schema.String>
                    type: Schema.optionalKey<Schema.Int>
                    propCount: Schema.optionalKey<Schema.Int>
                    sourceUfid: Schema.optionalKey<
                      Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
                    >
                    missionUfid: Schema.optionalKey<
                      Schema.decodeTo<Schema.BigInt, Schema.Union<readonly [Schema.Int, Schema.BigInt]>, never, never>
                    >
                    headTop: Schema.optionalKey<Schema.NullOr<Schema.String>>
                    head: Schema.optionalKey<Schema.NullOr<Schema.String>>
                    torso: Schema.optionalKey<Schema.NullOr<Schema.String>>
                    legs: Schema.optionalKey<Schema.NullOr<Schema.String>>
                  }>,
                  readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
                >
              >
              bbPosts: Schema.$Array<Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>>
              bbUnread: Schema.Int
            }>,
            readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
          >
        >
      }>,
      readonly [Schema.$Record<Schema.String, Schema.Codec<JsonValue, JsonValue, never, never>>]
    >,
    Schema.decodeTo<Schema.Codec<JsonValue, JsonValue, never, never>, Schema.String, never, never>,
    never,
    never
  >,
  Schema.Uint8Array,
  never,
  never
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/lego-tower-sdk/src/Save.ts#L751)

Since v1.0.0
