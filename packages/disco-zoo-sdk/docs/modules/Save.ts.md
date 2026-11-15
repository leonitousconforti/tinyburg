---
title: Save.ts
nav_order: 3
parent: Modules
---

## Save.ts overview

Disco Zoo's save (game version 1.6.3, save `dataVersion` 14).

The game keeps its state in two `DataManager`s. The "global" one holds the
`PlayerData`, `ZooData`, `StatsData`, `QuestManager`, `PetManager` and
`LoonManager`, the "local" one the `SceneryData`, `SettingsData` and
`StoreData`. `DataManager.GetSaveDataString` writes each with the game's
MiniJson as a JSON object from the data's name to the JSON string of its
`GetJSON()` (so every item is JSON inside a JSON string), and
`DataManager.LoadDataFromString` reads it back. The game writes those two
strings to `global.data` and `local.data` in its files directory, and
`CloudManager.Save` copies them into a `CloudSave`, whose `ToJson()` it
keeps in PlayerPrefs under `discozoo` (`CloudManager.SaveKey`). That string,
`{"localDataString":...,"globalDataString":...,"dataVersion":14,"xp":...}`,
is `SaveData`; `GlobalData` and `LocalData` are the two
`DataManager` strings.

For the sync server, `NBSync.savePlayer` hands the PlayerPrefs key
(`NBSync._prefName`, also `discozoo`) to the game's Java `SyncPush`
service, which reads that preference, URL-decodes it, removes the player's
salt and email (`,\"playerSalt\":\"...\"` and `,\"playerEmail\":\"...\"`
inside the nested `SettingsData`), and posts `NBSync.compress` of it: UTF-8,
zlib (`java.util.zip.Deflater` at its default level) and base64. So the
bytes the SDK's sync pull returns (`data` after base64) are the
zlib-compressed save without those two keys, which
`SaveDataFromBytes` reads; the salt and email are optional for that
reason. Both decode to `Redacted` values (`""` while the game has none), so
printing or logging a decoded save does not show them.

How this was determined: saves taken from the game on an emulator with a
Frida agent (`GetSaveDataString` of both managers, `CloudSave.ToJson`, the
PlayerPrefs value and the two files, which matched each other, for a fresh
game and for one grown with the game's own methods: debug unlocks, stats,
hats, decorations, toys, name tags, pets, a generated scenery lot, and pens
loaded through `LoadDataFromString` and written back by the game), the
field types the game's classes declare, the game's `MiniJson.Json.Serialize`
run on a test string, and the game's Java code (disassembly of `NBSync` and
`SyncPush`). The test fixtures are those saves, with the player's id and
salt replaced by fakes.

Numbers the game writes as strings stay strings in the save, so C# `long`
values (`DateTime` ticks, timers, coin totals) decode to `bigint` without
losing digits.

Every JSON object in the save (the `CloudSave`, the two `DataManager`
objects, each item and the objects inside items, such as pens, quests, pets
and scenery lots) keeps the keys this module does not model, such as ones a
newer game version adds, as JSON values beside the keys it does, and
encoding writes them back. Decoding never drops a key the game wrote.

Round trips: decoding a save string the game wrote and encoding it again
gives back the same string, byte for byte, whenever every key in it is one
this module models, as in every save game version 1.6.3 writes. Every
known exception:

- Encoding writes each object's unknown keys after its known keys (in the
  order they were read), so unknown keys read before or between known ones
  move to the end of their object.
- Unknown keys' values are read with `JSON.parse` and written the way
  MiniJson writes them, so strings, booleans, `null` and integers up to
  2^53 come back as they were, but a number that JavaScript writes
  differently (exponent notation such as `1E-05`, a trailing `.0`, an
  integer past 2^53) changes, and keys that look like array indexes
  (`"5"`) inside an unknown object move to its start.
