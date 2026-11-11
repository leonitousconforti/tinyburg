---
title: Save.ts
nav_order: 3
parent: Modules
---

## Save.ts overview

Pocket Trains' save: what `TRPlayer.ToBlockStr()` writes, which
`TRPlayer.saveGame()` keeps in the `TRBLOCK` PlayerPref and the game reads
back with `TRPlayer.FromBlock`. It is Nimblebit's block format: each value
written as `[key]value[key]`, with blocks nested in blocks. A list is a block
holding its length (`[ccount]5[ccount]`) and one block per item keyed by its
index (`[c0]...[c0]`), a few short lists are comma separated, and the
friends list is item blocks joined with commas. The blocks are read here
rather than with `NimblebitSchema.parseNimblebitObject`, which finds a key
anywhere in the text: these lists are numbered blocks after a count, and
short keys repeat at different depths (`c` is the coins, a crate's count
and a day's cars).

`NBSync.pushToServer` sends the same text without the `pS` and `pE` blocks
(the player's auth salt and email): `NBSync.encodeSave` deflates it with
zlib and base64 encodes it, `sync/pull` hands that string back unchanged, and
`NBSync.decodeSave` reverses it before `TRGame.HandleCloudChange` loads it.
`SaveDataFromBytes` reads those bytes.

Determined against Pocket Trains 1.10.2 on an emulator with a Frida probe
(November 2026), from saves the game wrote: a fresh install's, and one grown
by calling the game's own methods (coins, crates, parts, yard items,
achievements, tips, friends, jobs, licenses) and setting fields the save
only writes when they are set. The fixtures under `test/fixtures` are those
saves, with the player's id and salt replaced. Every key the game wrote is
modeled, in the game's order.

Decoding never drops part of a save: it fails on a block the schema does not
model (such as one a newer version of the game adds), and on a missing,
repeated or reordered block, a list whose count disagrees with its items,
text outside the blocks, or a value written other than the way the game
writes it (`1e4` for `10000`, say). So the round trip is exact, with no
exceptions: any text `SaveData` decodes encodes back to the same text,
byte for byte.

The player's auth salt (`pS`) and email (`pE`) decode to `Redacted` values
(`NimblebitConfig.PlayerAuthKeySchema` and `PlayerEmailSchema`), so printing
or logging a decoded save does not show them; `Redacted.value` reads them.

Not seen: keys a 1.10.2 save would only hold in states the probe did not
reach, a lost and found holding more than one part (`PLFP` is read as a
comma separated list, like the game's other lists), and what `jBE`, `cPC`
and `cPRI` hold beyond being C# `long`s.

Since v1.0.0

---

## Exports Grouped by Category

- [Schemas](#schemas)
  - [Awards](#awards)
  - [City](#city)
  - [Crate](#crate)
  - [DailyStat](#dailystat)
  - [Event](#event)
  - [Friend](#friend)
  - [Friends](#friends)
  - [Job](#job)
  - [JobType](#jobtype)
  - [Licenses](#licenses)
  - [Parts](#parts)
  - [SaveData](#savedata)
  - [SaveDataFromBytes](#savedatafrombytes)
  - [Stats](#stats)
  - [Track](#track)
  - [Train](#train)
  - [Trip](#trip)
  - [TripLeg](#tripleg)
  - [YardItem](#yarditem)
  - [YardType](#yardtype)

---

# Schemas

## Awards

Achievement progress (`NBAchievement`), percent complete by `awd` and the
achievement's number (`TRAchievementType`), in the game's order.

**Signature**

```ts
declare const Awards: Schema.compose<
  Schema.$Record<Schema.String, Schema.decodeTo<Schema.Int, Schema.String, never, never>>,
  Schema.decodeTo<Schema.$Record<Schema.String, Schema.String>, Schema.String, never, never>
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/pocket-trains-sdk/src/Save.ts#L513)

Since v1.0.0

## City

A city the player has (`TRCity`): its id, how many jobs can wait there
(`mlo`), and `j`, the jobs waiting (`[jcount]` then `[j0]`, `[j1]`...),
which the game only writes when there are any.

**Signature**

```ts
declare const City: Schema.decodeTo<
  Schema.Struct<{
    readonly id: Schema.decodeTo<Schema.Int, Schema.String, never, never>
    readonly mlo: Schema.decodeTo<Schema.Int, Schema.String, never, never>
    readonly j: Schema.optionalKey<
      Schema.$Array<
        Schema.decodeTo<
          Schema.Struct<{
            readonly id: Schema.decodeTo<Schema.Int, Schema.String, never, never>
            readonly s: Schema.decodeTo<Schema.Int, Schema.String, never, never>
            readonly e: Schema.decodeTo<Schema.Int, Schema.String, never, never>
            readonly p: Schema.decodeTo<Schema.Int, Schema.String, never, never>
            readonly c: Schema.decodeTo<Schema.Int, Schema.String, never, never>
            readonly t: Schema.decodeTo<
              Schema.Literals<
                readonly ["Standard", "LocalEvent", "GlobalEvent", "VIP", "Parts", "Crate", "SpecialCrate"]
              >,
              Schema.decodeTo<Schema.Int, Schema.String, never, never>,
              never,
              never
            >
          }>,
          Schema.String,
          never,
          never
        >
      >
    >
  }>,
  Schema.String,
  never,
  never
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/pocket-trains-sdk/src/Save.ts#L344)

Since v1.0.0

## Crate

Unopened crates of one level (`TRCrateInfo`): the level, `-1` for special
crates, and how many.

**Signature**

```ts
declare const Crate: Schema.decodeTo<
  Schema.Struct<{
    readonly l: Schema.decodeTo<Schema.Int, Schema.String, never, never>
    readonly c: Schema.decodeTo<Schema.Int, Schema.String, never, never>
  }>,
  Schema.String,
  never,
  never
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/pocket-trains-sdk/src/Save.ts#L384)

Since v1.0.0

## DailyStat

One day's takings (`TRDailyStat`): the day, revenue, miles, cars and crates.

**Signature**

```ts
declare const DailyStat: Schema.decodeTo<
  Schema.Struct<{
    readonly d: Schema.decodeTo<Schema.DateTimeUtc, Schema.String, never, never>
    readonly r: Schema.decodeTo<Schema.Int, Schema.String, never, never>
    readonly m: Schema.decodeTo<Schema.Int, Schema.String, never, never>
    readonly c: Schema.decodeTo<Schema.Int, Schema.String, never, never>
    readonly cr: Schema.decodeTo<Schema.Int, Schema.String, never, never>
  }>,
  Schema.String,
  never,
  never
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/pocket-trains-sdk/src/Save.ts#L422)

Since v1.0.0

## Event

The city event (`TREvents`): its seed, the cars delivered toward it
(`edel`), its city and how many goals were completed.

**Signature**

```ts
declare const Event: Schema.decodeTo<
  Schema.Struct<{
    readonly eseed: Schema.decodeTo<Schema.Int, Schema.String, never, never>
    readonly edel: Schema.decodeTo<Schema.Int, Schema.String, never, never>
    readonly ecity: Schema.decodeTo<Schema.Int, Schema.String, never, never>
    readonly ecom: Schema.decodeTo<Schema.Int, Schema.String, never, never>
  }>,
  Schema.String,
  never,
  never
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/pocket-trains-sdk/src/Save.ts#L409)

Since v1.0.0

## Friend

A friend (`TRFriend`): their player id (`c`) and the name the player gave
them (`n`).

**Signature**

```ts
declare const Friend: Schema.decodeTo<
  Schema.Struct<{ readonly c: Schema.brand<Schema.String, "PlayerId">; readonly n: Schema.String }>,
  Schema.String,
  never,
  never
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/pocket-trains-sdk/src/Save.ts#L456)

Since v1.0.0

## Friends

The friends list: each friend's blocks, joined with commas. A name may hold
a comma, so the list is split after each friend's closing `[n]` rather than
at every comma.

**Signature**

```ts
declare const Friends: Schema.compose<
  Schema.$Array<
    Schema.decodeTo<
      Schema.Struct<{ readonly c: Schema.brand<Schema.String, "PlayerId">; readonly n: Schema.String }>,
      Schema.String,
      never,
      never
    >
  >,
  Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/pocket-trains-sdk/src/Save.ts#L471)

Since v1.0.0

## Job

A job (`TRJobInfo`): a car (`id`, a car id) waiting in a city or hauled by a
train from city `s` to city `e`, how many cars it fills (`c`), the seed of
its passengers (`p`) and its kind (`t`).

**Signature**

```ts
declare const Job: Schema.decodeTo<
  Schema.Struct<{
    readonly id: Schema.decodeTo<Schema.Int, Schema.String, never, never>
    readonly s: Schema.decodeTo<Schema.Int, Schema.String, never, never>
    readonly e: Schema.decodeTo<Schema.Int, Schema.String, never, never>
    readonly p: Schema.decodeTo<Schema.Int, Schema.String, never, never>
    readonly c: Schema.decodeTo<Schema.Int, Schema.String, never, never>
    readonly t: Schema.decodeTo<
      Schema.Literals<readonly ["Standard", "LocalEvent", "GlobalEvent", "VIP", "Parts", "Crate", "SpecialCrate"]>,
      Schema.decodeTo<Schema.Int, Schema.String, never, never>,
      never,
      never
    >
  }>,
  Schema.String,
  never,
  never
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/pocket-trains-sdk/src/Save.ts#L327)

Since v1.0.0

## JobType

The kinds of job a car can be on (`TRJobType`), by the number the save
writes.

**Signature**

```ts
declare const JobType: Schema.decodeTo<
  Schema.Literals<readonly ["Standard", "LocalEvent", "GlobalEvent", "VIP", "Parts", "Crate", "SpecialCrate"]>,
  Schema.decodeTo<Schema.Int, Schema.String, never, never>,
  never,
  never
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/pocket-trains-sdk/src/Save.ts#L309)

Since v1.0.0

## Licenses

The regions the player holds a license for, in the order the game lists
them.

**Signature**

```ts
declare const Licenses: Schema.decodeTo<
  Schema.$Array<
    Schema.toType<Schema.Literals<readonly ["North America", "South America", "Europe", "Africa", "Asia", "Oceania"]>>
  >,
  Schema.decodeTo<
    Schema.Struct<{
      readonly items: Schema.$Array<
        Schema.Literals<readonly ["North America", "South America", "Europe", "Africa", "Asia", "Oceania"]>
      >
    }>,
    Schema.String,
    never,
    never
  >,
  never,
  never
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/pocket-trains-sdk/src/Save.ts#L504)

Since v1.0.0

## Parts

Parts toward an engine (`TRPartsInfo`): the engine's id and how many.

**Signature**

```ts
declare const Parts: Schema.decodeTo<
  Schema.Struct<{
    readonly eID: Schema.decodeTo<Schema.Int, Schema.String, never, never>
    readonly c: Schema.decodeTo<Schema.Int, Schema.String, never, never>
  }>,
  Schema.String,
  never,
  never
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/pocket-trains-sdk/src/Save.ts#L372)

Since v1.0.0

## SaveData

A save as `TRPlayer.ToBlockStr()` writes it, with the game's keys:

- `x`, `l`, `c`, `b`: xp, level, coins and bux; `curTrain`: the train in view.
- `v`: the game version that wrote it; `gift`: the player's gift id, once
  they have one.
- `pID`, `pS`, `pE`: the player's id, auth salt and email, the last two only
  in the copy the game keeps (and `pE` only once there is an email), and
  read as `Redacted` values; `pV`: written while the player is a VIP.
- `cities`, `tracks`, `parts`, `crates`, `yard`, `event`, `stats`,
  `licenses`, `awards`, `trains`: see each item's schema.
- `tut`, `bonus`, `tips`: the tutorial steps, bonuses and tips done;
  `tutorialTimestamp`: seconds since 1970 of the last tutorial step, or -1.
- `PFri`: friends; `PLFP`, `PLFB`: the lost and found's parts (engine ids)
  and bux.
- `nPCT`, `nFBT`: when the next progressive gift cycle and the next free bux
  are due, as C# `DateTime` ticks (`TRProgGifts` counts in ticks); `cPC`,
  `cPRI`: the gift cycle and reward index; `jBE`: when the job boost ends.
- `CoinsFree`, `BuxFree`, `CratesFree`, `CratesSpecialFree`: what the player
  was given for free; `timeInGame`: seconds played.

Decoding fails on any block not listed here, on a missing, repeated or
reordered one, and on a value not written the game's way, so any text this
decodes encodes back to the same text, byte for byte, with no exceptions.

**Signature**

```ts
declare const SaveData: Schema.decodeTo<
  Schema.Struct<{
    readonly x: Schema.decodeTo<Schema.BigInt, Schema.String, never, never>
    readonly l: Schema.decodeTo<Schema.Int, Schema.String, never, never>
    readonly curTrain: Schema.decodeTo<Schema.Int, Schema.String, never, never>
    readonly c: Schema.decodeTo<Schema.Int, Schema.String, never, never>
    readonly b: Schema.decodeTo<Schema.Int, Schema.String, never, never>
    readonly v: Schema.String
    readonly gift: Schema.optionalKey<Schema.String>
    readonly pID: Schema.Union<readonly [Schema.Literal<"">, Schema.brand<Schema.String, "PlayerId">]>
    readonly pS: Schema.optionalKey<
      Schema.Union<
        readonly [Schema.Literal<"">, Schema.brand<Schema.RedactedFromValue<Schema.String>, "PlayerAuthKey">]
      >
    >
    readonly pE: Schema.optionalKey<Schema.brand<Schema.RedactedFromValue<Schema.String>, "PlayerEmail">>
    readonly pV: Schema.optionalKey<Schema.decodeTo<Schema.Boolean, Schema.Literals<readonly ["0", "1"]>, never, never>>
    readonly cities: Schema.decodeTo<
      Schema.$Array<
        Schema.toType<
          Schema.decodeTo<
            Schema.Struct<{
              readonly id: Schema.decodeTo<Schema.Int, Schema.String, never, never>
              readonly mlo: Schema.decodeTo<Schema.Int, Schema.String, never, never>
              readonly j: Schema.optionalKey<
                Schema.$Array<
                  Schema.decodeTo<
                    Schema.Struct<{
                      readonly id: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                      readonly s: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                      readonly e: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                      readonly p: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                      readonly c: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                      readonly t: Schema.decodeTo<
                        Schema.Literals<
                          readonly ["Standard", "LocalEvent", "GlobalEvent", "VIP", "Parts", "Crate", "SpecialCrate"]
                        >,
                        Schema.decodeTo<Schema.Int, Schema.String, never, never>,
                        never,
                        never
                      >
                    }>,
                    Schema.String,
                    never,
                    never
                  >
                >
              >
            }>,
            Schema.String,
            never,
            never
          >
        >
      >,
      Schema.decodeTo<
        Schema.Struct<{
          readonly items: Schema.$Array<
            Schema.decodeTo<
              Schema.Struct<{
                readonly id: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                readonly mlo: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                readonly j: Schema.optionalKey<
                  Schema.$Array<
                    Schema.decodeTo<
                      Schema.Struct<{
                        readonly id: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                        readonly s: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                        readonly e: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                        readonly p: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                        readonly c: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                        readonly t: Schema.decodeTo<
                          Schema.Literals<
                            readonly ["Standard", "LocalEvent", "GlobalEvent", "VIP", "Parts", "Crate", "SpecialCrate"]
                          >,
                          Schema.decodeTo<Schema.Int, Schema.String, never, never>,
                          never,
                          never
                        >
                      }>,
                      Schema.String,
                      never,
                      never
                    >
                  >
                >
              }>,
              Schema.String,
              never,
              never
            >
          >
        }>,
        Schema.String,
        never,
        never
      >,
      never,
      never
    >
    readonly tracks: Schema.decodeTo<
      Schema.$Array<
        Schema.toType<
          Schema.decodeTo<
            Schema.Struct<{
              readonly id: Schema.decodeTo<Schema.Int, Schema.String, never, never>
              readonly oid: Schema.decodeTo<Schema.Int, Schema.String, never, never>
              readonly e: Schema.decodeTo<Schema.Boolean, Schema.Literals<readonly ["0", "1"]>, never, never>
            }>,
            Schema.String,
            never,
            never
          >
        >
      >,
      Schema.decodeTo<
        Schema.Struct<{
          readonly items: Schema.$Array<
            Schema.decodeTo<
              Schema.Struct<{
                readonly id: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                readonly oid: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                readonly e: Schema.decodeTo<Schema.Boolean, Schema.Literals<readonly ["0", "1"]>, never, never>
              }>,
              Schema.String,
              never,
              never
            >
          >
        }>,
        Schema.String,
        never,
        never
      >,
      never,
      never
    >
    readonly parts: Schema.decodeTo<
      Schema.$Array<
        Schema.toType<
          Schema.decodeTo<
            Schema.Struct<{
              readonly eID: Schema.decodeTo<Schema.Int, Schema.String, never, never>
              readonly c: Schema.decodeTo<Schema.Int, Schema.String, never, never>
            }>,
            Schema.String,
            never,
            never
          >
        >
      >,
      Schema.decodeTo<
        Schema.Struct<{
          readonly items: Schema.$Array<
            Schema.decodeTo<
              Schema.Struct<{
                readonly eID: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                readonly c: Schema.decodeTo<Schema.Int, Schema.String, never, never>
              }>,
              Schema.String,
              never,
              never
            >
          >
        }>,
        Schema.String,
        never,
        never
      >,
      never,
      never
    >
    readonly crates: Schema.decodeTo<
      Schema.$Array<
        Schema.toType<
          Schema.decodeTo<
            Schema.Struct<{
              readonly l: Schema.decodeTo<Schema.Int, Schema.String, never, never>
              readonly c: Schema.decodeTo<Schema.Int, Schema.String, never, never>
            }>,
            Schema.String,
            never,
            never
          >
        >
      >,
      Schema.decodeTo<
        Schema.Struct<{
          readonly items: Schema.$Array<
            Schema.decodeTo<
              Schema.Struct<{
                readonly l: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                readonly c: Schema.decodeTo<Schema.Int, Schema.String, never, never>
              }>,
              Schema.String,
              never,
              never
            >
          >
        }>,
        Schema.String,
        never,
        never
      >,
      never,
      never
    >
    readonly yard: Schema.decodeTo<
      Schema.$Array<
        Schema.toType<
          Schema.decodeTo<
            Schema.Struct<{
              readonly eID: Schema.decodeTo<Schema.Int, Schema.String, never, never>
              readonly c: Schema.decodeTo<Schema.Int, Schema.String, never, never>
              readonly t: Schema.decodeTo<
                Schema.Literals<readonly ["engine", "fuel", "none"]>,
                Schema.decodeTo<Schema.Int, Schema.String, never, never>,
                never,
                never
              >
            }>,
            Schema.String,
            never,
            never
          >
        >
      >,
      Schema.decodeTo<
        Schema.Struct<{
          readonly items: Schema.$Array<
            Schema.decodeTo<
              Schema.Struct<{
                readonly eID: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                readonly c: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                readonly t: Schema.decodeTo<
                  Schema.Literals<readonly ["engine", "fuel", "none"]>,
                  Schema.decodeTo<Schema.Int, Schema.String, never, never>,
                  never,
                  never
                >
              }>,
              Schema.String,
              never,
              never
            >
          >
        }>,
        Schema.String,
        never,
        never
      >,
      never,
      never
    >
    readonly event: Schema.decodeTo<
      Schema.Struct<{
        readonly eseed: Schema.decodeTo<Schema.Int, Schema.String, never, never>
        readonly edel: Schema.decodeTo<Schema.Int, Schema.String, never, never>
        readonly ecity: Schema.decodeTo<Schema.Int, Schema.String, never, never>
        readonly ecom: Schema.decodeTo<Schema.Int, Schema.String, never, never>
      }>,
      Schema.String,
      never,
      never
    >
    readonly stats: Schema.decodeTo<
      Schema.Struct<{
        readonly ds: Schema.$Array<
          Schema.decodeTo<
            Schema.Struct<{
              readonly d: Schema.decodeTo<Schema.DateTimeUtc, Schema.String, never, never>
              readonly r: Schema.decodeTo<Schema.Int, Schema.String, never, never>
              readonly m: Schema.decodeTo<Schema.Int, Schema.String, never, never>
              readonly c: Schema.decodeTo<Schema.Int, Schema.String, never, never>
              readonly cr: Schema.decodeTo<Schema.Int, Schema.String, never, never>
            }>,
            Schema.String,
            never,
            never
          >
        >
        readonly tm: Schema.decodeTo<Schema.BigInt, Schema.String, never, never>
        readonly tc: Schema.decodeTo<Schema.Int, Schema.String, never, never>
        readonly tcr: Schema.decodeTo<Schema.Int, Schema.String, never, never>
        readonly tb: Schema.decodeTo<Schema.Int, Schema.String, never, never>
        readonly te: Schema.decodeTo<Schema.Int, Schema.String, never, never>
      }>,
      Schema.String,
      never,
      never
    >
    readonly tut: Schema.compose<
      Schema.$Array<Schema.decodeTo<Schema.Int, Schema.String, never, never>>,
      Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>
    >
    readonly tutorialTimestamp: Schema.decodeTo<Schema.Finite, Schema.String, never, never>
    readonly bonus: Schema.compose<
      Schema.$Array<Schema.decodeTo<Schema.Int, Schema.String, never, never>>,
      Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>
    >
    readonly tips: Schema.compose<
      Schema.$Array<Schema.decodeTo<Schema.Int, Schema.String, never, never>>,
      Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>
    >
    readonly PFri: Schema.compose<
      Schema.$Array<
        Schema.decodeTo<
          Schema.Struct<{ readonly c: Schema.brand<Schema.String, "PlayerId">; readonly n: Schema.String }>,
          Schema.String,
          never,
          never
        >
      >,
      Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>
    >
    readonly PLFP: Schema.compose<
      Schema.$Array<Schema.decodeTo<Schema.Int, Schema.String, never, never>>,
      Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>
    >
    readonly PLFB: Schema.decodeTo<Schema.Int, Schema.String, never, never>
    readonly licenses: Schema.decodeTo<
      Schema.$Array<
        Schema.toType<
          Schema.Literals<readonly ["North America", "South America", "Europe", "Africa", "Asia", "Oceania"]>
        >
      >,
      Schema.decodeTo<
        Schema.Struct<{
          readonly items: Schema.$Array<
            Schema.Literals<readonly ["North America", "South America", "Europe", "Africa", "Asia", "Oceania"]>
          >
        }>,
        Schema.String,
        never,
        never
      >,
      never,
      never
    >
    readonly awards: Schema.compose<
      Schema.$Record<Schema.String, Schema.decodeTo<Schema.Int, Schema.String, never, never>>,
      Schema.decodeTo<Schema.$Record<Schema.String, Schema.String>, Schema.String, never, never>
    >
    readonly trains: Schema.decodeTo<
      Schema.$Array<
        Schema.toType<
          Schema.decodeTo<
            Schema.Struct<{
              readonly id: Schema.decodeTo<Schema.Int, Schema.String, never, never>
              readonly eId: Schema.decodeTo<Schema.Int, Schema.String, never, never>
              readonly eL: Schema.String
              readonly nT: Schema.decodeTo<Schema.Int, Schema.String, never, never>
              readonly l: Schema.decodeTo<Schema.DateTimeUtc, Schema.String, never, never>
              readonly f: Schema.decodeTo<Schema.Int, Schema.String, never, never>
              readonly lR: Schema.decodeTo<Schema.Int, Schema.String, never, never>
              readonly b: Schema.decodeTo<Schema.Int, Schema.String, never, never>
              readonly bt: Schema.decodeTo<Schema.Int, Schema.String, never, never>
              readonly clr: Schema.decodeTo<Schema.Int, Schema.String, never, never>
              readonly pin: Schema.optionalKey<
                Schema.decodeTo<Schema.Boolean, Schema.Literals<readonly ["0", "1"]>, never, never>
              >
              readonly j: Schema.$Array<
                Schema.decodeTo<
                  Schema.Struct<{
                    readonly id: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                    readonly s: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                    readonly e: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                    readonly p: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                    readonly c: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                    readonly t: Schema.decodeTo<
                      Schema.Literals<
                        readonly ["Standard", "LocalEvent", "GlobalEvent", "VIP", "Parts", "Crate", "SpecialCrate"]
                      >,
                      Schema.decodeTo<Schema.Int, Schema.String, never, never>,
                      never,
                      never
                    >
                  }>,
                  Schema.String,
                  never,
                  never
                >
              >
              readonly trip: Schema.optionalKey<
                Schema.decodeTo<
                  Schema.Struct<{
                    readonly sTime: Schema.decodeTo<Schema.DateTimeUtc, Schema.String, never, never>
                    readonly com: Schema.optionalKey<
                      Schema.decodeTo<Schema.Boolean, Schema.Literals<readonly ["0", "1"]>, never, never>
                    >
                    readonly off: Schema.optionalKey<
                      Schema.decodeTo<Schema.Boolean, Schema.Literals<readonly ["0", "1"]>, never, never>
                    >
                    readonly l: Schema.$Array<
                      Schema.decodeTo<
                        Schema.Struct<{
                          readonly tID: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                          readonly sID: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                          readonly o: Schema.optionalKey<
                            Schema.decodeTo<Schema.Boolean, Schema.Literals<readonly ["0", "1"]>, never, never>
                          >
                        }>,
                        Schema.String,
                        never,
                        never
                      >
                    >
                  }>,
                  Schema.String,
                  never,
                  never
                >
              >
            }>,
            Schema.String,
            never,
            never
          >
        >
      >,
      Schema.decodeTo<
        Schema.Struct<{
          readonly items: Schema.$Array<
            Schema.decodeTo<
              Schema.Struct<{
                readonly id: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                readonly eId: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                readonly eL: Schema.String
                readonly nT: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                readonly l: Schema.decodeTo<Schema.DateTimeUtc, Schema.String, never, never>
                readonly f: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                readonly lR: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                readonly b: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                readonly bt: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                readonly clr: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                readonly pin: Schema.optionalKey<
                  Schema.decodeTo<Schema.Boolean, Schema.Literals<readonly ["0", "1"]>, never, never>
                >
                readonly j: Schema.$Array<
                  Schema.decodeTo<
                    Schema.Struct<{
                      readonly id: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                      readonly s: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                      readonly e: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                      readonly p: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                      readonly c: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                      readonly t: Schema.decodeTo<
                        Schema.Literals<
                          readonly ["Standard", "LocalEvent", "GlobalEvent", "VIP", "Parts", "Crate", "SpecialCrate"]
                        >,
                        Schema.decodeTo<Schema.Int, Schema.String, never, never>,
                        never,
                        never
                      >
                    }>,
                    Schema.String,
                    never,
                    never
                  >
                >
                readonly trip: Schema.optionalKey<
                  Schema.decodeTo<
                    Schema.Struct<{
                      readonly sTime: Schema.decodeTo<Schema.DateTimeUtc, Schema.String, never, never>
                      readonly com: Schema.optionalKey<
                        Schema.decodeTo<Schema.Boolean, Schema.Literals<readonly ["0", "1"]>, never, never>
                      >
                      readonly off: Schema.optionalKey<
                        Schema.decodeTo<Schema.Boolean, Schema.Literals<readonly ["0", "1"]>, never, never>
                      >
                      readonly l: Schema.$Array<
                        Schema.decodeTo<
                          Schema.Struct<{
                            readonly tID: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                            readonly sID: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                            readonly o: Schema.optionalKey<
                              Schema.decodeTo<Schema.Boolean, Schema.Literals<readonly ["0", "1"]>, never, never>
                            >
                          }>,
                          Schema.String,
                          never,
                          never
                        >
                      >
                    }>,
                    Schema.String,
                    never,
                    never
                  >
                >
              }>,
              Schema.String,
              never,
              never
            >
          >
        }>,
        Schema.String,
        never,
        never
      >,
      never,
      never
    >
    readonly nPCT: Schema.decodeTo<Schema.BigInt, Schema.String, never, never>
    readonly cPC: Schema.decodeTo<Schema.BigInt, Schema.String, never, never>
    readonly cPRI: Schema.decodeTo<Schema.BigInt, Schema.String, never, never>
    readonly nFBT: Schema.decodeTo<Schema.BigInt, Schema.String, never, never>
    readonly jBE: Schema.decodeTo<Schema.BigInt, Schema.String, never, never>
    readonly CoinsFree: Schema.decodeTo<Schema.BigInt, Schema.String, never, never>
    readonly BuxFree: Schema.decodeTo<Schema.BigInt, Schema.String, never, never>
    readonly CratesFree: Schema.decodeTo<Schema.BigInt, Schema.String, never, never>
    readonly CratesSpecialFree: Schema.decodeTo<Schema.BigInt, Schema.String, never, never>
    readonly timeInGame: Schema.decodeTo<Schema.BigInt, Schema.String, never, never>
  }>,
  Schema.String,
  never,
  never
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/pocket-trains-sdk/src/Save.ts#L628)

Since v1.0.0

## SaveDataFromBytes

A save as the server holds it: the bytes of `data` in a `sync/pull`
response, once base64 decoded, are the save's UTF-8 text deflated with zlib
(`NBSync.encodeSave`, without the `pS` and `pE` blocks, which
`pushToServer` leaves out). Inflating and deflating use the platform's
`DecompressionStream` and `CompressionStream`, so this needs no dependency.
Decoding fails on bytes that are not zlib or do not inflate to UTF-8 text,
and keeps a leading byte order mark, which `SaveData` then rejects
rather than dropping it. Any bytes this decodes encode to bytes that inflate
to the same text, byte for byte, but are not the game's bytes, since its
zlib compresses differently.

**Signature**

```ts
declare const SaveDataFromBytes: Schema.compose<
  Schema.decodeTo<
    Schema.Struct<{
      readonly x: Schema.decodeTo<Schema.BigInt, Schema.String, never, never>
      readonly l: Schema.decodeTo<Schema.Int, Schema.String, never, never>
      readonly curTrain: Schema.decodeTo<Schema.Int, Schema.String, never, never>
      readonly c: Schema.decodeTo<Schema.Int, Schema.String, never, never>
      readonly b: Schema.decodeTo<Schema.Int, Schema.String, never, never>
      readonly v: Schema.String
      readonly gift: Schema.optionalKey<Schema.String>
      readonly pID: Schema.Union<readonly [Schema.Literal<"">, Schema.brand<Schema.String, "PlayerId">]>
      readonly pS: Schema.optionalKey<
        Schema.Union<
          readonly [Schema.Literal<"">, Schema.brand<Schema.RedactedFromValue<Schema.String>, "PlayerAuthKey">]
        >
      >
      readonly pE: Schema.optionalKey<Schema.brand<Schema.RedactedFromValue<Schema.String>, "PlayerEmail">>
      readonly pV: Schema.optionalKey<
        Schema.decodeTo<Schema.Boolean, Schema.Literals<readonly ["0", "1"]>, never, never>
      >
      readonly cities: Schema.decodeTo<
        Schema.$Array<
          Schema.toType<
            Schema.decodeTo<
              Schema.Struct<{
                readonly id: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                readonly mlo: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                readonly j: Schema.optionalKey<
                  Schema.$Array<
                    Schema.decodeTo<
                      Schema.Struct<{
                        readonly id: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                        readonly s: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                        readonly e: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                        readonly p: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                        readonly c: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                        readonly t: Schema.decodeTo<
                          Schema.Literals<
                            readonly ["Standard", "LocalEvent", "GlobalEvent", "VIP", "Parts", "Crate", "SpecialCrate"]
                          >,
                          Schema.decodeTo<Schema.Int, Schema.String, never, never>,
                          never,
                          never
                        >
                      }>,
                      Schema.String,
                      never,
                      never
                    >
                  >
                >
              }>,
              Schema.String,
              never,
              never
            >
          >
        >,
        Schema.decodeTo<
          Schema.Struct<{
            readonly items: Schema.$Array<
              Schema.decodeTo<
                Schema.Struct<{
                  readonly id: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                  readonly mlo: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                  readonly j: Schema.optionalKey<
                    Schema.$Array<
                      Schema.decodeTo<
                        Schema.Struct<{
                          readonly id: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                          readonly s: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                          readonly e: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                          readonly p: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                          readonly c: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                          readonly t: Schema.decodeTo<
                            Schema.Literals<
                              readonly [
                                "Standard",
                                "LocalEvent",
                                "GlobalEvent",
                                "VIP",
                                "Parts",
                                "Crate",
                                "SpecialCrate"
                              ]
                            >,
                            Schema.decodeTo<Schema.Int, Schema.String, never, never>,
                            never,
                            never
                          >
                        }>,
                        Schema.String,
                        never,
                        never
                      >
                    >
                  >
                }>,
                Schema.String,
                never,
                never
              >
            >
          }>,
          Schema.String,
          never,
          never
        >,
        never,
        never
      >
      readonly tracks: Schema.decodeTo<
        Schema.$Array<
          Schema.toType<
            Schema.decodeTo<
              Schema.Struct<{
                readonly id: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                readonly oid: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                readonly e: Schema.decodeTo<Schema.Boolean, Schema.Literals<readonly ["0", "1"]>, never, never>
              }>,
              Schema.String,
              never,
              never
            >
          >
        >,
        Schema.decodeTo<
          Schema.Struct<{
            readonly items: Schema.$Array<
              Schema.decodeTo<
                Schema.Struct<{
                  readonly id: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                  readonly oid: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                  readonly e: Schema.decodeTo<Schema.Boolean, Schema.Literals<readonly ["0", "1"]>, never, never>
                }>,
                Schema.String,
                never,
                never
              >
            >
          }>,
          Schema.String,
          never,
          never
        >,
        never,
        never
      >
      readonly parts: Schema.decodeTo<
        Schema.$Array<
          Schema.toType<
            Schema.decodeTo<
              Schema.Struct<{
                readonly eID: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                readonly c: Schema.decodeTo<Schema.Int, Schema.String, never, never>
              }>,
              Schema.String,
              never,
              never
            >
          >
        >,
        Schema.decodeTo<
          Schema.Struct<{
            readonly items: Schema.$Array<
              Schema.decodeTo<
                Schema.Struct<{
                  readonly eID: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                  readonly c: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                }>,
                Schema.String,
                never,
                never
              >
            >
          }>,
          Schema.String,
          never,
          never
        >,
        never,
        never
      >
      readonly crates: Schema.decodeTo<
        Schema.$Array<
          Schema.toType<
            Schema.decodeTo<
              Schema.Struct<{
                readonly l: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                readonly c: Schema.decodeTo<Schema.Int, Schema.String, never, never>
              }>,
              Schema.String,
              never,
              never
            >
          >
        >,
        Schema.decodeTo<
          Schema.Struct<{
            readonly items: Schema.$Array<
              Schema.decodeTo<
                Schema.Struct<{
                  readonly l: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                  readonly c: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                }>,
                Schema.String,
                never,
                never
              >
            >
          }>,
          Schema.String,
          never,
          never
        >,
        never,
        never
      >
      readonly yard: Schema.decodeTo<
        Schema.$Array<
          Schema.toType<
            Schema.decodeTo<
              Schema.Struct<{
                readonly eID: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                readonly c: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                readonly t: Schema.decodeTo<
                  Schema.Literals<readonly ["engine", "fuel", "none"]>,
                  Schema.decodeTo<Schema.Int, Schema.String, never, never>,
                  never,
                  never
                >
              }>,
              Schema.String,
              never,
              never
            >
          >
        >,
        Schema.decodeTo<
          Schema.Struct<{
            readonly items: Schema.$Array<
              Schema.decodeTo<
                Schema.Struct<{
                  readonly eID: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                  readonly c: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                  readonly t: Schema.decodeTo<
                    Schema.Literals<readonly ["engine", "fuel", "none"]>,
                    Schema.decodeTo<Schema.Int, Schema.String, never, never>,
                    never,
                    never
                  >
                }>,
                Schema.String,
                never,
                never
              >
            >
          }>,
          Schema.String,
          never,
          never
        >,
        never,
        never
      >
      readonly event: Schema.decodeTo<
        Schema.Struct<{
          readonly eseed: Schema.decodeTo<Schema.Int, Schema.String, never, never>
          readonly edel: Schema.decodeTo<Schema.Int, Schema.String, never, never>
          readonly ecity: Schema.decodeTo<Schema.Int, Schema.String, never, never>
          readonly ecom: Schema.decodeTo<Schema.Int, Schema.String, never, never>
        }>,
        Schema.String,
        never,
        never
      >
      readonly stats: Schema.decodeTo<
        Schema.Struct<{
          readonly ds: Schema.$Array<
            Schema.decodeTo<
              Schema.Struct<{
                readonly d: Schema.decodeTo<Schema.DateTimeUtc, Schema.String, never, never>
                readonly r: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                readonly m: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                readonly c: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                readonly cr: Schema.decodeTo<Schema.Int, Schema.String, never, never>
              }>,
              Schema.String,
              never,
              never
            >
          >
          readonly tm: Schema.decodeTo<Schema.BigInt, Schema.String, never, never>
          readonly tc: Schema.decodeTo<Schema.Int, Schema.String, never, never>
          readonly tcr: Schema.decodeTo<Schema.Int, Schema.String, never, never>
          readonly tb: Schema.decodeTo<Schema.Int, Schema.String, never, never>
          readonly te: Schema.decodeTo<Schema.Int, Schema.String, never, never>
        }>,
        Schema.String,
        never,
        never
      >
      readonly tut: Schema.compose<
        Schema.$Array<Schema.decodeTo<Schema.Int, Schema.String, never, never>>,
        Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>
      >
      readonly tutorialTimestamp: Schema.decodeTo<Schema.Finite, Schema.String, never, never>
      readonly bonus: Schema.compose<
        Schema.$Array<Schema.decodeTo<Schema.Int, Schema.String, never, never>>,
        Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>
      >
      readonly tips: Schema.compose<
        Schema.$Array<Schema.decodeTo<Schema.Int, Schema.String, never, never>>,
        Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>
      >
      readonly PFri: Schema.compose<
        Schema.$Array<
          Schema.decodeTo<
            Schema.Struct<{ readonly c: Schema.brand<Schema.String, "PlayerId">; readonly n: Schema.String }>,
            Schema.String,
            never,
            never
          >
        >,
        Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>
      >
      readonly PLFP: Schema.compose<
        Schema.$Array<Schema.decodeTo<Schema.Int, Schema.String, never, never>>,
        Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>
      >
      readonly PLFB: Schema.decodeTo<Schema.Int, Schema.String, never, never>
      readonly licenses: Schema.decodeTo<
        Schema.$Array<
          Schema.toType<
            Schema.Literals<readonly ["North America", "South America", "Europe", "Africa", "Asia", "Oceania"]>
          >
        >,
        Schema.decodeTo<
          Schema.Struct<{
            readonly items: Schema.$Array<
              Schema.Literals<readonly ["North America", "South America", "Europe", "Africa", "Asia", "Oceania"]>
            >
          }>,
          Schema.String,
          never,
          never
        >,
        never,
        never
      >
      readonly awards: Schema.compose<
        Schema.$Record<Schema.String, Schema.decodeTo<Schema.Int, Schema.String, never, never>>,
        Schema.decodeTo<Schema.$Record<Schema.String, Schema.String>, Schema.String, never, never>
      >
      readonly trains: Schema.decodeTo<
        Schema.$Array<
          Schema.toType<
            Schema.decodeTo<
              Schema.Struct<{
                readonly id: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                readonly eId: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                readonly eL: Schema.String
                readonly nT: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                readonly l: Schema.decodeTo<Schema.DateTimeUtc, Schema.String, never, never>
                readonly f: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                readonly lR: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                readonly b: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                readonly bt: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                readonly clr: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                readonly pin: Schema.optionalKey<
                  Schema.decodeTo<Schema.Boolean, Schema.Literals<readonly ["0", "1"]>, never, never>
                >
                readonly j: Schema.$Array<
                  Schema.decodeTo<
                    Schema.Struct<{
                      readonly id: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                      readonly s: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                      readonly e: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                      readonly p: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                      readonly c: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                      readonly t: Schema.decodeTo<
                        Schema.Literals<
                          readonly ["Standard", "LocalEvent", "GlobalEvent", "VIP", "Parts", "Crate", "SpecialCrate"]
                        >,
                        Schema.decodeTo<Schema.Int, Schema.String, never, never>,
                        never,
                        never
                      >
                    }>,
                    Schema.String,
                    never,
                    never
                  >
                >
                readonly trip: Schema.optionalKey<
                  Schema.decodeTo<
                    Schema.Struct<{
                      readonly sTime: Schema.decodeTo<Schema.DateTimeUtc, Schema.String, never, never>
                      readonly com: Schema.optionalKey<
                        Schema.decodeTo<Schema.Boolean, Schema.Literals<readonly ["0", "1"]>, never, never>
                      >
                      readonly off: Schema.optionalKey<
                        Schema.decodeTo<Schema.Boolean, Schema.Literals<readonly ["0", "1"]>, never, never>
                      >
                      readonly l: Schema.$Array<
                        Schema.decodeTo<
                          Schema.Struct<{
                            readonly tID: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                            readonly sID: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                            readonly o: Schema.optionalKey<
                              Schema.decodeTo<Schema.Boolean, Schema.Literals<readonly ["0", "1"]>, never, never>
                            >
                          }>,
                          Schema.String,
                          never,
                          never
                        >
                      >
                    }>,
                    Schema.String,
                    never,
                    never
                  >
                >
              }>,
              Schema.String,
              never,
              never
            >
          >
        >,
        Schema.decodeTo<
          Schema.Struct<{
            readonly items: Schema.$Array<
              Schema.decodeTo<
                Schema.Struct<{
                  readonly id: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                  readonly eId: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                  readonly eL: Schema.String
                  readonly nT: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                  readonly l: Schema.decodeTo<Schema.DateTimeUtc, Schema.String, never, never>
                  readonly f: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                  readonly lR: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                  readonly b: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                  readonly bt: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                  readonly clr: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                  readonly pin: Schema.optionalKey<
                    Schema.decodeTo<Schema.Boolean, Schema.Literals<readonly ["0", "1"]>, never, never>
                  >
                  readonly j: Schema.$Array<
                    Schema.decodeTo<
                      Schema.Struct<{
                        readonly id: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                        readonly s: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                        readonly e: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                        readonly p: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                        readonly c: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                        readonly t: Schema.decodeTo<
                          Schema.Literals<
                            readonly ["Standard", "LocalEvent", "GlobalEvent", "VIP", "Parts", "Crate", "SpecialCrate"]
                          >,
                          Schema.decodeTo<Schema.Int, Schema.String, never, never>,
                          never,
                          never
                        >
                      }>,
                      Schema.String,
                      never,
                      never
                    >
                  >
                  readonly trip: Schema.optionalKey<
                    Schema.decodeTo<
                      Schema.Struct<{
                        readonly sTime: Schema.decodeTo<Schema.DateTimeUtc, Schema.String, never, never>
                        readonly com: Schema.optionalKey<
                          Schema.decodeTo<Schema.Boolean, Schema.Literals<readonly ["0", "1"]>, never, never>
                        >
                        readonly off: Schema.optionalKey<
                          Schema.decodeTo<Schema.Boolean, Schema.Literals<readonly ["0", "1"]>, never, never>
                        >
                        readonly l: Schema.$Array<
                          Schema.decodeTo<
                            Schema.Struct<{
                              readonly tID: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                              readonly sID: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                              readonly o: Schema.optionalKey<
                                Schema.decodeTo<Schema.Boolean, Schema.Literals<readonly ["0", "1"]>, never, never>
                              >
                            }>,
                            Schema.String,
                            never,
                            never
                          >
                        >
                      }>,
                      Schema.String,
                      never,
                      never
                    >
                  >
                }>,
                Schema.String,
                never,
                never
              >
            >
          }>,
          Schema.String,
          never,
          never
        >,
        never,
        never
      >
      readonly nPCT: Schema.decodeTo<Schema.BigInt, Schema.String, never, never>
      readonly cPC: Schema.decodeTo<Schema.BigInt, Schema.String, never, never>
      readonly cPRI: Schema.decodeTo<Schema.BigInt, Schema.String, never, never>
      readonly nFBT: Schema.decodeTo<Schema.BigInt, Schema.String, never, never>
      readonly jBE: Schema.decodeTo<Schema.BigInt, Schema.String, never, never>
      readonly CoinsFree: Schema.decodeTo<Schema.BigInt, Schema.String, never, never>
      readonly BuxFree: Schema.decodeTo<Schema.BigInt, Schema.String, never, never>
      readonly CratesFree: Schema.decodeTo<Schema.BigInt, Schema.String, never, never>
      readonly CratesSpecialFree: Schema.decodeTo<Schema.BigInt, Schema.String, never, never>
      readonly timeInGame: Schema.decodeTo<Schema.BigInt, Schema.String, never, never>
    }>,
    Schema.String,
    never,
    never
  >,
  Schema.decodeTo<Schema.String, Schema.Uint8Array, never, never>
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/pocket-trains-sdk/src/Save.ts#L693)

Since v1.0.0

## Stats

The player's stats (`TRStats`): `ds`, the recent days (`[dscount]` then
`[ds0]`, `[ds1]`...), then the totals of miles, cars, crates, bux and events.

**Signature**

```ts
declare const Stats: Schema.decodeTo<
  Schema.Struct<{
    readonly ds: Schema.$Array<
      Schema.decodeTo<
        Schema.Struct<{
          readonly d: Schema.decodeTo<Schema.DateTimeUtc, Schema.String, never, never>
          readonly r: Schema.decodeTo<Schema.Int, Schema.String, never, never>
          readonly m: Schema.decodeTo<Schema.Int, Schema.String, never, never>
          readonly c: Schema.decodeTo<Schema.Int, Schema.String, never, never>
          readonly cr: Schema.decodeTo<Schema.Int, Schema.String, never, never>
        }>,
        Schema.String,
        never,
        never
      >
    >
    readonly tm: Schema.decodeTo<Schema.BigInt, Schema.String, never, never>
    readonly tc: Schema.decodeTo<Schema.Int, Schema.String, never, never>
    readonly tcr: Schema.decodeTo<Schema.Int, Schema.String, never, never>
    readonly tb: Schema.decodeTo<Schema.Int, Schema.String, never, never>
    readonly te: Schema.decodeTo<Schema.Int, Schema.String, never, never>
  }>,
  Schema.String,
  never,
  never
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/pocket-trains-sdk/src/Save.ts#L437)

Since v1.0.0

## Track

A track (`TRTrack`): its id, its owner (`oid`) and whether it is
electrified (`e`).

**Signature**

```ts
declare const Track: Schema.decodeTo<
  Schema.Struct<{
    readonly id: Schema.decodeTo<Schema.Int, Schema.String, never, never>
    readonly oid: Schema.decodeTo<Schema.Int, Schema.String, never, never>
    readonly e: Schema.decodeTo<Schema.Boolean, Schema.Literals<readonly ["0", "1"]>, never, never>
  }>,
  Schema.String,
  never,
  never
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/pocket-trains-sdk/src/Save.ts#L360)

Since v1.0.0

## Train

A train (`TRTrainInfo`): its id, engine (`eId`) and engine layout (`eL`),
trips made (`nT`), last arrival (`l`), fuel (`f`), last repair (`lR`),
broken part (`b`), trips since braking (`bt`), color (`clr`), `pin`,
written only when pinned, `j`, the jobs it hauls (`[jcount]` then `[j0]`,
`[j1]`...), and its trip.

**Signature**

```ts
declare const Train: Schema.decodeTo<
  Schema.Struct<{
    readonly id: Schema.decodeTo<Schema.Int, Schema.String, never, never>
    readonly eId: Schema.decodeTo<Schema.Int, Schema.String, never, never>
    readonly eL: Schema.String
    readonly nT: Schema.decodeTo<Schema.Int, Schema.String, never, never>
    readonly l: Schema.decodeTo<Schema.DateTimeUtc, Schema.String, never, never>
    readonly f: Schema.decodeTo<Schema.Int, Schema.String, never, never>
    readonly lR: Schema.decodeTo<Schema.Int, Schema.String, never, never>
    readonly b: Schema.decodeTo<Schema.Int, Schema.String, never, never>
    readonly bt: Schema.decodeTo<Schema.Int, Schema.String, never, never>
    readonly clr: Schema.decodeTo<Schema.Int, Schema.String, never, never>
    readonly pin: Schema.optionalKey<
      Schema.decodeTo<Schema.Boolean, Schema.Literals<readonly ["0", "1"]>, never, never>
    >
    readonly j: Schema.$Array<
      Schema.decodeTo<
        Schema.Struct<{
          readonly id: Schema.decodeTo<Schema.Int, Schema.String, never, never>
          readonly s: Schema.decodeTo<Schema.Int, Schema.String, never, never>
          readonly e: Schema.decodeTo<Schema.Int, Schema.String, never, never>
          readonly p: Schema.decodeTo<Schema.Int, Schema.String, never, never>
          readonly c: Schema.decodeTo<Schema.Int, Schema.String, never, never>
          readonly t: Schema.decodeTo<
            Schema.Literals<
              readonly ["Standard", "LocalEvent", "GlobalEvent", "VIP", "Parts", "Crate", "SpecialCrate"]
            >,
            Schema.decodeTo<Schema.Int, Schema.String, never, never>,
            never,
            never
          >
        }>,
        Schema.String,
        never,
        never
      >
    >
    readonly trip: Schema.optionalKey<
      Schema.decodeTo<
        Schema.Struct<{
          readonly sTime: Schema.decodeTo<Schema.DateTimeUtc, Schema.String, never, never>
          readonly com: Schema.optionalKey<
            Schema.decodeTo<Schema.Boolean, Schema.Literals<readonly ["0", "1"]>, never, never>
          >
          readonly off: Schema.optionalKey<
            Schema.decodeTo<Schema.Boolean, Schema.Literals<readonly ["0", "1"]>, never, never>
          >
          readonly l: Schema.$Array<
            Schema.decodeTo<
              Schema.Struct<{
                readonly tID: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                readonly sID: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                readonly o: Schema.optionalKey<
                  Schema.decodeTo<Schema.Boolean, Schema.Literals<readonly ["0", "1"]>, never, never>
                >
              }>,
              Schema.String,
              never,
              never
            >
          >
        }>,
        Schema.String,
        never,
        never
      >
    >
  }>,
  Schema.String,
  never,
  never
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/pocket-trains-sdk/src/Save.ts#L577)

Since v1.0.0

## Trip

A train's trip (`TRTrip`): when it started, `com` and `off`, written only
once it is complete and once it is unloaded, and `l`, its legs (`[lCount]`
then `[l0]`, `[l1]`...).

**Signature**

```ts
declare const Trip: Schema.decodeTo<
  Schema.Struct<{
    readonly sTime: Schema.decodeTo<Schema.DateTimeUtc, Schema.String, never, never>
    readonly com: Schema.optionalKey<
      Schema.decodeTo<Schema.Boolean, Schema.Literals<readonly ["0", "1"]>, never, never>
    >
    readonly off: Schema.optionalKey<
      Schema.decodeTo<Schema.Boolean, Schema.Literals<readonly ["0", "1"]>, never, never>
    >
    readonly l: Schema.$Array<
      Schema.decodeTo<
        Schema.Struct<{
          readonly tID: Schema.decodeTo<Schema.Int, Schema.String, never, never>
          readonly sID: Schema.decodeTo<Schema.Int, Schema.String, never, never>
          readonly o: Schema.optionalKey<
            Schema.decodeTo<Schema.Boolean, Schema.Literals<readonly ["0", "1"]>, never, never>
          >
        }>,
        Schema.String,
        never,
        never
      >
    >
  }>,
  Schema.String,
  never,
  never
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/pocket-trains-sdk/src/Save.ts#L557)

Since v1.0.0

## TripLeg

A leg of a trip (`TRTripLeg`): the track and the city it starts from, and
`o`, written only once the leg's cars are unloaded.

**Signature**

```ts
declare const TripLeg: Schema.decodeTo<
  Schema.Struct<{
    readonly tID: Schema.decodeTo<Schema.Int, Schema.String, never, never>
    readonly sID: Schema.decodeTo<Schema.Int, Schema.String, never, never>
    readonly o: Schema.optionalKey<Schema.decodeTo<Schema.Boolean, Schema.Literals<readonly ["0", "1"]>, never, never>>
  }>,
  Schema.String,
  never,
  never
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/pocket-trains-sdk/src/Save.ts#L543)

Since v1.0.0

## YardItem

Engines or fuel cars waiting in the station yard (`TRYardInfo`): the
engine's id, how many and which (`t`).

**Signature**

```ts
declare const YardItem: Schema.decodeTo<
  Schema.Struct<{
    readonly eID: Schema.decodeTo<Schema.Int, Schema.String, never, never>
    readonly c: Schema.decodeTo<Schema.Int, Schema.String, never, never>
    readonly t: Schema.decodeTo<
      Schema.Literals<readonly ["engine", "fuel", "none"]>,
      Schema.decodeTo<Schema.Int, Schema.String, never, never>,
      never,
      never
    >
  }>,
  Schema.String,
  never,
  never
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/pocket-trains-sdk/src/Save.ts#L396)

Since v1.0.0

## YardType

What a station yard item is (`TRYardType`), by the number the save writes.

**Signature**

```ts
declare const YardType: Schema.decodeTo<
  Schema.Literals<readonly ["engine", "fuel", "none"]>,
  Schema.decodeTo<Schema.Int, Schema.String, never, never>,
  never,
  never
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/pocket-trains-sdk/src/Save.ts#L317)

Since v1.0.0
