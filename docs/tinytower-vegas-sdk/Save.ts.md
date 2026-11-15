---
title: Save.ts
nav_order: 2
parent: "@tinyburg/tinytower-vegas-sdk"
---

## Save.ts overview

Tiny Tower Vegas's save: what the static `VPlayer.ToBlock()` writes, which
`VGame.SaveToDisk` keeps in the `vegas` PlayerPref and `VPlayer.FromBlock`
reads back when the tower loads (and again in `VGame.OnCloudData` for a
cloud save). It is Nimblebit's block format, the one Pocket Trains uses:
each value written by `Block.Val(key, value, num)` or `NBUtils.blockStr` as
`[key]value[key]`, where a numbered block appends its number to the key
(`[story1]...[story1]`), and objects are blocks nested in blocks. Values are
C#'s `ToString()` of the field: `True`/`False` for a `bool` (but `p_preg`
is written as `1`), the enum's name for a `VIPType`, its number for the
other enums. The blocks are read here rather than with
`NimblebitSchema.parseNimblebitObject`, which finds a key anywhere in the
text: the floors and posts are numbered blocks after a count, a floor
writes only its non-zero stock and sale slots and its occupied beds, each
by slot number, and many blocks are only written when they are set.

The server's copy is the same text: `NBSync.pushToServer` passes the Java
plugin (`com.nimblebit.nbsync.NBSync.NBSyncPushSave`) the name of the
PlayerPref to read (`NBSync._prefName`) rather than the text, and unlike
Pocket Trains nothing is left out: the save pulled back still held the
player's salt and email. `SaveDataFromBytes` reads the bytes
`sync/pull` hands back.

Determined against Tiny Tower Vegas 1.5.2 (Android, arm64) in two ways.
Offline, by disassembling `VPlayer.ToBlock`, `VFloor.ToBlock`,
`VBitizen.ToBlock`, `VBBPost.ToBlock`, `VMission.ToBlock`, `Block.Val`,
`NBUtils.blockStr` and `NBSync.pushToServer` in the APK's `libil2cpp.so`,
with the keys read from the metadata's string literals: that gives the
order of the blocks and the condition each optional block is written under.
Then on an emulator with a Frida probe (November 2026), from text the game
wrote: two fresh installs' saves, one grown by calling the game's own
methods (`VTowerPage.BuildNewFloor`, `TrySpawnVIP`, the `VPlayer` setters),
ones where the probe also set the fields that only some floors, posts and
bitizens have, so that every optional block was written, the save the game
pulled back from the server, and what `Block.Val` writes for a range of
floats. The fixtures under `test/fixtures` are those saves, with the
player's id, auth salt and email replaced. Every key the game writes is
modeled, in the game's order.

Decoding never drops part of a save: a block this module does not know, such
as one a later version of the game adds, fails to decode, as does a missing
or reordered block, text between blocks, or a value written another way than
the game writes it, in the save and in every object nested in it (a floor,
a bitizen, a post, the mission). In exchange, the round trip is exact: every
text that decodes encodes back to the same text, byte for byte, with no
exceptions.

The player's auth salt (`p_ps`) and email (`p_em`) decode to `Redacted`
values, with `NimblebitConfig.PlayerAuthKeySchema` (which also requires the
salt to be a UUID) and `NimblebitConfig.PlayerEmailSchema`, so printing or
logging a decoded save does not show them; `Redacted.value` reads them.

C# `long` and `ulong` values are `bigint`s: the save holds `DateTime` ticks
(`f_od`, `bb_date` and the floor timers) and a `ulong` (`tp`), which are
past what a `number` holds exactly. A C# `float` keeps the seven digits the
game writes, and only reads text written the way C# writes it with `.` for
the decimal point: the game writes `f_sln` and `bb_ft` in the device's
culture, so a save from a device that uses `,` fails to decode.

Since v1.0.0

---

## Exports Grouped by Category