- A key of an `AccountData` that looks like an array index would move
  to the start too (the game's keys are names).
- Text the game does not write (whitespace, other escapes, floats not in
  `float.ToString()` form, a key written twice in a JSON object, which
  keeps the last) decodes, but encodes in the game's form.

`SaveDataFromBytes` gives back the same save string, with the same
exceptions, but not necessarily the same compressed bytes.

Since v1.0.0

---

## Exports Grouped by Category

- [Primitives](#primitives)
  - [AccountData](#accountdata)
  - [BitString](#bitstring)
  - [IntList](#intlist)
  - [IntString](#intstring)
  - [LongString](#longstring)
  - [MiniJson](#minijson)
  - [SingleString](#singlestring)
- [Schemas](#schemas)
  - [CloudSave](#cloudsave)
  - [CollidableCell](#collidablecell)
  - [CustomPenData](#custompendata)
  - [DecorPenSet](#decorpenset)
  - [GlobalData](#globaldata)
  - [ItemSet](#itemset)
  - [LocalData](#localdata)
  - [LoonManager](#loonmanager)
  - [NamedAnimalData](#namedanimaldata)
  - [PathCell](#pathcell)
  - [PenData](#pendata)
  - [PetData](#petdata)
  - [PetManager](#petmanager)
  - [PetQuirk](#petquirk)
  - [PlayerData](#playerdata)
  - [Quest](#quest)
  - [QuestManager](#questmanager)
  - [SaveData](#savedata)
  - [SaveDataFromBytes](#savedatafrombytes)
  - [SceneryData](#scenerydata)
  - [SceneryLotData](#scenerylotdata)
  - [SettingsData](#settingsdata)
  - [StatsData](#statsdata)
  - [StoreData](#storedata)
  - [ZooData](#zoodata)

---

# Primitives

## AccountData

A C# `Dictionary<string, int>` the game writes as `key:value` pairs joined
by `,` (`DZUtils.StringifyDict`), such as `"Moon:1,Farm:1"`. Keys are names
(regions, tutorials, stat ids), which keep their order in a record; a key
that looks like an array index (`"5"`) would move to the start. A key that
appears twice fails to decode instead of losing one of its counts.

**Signature**

```ts
declare const AccountData: Schema.decodeTo<
  Schema.$Record<Schema.String, Schema.Int>,
  Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>,
  never,
  never
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/disco-zoo-sdk/src/Save.ts#L254)

Since v1.0.0

## BitString

A C# `bool` the game writes as `"1"` or `"0"`.

**Signature**

```ts
declare const BitString: Schema.decodeTo<Schema.Boolean, Schema.Literals<readonly ["0", "1"]>, never, never>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/disco-zoo-sdk/src/Save.ts#L201)

Since v1.0.0

## IntList

A list of C# `int`s the game writes joined by `,` (`StoreData`'s prices and
sales).

**Signature**

```ts
declare const IntList: Schema.compose<
  Schema.$Array<Schema.decodeTo<Schema.Int, Schema.String, never, never>>,
  Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/disco-zoo-sdk/src/Save.ts#L408)

Since v1.0.0

## IntString

A C# `int` the game writes as a string (`"42"`).

**Signature**

```ts
declare const IntString: Schema.decodeTo<Schema.Int, Schema.String, never, never>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/disco-zoo-sdk/src/Save.ts#L180)

Since v1.0.0

## LongString

A C# `long` the game writes as a string, decoded to a `bigint` since some
(`DateTime` ticks) do not fit a double.

**Signature**

```ts
declare const LongString: Schema.decodeTo<Schema.BigInt, Schema.String, never, never>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/disco-zoo-sdk/src/Save.ts#L191)

Since v1.0.0

## MiniJson

A JSON string as the game's MiniJson writes it, decoded with `schema`.
Encoding writes MiniJson's text again: no whitespace, keys in the order the
encoded value has them (for the save's objects, the keys this module models
in the game's order, then the ones it does not), and non-ASCII characters
escaped.

**Signature**

```ts
declare const MiniJson: <S extends Schema.Top>(
  schema: S
) => Schema.compose<
  S,
  Schema.decodeTo<Schema.Codec<Schema.MutableJson, Schema.MutableJson, never, never>, Schema.String, never, never>
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/disco-zoo-sdk/src/Save.ts#L152)

Since v1.0.0

## SingleString

A C# `float` the game writes as a string with `float.ToString()`, such as
`"0.05211356"` or `"4538.044"`. It decodes to a number and encodes with the
same up-to-7-significant-digit formatting, which gives back the game's text.

**Signature**

```ts
declare const SingleString: Schema.decodeTo<Schema.Finite, Schema.String, never, never>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/disco-zoo-sdk/src/Save.ts#L237)

Since v1.0.0

# Schemas

## CloudSave

The game's `CloudSave`: both `DataManager` strings, the save's data version
(`Core.dataVersion`) and the player's xp. Like every object in the save, it
keeps keys it does not model.

**Signature**

```ts
declare const CloudSave: Schema.StructWithRest<
  Schema.Struct<{
    localDataString: Schema.compose<
      Schema.StructWithRest<
        Schema.Struct<{
          SceneryData: Schema.compose<
            Schema.StructWithRest<
              Schema.Struct<{
                sceneryLotDatas: Schema.$Array<
                  Schema.StructWithRest<
                    Schema.Struct<{
                      penSlug: Schema.String
                      regionSlug: Schema.String
                      cols: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                      rows: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                      pathCells: Schema.compose<
                        Schema.$Array<
                          Schema.decodeTo<
                            Schema.Struct<{
                              readonly col: Schema.Int
                              readonly row: Schema.Int
                              readonly shape: Schema.Int
                            }>,
                            Schema.decodeTo<
                              Schema.Tuple<readonly [Schema.Int, Schema.Int, Schema.Int]>,
                              Schema.String,
                              never,
                              never
                            >,
                            never,
                            never
                          >
                        >,
                        Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>
                      >
                      collidableCells: Schema.compose<
                        Schema.$Array<
                          Schema.decodeTo<
                            Schema.Struct<{
                              readonly col: Schema.Int
                              readonly row: Schema.Int
                              readonly index: Schema.Int
                            }>,
                            Schema.decodeTo<
                              Schema.Tuple<readonly [Schema.Int, Schema.Int, Schema.Int]>,
                              Schema.String,
                              never,
                              never
                            >,
                            never,
                            never
                          >
                        >,
                        Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>
                      >
                    }>,
                    readonly [Schema.$Record<Schema.String, Schema.Codec<Schema.Json, Schema.Json, never, never>>]
                  >
                >
              }>,
              readonly [Schema.$Record<Schema.String, Schema.Codec<Schema.Json, Schema.Json, never, never>>]
            >,
            Schema.decodeTo<
              Schema.Codec<Schema.MutableJson, Schema.MutableJson, never, never>,
              Schema.String,
              never,
              never
            >
          >
          SettingsData: Schema.compose<
            Schema.StructWithRest<
              Schema.Struct<{
                sfxOn: Schema.Boolean
                musicOn: Schema.Boolean
                firstAnimalNotification: Schema.Boolean
                allAnimalsNotification: Schema.Boolean
                petHealedNotification: Schema.Boolean
                toddlerModeOn: Schema.Boolean
                isAdAgeConfirmed: Schema.Boolean
                isSyncAgeConfirmed: Schema.Boolean
                shouldShowNames: Schema.Boolean
                newsVersion: Schema.Int
                storeVersion: Schema.Int
                hasSeenPrivacyPopup: Schema.Boolean
                adsEnabled: Schema.Boolean
                personalizedConsentApplies: Schema.Boolean
                personalizedAdsEnabled: Schema.Boolean
                cloudEnabled: Schema.Boolean
                doNotSellData: Schema.Boolean
                firebaseEnabled: Schema.Boolean
                playerID: Schema.String
                playerSalt: Schema.optionalKey<
                  Schema.Union<
                    readonly [
                      Schema.Literal<"">,
                      Schema.brand<Schema.RedactedFromValue<Schema.String>, "PlayerAuthKey">
                    ]
                  >
                >
                playerRegistered: Schema.Boolean
                playerEmail: Schema.optionalKey<
                  Schema.Union<
                    readonly [Schema.Literal<"">, Schema.brand<Schema.RedactedFromValue<Schema.String>, "PlayerEmail">]
                  >
                >
                playerRegSent: Schema.Boolean
              }>,
              readonly [Schema.$Record<Schema.String, Schema.Codec<Schema.Json, Schema.Json, never, never>>]
            >,
            Schema.decodeTo<
              Schema.Codec<Schema.MutableJson, Schema.MutableJson, never, never>,
              Schema.String,
              never,
              never
            >
          >
          StoreData: Schema.compose<
            Schema.StructWithRest<
              Schema.Struct<{
                storeBuxValues: Schema.compose<
                  Schema.$Array<Schema.decodeTo<Schema.Int, Schema.String, never, never>>,
                  Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>
                >
                storeCoinsValues: Schema.compose<
                  Schema.$Array<Schema.decodeTo<Schema.Int, Schema.String, never, never>>,
                  Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>
                >
                storeSpaceCoinsValues: Schema.compose<
                  Schema.$Array<Schema.decodeTo<Schema.Int, Schema.String, never, never>>,
                  Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>
                >
                storeBuxSales: Schema.compose<
                  Schema.$Array<Schema.decodeTo<Schema.Int, Schema.String, never, never>>,
                  Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>
                >
                storeCoinsSales: Schema.compose<
                  Schema.$Array<Schema.decodeTo<Schema.Int, Schema.String, never, never>>,
                  Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>
                >
                storeSpaceCoinsSales: Schema.compose<
                  Schema.$Array<Schema.decodeTo<Schema.Int, Schema.String, never, never>>,
                  Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>
                >
                starter_bux: Schema.Int
                starter_coins: Schema.Int
                starter_sale: Schema.decodeTo<Schema.Boolean, Schema.Literals<readonly ["0", "1"]>, never, never>
                piggy_base: Schema.Int
                piggy_increment: Schema.Int
                piggy_buxPerAnimal: Schema.Int
                piggy_max: Schema.Int
                piggy_sale: Schema.decodeTo<Schema.Boolean, Schema.Literals<readonly ["0", "1"]>, never, never>
                zoopedia_sale: Schema.decodeTo<Schema.Boolean, Schema.Literals<readonly ["0", "1"]>, never, never>
              }>,
              readonly [Schema.$Record<Schema.String, Schema.Codec<Schema.Json, Schema.Json, never, never>>]
            >,
            Schema.decodeTo<
              Schema.Codec<Schema.MutableJson, Schema.MutableJson, never, never>,
              Schema.String,
              never,
              never
            >
          >
        }>,
        readonly [Schema.$Record<Schema.String, Schema.Codec<Schema.Json, Schema.Json, never, never>>]
      >,
      Schema.decodeTo<Schema.Codec<Schema.MutableJson, Schema.MutableJson, never, never>, Schema.String, never, never>
    >
    globalDataString: Schema.compose<
      Schema.StructWithRest<
        Schema.Struct<{
          PlayerData: Schema.compose<
            Schema.StructWithRest<
              Schema.Struct<{
                coins: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                bux: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                spaceCoins: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                xp: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                ticks: Schema.compose<
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
                >
                totalInGameTicks: Schema.decodeTo<Schema.BigInt, Schema.String, never, never>
                totalRealWorldTicks: Schema.decodeTo<Schema.BigInt, Schema.String, never, never>
                discoTicksLeft: Schema.decodeTo<Schema.BigInt, Schema.String, never, never>
                incidentTicksLeft: Schema.decodeTo<Schema.BigInt, Schema.String, never, never>
                zoopediaPurchased: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                partyLighting: Schema.String
                bestCarsPassed: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                bestFunkyCarsPassed: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                hasBeenFunky: Schema.decodeTo<Schema.Boolean, Schema.Literals<readonly ["0", "1"]>, never, never>
                currentRegion: Schema.optionalKey<Schema.String>
                currentSpaceRegion: Schema.String
                tutorialAccounts: Schema.decodeTo<
                  Schema.$Record<Schema.String, Schema.Int>,
                  Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>,
                  never,
                  never
                >
                unlockedRegionAccounts: Schema.decodeTo<
                  Schema.$Record<Schema.String, Schema.Int>,
                  Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>,
                  never,
                  never
                >
                trophyAccounts: Schema.decodeTo<
                  Schema.$Record<Schema.String, Schema.Int>,
                  Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>,
                  never,
                  never
                >
                hats: Schema.decodeTo<
                  Schema.$Array<Schema.Struct<{ readonly character: Schema.String; readonly count: Schema.Int }>>,
                  Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>,
                  never,
                  never
                >
                decor: Schema.decodeTo<
                  Schema.$Array<Schema.Struct<{ readonly character: Schema.String; readonly count: Schema.Int }>>,
                  Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>,
                  never,
                  never
                >
                toys: Schema.decodeTo<
                  Schema.$Array<Schema.Struct<{ readonly character: Schema.String; readonly count: Schema.Int }>>,
                  Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>,
                  never,
                  never
                >
                areToysUnlocked: Schema.decodeTo<Schema.Boolean, Schema.Literals<readonly ["0", "1"]>, never, never>
                hasReceivedSantaHats: Schema.decodeTo<
                  Schema.Boolean,
                  Schema.Literals<readonly ["0", "1"]>,
                  never,
                  never
                >
                hasStarterPack: Schema.decodeTo<Schema.Boolean, Schema.Literals<readonly ["0", "1"]>, never, never>
                piggyBux: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                piggyBankLevel: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                areRewardsUnlocked: Schema.decodeTo<Schema.Boolean, Schema.Literals<readonly ["0", "1"]>, never, never>
                dayIndex: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                lastDayPlayed: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                lastYearPlayed: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                weekSeed: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                numNameTags: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                binocularRegion: Schema.optionalKey<Schema.String>
              }>,
              readonly [Schema.$Record<Schema.String, Schema.Codec<Schema.Json, Schema.Json, never, never>>]
            >,
            Schema.decodeTo<
              Schema.Codec<Schema.MutableJson, Schema.MutableJson, never, never>,
              Schema.String,
              never,
              never
            >
          >
          ZooData: Schema.compose<
            Schema.StructWithRest<
              Schema.Struct<{
                penDatas: Schema.$Array<
                  Schema.StructWithRest<
                    Schema.Struct<{
                      animal: Schema.String
                      slug: Schema.String
                      count: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                      bilcoins: Schema.decodeTo<Schema.BigInt, Schema.String, never, never>
                      awakeTicksLeft: Schema.decodeTo<Schema.BigInt, Schema.String, never, never>
                      buildTicksLeft: Schema.decodeTo<Schema.BigInt, Schema.String, never, never>
                      wakeUpBonus: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                      hats: Schema.decodeTo<
                        Schema.$Array<Schema.Struct<{ readonly character: Schema.String; readonly count: Schema.Int }>>,
                        Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>,
                        never,
                        never
                      >
                      decor: Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>
                      toy: Schema.String
                    }>,
                    readonly [Schema.$Record<Schema.String, Schema.Codec<Schema.Json, Schema.Json, never, never>>]
                  >
                >
                customPenDatas: Schema.compose<
                  Schema.$Array<
                    Schema.compose<
                      Schema.Struct<{
                        readonly animalSlug: Schema.String
                        readonly namedAnimals: Schema.compose<
                          Schema.$Array<
                            Schema.decodeTo<
                              Schema.Struct<{
                                readonly hat: Schema.String
                                readonly variantIndex: Schema.Int
                                readonly name: Schema.String
                              }>,
                              Schema.String,
                              never,
                              never
                            >
                          >,
                          Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>
                        >
                      }>,
                      Schema.decodeTo<
                        Schema.Struct<{ readonly animalSlug: Schema.String; readonly namedAnimals: Schema.String }>,
                        Schema.String,
                        never,
                        never
                      >
                    >
                  >,
                  Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>
                >
              }>,
              readonly [Schema.$Record<Schema.String, Schema.Codec<Schema.Json, Schema.Json, never, never>>]
            >,
            Schema.decodeTo<
              Schema.Codec<Schema.MutableJson, Schema.MutableJson, never, never>,
              Schema.String,
              never,
              never
            >
          >
          StatsData: Schema.compose<
            Schema.StructWithRest<
              Schema.Struct<{
                coinAccounts: Schema.decodeTo<
                  Schema.$Record<Schema.String, Schema.Int>,
                  Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>,
                  never,
                  never
                >
                buxAccounts: Schema.decodeTo<
                  Schema.$Record<Schema.String, Schema.Int>,
                  Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>,
                  never,
                  never
                >
                spaceCoinAccounts: Schema.decodeTo<
                  Schema.$Record<Schema.String, Schema.Int>,
                  Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>,
                  never,
                  never
                >
                statAccounts: Schema.decodeTo<
                  Schema.$Record<Schema.String, Schema.Int>,
                  Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>,
                  never,
                  never
                >
                totalCoinsEarned: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                totalBuxEarned: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                totalSpaceCoinsEarned: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                totalCoinsSpent: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                totalBuxSpent: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                totalSpaceCoinsSpent: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                totalDiamondsEarnedPreviously: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                numTimeRewinds: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                actualTimeRewinds: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                extraTimeRewinds: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                totalPetsHealed: Schema.decodeTo<Schema.Int, Schema.String, never, never>
              }>,
              readonly [Schema.$Record<Schema.String, Schema.Codec<Schema.Json, Schema.Json, never, never>>]
            >,
            Schema.decodeTo<
              Schema.Codec<Schema.MutableJson, Schema.MutableJson, never, never>,
              Schema.String,
              never,
              never
            >
          >
          QuestManager: Schema.compose<
            Schema.StructWithRest<
              Schema.Struct<{
                heldAnimals: Schema.decodeTo<
                  Schema.$Record<Schema.String, Schema.Int>,
                  Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>,
                  never,
                  never
                >
                quests: Schema.$Array<
                  Schema.StructWithRest<
                    Schema.Struct<{
                      reward: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                      owner: Schema.String
                      animals: Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>
                    }>,
                    readonly [Schema.$Record<Schema.String, Schema.Codec<Schema.Json, Schema.Json, never, never>>]
                  >
                >
                canQuest: Schema.decodeTo<Schema.Boolean, Schema.Literals<readonly ["0", "1"]>, never, never>
              }>,
              readonly [Schema.$Record<Schema.String, Schema.Codec<Schema.Json, Schema.Json, never, never>>]
            >,
            Schema.decodeTo<
              Schema.Codec<Schema.MutableJson, Schema.MutableJson, never, never>,
              Schema.String,
              never,
              never
            >
          >
          PetManager: Schema.compose<
            Schema.StructWithRest<
              Schema.Struct<{
                nextPetID: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                totalPetsGivenAway: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                loungeSlots: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                loungeSlotsMax: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                currentUpgradeTier: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                petsGivenAwaySinceLastUpgrade: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                healTicksLeft: Schema.decodeTo<Schema.BigInt, Schema.String, never, never>
                hospitalPetHealState: Schema.Literals<readonly ["None", "Injured", "Healing", "Healed"]>
                hasRescuedPet: Schema.decodeTo<Schema.Boolean, Schema.Literals<readonly ["0", "1"]>, never, never>
                rescuesUntilNextPet: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                rescuePet: Schema.Union<
                  readonly [
                    Schema.StructWithRest<
                      Schema.Struct<{
                        breedIndex: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                        variationIndex: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                        quality: Schema.decodeTo<Schema.Finite, Schema.String, never, never>
                        healDuration: Schema.decodeTo<Schema.Finite, Schema.String, never, never>
                        gradeIndex: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                        nameData: Schema.decodeTo<
                          Schema.Struct<{
                            readonly hat: Schema.String
                            readonly variantIndex: Schema.Int
                            readonly name: Schema.String
                          }>,
                          Schema.String,
                          never,
                          never
                        >
                        species: Schema.String
                        quirks: Schema.compose<
                          Schema.$Array<
                            Schema.decodeTo<
                              Schema.Struct<{ readonly slug: Schema.String; readonly isRare: Schema.Boolean }>,
                              Schema.String,
                              never,
                              never
                            >
                          >,
                          Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>
                        >
                      }>,
                      readonly [Schema.$Record<Schema.String, Schema.Codec<Schema.Json, Schema.Json, never, never>>]
                    >,
                    Schema.$Record<Schema.String, Schema.Never>
                  ]
                >
                hospitalPet: Schema.Union<
                  readonly [
                    Schema.StructWithRest<
                      Schema.Struct<{
                        breedIndex: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                        variationIndex: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                        quality: Schema.decodeTo<Schema.Finite, Schema.String, never, never>
                        healDuration: Schema.decodeTo<Schema.Finite, Schema.String, never, never>
                        gradeIndex: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                        nameData: Schema.decodeTo<
                          Schema.Struct<{
                            readonly hat: Schema.String
                            readonly variantIndex: Schema.Int
                            readonly name: Schema.String
                          }>,
                          Schema.String,
                          never,
                          never
                        >
                        species: Schema.String
                        quirks: Schema.compose<
                          Schema.$Array<
                            Schema.decodeTo<
                              Schema.Struct<{ readonly slug: Schema.String; readonly isRare: Schema.Boolean }>,
                              Schema.String,
                              never,
                              never
                            >
                          >,
                          Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>
                        >
                      }>,
                      readonly [Schema.$Record<Schema.String, Schema.Codec<Schema.Json, Schema.Json, never, never>>]
                    >,
                    Schema.$Record<Schema.String, Schema.Never>
                  ]
                >
                hasAdoptedPet: Schema.decodeTo<Schema.Boolean, Schema.Literals<readonly ["0", "1"]>, never, never>
                loungeRegion: Schema.String
                loungeHats: Schema.decodeTo<
                  Schema.$Array<Schema.Struct<{ readonly character: Schema.String; readonly count: Schema.Int }>>,
                  Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>,
                  never,
                  never
                >
                loungeDecor: Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>
                loungeToy: Schema.String
                loungePets: Schema.$Array<
                  Schema.StructWithRest<
                    Schema.Struct<{
                      breedIndex: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                      variationIndex: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                      quality: Schema.decodeTo<Schema.Finite, Schema.String, never, never>
                      healDuration: Schema.decodeTo<Schema.Finite, Schema.String, never, never>
                      gradeIndex: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                      nameData: Schema.decodeTo<
                        Schema.Struct<{
                          readonly hat: Schema.String
                          readonly variantIndex: Schema.Int
                          readonly name: Schema.String
                        }>,
                        Schema.String,
                        never,
                        never
                      >
                      species: Schema.String
                      quirks: Schema.compose<
                        Schema.$Array<
                          Schema.decodeTo<
                            Schema.Struct<{ readonly slug: Schema.String; readonly isRare: Schema.Boolean }>,
                            Schema.String,
                            never,
                            never
                          >
                        >,
                        Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>
                      >
                    }>,
                    readonly [Schema.$Record<Schema.String, Schema.Codec<Schema.Json, Schema.Json, never, never>>]
                  >
                >
                seenRegionSlugs: Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>
              }>,
              readonly [Schema.$Record<Schema.String, Schema.Codec<Schema.Json, Schema.Json, never, never>>]
            >,
            Schema.decodeTo<
              Schema.Codec<Schema.MutableJson, Schema.MutableJson, never, never>,
              Schema.String,
              never,
              never
            >
          >
          LoonManager: Schema.compose<
            Schema.StructWithRest<
              Schema.Struct<{
                isGameOver: Schema.decodeTo<Schema.Boolean, Schema.Literals<readonly ["0", "1"]>, never, never>
                hasBeatenScore: Schema.decodeTo<Schema.Boolean, Schema.Literals<readonly ["0", "1"]>, never, never>
                score: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                bestScore: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                bestCombo: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                totalDiscoBallsMade: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                totalDiscoBallsMerged: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                totalDiscoBallHits: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                upcomingString: Schema.String
                ballString: Schema.String
                trophyString: Schema.String
                totalBalls: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                dropsUntilDart: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                hasMergedDisco: Schema.decodeTo<Schema.Boolean, Schema.Literals<readonly ["0", "1"]>, never, never>
                dangerTime: Schema.decodeTo<Schema.Finite, Schema.String, never, never>
                dangerIndex: Schema.decodeTo<Schema.Int, Schema.String, never, never>
              }>,
              readonly [Schema.$Record<Schema.String, Schema.Codec<Schema.Json, Schema.Json, never, never>>]
            >,
            Schema.decodeTo<
              Schema.Codec<Schema.MutableJson, Schema.MutableJson, never, never>,
              Schema.String,
              never,
              never
            >
          >
        }>,
        readonly [Schema.$Record<Schema.String, Schema.Codec<Schema.Json, Schema.Json, never, never>>]
      >,
      Schema.decodeTo<Schema.Codec<Schema.MutableJson, Schema.MutableJson, never, never>, Schema.String, never, never>
    >
    dataVersion: Schema.Int
    xp: Schema.Int
  }>,
  readonly [Schema.$Record<Schema.String, Schema.Codec<Schema.Json, Schema.Json, never, never>>]
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/disco-zoo-sdk/src/Save.ts#L825)

Since v1.0.0

## CollidableCell

A scenery object in a pen (the game's `CollidableCell`), written as
`col:row:index`, where `index` picks one of the region theme's collidables.

**Signature**

```ts
declare const CollidableCell: Schema.decodeTo<
  Schema.Struct<{ readonly col: Schema.Int; readonly row: Schema.Int; readonly index: Schema.Int }>,
  Schema.decodeTo<Schema.Tuple<readonly [Schema.Int, Schema.Int, Schema.Int]>, Schema.String, never, never>,
  never,
  never
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/disco-zoo-sdk/src/Save.ts#L450)

Since v1.0.0

## CustomPenData

The name tags of one kind of animal (the game's `CustomPenData`), written as
the animal's slug, `:` and its name tags joined by `;`, such as
`"sheep:10Woolly;21Baa Baa"`.

**Signature**

```ts
declare const CustomPenData: Schema.compose<
  Schema.Struct<{
    readonly animalSlug: Schema.String
    readonly namedAnimals: Schema.compose<
      Schema.$Array<
        Schema.decodeTo<
          Schema.Struct<{
            readonly hat: Schema.String
            readonly variantIndex: Schema.Int
            readonly name: Schema.String
          }>,
          Schema.String,
          never,
          never
        >
      >,
      Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>
    >
  }>,
  Schema.decodeTo<
    Schema.Struct<{ readonly animalSlug: Schema.String; readonly namedAnimals: Schema.String }>,
    Schema.String,
    never,
    never
  >
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/disco-zoo-sdk/src/Save.ts#L375)

Since v1.0.0

## DecorPenSet

The decorations placed in a pen (the game's `DecorPenSet`): one slot per
spot, joined by `;`, each holding a decoration's character or nothing (an
empty pen is `";;;"`).

**Signature**

```ts
declare const DecorPenSet: Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/disco-zoo-sdk/src/Save.ts#L334)

Since v1.0.0

## GlobalData

The "global" `DataManager`'s save string (`global.data`), as
`GetSaveDataString` writes it and `LoadDataFromString` reads it.

**Signature**

```ts
declare const GlobalData: Schema.compose<
  Schema.StructWithRest<
    Schema.Struct<{
      PlayerData: Schema.compose<
        Schema.StructWithRest<
          Schema.Struct<{
            coins: Schema.decodeTo<Schema.Int, Schema.String, never, never>
            bux: Schema.decodeTo<Schema.Int, Schema.String, never, never>
            spaceCoins: Schema.decodeTo<Schema.Int, Schema.String, never, never>
            xp: Schema.decodeTo<Schema.Int, Schema.String, never, never>
            ticks: Schema.compose<
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
            >
            totalInGameTicks: Schema.decodeTo<Schema.BigInt, Schema.String, never, never>
            totalRealWorldTicks: Schema.decodeTo<Schema.BigInt, Schema.String, never, never>
            discoTicksLeft: Schema.decodeTo<Schema.BigInt, Schema.String, never, never>
            incidentTicksLeft: Schema.decodeTo<Schema.BigInt, Schema.String, never, never>
            zoopediaPurchased: Schema.decodeTo<Schema.Int, Schema.String, never, never>
            partyLighting: Schema.String
            bestCarsPassed: Schema.decodeTo<Schema.Int, Schema.String, never, never>
            bestFunkyCarsPassed: Schema.decodeTo<Schema.Int, Schema.String, never, never>
            hasBeenFunky: Schema.decodeTo<Schema.Boolean, Schema.Literals<readonly ["0", "1"]>, never, never>
            currentRegion: Schema.optionalKey<Schema.String>
            currentSpaceRegion: Schema.String
            tutorialAccounts: Schema.decodeTo<
              Schema.$Record<Schema.String, Schema.Int>,
              Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>,
              never,
              never
            >
            unlockedRegionAccounts: Schema.decodeTo<
              Schema.$Record<Schema.String, Schema.Int>,
              Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>,
              never,
              never
            >
            trophyAccounts: Schema.decodeTo<
              Schema.$Record<Schema.String, Schema.Int>,
              Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>,
              never,
              never
            >
            hats: Schema.decodeTo<
              Schema.$Array<Schema.Struct<{ readonly character: Schema.String; readonly count: Schema.Int }>>,
              Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>,
              never,
              never
            >
            decor: Schema.decodeTo<
              Schema.$Array<Schema.Struct<{ readonly character: Schema.String; readonly count: Schema.Int }>>,
              Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>,
              never,
              never
            >
            toys: Schema.decodeTo<
              Schema.$Array<Schema.Struct<{ readonly character: Schema.String; readonly count: Schema.Int }>>,
              Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>,
              never,
              never
            >
            areToysUnlocked: Schema.decodeTo<Schema.Boolean, Schema.Literals<readonly ["0", "1"]>, never, never>
            hasReceivedSantaHats: Schema.decodeTo<Schema.Boolean, Schema.Literals<readonly ["0", "1"]>, never, never>
            hasStarterPack: Schema.decodeTo<Schema.Boolean, Schema.Literals<readonly ["0", "1"]>, never, never>
            piggyBux: Schema.decodeTo<Schema.Int, Schema.String, never, never>
            piggyBankLevel: Schema.decodeTo<Schema.Int, Schema.String, never, never>
            areRewardsUnlocked: Schema.decodeTo<Schema.Boolean, Schema.Literals<readonly ["0", "1"]>, never, never>
            dayIndex: Schema.decodeTo<Schema.Int, Schema.String, never, never>
            lastDayPlayed: Schema.decodeTo<Schema.Int, Schema.String, never, never>
            lastYearPlayed: Schema.decodeTo<Schema.Int, Schema.String, never, never>
            weekSeed: Schema.decodeTo<Schema.Int, Schema.String, never, never>
            numNameTags: Schema.decodeTo<Schema.Int, Schema.String, never, never>
            binocularRegion: Schema.optionalKey<Schema.String>
          }>,
          readonly [Schema.$Record<Schema.String, Schema.Codec<Schema.Json, Schema.Json, never, never>>]
        >,
        Schema.decodeTo<Schema.Codec<Schema.MutableJson, Schema.MutableJson, never, never>, Schema.String, never, never>
      >
      ZooData: Schema.compose<
        Schema.StructWithRest<
          Schema.Struct<{
            penDatas: Schema.$Array<
              Schema.StructWithRest<
                Schema.Struct<{
                  animal: Schema.String
                  slug: Schema.String
                  count: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                  bilcoins: Schema.decodeTo<Schema.BigInt, Schema.String, never, never>
                  awakeTicksLeft: Schema.decodeTo<Schema.BigInt, Schema.String, never, never>
                  buildTicksLeft: Schema.decodeTo<Schema.BigInt, Schema.String, never, never>
                  wakeUpBonus: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                  hats: Schema.decodeTo<
                    Schema.$Array<Schema.Struct<{ readonly character: Schema.String; readonly count: Schema.Int }>>,
                    Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>,
                    never,
                    never
                  >
                  decor: Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>
                  toy: Schema.String
                }>,
                readonly [Schema.$Record<Schema.String, Schema.Codec<Schema.Json, Schema.Json, never, never>>]
              >
            >
            customPenDatas: Schema.compose<
              Schema.$Array<
                Schema.compose<
                  Schema.Struct<{
                    readonly animalSlug: Schema.String
                    readonly namedAnimals: Schema.compose<
                      Schema.$Array<
                        Schema.decodeTo<
                          Schema.Struct<{
                            readonly hat: Schema.String
                            readonly variantIndex: Schema.Int
                            readonly name: Schema.String
                          }>,
                          Schema.String,
                          never,
                          never
                        >
                      >,
                      Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>
                    >
                  }>,
                  Schema.decodeTo<
                    Schema.Struct<{ readonly animalSlug: Schema.String; readonly namedAnimals: Schema.String }>,
                    Schema.String,
                    never,
                    never
                  >
                >
              >,
              Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>
            >
          }>,
          readonly [Schema.$Record<Schema.String, Schema.Codec<Schema.Json, Schema.Json, never, never>>]
        >,
        Schema.decodeTo<Schema.Codec<Schema.MutableJson, Schema.MutableJson, never, never>, Schema.String, never, never>
      >
      StatsData: Schema.compose<
        Schema.StructWithRest<
          Schema.Struct<{
            coinAccounts: Schema.decodeTo<
              Schema.$Record<Schema.String, Schema.Int>,
              Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>,
              never,
              never
            >
            buxAccounts: Schema.decodeTo<
              Schema.$Record<Schema.String, Schema.Int>,
              Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>,
              never,
              never
            >
            spaceCoinAccounts: Schema.decodeTo<
              Schema.$Record<Schema.String, Schema.Int>,
              Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>,
              never,
              never
            >
            statAccounts: Schema.decodeTo<
              Schema.$Record<Schema.String, Schema.Int>,
              Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>,
              never,
              never
            >
            totalCoinsEarned: Schema.decodeTo<Schema.Int, Schema.String, never, never>
            totalBuxEarned: Schema.decodeTo<Schema.Int, Schema.String, never, never>
            totalSpaceCoinsEarned: Schema.decodeTo<Schema.Int, Schema.String, never, never>
            totalCoinsSpent: Schema.decodeTo<Schema.Int, Schema.String, never, never>
            totalBuxSpent: Schema.decodeTo<Schema.Int, Schema.String, never, never>
            totalSpaceCoinsSpent: Schema.decodeTo<Schema.Int, Schema.String, never, never>
            totalDiamondsEarnedPreviously: Schema.decodeTo<Schema.Int, Schema.String, never, never>
            numTimeRewinds: Schema.decodeTo<Schema.Int, Schema.String, never, never>
            actualTimeRewinds: Schema.decodeTo<Schema.Int, Schema.String, never, never>
            extraTimeRewinds: Schema.decodeTo<Schema.Int, Schema.String, never, never>
            totalPetsHealed: Schema.decodeTo<Schema.Int, Schema.String, never, never>
          }>,
          readonly [Schema.$Record<Schema.String, Schema.Codec<Schema.Json, Schema.Json, never, never>>]
        >,
        Schema.decodeTo<Schema.Codec<Schema.MutableJson, Schema.MutableJson, never, never>, Schema.String, never, never>
      >
      QuestManager: Schema.compose<
        Schema.StructWithRest<
          Schema.Struct<{
            heldAnimals: Schema.decodeTo<
              Schema.$Record<Schema.String, Schema.Int>,
              Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>,
              never,
              never
            >
            quests: Schema.$Array<
              Schema.StructWithRest<
                Schema.Struct<{
                  reward: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                  owner: Schema.String
                  animals: Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>
                }>,
                readonly [Schema.$Record<Schema.String, Schema.Codec<Schema.Json, Schema.Json, never, never>>]
              >
            >
            canQuest: Schema.decodeTo<Schema.Boolean, Schema.Literals<readonly ["0", "1"]>, never, never>
          }>,
          readonly [Schema.$Record<Schema.String, Schema.Codec<Schema.Json, Schema.Json, never, never>>]
        >,
        Schema.decodeTo<Schema.Codec<Schema.MutableJson, Schema.MutableJson, never, never>, Schema.String, never, never>
      >
      PetManager: Schema.compose<
        Schema.StructWithRest<
          Schema.Struct<{
            nextPetID: Schema.decodeTo<Schema.Int, Schema.String, never, never>
            totalPetsGivenAway: Schema.decodeTo<Schema.Int, Schema.String, never, never>
            loungeSlots: Schema.decodeTo<Schema.Int, Schema.String, never, never>
            loungeSlotsMax: Schema.decodeTo<Schema.Int, Schema.String, never, never>
            currentUpgradeTier: Schema.decodeTo<Schema.Int, Schema.String, never, never>
            petsGivenAwaySinceLastUpgrade: Schema.decodeTo<Schema.Int, Schema.String, never, never>
            healTicksLeft: Schema.decodeTo<Schema.BigInt, Schema.String, never, never>
            hospitalPetHealState: Schema.Literals<readonly ["None", "Injured", "Healing", "Healed"]>
            hasRescuedPet: Schema.decodeTo<Schema.Boolean, Schema.Literals<readonly ["0", "1"]>, never, never>
            rescuesUntilNextPet: Schema.decodeTo<Schema.Int, Schema.String, never, never>
            rescuePet: Schema.Union<
              readonly [
                Schema.StructWithRest<
                  Schema.Struct<{
                    breedIndex: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                    variationIndex: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                    quality: Schema.decodeTo<Schema.Finite, Schema.String, never, never>
                    healDuration: Schema.decodeTo<Schema.Finite, Schema.String, never, never>
                    gradeIndex: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                    nameData: Schema.decodeTo<
                      Schema.Struct<{
                        readonly hat: Schema.String
                        readonly variantIndex: Schema.Int
                        readonly name: Schema.String
                      }>,
                      Schema.String,
                      never,
                      never
                    >
                    species: Schema.String
                    quirks: Schema.compose<
                      Schema.$Array<
                        Schema.decodeTo<
                          Schema.Struct<{ readonly slug: Schema.String; readonly isRare: Schema.Boolean }>,
                          Schema.String,
                          never,
                          never
                        >
                      >,
                      Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>
                    >
                  }>,
                  readonly [Schema.$Record<Schema.String, Schema.Codec<Schema.Json, Schema.Json, never, never>>]
                >,
                Schema.$Record<Schema.String, Schema.Never>
              ]
            >
            hospitalPet: Schema.Union<
              readonly [
                Schema.StructWithRest<
                  Schema.Struct<{
                    breedIndex: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                    variationIndex: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                    quality: Schema.decodeTo<Schema.Finite, Schema.String, never, never>
                    healDuration: Schema.decodeTo<Schema.Finite, Schema.String, never, never>
                    gradeIndex: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                    nameData: Schema.decodeTo<
                      Schema.Struct<{
                        readonly hat: Schema.String
                        readonly variantIndex: Schema.Int
                        readonly name: Schema.String
                      }>,
                      Schema.String,
                      never,
                      never
                    >
                    species: Schema.String
                    quirks: Schema.compose<
                      Schema.$Array<
                        Schema.decodeTo<
                          Schema.Struct<{ readonly slug: Schema.String; readonly isRare: Schema.Boolean }>,
                          Schema.String,
                          never,
                          never
                        >
                      >,
                      Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>
                    >
                  }>,
                  readonly [Schema.$Record<Schema.String, Schema.Codec<Schema.Json, Schema.Json, never, never>>]
                >,
                Schema.$Record<Schema.String, Schema.Never>
              ]
            >
            hasAdoptedPet: Schema.decodeTo<Schema.Boolean, Schema.Literals<readonly ["0", "1"]>, never, never>
            loungeRegion: Schema.String
            loungeHats: Schema.decodeTo<
              Schema.$Array<Schema.Struct<{ readonly character: Schema.String; readonly count: Schema.Int }>>,
              Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>,
              never,
              never
            >
            loungeDecor: Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>
            loungeToy: Schema.String
            loungePets: Schema.$Array<
              Schema.StructWithRest<
                Schema.Struct<{
                  breedIndex: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                  variationIndex: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                  quality: Schema.decodeTo<Schema.Finite, Schema.String, never, never>
                  healDuration: Schema.decodeTo<Schema.Finite, Schema.String, never, never>
                  gradeIndex: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                  nameData: Schema.decodeTo<
                    Schema.Struct<{
                      readonly hat: Schema.String
                      readonly variantIndex: Schema.Int
                      readonly name: Schema.String
                    }>,
                    Schema.String,
                    never,
                    never
                  >
                  species: Schema.String
                  quirks: Schema.compose<
                    Schema.$Array<
                      Schema.decodeTo<
                        Schema.Struct<{ readonly slug: Schema.String; readonly isRare: Schema.Boolean }>,
                        Schema.String,
                        never,
                        never
                      >
                    >,
                    Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>
                  >
                }>,
                readonly [Schema.$Record<Schema.String, Schema.Codec<Schema.Json, Schema.Json, never, never>>]
              >
            >
            seenRegionSlugs: Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>
          }>,
          readonly [Schema.$Record<Schema.String, Schema.Codec<Schema.Json, Schema.Json, never, never>>]
        >,
        Schema.decodeTo<Schema.Codec<Schema.MutableJson, Schema.MutableJson, never, never>, Schema.String, never, never>
      >
      LoonManager: Schema.compose<
        Schema.StructWithRest<
          Schema.Struct<{
            isGameOver: Schema.decodeTo<Schema.Boolean, Schema.Literals<readonly ["0", "1"]>, never, never>
            hasBeatenScore: Schema.decodeTo<Schema.Boolean, Schema.Literals<readonly ["0", "1"]>, never, never>
            score: Schema.decodeTo<Schema.Int, Schema.String, never, never>
            bestScore: Schema.decodeTo<Schema.Int, Schema.String, never, never>
            bestCombo: Schema.decodeTo<Schema.Int, Schema.String, never, never>
            totalDiscoBallsMade: Schema.decodeTo<Schema.Int, Schema.String, never, never>
            totalDiscoBallsMerged: Schema.decodeTo<Schema.Int, Schema.String, never, never>
            totalDiscoBallHits: Schema.decodeTo<Schema.Int, Schema.String, never, never>
            upcomingString: Schema.String
            ballString: Schema.String
            trophyString: Schema.String
            totalBalls: Schema.decodeTo<Schema.Int, Schema.String, never, never>
            dropsUntilDart: Schema.decodeTo<Schema.Int, Schema.String, never, never>
            hasMergedDisco: Schema.decodeTo<Schema.Boolean, Schema.Literals<readonly ["0", "1"]>, never, never>
            dangerTime: Schema.decodeTo<Schema.Finite, Schema.String, never, never>
            dangerIndex: Schema.decodeTo<Schema.Int, Schema.String, never, never>
          }>,
          readonly [Schema.$Record<Schema.String, Schema.Codec<Schema.Json, Schema.Json, never, never>>]
        >,
        Schema.decodeTo<Schema.Codec<Schema.MutableJson, Schema.MutableJson, never, never>, Schema.String, never, never>
      >
    }>,
    readonly [Schema.$Record<Schema.String, Schema.Codec<Schema.Json, Schema.Json, never, never>>]
  >,
  Schema.decodeTo<Schema.Codec<Schema.MutableJson, Schema.MutableJson, never, never>, Schema.String, never, never>
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/disco-zoo-sdk/src/Save.ts#L791)

Since v1.0.0

## ItemSet

How many of each hat, decoration or toy: the game's `HatSet`, `DecorSet` and
`ToySet`, written as the item's character and its count, joined by `;` (for
example `"12;!1"` is two `1` hats and one `!` hat). Kept as a list of
entries in the game's order, since the characters include digits, which a
record would reorder.

**Signature**

```ts
declare const ItemSet: Schema.decodeTo<
  Schema.$Array<Schema.Struct<{ readonly character: Schema.String; readonly count: Schema.Int }>>,
  Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>,
  never,
  never
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/disco-zoo-sdk/src/Save.ts#L299)

Since v1.0.0

## LocalData

The "local" `DataManager`'s save string (`local.data`), as
`GetSaveDataString` writes it and `LoadDataFromString` reads it.

**Signature**

```ts
declare const LocalData: Schema.compose<
  Schema.StructWithRest<
    Schema.Struct<{
      SceneryData: Schema.compose<
        Schema.StructWithRest<
          Schema.Struct<{
            sceneryLotDatas: Schema.$Array<
              Schema.StructWithRest<
                Schema.Struct<{
                  penSlug: Schema.String
                  regionSlug: Schema.String
                  cols: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                  rows: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                  pathCells: Schema.compose<
                    Schema.$Array<
                      Schema.decodeTo<
                        Schema.Struct<{
                          readonly col: Schema.Int
                          readonly row: Schema.Int
                          readonly shape: Schema.Int
                        }>,
                        Schema.decodeTo<
                          Schema.Tuple<readonly [Schema.Int, Schema.Int, Schema.Int]>,
                          Schema.String,
                          never,
                          never
                        >,
                        never,
                        never
                      >
                    >,
                    Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>
                  >
                  collidableCells: Schema.compose<
                    Schema.$Array<
                      Schema.decodeTo<
                        Schema.Struct<{
                          readonly col: Schema.Int
                          readonly row: Schema.Int
                          readonly index: Schema.Int
                        }>,
                        Schema.decodeTo<
                          Schema.Tuple<readonly [Schema.Int, Schema.Int, Schema.Int]>,
                          Schema.String,
                          never,
                          never
                        >,
                        never,
                        never
                      >
                    >,
                    Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>
                  >
                }>,
                readonly [Schema.$Record<Schema.String, Schema.Codec<Schema.Json, Schema.Json, never, never>>]
              >
            >
          }>,
          readonly [Schema.$Record<Schema.String, Schema.Codec<Schema.Json, Schema.Json, never, never>>]
        >,
        Schema.decodeTo<Schema.Codec<Schema.MutableJson, Schema.MutableJson, never, never>, Schema.String, never, never>
      >
      SettingsData: Schema.compose<
        Schema.StructWithRest<
          Schema.Struct<{
            sfxOn: Schema.Boolean
            musicOn: Schema.Boolean
            firstAnimalNotification: Schema.Boolean
            allAnimalsNotification: Schema.Boolean
            petHealedNotification: Schema.Boolean
            toddlerModeOn: Schema.Boolean
            isAdAgeConfirmed: Schema.Boolean
            isSyncAgeConfirmed: Schema.Boolean
            shouldShowNames: Schema.Boolean
            newsVersion: Schema.Int
            storeVersion: Schema.Int
            hasSeenPrivacyPopup: Schema.Boolean
            adsEnabled: Schema.Boolean
            personalizedConsentApplies: Schema.Boolean
            personalizedAdsEnabled: Schema.Boolean
            cloudEnabled: Schema.Boolean
            doNotSellData: Schema.Boolean
            firebaseEnabled: Schema.Boolean
            playerID: Schema.String
            playerSalt: Schema.optionalKey<
              Schema.Union<
                readonly [Schema.Literal<"">, Schema.brand<Schema.RedactedFromValue<Schema.String>, "PlayerAuthKey">]
              >
            >
            playerRegistered: Schema.Boolean
            playerEmail: Schema.optionalKey<
              Schema.Union<
                readonly [Schema.Literal<"">, Schema.brand<Schema.RedactedFromValue<Schema.String>, "PlayerEmail">]
              >
            >
            playerRegSent: Schema.Boolean
          }>,
          readonly [Schema.$Record<Schema.String, Schema.Codec<Schema.Json, Schema.Json, never, never>>]
        >,
        Schema.decodeTo<Schema.Codec<Schema.MutableJson, Schema.MutableJson, never, never>, Schema.String, never, never>
      >
      StoreData: Schema.compose<
        Schema.StructWithRest<
          Schema.Struct<{
            storeBuxValues: Schema.compose<
              Schema.$Array<Schema.decodeTo<Schema.Int, Schema.String, never, never>>,
              Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>
            >
            storeCoinsValues: Schema.compose<
              Schema.$Array<Schema.decodeTo<Schema.Int, Schema.String, never, never>>,
              Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>
            >
            storeSpaceCoinsValues: Schema.compose<
              Schema.$Array<Schema.decodeTo<Schema.Int, Schema.String, never, never>>,
              Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>
            >
            storeBuxSales: Schema.compose<
              Schema.$Array<Schema.decodeTo<Schema.Int, Schema.String, never, never>>,
              Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>
            >
            storeCoinsSales: Schema.compose<
              Schema.$Array<Schema.decodeTo<Schema.Int, Schema.String, never, never>>,
              Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>
            >
            storeSpaceCoinsSales: Schema.compose<
              Schema.$Array<Schema.decodeTo<Schema.Int, Schema.String, never, never>>,
              Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>
            >
            starter_bux: Schema.Int
            starter_coins: Schema.Int
            starter_sale: Schema.decodeTo<Schema.Boolean, Schema.Literals<readonly ["0", "1"]>, never, never>
            piggy_base: Schema.Int
            piggy_increment: Schema.Int
            piggy_buxPerAnimal: Schema.Int
            piggy_max: Schema.Int
            piggy_sale: Schema.decodeTo<Schema.Boolean, Schema.Literals<readonly ["0", "1"]>, never, never>
            zoopedia_sale: Schema.decodeTo<Schema.Boolean, Schema.Literals<readonly ["0", "1"]>, never, never>
          }>,
          readonly [Schema.$Record<Schema.String, Schema.Codec<Schema.Json, Schema.Json, never, never>>]
        >,
        Schema.decodeTo<Schema.Codec<Schema.MutableJson, Schema.MutableJson, never, never>, Schema.String, never, never>
      >
    }>,
    readonly [Schema.$Record<Schema.String, Schema.Codec<Schema.Json, Schema.Json, never, never>>]
  >,
  Schema.decodeTo<Schema.Codec<Schema.MutableJson, Schema.MutableJson, never, never>, Schema.String, never, never>
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/disco-zoo-sdk/src/Save.ts#L809)

Since v1.0.0

## LoonManager

The disco ball drop game (the game's `LoonManager`). The board, upcoming
balls and trophies are the game's own strings, kept as they are.

**Signature**

```ts
declare const LoonManager: Schema.StructWithRest<
  Schema.Struct<{
    isGameOver: Schema.decodeTo<Schema.Boolean, Schema.Literals<readonly ["0", "1"]>, never, never>
    hasBeatenScore: Schema.decodeTo<Schema.Boolean, Schema.Literals<readonly ["0", "1"]>, never, never>
    score: Schema.decodeTo<Schema.Int, Schema.String, never, never>
    bestScore: Schema.decodeTo<Schema.Int, Schema.String, never, never>
    bestCombo: Schema.decodeTo<Schema.Int, Schema.String, never, never>
    totalDiscoBallsMade: Schema.decodeTo<Schema.Int, Schema.String, never, never>
    totalDiscoBallsMerged: Schema.decodeTo<Schema.Int, Schema.String, never, never>
    totalDiscoBallHits: Schema.decodeTo<Schema.Int, Schema.String, never, never>
    upcomingString: Schema.String
    ballString: Schema.String
    trophyString: Schema.String
    totalBalls: Schema.decodeTo<Schema.Int, Schema.String, never, never>
    dropsUntilDart: Schema.decodeTo<Schema.Int, Schema.String, never, never>
    hasMergedDisco: Schema.decodeTo<Schema.Boolean, Schema.Literals<readonly ["0", "1"]>, never, never>
    dangerTime: Schema.decodeTo<Schema.Finite, Schema.String, never, never>
    dangerIndex: Schema.decodeTo<Schema.Int, Schema.String, never, never>
  }>,
  readonly [Schema.$Record<Schema.String, Schema.Codec<Schema.Json, Schema.Json, never, never>>]
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/disco-zoo-sdk/src/Save.ts#L673)

Since v1.0.0

## NamedAnimalData

A name tag (the game's `NamedAnimalData`), written as the hat's character
(`-` for none), the variant index (one digit) and the name, such as
`"10Woolly"`. Pets without a name tag carry `"-0~~~"`.

**Signature**

```ts
declare const NamedAnimalData: Schema.decodeTo<
  Schema.Struct<{ readonly hat: Schema.String; readonly variantIndex: Schema.Int; readonly name: Schema.String }>,
  Schema.String,
  never,
  never
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/disco-zoo-sdk/src/Save.ts#L344)

Since v1.0.0

## PathCell

A path tile in a pen's scenery (the game's `PathCell`), written as
`col:row:shape`, where `shape` is the game's `PathShape` enum value.

**Signature**

```ts
declare const PathCell: Schema.decodeTo<
  Schema.Struct<{ readonly col: Schema.Int; readonly row: Schema.Int; readonly shape: Schema.Int }>,
  Schema.decodeTo<Schema.Tuple<readonly [Schema.Int, Schema.Int, Schema.Int]>, Schema.String, never, never>,
  never,
  never
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/disco-zoo-sdk/src/Save.ts#L433)

Since v1.0.0

## PenData

A pen (the game's `PenData`): the animal it holds, how many, its coins and
timers, and the hats, decorations and toy in it. `slug` is the pen's own
random id.

**Signature**

```ts
declare const PenData: Schema.StructWithRest<
  Schema.Struct<{
    animal: Schema.String
    slug: Schema.String
    count: Schema.decodeTo<Schema.Int, Schema.String, never, never>
    bilcoins: Schema.decodeTo<Schema.BigInt, Schema.String, never, never>
    awakeTicksLeft: Schema.decodeTo<Schema.BigInt, Schema.String, never, never>
    buildTicksLeft: Schema.decodeTo<Schema.BigInt, Schema.String, never, never>
    wakeUpBonus: Schema.decodeTo<Schema.Int, Schema.String, never, never>
    hats: Schema.decodeTo<
      Schema.$Array<Schema.Struct<{ readonly character: Schema.String; readonly count: Schema.Int }>>,
      Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>,
      never,
      never
    >
    decor: Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>
    toy: Schema.String
  }>,
  readonly [Schema.$Record<Schema.String, Schema.Codec<Schema.Json, Schema.Json, never, never>>]
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/disco-zoo-sdk/src/Save.ts#L537)

Since v1.0.0

## PetData

A pet (the game's `PetData`). `nameData` is its name tag.

**Signature**

```ts
declare const PetData: Schema.StructWithRest<
  Schema.Struct<{
    breedIndex: Schema.decodeTo<Schema.Int, Schema.String, never, never>
    variationIndex: Schema.decodeTo<Schema.Int, Schema.String, never, never>
    quality: Schema.decodeTo<Schema.Finite, Schema.String, never, never>
    healDuration: Schema.decodeTo<Schema.Finite, Schema.String, never, never>
    gradeIndex: Schema.decodeTo<Schema.Int, Schema.String, never, never>
    nameData: Schema.decodeTo<
      Schema.Struct<{ readonly hat: Schema.String; readonly variantIndex: Schema.Int; readonly name: Schema.String }>,
      Schema.String,
      never,
      never
    >
    species: Schema.String
    quirks: Schema.compose<
      Schema.$Array<
        Schema.decodeTo<
          Schema.Struct<{ readonly slug: Schema.String; readonly isRare: Schema.Boolean }>,
          Schema.String,
          never,
          never
        >
      >,
      Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>
    >
  }>,
  readonly [Schema.$Record<Schema.String, Schema.Codec<Schema.Json, Schema.Json, never, never>>]
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/disco-zoo-sdk/src/Save.ts#L623)

Since v1.0.0

## PetManager

Pets (the game's `PetManager`): the rescue and hospital pets (`{}` when
there is none), the lounge and its pets, and progress towards upgrades.

**Signature**

```ts
declare const PetManager: Schema.StructWithRest<
  Schema.Struct<{
    nextPetID: Schema.decodeTo<Schema.Int, Schema.String, never, never>
    totalPetsGivenAway: Schema.decodeTo<Schema.Int, Schema.String, never, never>
    loungeSlots: Schema.decodeTo<Schema.Int, Schema.String, never, never>
    loungeSlotsMax: Schema.decodeTo<Schema.Int, Schema.String, never, never>
    currentUpgradeTier: Schema.decodeTo<Schema.Int, Schema.String, never, never>
    petsGivenAwaySinceLastUpgrade: Schema.decodeTo<Schema.Int, Schema.String, never, never>
    healTicksLeft: Schema.decodeTo<Schema.BigInt, Schema.String, never, never>
    hospitalPetHealState: Schema.Literals<readonly ["None", "Injured", "Healing", "Healed"]>
    hasRescuedPet: Schema.decodeTo<Schema.Boolean, Schema.Literals<readonly ["0", "1"]>, never, never>
    rescuesUntilNextPet: Schema.decodeTo<Schema.Int, Schema.String, never, never>
    rescuePet: Schema.Union<
      readonly [
        Schema.StructWithRest<
          Schema.Struct<{
            breedIndex: Schema.decodeTo<Schema.Int, Schema.String, never, never>
            variationIndex: Schema.decodeTo<Schema.Int, Schema.String, never, never>
            quality: Schema.decodeTo<Schema.Finite, Schema.String, never, never>
            healDuration: Schema.decodeTo<Schema.Finite, Schema.String, never, never>
            gradeIndex: Schema.decodeTo<Schema.Int, Schema.String, never, never>
            nameData: Schema.decodeTo<
              Schema.Struct<{
                readonly hat: Schema.String
                readonly variantIndex: Schema.Int
                readonly name: Schema.String
              }>,
              Schema.String,
              never,
              never
            >
            species: Schema.String
            quirks: Schema.compose<
              Schema.$Array<
                Schema.decodeTo<
                  Schema.Struct<{ readonly slug: Schema.String; readonly isRare: Schema.Boolean }>,
                  Schema.String,
                  never,
                  never
                >
              >,
              Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>
            >
          }>,
          readonly [Schema.$Record<Schema.String, Schema.Codec<Schema.Json, Schema.Json, never, never>>]
        >,
        Schema.$Record<Schema.String, Schema.Never>
      ]
    >
    hospitalPet: Schema.Union<
      readonly [
        Schema.StructWithRest<
          Schema.Struct<{
            breedIndex: Schema.decodeTo<Schema.Int, Schema.String, never, never>
            variationIndex: Schema.decodeTo<Schema.Int, Schema.String, never, never>
            quality: Schema.decodeTo<Schema.Finite, Schema.String, never, never>
            healDuration: Schema.decodeTo<Schema.Finite, Schema.String, never, never>
            gradeIndex: Schema.decodeTo<Schema.Int, Schema.String, never, never>
            nameData: Schema.decodeTo<
              Schema.Struct<{
                readonly hat: Schema.String
                readonly variantIndex: Schema.Int
                readonly name: Schema.String
              }>,
              Schema.String,
              never,
              never
            >
            species: Schema.String
            quirks: Schema.compose<
              Schema.$Array<
                Schema.decodeTo<
                  Schema.Struct<{ readonly slug: Schema.String; readonly isRare: Schema.Boolean }>,
                  Schema.String,
                  never,
                  never
                >
              >,
              Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>
            >
          }>,
          readonly [Schema.$Record<Schema.String, Schema.Codec<Schema.Json, Schema.Json, never, never>>]
        >,
        Schema.$Record<Schema.String, Schema.Never>
      ]
    >
    hasAdoptedPet: Schema.decodeTo<Schema.Boolean, Schema.Literals<readonly ["0", "1"]>, never, never>
    loungeRegion: Schema.String
    loungeHats: Schema.decodeTo<
      Schema.$Array<Schema.Struct<{ readonly character: Schema.String; readonly count: Schema.Int }>>,
      Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>,
      never,
      never
    >
    loungeDecor: Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>
    loungeToy: Schema.String
    loungePets: Schema.$Array<
      Schema.StructWithRest<
        Schema.Struct<{
          breedIndex: Schema.decodeTo<Schema.Int, Schema.String, never, never>
          variationIndex: Schema.decodeTo<Schema.Int, Schema.String, never, never>
          quality: Schema.decodeTo<Schema.Finite, Schema.String, never, never>
          healDuration: Schema.decodeTo<Schema.Finite, Schema.String, never, never>
          gradeIndex: Schema.decodeTo<Schema.Int, Schema.String, never, never>
          nameData: Schema.decodeTo<
            Schema.Struct<{
              readonly hat: Schema.String
              readonly variantIndex: Schema.Int
              readonly name: Schema.String
            }>,
            Schema.String,
            never,
            never
          >
          species: Schema.String
          quirks: Schema.compose<
            Schema.$Array<
              Schema.decodeTo<
                Schema.Struct<{ readonly slug: Schema.String; readonly isRare: Schema.Boolean }>,
                Schema.String,
                never,
                never
              >
            >,
            Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>
          >
        }>,
        readonly [Schema.$Record<Schema.String, Schema.Codec<Schema.Json, Schema.Json, never, never>>]
      >
    >
    seenRegionSlugs: Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>
  }>,
  readonly [Schema.$Record<Schema.String, Schema.Codec<Schema.Json, Schema.Json, never, never>>]
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/disco-zoo-sdk/src/Save.ts#L644)

Since v1.0.0

## PetQuirk

A pet's quirk (the game's `PetQuirk`): the quirk's slug from `Pets.quirks`,
with a `+` after it for a rare one (`PetQuirk.isRare`, the only other state a
quirk has).

**Signature**

```ts
declare const PetQuirk: Schema.decodeTo<
  Schema.Struct<{ readonly slug: Schema.String; readonly isRare: Schema.Boolean }>,
  Schema.String,
  never,
  never
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/disco-zoo-sdk/src/Save.ts#L468)

Since v1.0.0

## PlayerData

The player's progress (the game's `PlayerData`). `currentRegion` and
`binocularRegion` are left out while the game has none.

**Signature**

```ts
declare const PlayerData: Schema.StructWithRest<
  Schema.Struct<{
    coins: Schema.decodeTo<Schema.Int, Schema.String, never, never>
    bux: Schema.decodeTo<Schema.Int, Schema.String, never, never>
    spaceCoins: Schema.decodeTo<Schema.Int, Schema.String, never, never>
    xp: Schema.decodeTo<Schema.Int, Schema.String, never, never>
    ticks: Schema.compose<
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
    >
    totalInGameTicks: Schema.decodeTo<Schema.BigInt, Schema.String, never, never>
    totalRealWorldTicks: Schema.decodeTo<Schema.BigInt, Schema.String, never, never>
    discoTicksLeft: Schema.decodeTo<Schema.BigInt, Schema.String, never, never>
    incidentTicksLeft: Schema.decodeTo<Schema.BigInt, Schema.String, never, never>
    zoopediaPurchased: Schema.decodeTo<Schema.Int, Schema.String, never, never>
    partyLighting: Schema.String
    bestCarsPassed: Schema.decodeTo<Schema.Int, Schema.String, never, never>
    bestFunkyCarsPassed: Schema.decodeTo<Schema.Int, Schema.String, never, never>
    hasBeenFunky: Schema.decodeTo<Schema.Boolean, Schema.Literals<readonly ["0", "1"]>, never, never>
    currentRegion: Schema.optionalKey<Schema.String>
    currentSpaceRegion: Schema.String
    tutorialAccounts: Schema.decodeTo<
      Schema.$Record<Schema.String, Schema.Int>,
      Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>,
      never,
      never
    >
    unlockedRegionAccounts: Schema.decodeTo<
      Schema.$Record<Schema.String, Schema.Int>,
      Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>,
      never,
      never
    >
    trophyAccounts: Schema.decodeTo<
      Schema.$Record<Schema.String, Schema.Int>,
      Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>,
      never,
      never
    >
    hats: Schema.decodeTo<
      Schema.$Array<Schema.Struct<{ readonly character: Schema.String; readonly count: Schema.Int }>>,
      Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>,
      never,
      never
    >
    decor: Schema.decodeTo<
      Schema.$Array<Schema.Struct<{ readonly character: Schema.String; readonly count: Schema.Int }>>,
      Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>,
      never,
      never
    >
    toys: Schema.decodeTo<
      Schema.$Array<Schema.Struct<{ readonly character: Schema.String; readonly count: Schema.Int }>>,
      Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>,
      never,
      never
    >
    areToysUnlocked: Schema.decodeTo<Schema.Boolean, Schema.Literals<readonly ["0", "1"]>, never, never>
    hasReceivedSantaHats: Schema.decodeTo<Schema.Boolean, Schema.Literals<readonly ["0", "1"]>, never, never>
    hasStarterPack: Schema.decodeTo<Schema.Boolean, Schema.Literals<readonly ["0", "1"]>, never, never>
    piggyBux: Schema.decodeTo<Schema.Int, Schema.String, never, never>
    piggyBankLevel: Schema.decodeTo<Schema.Int, Schema.String, never, never>
    areRewardsUnlocked: Schema.decodeTo<Schema.Boolean, Schema.Literals<readonly ["0", "1"]>, never, never>
    dayIndex: Schema.decodeTo<Schema.Int, Schema.String, never, never>
    lastDayPlayed: Schema.decodeTo<Schema.Int, Schema.String, never, never>
    lastYearPlayed: Schema.decodeTo<Schema.Int, Schema.String, never, never>
    weekSeed: Schema.decodeTo<Schema.Int, Schema.String, never, never>
    numNameTags: Schema.decodeTo<Schema.Int, Schema.String, never, never>
    binocularRegion: Schema.optionalKey<Schema.String>
  }>,
  readonly [Schema.$Record<Schema.String, Schema.Codec<Schema.Json, Schema.Json, never, never>>]
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/disco-zoo-sdk/src/Save.ts#L490)

Since v1.0.0

## Quest

A space quest (the game's `Quest`): its space coin reward, who asks (a
`QuestOwner` slug, such as `Venus`), and the animals it needs, joined by
`,`.

**Signature**

```ts
declare const Quest: Schema.StructWithRest<
  Schema.Struct<{
    reward: Schema.decodeTo<Schema.Int, Schema.String, never, never>
    owner: Schema.String
    animals: Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>
  }>,
  readonly [Schema.$Record<Schema.String, Schema.Codec<Schema.Json, Schema.Json, never, never>>]
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/disco-zoo-sdk/src/Save.ts#L598)

Since v1.0.0

## QuestManager

Space quests (the game's `QuestManager`): the animals held for them (animal
slug to count) and the open quests.

**Signature**

```ts
declare const QuestManager: Schema.StructWithRest<
  Schema.Struct<{
    heldAnimals: Schema.decodeTo<
      Schema.$Record<Schema.String, Schema.Int>,
      Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>,
      never,
      never
    >
    quests: Schema.$Array<
      Schema.StructWithRest<
        Schema.Struct<{
          reward: Schema.decodeTo<Schema.Int, Schema.String, never, never>
          owner: Schema.String
          animals: Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>
        }>,
        readonly [Schema.$Record<Schema.String, Schema.Codec<Schema.Json, Schema.Json, never, never>>]
      >
    >
    canQuest: Schema.decodeTo<Schema.Boolean, Schema.Literals<readonly ["0", "1"]>, never, never>
  }>,
  readonly [Schema.$Record<Schema.String, Schema.Codec<Schema.Json, Schema.Json, never, never>>]
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/disco-zoo-sdk/src/Save.ts#L611)

Since v1.0.0

## SaveData

The save string: `CloudSave.ToJson()`, which the game keeps in PlayerPrefs
under `discozoo` and the sync server stores (without the player's salt and
email). Decoding keeps keys the schema does not model, in every object of
the save, and never drops one. Encoding a decoded save gives back the
string the game wrote, byte for byte, except that each object's unknown keys
are written after its known keys, and that numbers inside unknown keys'
values are written the way JavaScript writes them (the module
documentation lists every exception).

**Signature**

```ts
declare const SaveData: Schema.compose<
  Schema.StructWithRest<
    Schema.Struct<{
      localDataString: Schema.compose<
        Schema.StructWithRest<
          Schema.Struct<{
            SceneryData: Schema.compose<
              Schema.StructWithRest<
                Schema.Struct<{
                  sceneryLotDatas: Schema.$Array<
                    Schema.StructWithRest<
                      Schema.Struct<{
                        penSlug: Schema.String
                        regionSlug: Schema.String
                        cols: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                        rows: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                        pathCells: Schema.compose<
                          Schema.$Array<
                            Schema.decodeTo<
                              Schema.Struct<{
                                readonly col: Schema.Int
                                readonly row: Schema.Int
                                readonly shape: Schema.Int
                              }>,
                              Schema.decodeTo<
                                Schema.Tuple<readonly [Schema.Int, Schema.Int, Schema.Int]>,
                                Schema.String,
                                never,
                                never
                              >,
                              never,
                              never
                            >
                          >,
                          Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>
                        >
                        collidableCells: Schema.compose<
                          Schema.$Array<
                            Schema.decodeTo<
                              Schema.Struct<{
                                readonly col: Schema.Int
                                readonly row: Schema.Int
                                readonly index: Schema.Int
                              }>,
                              Schema.decodeTo<
                                Schema.Tuple<readonly [Schema.Int, Schema.Int, Schema.Int]>,
                                Schema.String,
                                never,
                                never
                              >,
                              never,
                              never
                            >
                          >,
                          Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>
                        >
                      }>,
                      readonly [Schema.$Record<Schema.String, Schema.Codec<Schema.Json, Schema.Json, never, never>>]
                    >
                  >
                }>,
                readonly [Schema.$Record<Schema.String, Schema.Codec<Schema.Json, Schema.Json, never, never>>]
              >,
              Schema.decodeTo<
                Schema.Codec<Schema.MutableJson, Schema.MutableJson, never, never>,
                Schema.String,
                never,
                never
              >
            >
            SettingsData: Schema.compose<
              Schema.StructWithRest<
                Schema.Struct<{
                  sfxOn: Schema.Boolean
                  musicOn: Schema.Boolean
                  firstAnimalNotification: Schema.Boolean
                  allAnimalsNotification: Schema.Boolean
                  petHealedNotification: Schema.Boolean
                  toddlerModeOn: Schema.Boolean
                  isAdAgeConfirmed: Schema.Boolean
                  isSyncAgeConfirmed: Schema.Boolean
                  shouldShowNames: Schema.Boolean
                  newsVersion: Schema.Int
                  storeVersion: Schema.Int
                  hasSeenPrivacyPopup: Schema.Boolean
                  adsEnabled: Schema.Boolean
                  personalizedConsentApplies: Schema.Boolean
                  personalizedAdsEnabled: Schema.Boolean
                  cloudEnabled: Schema.Boolean
                  doNotSellData: Schema.Boolean
                  firebaseEnabled: Schema.Boolean
                  playerID: Schema.String
                  playerSalt: Schema.optionalKey<
                    Schema.Union<
                      readonly [
                        Schema.Literal<"">,
                        Schema.brand<Schema.RedactedFromValue<Schema.String>, "PlayerAuthKey">
                      ]
                    >
                  >
                  playerRegistered: Schema.Boolean
                  playerEmail: Schema.optionalKey<
                    Schema.Union<
                      readonly [
                        Schema.Literal<"">,
                        Schema.brand<Schema.RedactedFromValue<Schema.String>, "PlayerEmail">
                      ]
                    >
                  >
                  playerRegSent: Schema.Boolean
                }>,
                readonly [Schema.$Record<Schema.String, Schema.Codec<Schema.Json, Schema.Json, never, never>>]
              >,
              Schema.decodeTo<
                Schema.Codec<Schema.MutableJson, Schema.MutableJson, never, never>,
                Schema.String,
                never,
                never
              >
            >
            StoreData: Schema.compose<
              Schema.StructWithRest<
                Schema.Struct<{
                  storeBuxValues: Schema.compose<
                    Schema.$Array<Schema.decodeTo<Schema.Int, Schema.String, never, never>>,
                    Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>
                  >
                  storeCoinsValues: Schema.compose<
                    Schema.$Array<Schema.decodeTo<Schema.Int, Schema.String, never, never>>,
                    Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>
                  >
                  storeSpaceCoinsValues: Schema.compose<
                    Schema.$Array<Schema.decodeTo<Schema.Int, Schema.String, never, never>>,
                    Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>
                  >
                  storeBuxSales: Schema.compose<
                    Schema.$Array<Schema.decodeTo<Schema.Int, Schema.String, never, never>>,
                    Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>
                  >
                  storeCoinsSales: Schema.compose<
                    Schema.$Array<Schema.decodeTo<Schema.Int, Schema.String, never, never>>,
                    Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>
                  >
                  storeSpaceCoinsSales: Schema.compose<
                    Schema.$Array<Schema.decodeTo<Schema.Int, Schema.String, never, never>>,
                    Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>
                  >
                  starter_bux: Schema.Int
                  starter_coins: Schema.Int
                  starter_sale: Schema.decodeTo<Schema.Boolean, Schema.Literals<readonly ["0", "1"]>, never, never>
                  piggy_base: Schema.Int
                  piggy_increment: Schema.Int
                  piggy_buxPerAnimal: Schema.Int
                  piggy_max: Schema.Int
                  piggy_sale: Schema.decodeTo<Schema.Boolean, Schema.Literals<readonly ["0", "1"]>, never, never>
                  zoopedia_sale: Schema.decodeTo<Schema.Boolean, Schema.Literals<readonly ["0", "1"]>, never, never>
                }>,
                readonly [Schema.$Record<Schema.String, Schema.Codec<Schema.Json, Schema.Json, never, never>>]
              >,
              Schema.decodeTo<
                Schema.Codec<Schema.MutableJson, Schema.MutableJson, never, never>,
                Schema.String,
                never,
                never
              >
            >
          }>,
          readonly [Schema.$Record<Schema.String, Schema.Codec<Schema.Json, Schema.Json, never, never>>]
        >,
        Schema.decodeTo<Schema.Codec<Schema.MutableJson, Schema.MutableJson, never, never>, Schema.String, never, never>
      >
      globalDataString: Schema.compose<
        Schema.StructWithRest<
          Schema.Struct<{
            PlayerData: Schema.compose<
              Schema.StructWithRest<
                Schema.Struct<{
                  coins: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                  bux: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                  spaceCoins: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                  xp: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                  ticks: Schema.compose<
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
                  >
                  totalInGameTicks: Schema.decodeTo<Schema.BigInt, Schema.String, never, never>
                  totalRealWorldTicks: Schema.decodeTo<Schema.BigInt, Schema.String, never, never>
                  discoTicksLeft: Schema.decodeTo<Schema.BigInt, Schema.String, never, never>
                  incidentTicksLeft: Schema.decodeTo<Schema.BigInt, Schema.String, never, never>
                  zoopediaPurchased: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                  partyLighting: Schema.String
                  bestCarsPassed: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                  bestFunkyCarsPassed: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                  hasBeenFunky: Schema.decodeTo<Schema.Boolean, Schema.Literals<readonly ["0", "1"]>, never, never>
                  currentRegion: Schema.optionalKey<Schema.String>
                  currentSpaceRegion: Schema.String
                  tutorialAccounts: Schema.decodeTo<
                    Schema.$Record<Schema.String, Schema.Int>,
                    Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>,
                    never,
                    never
                  >
                  unlockedRegionAccounts: Schema.decodeTo<
                    Schema.$Record<Schema.String, Schema.Int>,
                    Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>,
                    never,
                    never
                  >
                  trophyAccounts: Schema.decodeTo<
                    Schema.$Record<Schema.String, Schema.Int>,
                    Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>,
                    never,
                    never
                  >
                  hats: Schema.decodeTo<
                    Schema.$Array<Schema.Struct<{ readonly character: Schema.String; readonly count: Schema.Int }>>,
                    Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>,
                    never,
                    never
                  >
                  decor: Schema.decodeTo<
                    Schema.$Array<Schema.Struct<{ readonly character: Schema.String; readonly count: Schema.Int }>>,
                    Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>,
                    never,
                    never
                  >
                  toys: Schema.decodeTo<
                    Schema.$Array<Schema.Struct<{ readonly character: Schema.String; readonly count: Schema.Int }>>,
                    Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>,
                    never,
                    never
                  >
                  areToysUnlocked: Schema.decodeTo<Schema.Boolean, Schema.Literals<readonly ["0", "1"]>, never, never>
                  hasReceivedSantaHats: Schema.decodeTo<
                    Schema.Boolean,
                    Schema.Literals<readonly ["0", "1"]>,
                    never,
                    never
                  >
                  hasStarterPack: Schema.decodeTo<Schema.Boolean, Schema.Literals<readonly ["0", "1"]>, never, never>
                  piggyBux: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                  piggyBankLevel: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                  areRewardsUnlocked: Schema.decodeTo<
                    Schema.Boolean,
                    Schema.Literals<readonly ["0", "1"]>,
                    never,
                    never
                  >
                  dayIndex: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                  lastDayPlayed: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                  lastYearPlayed: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                  weekSeed: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                  numNameTags: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                  binocularRegion: Schema.optionalKey<Schema.String>
                }>,
                readonly [Schema.$Record<Schema.String, Schema.Codec<Schema.Json, Schema.Json, never, never>>]
              >,
              Schema.decodeTo<
                Schema.Codec<Schema.MutableJson, Schema.MutableJson, never, never>,
                Schema.String,
                never,
                never
              >
            >
            ZooData: Schema.compose<
              Schema.StructWithRest<
                Schema.Struct<{
                  penDatas: Schema.$Array<
                    Schema.StructWithRest<
                      Schema.Struct<{
                        animal: Schema.String
                        slug: Schema.String
                        count: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                        bilcoins: Schema.decodeTo<Schema.BigInt, Schema.String, never, never>
                        awakeTicksLeft: Schema.decodeTo<Schema.BigInt, Schema.String, never, never>
                        buildTicksLeft: Schema.decodeTo<Schema.BigInt, Schema.String, never, never>
                        wakeUpBonus: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                        hats: Schema.decodeTo<
                          Schema.$Array<
                            Schema.Struct<{ readonly character: Schema.String; readonly count: Schema.Int }>
                          >,
                          Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>,
                          never,
                          never
                        >
                        decor: Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>
                        toy: Schema.String
                      }>,
                      readonly [Schema.$Record<Schema.String, Schema.Codec<Schema.Json, Schema.Json, never, never>>]
                    >
                  >
                  customPenDatas: Schema.compose<
                    Schema.$Array<
                      Schema.compose<
                        Schema.Struct<{
                          readonly animalSlug: Schema.String
                          readonly namedAnimals: Schema.compose<
                            Schema.$Array<
                              Schema.decodeTo<
                                Schema.Struct<{
                                  readonly hat: Schema.String
                                  readonly variantIndex: Schema.Int
                                  readonly name: Schema.String
                                }>,
                                Schema.String,
                                never,
                                never
                              >
                            >,
                            Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>
                          >
                        }>,
                        Schema.decodeTo<
                          Schema.Struct<{ readonly animalSlug: Schema.String; readonly namedAnimals: Schema.String }>,
                          Schema.String,
                          never,
                          never
                        >
                      >
                    >,
                    Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>
                  >
                }>,
                readonly [Schema.$Record<Schema.String, Schema.Codec<Schema.Json, Schema.Json, never, never>>]
              >,
              Schema.decodeTo<
                Schema.Codec<Schema.MutableJson, Schema.MutableJson, never, never>,
                Schema.String,
                never,
                never
              >
            >
            StatsData: Schema.compose<
              Schema.StructWithRest<
                Schema.Struct<{
                  coinAccounts: Schema.decodeTo<
                    Schema.$Record<Schema.String, Schema.Int>,
                    Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>,
                    never,
                    never
                  >
                  buxAccounts: Schema.decodeTo<
                    Schema.$Record<Schema.String, Schema.Int>,
                    Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>,
                    never,
                    never
                  >
                  spaceCoinAccounts: Schema.decodeTo<
                    Schema.$Record<Schema.String, Schema.Int>,
                    Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>,
                    never,
                    never
                  >
                  statAccounts: Schema.decodeTo<
                    Schema.$Record<Schema.String, Schema.Int>,
                    Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>,
                    never,
                    never
                  >
                  totalCoinsEarned: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                  totalBuxEarned: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                  totalSpaceCoinsEarned: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                  totalCoinsSpent: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                  totalBuxSpent: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                  totalSpaceCoinsSpent: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                  totalDiamondsEarnedPreviously: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                  numTimeRewinds: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                  actualTimeRewinds: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                  extraTimeRewinds: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                  totalPetsHealed: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                }>,
                readonly [Schema.$Record<Schema.String, Schema.Codec<Schema.Json, Schema.Json, never, never>>]
              >,
              Schema.decodeTo<
                Schema.Codec<Schema.MutableJson, Schema.MutableJson, never, never>,
                Schema.String,
                never,
                never
              >
            >
            QuestManager: Schema.compose<
              Schema.StructWithRest<
                Schema.Struct<{
                  heldAnimals: Schema.decodeTo<
                    Schema.$Record<Schema.String, Schema.Int>,
                    Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>,
                    never,
                    never
                  >
                  quests: Schema.$Array<
                    Schema.StructWithRest<
                      Schema.Struct<{
                        reward: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                        owner: Schema.String
                        animals: Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>
                      }>,
                      readonly [Schema.$Record<Schema.String, Schema.Codec<Schema.Json, Schema.Json, never, never>>]
                    >
                  >
                  canQuest: Schema.decodeTo<Schema.Boolean, Schema.Literals<readonly ["0", "1"]>, never, never>
                }>,
                readonly [Schema.$Record<Schema.String, Schema.Codec<Schema.Json, Schema.Json, never, never>>]
              >,
              Schema.decodeTo<
                Schema.Codec<Schema.MutableJson, Schema.MutableJson, never, never>,
                Schema.String,
                never,
                never
              >
            >
            PetManager: Schema.compose<
              Schema.StructWithRest<
                Schema.Struct<{
                  nextPetID: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                  totalPetsGivenAway: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                  loungeSlots: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                  loungeSlotsMax: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                  currentUpgradeTier: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                  petsGivenAwaySinceLastUpgrade: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                  healTicksLeft: Schema.decodeTo<Schema.BigInt, Schema.String, never, never>
                  hospitalPetHealState: Schema.Literals<readonly ["None", "Injured", "Healing", "Healed"]>
                  hasRescuedPet: Schema.decodeTo<Schema.Boolean, Schema.Literals<readonly ["0", "1"]>, never, never>
                  rescuesUntilNextPet: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                  rescuePet: Schema.Union<
                    readonly [
                      Schema.StructWithRest<
                        Schema.Struct<{
                          breedIndex: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                          variationIndex: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                          quality: Schema.decodeTo<Schema.Finite, Schema.String, never, never>
                          healDuration: Schema.decodeTo<Schema.Finite, Schema.String, never, never>
                          gradeIndex: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                          nameData: Schema.decodeTo<
                            Schema.Struct<{
                              readonly hat: Schema.String
                              readonly variantIndex: Schema.Int
                              readonly name: Schema.String
                            }>,
                            Schema.String,
                            never,
                            never
                          >
                          species: Schema.String
                          quirks: Schema.compose<
                            Schema.$Array<
                              Schema.decodeTo<
                                Schema.Struct<{ readonly slug: Schema.String; readonly isRare: Schema.Boolean }>,
                                Schema.String,
                                never,
                                never
                              >
                            >,
                            Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>
                          >
                        }>,
                        readonly [Schema.$Record<Schema.String, Schema.Codec<Schema.Json, Schema.Json, never, never>>]
                      >,
                      Schema.$Record<Schema.String, Schema.Never>
                    ]
                  >
                  hospitalPet: Schema.Union<
                    readonly [
                      Schema.StructWithRest<
                        Schema.Struct<{
                          breedIndex: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                          variationIndex: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                          quality: Schema.decodeTo<Schema.Finite, Schema.String, never, never>
                          healDuration: Schema.decodeTo<Schema.Finite, Schema.String, never, never>
                          gradeIndex: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                          nameData: Schema.decodeTo<
                            Schema.Struct<{
                              readonly hat: Schema.String
                              readonly variantIndex: Schema.Int
                              readonly name: Schema.String
                            }>,
                            Schema.String,
                            never,
                            never
                          >
                          species: Schema.String
                          quirks: Schema.compose<
                            Schema.$Array<
                              Schema.decodeTo<
                                Schema.Struct<{ readonly slug: Schema.String; readonly isRare: Schema.Boolean }>,
                                Schema.String,
                                never,
                                never
                              >
                            >,
                            Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>
                          >
                        }>,
                        readonly [Schema.$Record<Schema.String, Schema.Codec<Schema.Json, Schema.Json, never, never>>]
                      >,
                      Schema.$Record<Schema.String, Schema.Never>
                    ]
                  >
                  hasAdoptedPet: Schema.decodeTo<Schema.Boolean, Schema.Literals<readonly ["0", "1"]>, never, never>
                  loungeRegion: Schema.String
                  loungeHats: Schema.decodeTo<
                    Schema.$Array<Schema.Struct<{ readonly character: Schema.String; readonly count: Schema.Int }>>,
                    Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>,
                    never,
                    never
                  >
                  loungeDecor: Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>
                  loungeToy: Schema.String
                  loungePets: Schema.$Array<
                    Schema.StructWithRest<
                      Schema.Struct<{
                        breedIndex: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                        variationIndex: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                        quality: Schema.decodeTo<Schema.Finite, Schema.String, never, never>
                        healDuration: Schema.decodeTo<Schema.Finite, Schema.String, never, never>
                        gradeIndex: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                        nameData: Schema.decodeTo<
                          Schema.Struct<{
                            readonly hat: Schema.String
                            readonly variantIndex: Schema.Int
                            readonly name: Schema.String
                          }>,
                          Schema.String,
                          never,
                          never
                        >
                        species: Schema.String
                        quirks: Schema.compose<
                          Schema.$Array<
                            Schema.decodeTo<
                              Schema.Struct<{ readonly slug: Schema.String; readonly isRare: Schema.Boolean }>,
                              Schema.String,
                              never,
                              never
                            >
                          >,
                          Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>
                        >
                      }>,
                      readonly [Schema.$Record<Schema.String, Schema.Codec<Schema.Json, Schema.Json, never, never>>]
                    >
                  >
                  seenRegionSlugs: Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>
                }>,
                readonly [Schema.$Record<Schema.String, Schema.Codec<Schema.Json, Schema.Json, never, never>>]
              >,
              Schema.decodeTo<
                Schema.Codec<Schema.MutableJson, Schema.MutableJson, never, never>,
                Schema.String,
                never,
                never
              >
            >
            LoonManager: Schema.compose<
              Schema.StructWithRest<
                Schema.Struct<{
                  isGameOver: Schema.decodeTo<Schema.Boolean, Schema.Literals<readonly ["0", "1"]>, never, never>
                  hasBeatenScore: Schema.decodeTo<Schema.Boolean, Schema.Literals<readonly ["0", "1"]>, never, never>
                  score: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                  bestScore: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                  bestCombo: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                  totalDiscoBallsMade: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                  totalDiscoBallsMerged: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                  totalDiscoBallHits: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                  upcomingString: Schema.String
                  ballString: Schema.String
                  trophyString: Schema.String
                  totalBalls: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                  dropsUntilDart: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                  hasMergedDisco: Schema.decodeTo<Schema.Boolean, Schema.Literals<readonly ["0", "1"]>, never, never>
                  dangerTime: Schema.decodeTo<Schema.Finite, Schema.String, never, never>
                  dangerIndex: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                }>,
                readonly [Schema.$Record<Schema.String, Schema.Codec<Schema.Json, Schema.Json, never, never>>]
              >,
              Schema.decodeTo<
                Schema.Codec<Schema.MutableJson, Schema.MutableJson, never, never>,
                Schema.String,
                never,
                never
              >
            >
          }>,
          readonly [Schema.$Record<Schema.String, Schema.Codec<Schema.Json, Schema.Json, never, never>>]
        >,
        Schema.decodeTo<Schema.Codec<Schema.MutableJson, Schema.MutableJson, never, never>, Schema.String, never, never>
      >
      dataVersion: Schema.Int
      xp: Schema.Int
    }>,
    readonly [Schema.$Record<Schema.String, Schema.Codec<Schema.Json, Schema.Json, never, never>>]
  >,
  Schema.decodeTo<Schema.Codec<Schema.MutableJson, Schema.MutableJson, never, never>, Schema.String, never, never>
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/disco-zoo-sdk/src/Save.ts#L845)

Since v1.0.0

## SaveDataFromBytes

The save as the sync server holds it: the bytes of the base64 `data` that
`/sync/pull/` returns (what `sync_pullSave` gives), which are the
zlib-compressed UTF-8 save string without the player's salt and email. It
decompresses with the platform's `DecompressionStream`, so it only decodes
and encodes with the Effect or Promise APIs, not the sync ones. Compressing
again need not give the same bytes as the game's zlib, only bytes the game
reads.

**Signature**

```ts
declare const SaveDataFromBytes: Schema.decodeTo<
  Schema.compose<
    Schema.StructWithRest<
      Schema.Struct<{
        localDataString: Schema.compose<
          Schema.StructWithRest<
            Schema.Struct<{
              SceneryData: Schema.compose<
                Schema.StructWithRest<
                  Schema.Struct<{
                    sceneryLotDatas: Schema.$Array<
                      Schema.StructWithRest<
                        Schema.Struct<{
                          penSlug: Schema.String
                          regionSlug: Schema.String
                          cols: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                          rows: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                          pathCells: Schema.compose<
                            Schema.$Array<
                              Schema.decodeTo<
                                Schema.Struct<{
                                  readonly col: Schema.Int
                                  readonly row: Schema.Int
                                  readonly shape: Schema.Int
                                }>,
                                Schema.decodeTo<
                                  Schema.Tuple<readonly [Schema.Int, Schema.Int, Schema.Int]>,
                                  Schema.String,
                                  never,
                                  never
                                >,
                                never,
                                never
                              >
                            >,
                            Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>
                          >
                          collidableCells: Schema.compose<
                            Schema.$Array<
                              Schema.decodeTo<
                                Schema.Struct<{
                                  readonly col: Schema.Int
                                  readonly row: Schema.Int
                                  readonly index: Schema.Int
                                }>,
                                Schema.decodeTo<
                                  Schema.Tuple<readonly [Schema.Int, Schema.Int, Schema.Int]>,
                                  Schema.String,
                                  never,
                                  never
                                >,
                                never,
                                never
                              >
                            >,
                            Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>
                          >
                        }>,
                        readonly [Schema.$Record<Schema.String, Schema.Codec<Schema.Json, Schema.Json, never, never>>]
                      >
                    >
                  }>,
                  readonly [Schema.$Record<Schema.String, Schema.Codec<Schema.Json, Schema.Json, never, never>>]
                >,
                Schema.decodeTo<
                  Schema.Codec<Schema.MutableJson, Schema.MutableJson, never, never>,
                  Schema.String,
                  never,
                  never
                >
              >
              SettingsData: Schema.compose<
                Schema.StructWithRest<
                  Schema.Struct<{
                    sfxOn: Schema.Boolean
                    musicOn: Schema.Boolean
                    firstAnimalNotification: Schema.Boolean
                    allAnimalsNotification: Schema.Boolean
                    petHealedNotification: Schema.Boolean
                    toddlerModeOn: Schema.Boolean
                    isAdAgeConfirmed: Schema.Boolean
                    isSyncAgeConfirmed: Schema.Boolean
                    shouldShowNames: Schema.Boolean
                    newsVersion: Schema.Int
                    storeVersion: Schema.Int
                    hasSeenPrivacyPopup: Schema.Boolean
                    adsEnabled: Schema.Boolean
                    personalizedConsentApplies: Schema.Boolean
                    personalizedAdsEnabled: Schema.Boolean
                    cloudEnabled: Schema.Boolean
                    doNotSellData: Schema.Boolean
                    firebaseEnabled: Schema.Boolean
                    playerID: Schema.String
                    playerSalt: Schema.optionalKey<
                      Schema.Union<
                        readonly [
                          Schema.Literal<"">,
                          Schema.brand<Schema.RedactedFromValue<Schema.String>, "PlayerAuthKey">
                        ]
                      >
                    >
                    playerRegistered: Schema.Boolean
                    playerEmail: Schema.optionalKey<
                      Schema.Union<
                        readonly [
                          Schema.Literal<"">,
                          Schema.brand<Schema.RedactedFromValue<Schema.String>, "PlayerEmail">
                        ]
                      >
                    >
                    playerRegSent: Schema.Boolean
                  }>,
                  readonly [Schema.$Record<Schema.String, Schema.Codec<Schema.Json, Schema.Json, never, never>>]
                >,
                Schema.decodeTo<
                  Schema.Codec<Schema.MutableJson, Schema.MutableJson, never, never>,
                  Schema.String,
                  never,
                  never
                >
              >
              StoreData: Schema.compose<
                Schema.StructWithRest<
                  Schema.Struct<{
                    storeBuxValues: Schema.compose<
                      Schema.$Array<Schema.decodeTo<Schema.Int, Schema.String, never, never>>,
                      Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>
                    >
                    storeCoinsValues: Schema.compose<
                      Schema.$Array<Schema.decodeTo<Schema.Int, Schema.String, never, never>>,
                      Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>
                    >
                    storeSpaceCoinsValues: Schema.compose<
                      Schema.$Array<Schema.decodeTo<Schema.Int, Schema.String, never, never>>,
                      Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>
                    >
                    storeBuxSales: Schema.compose<
                      Schema.$Array<Schema.decodeTo<Schema.Int, Schema.String, never, never>>,
                      Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>
                    >
                    storeCoinsSales: Schema.compose<
                      Schema.$Array<Schema.decodeTo<Schema.Int, Schema.String, never, never>>,
                      Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>
                    >
                    storeSpaceCoinsSales: Schema.compose<
                      Schema.$Array<Schema.decodeTo<Schema.Int, Schema.String, never, never>>,
                      Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>
                    >
                    starter_bux: Schema.Int
                    starter_coins: Schema.Int
                    starter_sale: Schema.decodeTo<Schema.Boolean, Schema.Literals<readonly ["0", "1"]>, never, never>
                    piggy_base: Schema.Int
                    piggy_increment: Schema.Int
                    piggy_buxPerAnimal: Schema.Int
                    piggy_max: Schema.Int
                    piggy_sale: Schema.decodeTo<Schema.Boolean, Schema.Literals<readonly ["0", "1"]>, never, never>
                    zoopedia_sale: Schema.decodeTo<Schema.Boolean, Schema.Literals<readonly ["0", "1"]>, never, never>
                  }>,
                  readonly [Schema.$Record<Schema.String, Schema.Codec<Schema.Json, Schema.Json, never, never>>]
                >,
                Schema.decodeTo<
                  Schema.Codec<Schema.MutableJson, Schema.MutableJson, never, never>,
                  Schema.String,
                  never,
                  never
                >
              >
            }>,
            readonly [Schema.$Record<Schema.String, Schema.Codec<Schema.Json, Schema.Json, never, never>>]
          >,
          Schema.decodeTo<
            Schema.Codec<Schema.MutableJson, Schema.MutableJson, never, never>,
            Schema.String,
            never,
            never
          >
        >
        globalDataString: Schema.compose<
          Schema.StructWithRest<
            Schema.Struct<{
              PlayerData: Schema.compose<
                Schema.StructWithRest<
                  Schema.Struct<{
                    coins: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                    bux: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                    spaceCoins: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                    xp: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                    ticks: Schema.compose<
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
                    >
                    totalInGameTicks: Schema.decodeTo<Schema.BigInt, Schema.String, never, never>
                    totalRealWorldTicks: Schema.decodeTo<Schema.BigInt, Schema.String, never, never>
                    discoTicksLeft: Schema.decodeTo<Schema.BigInt, Schema.String, never, never>
                    incidentTicksLeft: Schema.decodeTo<Schema.BigInt, Schema.String, never, never>
                    zoopediaPurchased: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                    partyLighting: Schema.String
                    bestCarsPassed: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                    bestFunkyCarsPassed: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                    hasBeenFunky: Schema.decodeTo<Schema.Boolean, Schema.Literals<readonly ["0", "1"]>, never, never>
                    currentRegion: Schema.optionalKey<Schema.String>
                    currentSpaceRegion: Schema.String
                    tutorialAccounts: Schema.decodeTo<
                      Schema.$Record<Schema.String, Schema.Int>,
                      Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>,
                      never,
                      never
                    >
                    unlockedRegionAccounts: Schema.decodeTo<
                      Schema.$Record<Schema.String, Schema.Int>,
                      Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>,
                      never,
                      never
                    >
                    trophyAccounts: Schema.decodeTo<
                      Schema.$Record<Schema.String, Schema.Int>,
                      Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>,
                      never,
                      never
                    >
                    hats: Schema.decodeTo<
                      Schema.$Array<Schema.Struct<{ readonly character: Schema.String; readonly count: Schema.Int }>>,
                      Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>,
                      never,
                      never
                    >
                    decor: Schema.decodeTo<
                      Schema.$Array<Schema.Struct<{ readonly character: Schema.String; readonly count: Schema.Int }>>,
                      Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>,
                      never,
                      never
                    >
                    toys: Schema.decodeTo<
                      Schema.$Array<Schema.Struct<{ readonly character: Schema.String; readonly count: Schema.Int }>>,
                      Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>,
                      never,
                      never
                    >
                    areToysUnlocked: Schema.decodeTo<Schema.Boolean, Schema.Literals<readonly ["0", "1"]>, never, never>
                    hasReceivedSantaHats: Schema.decodeTo<
                      Schema.Boolean,
                      Schema.Literals<readonly ["0", "1"]>,
                      never,
                      never
                    >
                    hasStarterPack: Schema.decodeTo<Schema.Boolean, Schema.Literals<readonly ["0", "1"]>, never, never>
                    piggyBux: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                    piggyBankLevel: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                    areRewardsUnlocked: Schema.decodeTo<
                      Schema.Boolean,
                      Schema.Literals<readonly ["0", "1"]>,
                      never,
                      never
                    >
                    dayIndex: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                    lastDayPlayed: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                    lastYearPlayed: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                    weekSeed: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                    numNameTags: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                    binocularRegion: Schema.optionalKey<Schema.String>
                  }>,
                  readonly [Schema.$Record<Schema.String, Schema.Codec<Schema.Json, Schema.Json, never, never>>]
                >,
                Schema.decodeTo<
                  Schema.Codec<Schema.MutableJson, Schema.MutableJson, never, never>,
                  Schema.String,
                  never,
                  never
                >
              >
              ZooData: Schema.compose<
                Schema.StructWithRest<
                  Schema.Struct<{
                    penDatas: Schema.$Array<
                      Schema.StructWithRest<
                        Schema.Struct<{
                          animal: Schema.String
                          slug: Schema.String
                          count: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                          bilcoins: Schema.decodeTo<Schema.BigInt, Schema.String, never, never>
                          awakeTicksLeft: Schema.decodeTo<Schema.BigInt, Schema.String, never, never>
                          buildTicksLeft: Schema.decodeTo<Schema.BigInt, Schema.String, never, never>
                          wakeUpBonus: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                          hats: Schema.decodeTo<
                            Schema.$Array<
                              Schema.Struct<{ readonly character: Schema.String; readonly count: Schema.Int }>
                            >,
                            Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>,
                            never,
                            never
                          >
                          decor: Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>
                          toy: Schema.String
                        }>,
                        readonly [Schema.$Record<Schema.String, Schema.Codec<Schema.Json, Schema.Json, never, never>>]
                      >
                    >
                    customPenDatas: Schema.compose<
                      Schema.$Array<
                        Schema.compose<
                          Schema.Struct<{
                            readonly animalSlug: Schema.String
                            readonly namedAnimals: Schema.compose<
                              Schema.$Array<
                                Schema.decodeTo<
                                  Schema.Struct<{
                                    readonly hat: Schema.String
                                    readonly variantIndex: Schema.Int
                                    readonly name: Schema.String
                                  }>,
                                  Schema.String,
                                  never,
                                  never
                                >
                              >,
                              Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>
                            >
                          }>,
                          Schema.decodeTo<
                            Schema.Struct<{ readonly animalSlug: Schema.String; readonly namedAnimals: Schema.String }>,
                            Schema.String,
                            never,
                            never
                          >
                        >
                      >,
                      Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>
                    >
                  }>,
                  readonly [Schema.$Record<Schema.String, Schema.Codec<Schema.Json, Schema.Json, never, never>>]
                >,
                Schema.decodeTo<
                  Schema.Codec<Schema.MutableJson, Schema.MutableJson, never, never>,
                  Schema.String,
                  never,
                  never
                >
              >
              StatsData: Schema.compose<
                Schema.StructWithRest<
                  Schema.Struct<{
                    coinAccounts: Schema.decodeTo<
                      Schema.$Record<Schema.String, Schema.Int>,
                      Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>,
                      never,
                      never
                    >
                    buxAccounts: Schema.decodeTo<
                      Schema.$Record<Schema.String, Schema.Int>,
                      Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>,
                      never,
                      never
                    >
                    spaceCoinAccounts: Schema.decodeTo<
                      Schema.$Record<Schema.String, Schema.Int>,
                      Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>,
                      never,
                      never
                    >
                    statAccounts: Schema.decodeTo<
                      Schema.$Record<Schema.String, Schema.Int>,
                      Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>,
                      never,
                      never
                    >
                    totalCoinsEarned: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                    totalBuxEarned: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                    totalSpaceCoinsEarned: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                    totalCoinsSpent: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                    totalBuxSpent: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                    totalSpaceCoinsSpent: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                    totalDiamondsEarnedPreviously: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                    numTimeRewinds: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                    actualTimeRewinds: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                    extraTimeRewinds: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                    totalPetsHealed: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                  }>,
                  readonly [Schema.$Record<Schema.String, Schema.Codec<Schema.Json, Schema.Json, never, never>>]
                >,
                Schema.decodeTo<
                  Schema.Codec<Schema.MutableJson, Schema.MutableJson, never, never>,
                  Schema.String,
                  never,
                  never
                >
              >
              QuestManager: Schema.compose<
                Schema.StructWithRest<
                  Schema.Struct<{
                    heldAnimals: Schema.decodeTo<
                      Schema.$Record<Schema.String, Schema.Int>,
                      Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>,
                      never,
                      never
                    >
                    quests: Schema.$Array<
                      Schema.StructWithRest<
                        Schema.Struct<{
                          reward: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                          owner: Schema.String
                          animals: Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>
                        }>,
                        readonly [Schema.$Record<Schema.String, Schema.Codec<Schema.Json, Schema.Json, never, never>>]
                      >
                    >
                    canQuest: Schema.decodeTo<Schema.Boolean, Schema.Literals<readonly ["0", "1"]>, never, never>
                  }>,
                  readonly [Schema.$Record<Schema.String, Schema.Codec<Schema.Json, Schema.Json, never, never>>]
                >,
                Schema.decodeTo<
                  Schema.Codec<Schema.MutableJson, Schema.MutableJson, never, never>,
                  Schema.String,
                  never,
                  never
                >
              >
              PetManager: Schema.compose<
                Schema.StructWithRest<
                  Schema.Struct<{
                    nextPetID: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                    totalPetsGivenAway: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                    loungeSlots: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                    loungeSlotsMax: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                    currentUpgradeTier: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                    petsGivenAwaySinceLastUpgrade: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                    healTicksLeft: Schema.decodeTo<Schema.BigInt, Schema.String, never, never>
                    hospitalPetHealState: Schema.Literals<readonly ["None", "Injured", "Healing", "Healed"]>
                    hasRescuedPet: Schema.decodeTo<Schema.Boolean, Schema.Literals<readonly ["0", "1"]>, never, never>
                    rescuesUntilNextPet: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                    rescuePet: Schema.Union<
                      readonly [
                        Schema.StructWithRest<
                          Schema.Struct<{
                            breedIndex: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                            variationIndex: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                            quality: Schema.decodeTo<Schema.Finite, Schema.String, never, never>
                            healDuration: Schema.decodeTo<Schema.Finite, Schema.String, never, never>
                            gradeIndex: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                            nameData: Schema.decodeTo<
                              Schema.Struct<{
                                readonly hat: Schema.String
                                readonly variantIndex: Schema.Int
                                readonly name: Schema.String
                              }>,
                              Schema.String,
                              never,
                              never
                            >
                            species: Schema.String
                            quirks: Schema.compose<
                              Schema.$Array<
                                Schema.decodeTo<
                                  Schema.Struct<{ readonly slug: Schema.String; readonly isRare: Schema.Boolean }>,
                                  Schema.String,
                                  never,
                                  never
                                >
                              >,
                              Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>
                            >
                          }>,
                          readonly [Schema.$Record<Schema.String, Schema.Codec<Schema.Json, Schema.Json, never, never>>]
                        >,
                        Schema.$Record<Schema.String, Schema.Never>
                      ]
                    >
                    hospitalPet: Schema.Union<
                      readonly [
                        Schema.StructWithRest<
                          Schema.Struct<{
                            breedIndex: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                            variationIndex: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                            quality: Schema.decodeTo<Schema.Finite, Schema.String, never, never>
                            healDuration: Schema.decodeTo<Schema.Finite, Schema.String, never, never>
                            gradeIndex: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                            nameData: Schema.decodeTo<
                              Schema.Struct<{
                                readonly hat: Schema.String
                                readonly variantIndex: Schema.Int
                                readonly name: Schema.String
                              }>,
                              Schema.String,
                              never,
                              never
                            >
                            species: Schema.String
                            quirks: Schema.compose<
                              Schema.$Array<
                                Schema.decodeTo<
                                  Schema.Struct<{ readonly slug: Schema.String; readonly isRare: Schema.Boolean }>,
                                  Schema.String,
                                  never,
                                  never
                                >
                              >,
                              Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>
                            >
                          }>,
                          readonly [Schema.$Record<Schema.String, Schema.Codec<Schema.Json, Schema.Json, never, never>>]
                        >,
                        Schema.$Record<Schema.String, Schema.Never>
                      ]
                    >
                    hasAdoptedPet: Schema.decodeTo<Schema.Boolean, Schema.Literals<readonly ["0", "1"]>, never, never>
                    loungeRegion: Schema.String
                    loungeHats: Schema.decodeTo<
                      Schema.$Array<Schema.Struct<{ readonly character: Schema.String; readonly count: Schema.Int }>>,
                      Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>,
                      never,
                      never
                    >
                    loungeDecor: Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>
                    loungeToy: Schema.String
                    loungePets: Schema.$Array<
                      Schema.StructWithRest<
                        Schema.Struct<{
                          breedIndex: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                          variationIndex: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                          quality: Schema.decodeTo<Schema.Finite, Schema.String, never, never>
                          healDuration: Schema.decodeTo<Schema.Finite, Schema.String, never, never>
                          gradeIndex: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                          nameData: Schema.decodeTo<
                            Schema.Struct<{
                              readonly hat: Schema.String
                              readonly variantIndex: Schema.Int
                              readonly name: Schema.String
                            }>,
                            Schema.String,
                            never,
                            never
                          >
                          species: Schema.String
                          quirks: Schema.compose<
                            Schema.$Array<
                              Schema.decodeTo<
                                Schema.Struct<{ readonly slug: Schema.String; readonly isRare: Schema.Boolean }>,
                                Schema.String,
                                never,
                                never
                              >
                            >,
                            Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>
                          >
                        }>,
                        readonly [Schema.$Record<Schema.String, Schema.Codec<Schema.Json, Schema.Json, never, never>>]
                      >
                    >
                    seenRegionSlugs: Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>
                  }>,
                  readonly [Schema.$Record<Schema.String, Schema.Codec<Schema.Json, Schema.Json, never, never>>]
                >,
                Schema.decodeTo<
                  Schema.Codec<Schema.MutableJson, Schema.MutableJson, never, never>,
                  Schema.String,
                  never,
                  never
                >
              >
              LoonManager: Schema.compose<
                Schema.StructWithRest<
                  Schema.Struct<{
                    isGameOver: Schema.decodeTo<Schema.Boolean, Schema.Literals<readonly ["0", "1"]>, never, never>
                    hasBeatenScore: Schema.decodeTo<Schema.Boolean, Schema.Literals<readonly ["0", "1"]>, never, never>
                    score: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                    bestScore: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                    bestCombo: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                    totalDiscoBallsMade: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                    totalDiscoBallsMerged: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                    totalDiscoBallHits: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                    upcomingString: Schema.String
                    ballString: Schema.String
                    trophyString: Schema.String
                    totalBalls: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                    dropsUntilDart: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                    hasMergedDisco: Schema.decodeTo<Schema.Boolean, Schema.Literals<readonly ["0", "1"]>, never, never>
                    dangerTime: Schema.decodeTo<Schema.Finite, Schema.String, never, never>
                    dangerIndex: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                  }>,
                  readonly [Schema.$Record<Schema.String, Schema.Codec<Schema.Json, Schema.Json, never, never>>]
                >,
                Schema.decodeTo<
                  Schema.Codec<Schema.MutableJson, Schema.MutableJson, never, never>,
                  Schema.String,
                  never,
                  never
                >
              >
            }>,
            readonly [Schema.$Record<Schema.String, Schema.Codec<Schema.Json, Schema.Json, never, never>>]
          >,
          Schema.decodeTo<
            Schema.Codec<Schema.MutableJson, Schema.MutableJson, never, never>,
            Schema.String,
            never,
            never
          >
        >
        dataVersion: Schema.Int
        xp: Schema.Int
      }>,
      readonly [Schema.$Record<Schema.String, Schema.Codec<Schema.Json, Schema.Json, never, never>>]
    >,
    Schema.decodeTo<Schema.Codec<Schema.MutableJson, Schema.MutableJson, never, never>, Schema.String, never, never>
  >,
  Schema.Uint8Array,
  never,
  never
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/disco-zoo-sdk/src/Save.ts#L893)

Since v1.0.0

## SceneryData

The pens' scenery (the game's `SceneryData`).

**Signature**

```ts
declare const SceneryData: Schema.StructWithRest<
  Schema.Struct<{
    sceneryLotDatas: Schema.$Array<
      Schema.StructWithRest<
        Schema.Struct<{
          penSlug: Schema.String
          regionSlug: Schema.String
          cols: Schema.decodeTo<Schema.Int, Schema.String, never, never>
          rows: Schema.decodeTo<Schema.Int, Schema.String, never, never>
          pathCells: Schema.compose<
            Schema.$Array<
              Schema.decodeTo<
                Schema.Struct<{ readonly col: Schema.Int; readonly row: Schema.Int; readonly shape: Schema.Int }>,
                Schema.decodeTo<
                  Schema.Tuple<readonly [Schema.Int, Schema.Int, Schema.Int]>,
                  Schema.String,
                  never,
                  never
                >,
                never,
                never
              >
            >,
            Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>
          >
          collidableCells: Schema.compose<
            Schema.$Array<
              Schema.decodeTo<
                Schema.Struct<{ readonly col: Schema.Int; readonly row: Schema.Int; readonly index: Schema.Int }>,
                Schema.decodeTo<
                  Schema.Tuple<readonly [Schema.Int, Schema.Int, Schema.Int]>,
                  Schema.String,
                  never,
                  never
                >,
                never,
                never
              >
            >,
            Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>
          >
        }>,
        readonly [Schema.$Record<Schema.String, Schema.Codec<Schema.Json, Schema.Json, never, never>>]
      >
    >
  }>,
  readonly [Schema.$Record<Schema.String, Schema.Codec<Schema.Json, Schema.Json, never, never>>]
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/disco-zoo-sdk/src/Save.ts#L714)

Since v1.0.0

## SceneryLotData

The scenery generated for a pen (the game's `SceneryLotData`): its grid size,
path and scenery objects.

**Signature**

```ts
declare const SceneryLotData: Schema.StructWithRest<
  Schema.Struct<{
    penSlug: Schema.String
    regionSlug: Schema.String
    cols: Schema.decodeTo<Schema.Int, Schema.String, never, never>
    rows: Schema.decodeTo<Schema.Int, Schema.String, never, never>
    pathCells: Schema.compose<
      Schema.$Array<
        Schema.decodeTo<
          Schema.Struct<{ readonly col: Schema.Int; readonly row: Schema.Int; readonly shape: Schema.Int }>,
          Schema.decodeTo<Schema.Tuple<readonly [Schema.Int, Schema.Int, Schema.Int]>, Schema.String, never, never>,
          never,
          never
        >
      >,
      Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>
    >
    collidableCells: Schema.compose<
      Schema.$Array<
        Schema.decodeTo<
          Schema.Struct<{ readonly col: Schema.Int; readonly row: Schema.Int; readonly index: Schema.Int }>,
          Schema.decodeTo<Schema.Tuple<readonly [Schema.Int, Schema.Int, Schema.Int]>, Schema.String, never, never>,
          never,
          never
        >
      >,
      Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>
    >
  }>,
  readonly [Schema.$Record<Schema.String, Schema.Codec<Schema.Json, Schema.Json, never, never>>]
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/disco-zoo-sdk/src/Save.ts#L699)

Since v1.0.0

## SettingsData

Settings and the player's sync account (the game's `SettingsData`).
`playerSalt` is the player's auth key and `playerEmail` the email they
registered with. Both decode to `Redacted` values, so that printing or
logging a decoded save does not show them, or to `""` while the game has
none (the game writes `""` for the email before the player registers, and
the salt is read the same way). Both are missing from the copy of the save
the sync server holds.

**Signature**

```ts
declare const SettingsData: Schema.StructWithRest<
  Schema.Struct<{
    sfxOn: Schema.Boolean
    musicOn: Schema.Boolean
    firstAnimalNotification: Schema.Boolean
    allAnimalsNotification: Schema.Boolean
    petHealedNotification: Schema.Boolean
    toddlerModeOn: Schema.Boolean
    isAdAgeConfirmed: Schema.Boolean
    isSyncAgeConfirmed: Schema.Boolean
    shouldShowNames: Schema.Boolean
    newsVersion: Schema.Int
    storeVersion: Schema.Int
    hasSeenPrivacyPopup: Schema.Boolean
    adsEnabled: Schema.Boolean
    personalizedConsentApplies: Schema.Boolean
    personalizedAdsEnabled: Schema.Boolean
    cloudEnabled: Schema.Boolean
    doNotSellData: Schema.Boolean
    firebaseEnabled: Schema.Boolean
    playerID: Schema.String
    playerSalt: Schema.optionalKey<
      Schema.Union<
        readonly [Schema.Literal<"">, Schema.brand<Schema.RedactedFromValue<Schema.String>, "PlayerAuthKey">]
      >
    >
    playerRegistered: Schema.Boolean
    playerEmail: Schema.optionalKey<
      Schema.Union<readonly [Schema.Literal<"">, Schema.brand<Schema.RedactedFromValue<Schema.String>, "PlayerEmail">]>
    >
    playerRegSent: Schema.Boolean
  }>,
  readonly [Schema.$Record<Schema.String, Schema.Codec<Schema.Json, Schema.Json, never, never>>]
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/disco-zoo-sdk/src/Save.ts#L730)

Since v1.0.0

## StatsData

Lifetime totals (the game's `StatsData`), with what each currency was
earned on.

**Signature**

```ts
declare const StatsData: Schema.StructWithRest<
  Schema.Struct<{
    coinAccounts: Schema.decodeTo<
      Schema.$Record<Schema.String, Schema.Int>,
      Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>,
      never,
      never
    >
    buxAccounts: Schema.decodeTo<
      Schema.$Record<Schema.String, Schema.Int>,
      Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>,
      never,
      never
    >
    spaceCoinAccounts: Schema.decodeTo<
      Schema.$Record<Schema.String, Schema.Int>,
      Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>,
      never,
      never
    >
    statAccounts: Schema.decodeTo<
      Schema.$Record<Schema.String, Schema.Int>,
      Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>,
      never,
      never
    >
    totalCoinsEarned: Schema.decodeTo<Schema.Int, Schema.String, never, never>
    totalBuxEarned: Schema.decodeTo<Schema.Int, Schema.String, never, never>
    totalSpaceCoinsEarned: Schema.decodeTo<Schema.Int, Schema.String, never, never>
    totalCoinsSpent: Schema.decodeTo<Schema.Int, Schema.String, never, never>
    totalBuxSpent: Schema.decodeTo<Schema.Int, Schema.String, never, never>
    totalSpaceCoinsSpent: Schema.decodeTo<Schema.Int, Schema.String, never, never>
    totalDiamondsEarnedPreviously: Schema.decodeTo<Schema.Int, Schema.String, never, never>
    numTimeRewinds: Schema.decodeTo<Schema.Int, Schema.String, never, never>
    actualTimeRewinds: Schema.decodeTo<Schema.Int, Schema.String, never, never>
    extraTimeRewinds: Schema.decodeTo<Schema.Int, Schema.String, never, never>
    totalPetsHealed: Schema.decodeTo<Schema.Int, Schema.String, never, never>
  }>,
  readonly [Schema.$Record<Schema.String, Schema.Codec<Schema.Json, Schema.Json, never, never>>]
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/disco-zoo-sdk/src/Save.ts#L572)

Since v1.0.0

## StoreData

Store prices and sales (the game's `StoreData`), as last fetched.

**Signature**

```ts
declare const StoreData: Schema.StructWithRest<
  Schema.Struct<{
    storeBuxValues: Schema.compose<
      Schema.$Array<Schema.decodeTo<Schema.Int, Schema.String, never, never>>,
      Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>
    >
    storeCoinsValues: Schema.compose<
      Schema.$Array<Schema.decodeTo<Schema.Int, Schema.String, never, never>>,
      Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>
    >
    storeSpaceCoinsValues: Schema.compose<
      Schema.$Array<Schema.decodeTo<Schema.Int, Schema.String, never, never>>,
      Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>
    >
    storeBuxSales: Schema.compose<
      Schema.$Array<Schema.decodeTo<Schema.Int, Schema.String, never, never>>,
      Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>
    >
    storeCoinsSales: Schema.compose<
      Schema.$Array<Schema.decodeTo<Schema.Int, Schema.String, never, never>>,
      Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>
    >
    storeSpaceCoinsSales: Schema.compose<
      Schema.$Array<Schema.decodeTo<Schema.Int, Schema.String, never, never>>,
      Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>
    >
    starter_bux: Schema.Int
    starter_coins: Schema.Int
    starter_sale: Schema.decodeTo<Schema.Boolean, Schema.Literals<readonly ["0", "1"]>, never, never>
    piggy_base: Schema.Int
    piggy_increment: Schema.Int
    piggy_buxPerAnimal: Schema.Int
    piggy_max: Schema.Int
    piggy_sale: Schema.decodeTo<Schema.Boolean, Schema.Literals<readonly ["0", "1"]>, never, never>
    zoopedia_sale: Schema.decodeTo<Schema.Boolean, Schema.Literals<readonly ["0", "1"]>, never, never>
  }>,
  readonly [Schema.$Record<Schema.String, Schema.Codec<Schema.Json, Schema.Json, never, never>>]
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/disco-zoo-sdk/src/Save.ts#L762)

Since v1.0.0

## ZooData

The zoo (the game's `ZooData`): its pens, and its name tags as
`CustomPenData`s joined by `|`.

**Signature**

```ts
declare const ZooData: Schema.StructWithRest<
  Schema.Struct<{
    penDatas: Schema.$Array<
      Schema.StructWithRest<
        Schema.Struct<{
          animal: Schema.String
          slug: Schema.String
          count: Schema.decodeTo<Schema.Int, Schema.String, never, never>
          bilcoins: Schema.decodeTo<Schema.BigInt, Schema.String, never, never>
          awakeTicksLeft: Schema.decodeTo<Schema.BigInt, Schema.String, never, never>
          buildTicksLeft: Schema.decodeTo<Schema.BigInt, Schema.String, never, never>
          wakeUpBonus: Schema.decodeTo<Schema.Int, Schema.String, never, never>
          hats: Schema.decodeTo<
            Schema.$Array<Schema.Struct<{ readonly character: Schema.String; readonly count: Schema.Int }>>,
            Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>,
            never,
            never
          >
          decor: Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>
          toy: Schema.String
        }>,
        readonly [Schema.$Record<Schema.String, Schema.Codec<Schema.Json, Schema.Json, never, never>>]
      >
    >
    customPenDatas: Schema.compose<
      Schema.$Array<
        Schema.compose<
          Schema.Struct<{
            readonly animalSlug: Schema.String
            readonly namedAnimals: Schema.compose<
              Schema.$Array<
                Schema.decodeTo<
                  Schema.Struct<{
                    readonly hat: Schema.String
                    readonly variantIndex: Schema.Int
                    readonly name: Schema.String
                  }>,
                  Schema.String,
                  never,
                  never
                >
              >,
              Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>
            >
          }>,
          Schema.decodeTo<
            Schema.Struct<{ readonly animalSlug: Schema.String; readonly namedAnimals: Schema.String }>,
            Schema.String,
            never,
            never
          >
        >
      >,
      Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>
    >
  }>,
  readonly [Schema.$Record<Schema.String, Schema.Codec<Schema.Json, Schema.Json, never, never>>]
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/disco-zoo-sdk/src/Save.ts#L557)

Since v1.0.0