- [Schemas](#schemas)
  - [Bitizen](#bitizen)
  - [Floor](#floor)
  - [Mission](#mission)
  - [Post](#post)
  - [Resident](#resident)
  - [SaveData](#savedata)
  - [SaveDataFromBytes](#savedatafrombytes)
  - [Story](#story)
  - [VIPType](#viptype)

---

# Schemas

## Bitizen

A bitizen (`VBitizen.ToBlock`): the seed its looks and name come from
(`b_seed`), `b_df`, its dream floor's id, written once it has one, `b_cn`,
its costume, written when it wears one (`construction` for the builders on
an unfinished floor, a character's costume for a character), and `!`, an
empty block written while its `dreamed` flag is set.

**Signature**

```ts
declare const Bitizen: Schema.decodeTo<
  Schema.Struct<{
    readonly b_seed: Schema.decodeTo<Schema.Int, Schema.String, never, never>
    readonly b_df: Schema.optionalKey<Schema.decodeTo<Schema.Int, Schema.String, never, never>>
    readonly b_cn: Schema.optionalKey<Schema.String>
    readonly "!": Schema.optionalKey<Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"">, never, never>>
  }>,
  Schema.String,
  never,
  never
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-vegas-sdk/src/Save.ts#L468)

Since v1.0.0

## Floor

A floor (`VFloor.ToBlock`): its id in the game's floor table (`f_id`, 0 for
one still being built), when it opens or opened (`f_od`, C# `DateTime`
ticks, 0 for none), its stocking base time (`f_sbt`), and, written only
when they apply:

- `f_si`, `f_st`: the tier being stocked (`_stockingTier`) and when
  stocking started (`_stockingStartTime`), while the tier is 0 or more.
- `f_fpd`: on a casino, `_lastFreePlayDay`.
- `f_chps`, `f_bwon`: the chips spent and bux won on it, once above zero.
- `f_stk`: the stock in each slot (`_stocks`), for the slots above zero.
- `f_lst`: each slot's last sale (`_lastSaleTicks`), for the slots above
  zero.
- `f_bzn`: the bitizens on it by slot, see `Resident`.

`f_st`, `f_fpd`, `f_lst` and `f_cot` are C# `long`s; the values in the
fixtures were set by the probe, so their units are only known from the
fields' names.

**Signature**

```ts
declare const Floor: Schema.decodeTo<
  Schema.Struct<{
    readonly f_id: Schema.decodeTo<Schema.Int, Schema.String, never, never>
    readonly f_od: Schema.decodeTo<Schema.BigInt, Schema.String, never, never>
    readonly f_sbt: Schema.decodeTo<Schema.Int, Schema.String, never, never>
    readonly f_si: Schema.optionalKey<Schema.decodeTo<Schema.Int, Schema.String, never, never>>
    readonly f_st: Schema.optionalKey<Schema.decodeTo<Schema.BigInt, Schema.String, never, never>>
    readonly f_fpd: Schema.optionalKey<Schema.decodeTo<Schema.BigInt, Schema.String, never, never>>
    readonly f_chps: Schema.optionalKey<Schema.decodeTo<Schema.Int, Schema.String, never, never>>
    readonly f_bwon: Schema.optionalKey<Schema.decodeTo<Schema.Int, Schema.String, never, never>>
    readonly f_stk: Schema.$Record<Schema.String, Schema.decodeTo<Schema.Int, Schema.String, never, never>>
    readonly f_lst: Schema.$Record<Schema.String, Schema.decodeTo<Schema.BigInt, Schema.String, never, never>>
    readonly f_bzn: Schema.$Record<
      Schema.String,
      Schema.Struct<{
        readonly f_bzn: Schema.decodeTo<
          Schema.Struct<{
            readonly b_seed: Schema.decodeTo<Schema.Int, Schema.String, never, never>
            readonly b_df: Schema.optionalKey<Schema.decodeTo<Schema.Int, Schema.String, never, never>>
            readonly b_cn: Schema.optionalKey<Schema.String>
            readonly "!": Schema.optionalKey<Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"">, never, never>>
          }>,
          Schema.String,
          never,
          never
        >
        readonly f_vpt: Schema.optionalKey<
          Schema.Literals<readonly ["None", "Applicant", "Engineer", "TravelAgent", "Deliveryman", "Bellhop"]>
        >
        readonly f_cot: Schema.optionalKey<Schema.decodeTo<Schema.BigInt, Schema.String, never, never>>
        readonly f_sln: Schema.optionalKey<Schema.decodeTo<Schema.Finite, Schema.String, never, never>>
      }>
    >
  }>,
  Schema.String,
  never,
  never
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-vegas-sdk/src/Save.ts#L557)

Since v1.0.0

## Mission

The mission in progress (`VMission.ToBlock`): its id (`m_id`), the floor it
is about (`m_fid`), `m_pr`, the props to find, written when it has any, how
many (`m_cnt`), the floor type it is about as the `FloorType` number
(`m_ft`), and `m_com`, an empty block written once it is complete.

**Signature**

```ts
declare const Mission: Schema.decodeTo<
  Schema.Struct<{
    readonly m_id: Schema.decodeTo<Schema.Int, Schema.String, never, never>
    readonly m_fid: Schema.decodeTo<Schema.Int, Schema.String, never, never>
    readonly m_pr: Schema.optionalKey<Schema.String>
    readonly m_cnt: Schema.decodeTo<Schema.Int, Schema.String, never, never>
    readonly m_ft: Schema.decodeTo<Schema.Int, Schema.String, never, never>
    readonly m_com: Schema.optionalKey<Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"">, never, never>>
  }>,
  Schema.String,
  never,
  never
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-vegas-sdk/src/Save.ts#L484)

Since v1.0.0

## Post

A Bitbook post (`VBBPost.ToBlock`): the post's id in the game's post table
(`bb_tid`), who posted it, the first of these that is set (`bb_bzn`, a
bitizen; else `bb_chr`, a character's id; else `bb_selem` and `bb_sname`, a
sprite and a name), when, as C# `DateTime` ticks (`bb_date`), the text
(`bb_txt`), the media's `PostMediaType` number (`bb_mt`) and path (`bb_mp`),
`bb_ft`, a time written when it is above zero, and the likes (`bb_lks`).

**Signature**

```ts
declare const Post: Schema.decodeTo<
  Schema.Struct<{
    readonly bb_tid: Schema.decodeTo<Schema.Int, Schema.String, never, never>
    readonly bb_bzn: Schema.optionalKey<
      Schema.decodeTo<
        Schema.Struct<{
          readonly b_seed: Schema.decodeTo<Schema.Int, Schema.String, never, never>
          readonly b_df: Schema.optionalKey<Schema.decodeTo<Schema.Int, Schema.String, never, never>>
          readonly b_cn: Schema.optionalKey<Schema.String>
          readonly "!": Schema.optionalKey<Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"">, never, never>>
        }>,
        Schema.String,
        never,
        never
      >
    >
    readonly bb_chr: Schema.optionalKey<Schema.String>
    readonly bb_selem: Schema.optionalKey<Schema.String>
    readonly bb_sname: Schema.optionalKey<Schema.String>
    readonly bb_date: Schema.decodeTo<Schema.BigInt, Schema.String, never, never>
    readonly bb_txt: Schema.String
    readonly bb_mt: Schema.decodeTo<Schema.Int, Schema.String, never, never>
    readonly bb_mp: Schema.String
    readonly bb_ft: Schema.optionalKey<Schema.decodeTo<Schema.Finite, Schema.String, never, never>>
    readonly bb_lks: Schema.decodeTo<Schema.Int, Schema.String, never, never>
  }>,
  Schema.String,
  never,
  never
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-vegas-sdk/src/Save.ts#L504)

Since v1.0.0

## Resident

A floor's occupied bed or slot (`VFloor._residents`), by slot number: the
bitizen (`f_bzn`), and on a lobby its VIP job (`f_vpt`), or on a hotel its
checkout time (`f_cot`, `VFloor._checkoutTimes`, a C# `long`, by its name
`DateTime` ticks) and stay length (`f_sln`, `VFloor._stayLengths`, a
`float`).

**Signature**

```ts
declare const Resident: Schema.Struct<{
  readonly f_bzn: Schema.decodeTo<
    Schema.Struct<{
      readonly b_seed: Schema.decodeTo<Schema.Int, Schema.String, never, never>
      readonly b_df: Schema.optionalKey<Schema.decodeTo<Schema.Int, Schema.String, never, never>>
      readonly b_cn: Schema.optionalKey<Schema.String>
      readonly "!": Schema.optionalKey<Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"">, never, never>>
    }>,
    Schema.String,
    never,
    never
  >
  readonly f_vpt: Schema.optionalKey<
    Schema.Literals<readonly ["None", "Applicant", "Engineer", "TravelAgent", "Deliveryman", "Bellhop"]>
  >
  readonly f_cot: Schema.optionalKey<Schema.decodeTo<Schema.BigInt, Schema.String, never, never>>
  readonly f_sln: Schema.optionalKey<Schema.decodeTo<Schema.Finite, Schema.String, never, never>>
}>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-vegas-sdk/src/Save.ts#L528)

Since v1.0.0

## SaveData

A save as `VPlayer.ToBlock()` writes it, with the game's keys:

- `ver`: the game version that wrote it; `it`: when the game was installed,
  in seconds since 0001-01-01; `lst`: `VPlayer.lastSaleTime` (0 in every
  save seen).
- `p_coin`, `p_bux`, `p_chip`, `p_winn`: coins, bux, chips and winnings;
  `p_cb`, `p_bxb`: the chips and bux bought; `tp`: `VPlayer.tp`, a `ulong`
  that `VGame.OnCloudData` reads from a cloud save (what it counts was not
  determined).
- `p_vip`, `p_sfxon`, `p_muson`, `p_noteson`, `p_bbon`, `p_videoson`,
  `p_videoscheck`: VIP status and the options.
- `p_roof`, `p_lift`, `p_lobby`: the roof, elevator and lobby in use, and
  `p_rfs`, `p_lfs`, `p_lbys`, the ones owned (written when there are any);
  `p_lspd`: the elevator's speed.
- `p_fwk`, `p_fwkrow`: `lastFireworkDay` and `consecFireworkDays`, the
  last fireworks show and how many days in a row.
- `floors`: the floors, written as `[p_stories]` (how many) and one
  `[story<n>]` per floor, see `Story`.
- `p_frnd`, `p_ch`: friends' player ids and the characters met, written when
  there are any; `p_avseed`, `p_avcost`: the avatar's seed (written when 0
  or more) and costume (written when set).
- `p_tmi`: the tutorial mission's index; `p_miss`: the mission in progress;
  `p_ntm`, `p_tipmiss`: the next tip mission and tip mission index, when
  set.
- `p_bbhsh`: `p_bux + p_coin + p_chip` in base 26 with `A` for 0
  (`NBUtils.toBase26`), a check against editing them, so a save whose
  currencies change needs a new one; `tmp`: `temp` once the game believes
  the save was tampered with; `posts`: the Bitbook posts, written as
  `[p_bbcnt]` (how many) and `[post0]`, `[post1]`..., see `Post`.
- `p_pid`, `p_ps`: the player's id and auth salt, once registered with
  Nimblebit's servers; `p_em`: the player's email, once given; `p_preg`:
  written as `1` while `playerRegistered` is set. The salt and email decode
  to `Redacted` values; a salt that is not a UUID fails to decode.

Every text that decodes encodes back to the same text, byte for byte, with
no exceptions: a block this schema does not know fails to decode, here and
in the objects nested in the save, instead of being dropped. A save built
rather than decoded is written the way the game writes it, a float with the
seven significant digits C# keeps (so it decodes to the nearest such
number) and slots in ascending order.

**Signature**

```ts
declare const SaveData: Schema.decodeTo<
  Schema.Struct<{
    readonly ver: Schema.String
    readonly it: Schema.decodeTo<Schema.BigInt, Schema.String, never, never>
    readonly lst: Schema.decodeTo<Schema.BigInt, Schema.String, never, never>
    readonly p_coin: Schema.decodeTo<Schema.BigInt, Schema.String, never, never>
    readonly p_bux: Schema.decodeTo<Schema.BigInt, Schema.String, never, never>
    readonly p_chip: Schema.decodeTo<Schema.BigInt, Schema.String, never, never>
    readonly p_winn: Schema.decodeTo<Schema.BigInt, Schema.String, never, never>
    readonly p_vip: Schema.decodeTo<Schema.Boolean, Schema.Literals<readonly ["True", "False"]>, never, never>
    readonly p_sfxon: Schema.decodeTo<Schema.Boolean, Schema.Literals<readonly ["True", "False"]>, never, never>
    readonly p_muson: Schema.decodeTo<Schema.Boolean, Schema.Literals<readonly ["True", "False"]>, never, never>
    readonly p_noteson: Schema.decodeTo<Schema.Boolean, Schema.Literals<readonly ["True", "False"]>, never, never>
    readonly p_bbon: Schema.decodeTo<Schema.Boolean, Schema.Literals<readonly ["True", "False"]>, never, never>
    readonly p_videoson: Schema.decodeTo<Schema.Boolean, Schema.Literals<readonly ["True", "False"]>, never, never>
    readonly p_videoscheck: Schema.decodeTo<Schema.Boolean, Schema.Literals<readonly ["True", "False"]>, never, never>
    readonly p_roof: Schema.decodeTo<Schema.Int, Schema.String, never, never>
    readonly p_lift: Schema.decodeTo<Schema.Int, Schema.String, never, never>
    readonly p_lobby: Schema.decodeTo<Schema.Int, Schema.String, never, never>
    readonly p_lspd: Schema.decodeTo<Schema.Finite, Schema.String, never, never>
    readonly p_fwk: Schema.decodeTo<Schema.BigInt, Schema.String, never, never>
    readonly p_fwkrow: Schema.decodeTo<Schema.Int, Schema.String, never, never>
    readonly floors: Schema.$Array<
      Schema.Struct<{
        readonly story: Schema.decodeTo<Schema.Int, Schema.String, never, never>
        readonly floor: Schema.decodeTo<
          Schema.Struct<{
            readonly f_id: Schema.decodeTo<Schema.Int, Schema.String, never, never>
            readonly f_od: Schema.decodeTo<Schema.BigInt, Schema.String, never, never>
            readonly f_sbt: Schema.decodeTo<Schema.Int, Schema.String, never, never>
            readonly f_si: Schema.optionalKey<Schema.decodeTo<Schema.Int, Schema.String, never, never>>
            readonly f_st: Schema.optionalKey<Schema.decodeTo<Schema.BigInt, Schema.String, never, never>>
            readonly f_fpd: Schema.optionalKey<Schema.decodeTo<Schema.BigInt, Schema.String, never, never>>
            readonly f_chps: Schema.optionalKey<Schema.decodeTo<Schema.Int, Schema.String, never, never>>
            readonly f_bwon: Schema.optionalKey<Schema.decodeTo<Schema.Int, Schema.String, never, never>>
            readonly f_stk: Schema.$Record<Schema.String, Schema.decodeTo<Schema.Int, Schema.String, never, never>>
            readonly f_lst: Schema.$Record<Schema.String, Schema.decodeTo<Schema.BigInt, Schema.String, never, never>>
            readonly f_bzn: Schema.$Record<
              Schema.String,
              Schema.Struct<{
                readonly f_bzn: Schema.decodeTo<
                  Schema.Struct<{
                    readonly b_seed: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                    readonly b_df: Schema.optionalKey<Schema.decodeTo<Schema.Int, Schema.String, never, never>>
                    readonly b_cn: Schema.optionalKey<Schema.String>
                    readonly "!": Schema.optionalKey<
                      Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"">, never, never>
                    >
                  }>,
                  Schema.String,
                  never,
                  never
                >
                readonly f_vpt: Schema.optionalKey<
                  Schema.Literals<readonly ["None", "Applicant", "Engineer", "TravelAgent", "Deliveryman", "Bellhop"]>
                >
                readonly f_cot: Schema.optionalKey<Schema.decodeTo<Schema.BigInt, Schema.String, never, never>>
                readonly f_sln: Schema.optionalKey<Schema.decodeTo<Schema.Finite, Schema.String, never, never>>
              }>
            >
          }>,
          Schema.String,
          never,
          never
        >
      }>
    >
    readonly p_frnd: Schema.optionalKey<Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>>
    readonly p_ch: Schema.optionalKey<Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>>
    readonly p_avseed: Schema.optionalKey<Schema.decodeTo<Schema.Int, Schema.String, never, never>>
    readonly p_avcost: Schema.optionalKey<Schema.String>
    readonly p_rfs: Schema.optionalKey<
      Schema.compose<
        Schema.$Array<Schema.decodeTo<Schema.Int, Schema.String, never, never>>,
        Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>
      >
    >
    readonly p_lfs: Schema.optionalKey<
      Schema.compose<
        Schema.$Array<Schema.decodeTo<Schema.Int, Schema.String, never, never>>,
        Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>
      >
    >
    readonly p_lbys: Schema.optionalKey<
      Schema.compose<
        Schema.$Array<Schema.decodeTo<Schema.Int, Schema.String, never, never>>,
        Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>
      >
    >
    readonly p_tmi: Schema.decodeTo<Schema.Int, Schema.String, never, never>
    readonly p_miss: Schema.optionalKey<
      Schema.decodeTo<
        Schema.Struct<{
          readonly m_id: Schema.decodeTo<Schema.Int, Schema.String, never, never>
          readonly m_fid: Schema.decodeTo<Schema.Int, Schema.String, never, never>
          readonly m_pr: Schema.optionalKey<Schema.String>
          readonly m_cnt: Schema.decodeTo<Schema.Int, Schema.String, never, never>
          readonly m_ft: Schema.decodeTo<Schema.Int, Schema.String, never, never>
          readonly m_com: Schema.optionalKey<Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"">, never, never>>
        }>,
        Schema.String,
        never,
        never
      >
    >
    readonly p_ntm: Schema.optionalKey<Schema.decodeTo<Schema.Int, Schema.String, never, never>>
    readonly p_tipmiss: Schema.optionalKey<Schema.decodeTo<Schema.Int, Schema.String, never, never>>
    readonly p_cb: Schema.decodeTo<Schema.BigInt, Schema.String, never, never>
    readonly p_bxb: Schema.decodeTo<Schema.BigInt, Schema.String, never, never>
    readonly p_bbhsh: Schema.String
    readonly tmp: Schema.optionalKey<Schema.Literal<"temp">>
    readonly posts: Schema.$Array<
      Schema.decodeTo<
        Schema.Struct<{
          readonly bb_tid: Schema.decodeTo<Schema.Int, Schema.String, never, never>
          readonly bb_bzn: Schema.optionalKey<
            Schema.decodeTo<
              Schema.Struct<{
                readonly b_seed: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                readonly b_df: Schema.optionalKey<Schema.decodeTo<Schema.Int, Schema.String, never, never>>
                readonly b_cn: Schema.optionalKey<Schema.String>
                readonly "!": Schema.optionalKey<
                  Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"">, never, never>
                >
              }>,
              Schema.String,
              never,
              never
            >
          >
          readonly bb_chr: Schema.optionalKey<Schema.String>
          readonly bb_selem: Schema.optionalKey<Schema.String>
          readonly bb_sname: Schema.optionalKey<Schema.String>
          readonly bb_date: Schema.decodeTo<Schema.BigInt, Schema.String, never, never>
          readonly bb_txt: Schema.String
          readonly bb_mt: Schema.decodeTo<Schema.Int, Schema.String, never, never>
          readonly bb_mp: Schema.String
          readonly bb_ft: Schema.optionalKey<Schema.decodeTo<Schema.Finite, Schema.String, never, never>>
          readonly bb_lks: Schema.decodeTo<Schema.Int, Schema.String, never, never>
        }>,
        Schema.String,
        never,
        never
      >
    >
    readonly p_pid: Schema.optionalKey<Schema.brand<Schema.String, "PlayerId">>
    readonly p_ps: Schema.optionalKey<Schema.brand<Schema.RedactedFromValue<Schema.String>, "PlayerAuthKey">>
    readonly p_em: Schema.optionalKey<Schema.brand<Schema.RedactedFromValue<Schema.String>, "PlayerEmail">>
    readonly p_preg: Schema.optionalKey<Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>>
    readonly tp: Schema.decodeTo<Schema.BigInt, Schema.String, never, never>
  }>,
  Schema.String,
  never,
  never
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-vegas-sdk/src/Save.ts#L638)

Since v1.0.0

## SaveDataFromBytes

A save as the server holds it: the bytes of `data` in a `sync/pull`
response, once base64 decoded, are the save's UTF-8 text deflated with zlib.
`NBSync.getCurrentSave` requests `sync/pull` and hands `data` to
`NBSync.decodeSave` (the Java plugin's `decompress`), whose text
`VGame.OnCloudData` loads; `NBSync.encodeSave` (`compress`) does the
reverse. On the emulator the pulled `data` was a zlib stream (`78 9c`)
that decoded to the very save the game had pushed, salt and email
included. Inflating and deflating use the platform's `DecompressionStream`
and `CompressionStream`, so this needs no dependency. The round trip keeps
the text, not the bytes: what it encodes from a decoded save inflates to
exactly the text the input inflated to, but need not be the game's bytes,
since its zlib may compress differently. The text is read as it is, so a
byte order mark before it fails to decode rather than being dropped.

**Signature**

```ts
declare const SaveDataFromBytes: Schema.compose<
  Schema.decodeTo<
    Schema.Struct<{
      readonly ver: Schema.String
      readonly it: Schema.decodeTo<Schema.BigInt, Schema.String, never, never>
      readonly lst: Schema.decodeTo<Schema.BigInt, Schema.String, never, never>
      readonly p_coin: Schema.decodeTo<Schema.BigInt, Schema.String, never, never>
      readonly p_bux: Schema.decodeTo<Schema.BigInt, Schema.String, never, never>
      readonly p_chip: Schema.decodeTo<Schema.BigInt, Schema.String, never, never>
      readonly p_winn: Schema.decodeTo<Schema.BigInt, Schema.String, never, never>
      readonly p_vip: Schema.decodeTo<Schema.Boolean, Schema.Literals<readonly ["True", "False"]>, never, never>
      readonly p_sfxon: Schema.decodeTo<Schema.Boolean, Schema.Literals<readonly ["True", "False"]>, never, never>
      readonly p_muson: Schema.decodeTo<Schema.Boolean, Schema.Literals<readonly ["True", "False"]>, never, never>
      readonly p_noteson: Schema.decodeTo<Schema.Boolean, Schema.Literals<readonly ["True", "False"]>, never, never>
      readonly p_bbon: Schema.decodeTo<Schema.Boolean, Schema.Literals<readonly ["True", "False"]>, never, never>
      readonly p_videoson: Schema.decodeTo<Schema.Boolean, Schema.Literals<readonly ["True", "False"]>, never, never>
      readonly p_videoscheck: Schema.decodeTo<Schema.Boolean, Schema.Literals<readonly ["True", "False"]>, never, never>
      readonly p_roof: Schema.decodeTo<Schema.Int, Schema.String, never, never>
      readonly p_lift: Schema.decodeTo<Schema.Int, Schema.String, never, never>
      readonly p_lobby: Schema.decodeTo<Schema.Int, Schema.String, never, never>
      readonly p_lspd: Schema.decodeTo<Schema.Finite, Schema.String, never, never>
      readonly p_fwk: Schema.decodeTo<Schema.BigInt, Schema.String, never, never>
      readonly p_fwkrow: Schema.decodeTo<Schema.Int, Schema.String, never, never>
      readonly floors: Schema.$Array<
        Schema.Struct<{
          readonly story: Schema.decodeTo<Schema.Int, Schema.String, never, never>
          readonly floor: Schema.decodeTo<
            Schema.Struct<{
              readonly f_id: Schema.decodeTo<Schema.Int, Schema.String, never, never>
              readonly f_od: Schema.decodeTo<Schema.BigInt, Schema.String, never, never>
              readonly f_sbt: Schema.decodeTo<Schema.Int, Schema.String, never, never>
              readonly f_si: Schema.optionalKey<Schema.decodeTo<Schema.Int, Schema.String, never, never>>
              readonly f_st: Schema.optionalKey<Schema.decodeTo<Schema.BigInt, Schema.String, never, never>>
              readonly f_fpd: Schema.optionalKey<Schema.decodeTo<Schema.BigInt, Schema.String, never, never>>
              readonly f_chps: Schema.optionalKey<Schema.decodeTo<Schema.Int, Schema.String, never, never>>
              readonly f_bwon: Schema.optionalKey<Schema.decodeTo<Schema.Int, Schema.String, never, never>>
              readonly f_stk: Schema.$Record<Schema.String, Schema.decodeTo<Schema.Int, Schema.String, never, never>>
              readonly f_lst: Schema.$Record<Schema.String, Schema.decodeTo<Schema.BigInt, Schema.String, never, never>>
              readonly f_bzn: Schema.$Record<
                Schema.String,
                Schema.Struct<{
                  readonly f_bzn: Schema.decodeTo<
                    Schema.Struct<{
                      readonly b_seed: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                      readonly b_df: Schema.optionalKey<Schema.decodeTo<Schema.Int, Schema.String, never, never>>
                      readonly b_cn: Schema.optionalKey<Schema.String>
                      readonly "!": Schema.optionalKey<
                        Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"">, never, never>
                      >
                    }>,
                    Schema.String,
                    never,
                    never
                  >
                  readonly f_vpt: Schema.optionalKey<
                    Schema.Literals<readonly ["None", "Applicant", "Engineer", "TravelAgent", "Deliveryman", "Bellhop"]>
                  >
                  readonly f_cot: Schema.optionalKey<Schema.decodeTo<Schema.BigInt, Schema.String, never, never>>
                  readonly f_sln: Schema.optionalKey<Schema.decodeTo<Schema.Finite, Schema.String, never, never>>
                }>
              >
            }>,
            Schema.String,
            never,
            never
          >
        }>
      >
      readonly p_frnd: Schema.optionalKey<Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>>
      readonly p_ch: Schema.optionalKey<Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>>
      readonly p_avseed: Schema.optionalKey<Schema.decodeTo<Schema.Int, Schema.String, never, never>>
      readonly p_avcost: Schema.optionalKey<Schema.String>
      readonly p_rfs: Schema.optionalKey<
        Schema.compose<
          Schema.$Array<Schema.decodeTo<Schema.Int, Schema.String, never, never>>,
          Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>
        >
      >
      readonly p_lfs: Schema.optionalKey<
        Schema.compose<
          Schema.$Array<Schema.decodeTo<Schema.Int, Schema.String, never, never>>,
          Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>
        >
      >
      readonly p_lbys: Schema.optionalKey<
        Schema.compose<
          Schema.$Array<Schema.decodeTo<Schema.Int, Schema.String, never, never>>,
          Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>
        >
      >
      readonly p_tmi: Schema.decodeTo<Schema.Int, Schema.String, never, never>
      readonly p_miss: Schema.optionalKey<
        Schema.decodeTo<
          Schema.Struct<{
            readonly m_id: Schema.decodeTo<Schema.Int, Schema.String, never, never>
            readonly m_fid: Schema.decodeTo<Schema.Int, Schema.String, never, never>
            readonly m_pr: Schema.optionalKey<Schema.String>
            readonly m_cnt: Schema.decodeTo<Schema.Int, Schema.String, never, never>
            readonly m_ft: Schema.decodeTo<Schema.Int, Schema.String, never, never>
            readonly m_com: Schema.optionalKey<Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"">, never, never>>
          }>,
          Schema.String,
          never,
          never
        >
      >
      readonly p_ntm: Schema.optionalKey<Schema.decodeTo<Schema.Int, Schema.String, never, never>>
      readonly p_tipmiss: Schema.optionalKey<Schema.decodeTo<Schema.Int, Schema.String, never, never>>
      readonly p_cb: Schema.decodeTo<Schema.BigInt, Schema.String, never, never>
      readonly p_bxb: Schema.decodeTo<Schema.BigInt, Schema.String, never, never>
      readonly p_bbhsh: Schema.String
      readonly tmp: Schema.optionalKey<Schema.Literal<"temp">>
      readonly posts: Schema.$Array<
        Schema.decodeTo<
          Schema.Struct<{
            readonly bb_tid: Schema.decodeTo<Schema.Int, Schema.String, never, never>
            readonly bb_bzn: Schema.optionalKey<
              Schema.decodeTo<
                Schema.Struct<{
                  readonly b_seed: Schema.decodeTo<Schema.Int, Schema.String, never, never>
                  readonly b_df: Schema.optionalKey<Schema.decodeTo<Schema.Int, Schema.String, never, never>>
                  readonly b_cn: Schema.optionalKey<Schema.String>
                  readonly "!": Schema.optionalKey<
                    Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"">, never, never>
                  >
                }>,
                Schema.String,
                never,
                never
              >
            >
            readonly bb_chr: Schema.optionalKey<Schema.String>
            readonly bb_selem: Schema.optionalKey<Schema.String>
            readonly bb_sname: Schema.optionalKey<Schema.String>
            readonly bb_date: Schema.decodeTo<Schema.BigInt, Schema.String, never, never>
            readonly bb_txt: Schema.String
            readonly bb_mt: Schema.decodeTo<Schema.Int, Schema.String, never, never>
            readonly bb_mp: Schema.String
            readonly bb_ft: Schema.optionalKey<Schema.decodeTo<Schema.Finite, Schema.String, never, never>>
            readonly bb_lks: Schema.decodeTo<Schema.Int, Schema.String, never, never>
          }>,
          Schema.String,
          never,
          never
        >
      >
      readonly p_pid: Schema.optionalKey<Schema.brand<Schema.String, "PlayerId">>
      readonly p_ps: Schema.optionalKey<Schema.brand<Schema.RedactedFromValue<Schema.String>, "PlayerAuthKey">>
      readonly p_em: Schema.optionalKey<Schema.brand<Schema.RedactedFromValue<Schema.String>, "PlayerEmail">>
      readonly p_preg: Schema.optionalKey<Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>>
      readonly tp: Schema.decodeTo<Schema.BigInt, Schema.String, never, never>
    }>,
    Schema.String,
    never,
    never
  >,
  Schema.decodeTo<Schema.String, Schema.Uint8Array, never, never>
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-vegas-sdk/src/Save.ts#L716)

Since v1.0.0

## Story

A floor of the tower and the story it is on (`[story<n>]`).

**Signature**

```ts
declare const Story: Schema.Struct<{
  readonly story: Schema.decodeTo<Schema.Int, Schema.String, never, never>
  readonly floor: Schema.decodeTo<
    Schema.Struct<{
      readonly f_id: Schema.decodeTo<Schema.Int, Schema.String, never, never>
      readonly f_od: Schema.decodeTo<Schema.BigInt, Schema.String, never, never>
      readonly f_sbt: Schema.decodeTo<Schema.Int, Schema.String, never, never>
      readonly f_si: Schema.optionalKey<Schema.decodeTo<Schema.Int, Schema.String, never, never>>
      readonly f_st: Schema.optionalKey<Schema.decodeTo<Schema.BigInt, Schema.String, never, never>>
      readonly f_fpd: Schema.optionalKey<Schema.decodeTo<Schema.BigInt, Schema.String, never, never>>
      readonly f_chps: Schema.optionalKey<Schema.decodeTo<Schema.Int, Schema.String, never, never>>
      readonly f_bwon: Schema.optionalKey<Schema.decodeTo<Schema.Int, Schema.String, never, never>>
      readonly f_stk: Schema.$Record<Schema.String, Schema.decodeTo<Schema.Int, Schema.String, never, never>>
      readonly f_lst: Schema.$Record<Schema.String, Schema.decodeTo<Schema.BigInt, Schema.String, never, never>>
      readonly f_bzn: Schema.$Record<
        Schema.String,
        Schema.Struct<{
          readonly f_bzn: Schema.decodeTo<
            Schema.Struct<{
              readonly b_seed: Schema.decodeTo<Schema.Int, Schema.String, never, never>
              readonly b_df: Schema.optionalKey<Schema.decodeTo<Schema.Int, Schema.String, never, never>>
              readonly b_cn: Schema.optionalKey<Schema.String>
              readonly "!": Schema.optionalKey<Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"">, never, never>>
            }>,
            Schema.String,
            never,
            never
          >
          readonly f_vpt: Schema.optionalKey<
            Schema.Literals<readonly ["None", "Applicant", "Engineer", "TravelAgent", "Deliveryman", "Bellhop"]>
          >
          readonly f_cot: Schema.optionalKey<Schema.decodeTo<Schema.BigInt, Schema.String, never, never>>
          readonly f_sln: Schema.optionalKey<Schema.decodeTo<Schema.Finite, Schema.String, never, never>>
        }>
      >
    }>,
    Schema.String,
    never,
    never
  >
}>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-vegas-sdk/src/Save.ts#L584)

Since v1.0.0

## VIPType

The jobs a VIP can have (`VIPType`), written by name.

**Signature**

```ts
declare const VIPType: Schema.Literals<
  readonly ["None", "Applicant", "Engineer", "TravelAgent", "Deliveryman", "Bellhop"]
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-vegas-sdk/src/Save.ts#L456)

Since v1.0.0
