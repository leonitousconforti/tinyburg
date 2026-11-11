/**
 * Pocket Trains' save: what `TRPlayer.ToBlockStr()` writes, which
 * `TRPlayer.saveGame()` keeps in the `TRBLOCK` PlayerPref and the game reads
 * back with `TRPlayer.FromBlock`. It is Nimblebit's block format: each value
 * written as `[key]value[key]`, with blocks nested in blocks. A list is a block
 * holding its length (`[ccount]5[ccount]`) and one block per item keyed by its
 * index (`[c0]...[c0]`), a few short lists are comma separated, and the
 * friends list is item blocks joined with commas. The blocks are read here
 * rather than with `NimblebitSchema.parseNimblebitObject`, which finds a key
 * anywhere in the text: these lists are numbered blocks after a count, and
 * short keys repeat at different depths (`c` is the coins, a crate's count
 * and a day's cars).
 *
 * `NBSync.pushToServer` sends the same text without the `pS` and `pE` blocks
 * (the player's auth salt and email): `NBSync.encodeSave` deflates it with
 * zlib and base64 encodes it, `sync/pull` hands that string back unchanged, and
 * `NBSync.decodeSave` reverses it before `TRGame.HandleCloudChange` loads it.
 * {@link SaveDataFromBytes} reads those bytes.
 *
 * Determined against Pocket Trains 1.10.2 on an emulator with a Frida probe
 * (November 2026), from saves the game wrote: a fresh install's, and one grown
 * by calling the game's own methods (coins, crates, parts, yard items,
 * achievements, tips, friends, jobs, licenses) and setting fields the save
 * only writes when they are set. The fixtures under `test/fixtures` are those
 * saves, with the player's id and salt replaced. Every key the game wrote is
 * modeled, in the game's order.
 *
 * Decoding never drops part of a save: it fails on a block the schema does not
 * model (such as one a newer version of the game adds), and on a missing,
 * repeated or reordered block, a list whose count disagrees with its items,
 * text outside the blocks, or a value written other than the way the game
 * writes it (`1e4` for `10000`, say). So the round trip is exact, with no
 * exceptions: any text {@link SaveData} decodes encodes back to the same text,
 * byte for byte.
 *
 * The player's auth salt (`pS`) and email (`pE`) decode to `Redacted` values
 * (`NimblebitConfig.PlayerAuthKeySchema` and `PlayerEmailSchema`), so printing
 * or logging a decoded save does not show them; `Redacted.value` reads them.
 *
 * Not seen: keys a 1.10.2 save would only hold in states the probe did not
 * reach, a lost and found holding more than one part (`PLFP` is read as a
 * comma separated list, like the game's other lists), and what `jBE`, `cPC`
 * and `cPRI` hold beyond being C# `long`s.
 *
 * @since 1.0.0
 * @category Save
 */

import * as DateTime from "effect/DateTime";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import * as SchemaAST from "effect/SchemaAST";
import * as SchemaIssue from "effect/SchemaIssue";
import * as SchemaTransformation from "effect/SchemaTransformation";

import { NimblebitConfig, NimblebitSchema } from "@tinyburg/nimblebit-sdk";

import * as Cities from "./Cities.ts";

// ---------------------------------------------------------------------------
// The block format
// ---------------------------------------------------------------------------

interface Block {
    readonly key: string;
    readonly value: string;
}

const opening = /\[([^[\]]+)\]/y;

/**
 * Splits a run of `[key]value[key]` blocks. A block ends at the first closing
 * tag after it opens, so its value may hold other blocks as long as none has
 * its key, which is how the game nests them. Text that is not exactly such a
 * run, such as anything between two blocks, is undefined.
 */
const splitBlocks = (text: string): ReadonlyArray<Block> | undefined => {
    const blocks: Array<Block> = [];
    let at = 0;
    while (at < text.length) {
        opening.lastIndex = at;
        const open = opening.exec(text);
        if (open === null) return undefined;
        const tag = open[0];
        const start = at + tag.length;
        const end = text.indexOf(tag, start);
        if (end < 0) return undefined;
        blocks.push({ key: open[1], value: text.slice(start, end) });
        at = end + tag.length;
    }
    return blocks;
};

const joinBlocks = (blocks: ReadonlyArray<Block>): string =>
    blocks.map(({ key, value }) => `[${key}]${value}[${key}]`).join("");

const invalid = (message: string, input: unknown): SchemaIssue.Issue =>
    new SchemaIssue.InvalidValue({ message }, input);

/**
 * How a list sits among an object's blocks: a `count` block holding its
 * length, and one block per item keyed `prefix0`, `prefix1` and so on, after
 * the count or, with `countAfter`, before it.
 */
interface ListLayout {
    readonly count: string;
    readonly prefix: string;
    readonly countAfter?: boolean | undefined;
}

/**
 * An object written as a run of blocks, one per field, keyed by the field's
 * name and in the order the fields are declared, which is the game's order. A
 * field in `lists` is written as a {@link ListLayout}, and its schema decodes
 * the array of its items' blocks. An optional field may be missing. Any other
 * missing, extra or reordered block fails to decode, so whatever decodes
 * encodes back to the same text.
 */
const blockObject = <const Fields extends Schema.Struct.Fields>(
    fields: Fields,
    lists: { readonly [K in keyof Fields]?: ListLayout } = {}
) => {
    const to = Schema.Struct(fields);
    type Encoded = (typeof to)["Encoded"];
    const order = Object.keys(fields);
    const optional = new Set(order.filter((field) => SchemaAST.isOptional(fields[field].ast)));
    const layouts: Readonly<Record<string, ListLayout | undefined>> = lists;

    const decode = (text: string): Effect.Effect<Encoded, SchemaIssue.Issue> => {
        const blocks = splitBlocks(text);
        if (blocks === undefined) return Effect.fail(invalid("Expected a run of [key]value[key] blocks", text));
        const out: Record<string, string | ReadonlyArray<string>> = {};
        let at = 0;
        const items = (prefix: string): Array<string> => {
            const values: Array<string> = [];
            while (blocks[at]?.key === `${prefix}${values.length}`) values.push(blocks[at++].value);
            return values;
        };
        for (const field of order) {
            const layout = layouts[field];
            if (layout === undefined) {
                if (blocks[at]?.key === field) out[field] = blocks[at++].value;
                else if (!optional.has(field)) return Effect.fail(invalid(`Expected [${field}] at block ${at}`, text));
                continue;
            }
            const start = at;
            const before = layout.countAfter === true ? items(layout.prefix) : [];
            if (blocks[at]?.key !== layout.count) {
                if (optional.has(field) && at === start) continue;
                return Effect.fail(invalid(`Expected [${layout.count}] at block ${at}`, text));
            }
            const count = blocks[at++].value;
            const values = layout.countAfter === true ? before : items(layout.prefix);
            if (count !== `${values.length}`) {
                return Effect.fail(
                    invalid(`[${layout.count}] is ${count}, but there are ${values.length} items`, text)
                );
            }
            out[field] = values;
        }
        if (at < blocks.length) return Effect.fail(invalid(`Unexpected [${blocks[at].key}] at block ${at}`, text));
        // Bridges an untyped runtime boundary: each field holds its block's
        // text, or a list's item texts, which is the struct's encoded side.
        //
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion
        return Effect.succeed(out as Encoded);
    };

    const encode = (object: Encoded): Effect.Effect<string, SchemaIssue.Issue> => {
        // Bridges an untyped runtime boundary, the other way.
        //
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion
        const record = object as Readonly<Record<string, string | ReadonlyArray<string> | undefined>>;
        const blocks: Array<Block> = [];
        for (const field of order) {
            const value = record[field];
            if (value === undefined) continue;
            if (typeof value === "string") {
                blocks.push({ key: field, value });
                continue;
            }
            const layout = layouts[field];
            if (layout === undefined) return Effect.fail(invalid(`[${field}] holds a list but has no layout`, object));
            const items = value.map((item, index) => ({ key: `${layout.prefix}${index}`, value: item }));
            const count = { key: layout.count, value: `${value.length}` };
            blocks.push(...(layout.countAfter === true ? [...items, count] : [count, ...items]));
        }
        return Effect.succeed(joinBlocks(blocks));
    };

    return Schema.String.pipe(Schema.decodeTo(to, SchemaTransformation.transformEffect({ decode, encode })));
};

/** A block holding nothing but a {@link ListLayout} list, read as the array of its items. */
const blockList = <Item extends Schema.Codec<unknown, string, unknown, unknown>>(item: Item, layout: ListLayout) =>
    blockObject({ items: Schema.Array(item) }, { items: layout }).pipe(
        Schema.decodeTo(
            Schema.Array(Schema.toType(item)),
            SchemaTransformation.transform({
                decode: ({ items }) => items,
                encode: (items) => ({ items }),
            })
        )
    );

// ---------------------------------------------------------------------------
// Values
// ---------------------------------------------------------------------------

/** An integer as C#'s `ToString()` writes it, which is the only way it reads back the same. */
const integer = Schema.String.check(Schema.isPattern(/^(?:0|-?[1-9]\d*)$/));

/** A C# `int`. */
const Int32 = integer.pipe(Schema.decodeTo(Schema.Int.check(Schema.isInt32()), SchemaTransformation.numberFromString));

/**
 * A C# `long`, as a `bigint`: the save holds `DateTime` ticks, which are past
 * what a `number` holds exactly.
 */
const Int64 = integer.pipe(Schema.decodeTo(Schema.BigInt, SchemaTransformation.bigintFromString));

/** A C# `double`, only as written the way JavaScript writes the same number. */
const Double = Schema.String.pipe(
    Schema.decodeTo(
        Schema.Finite,
        SchemaTransformation.transformEffect({
            decode: (text: string) => {
                const number = Number(text);
                return Number.isFinite(number) && `${number}` === text
                    ? Effect.succeed(number)
                    : Effect.fail(invalid("Expected a number written the way JavaScript writes it", text));
            },
            encode: (number: number) => Effect.succeed(`${number}`),
        })
    )
);

/** A flag written as `1` or `0`. */
const Bit = Schema.Literals(["0", "1"]).pipe(
    Schema.decodeTo(
        Schema.Boolean,
        SchemaTransformation.transform({
            decode: (bit) => bit === "1",
            encode: (flag): "0" | "1" => (flag ? "1" : "0"),
        })
    )
);

/** A C# `DateTime` written as whole seconds since 1970 (`NBUtils.ToUnixTimespan`). */
const UnixSeconds = integer.pipe(
    Schema.decodeTo(
        Schema.DateTimeUtc,
        SchemaTransformation.transformEffect({
            decode: (text: string) =>
                Effect.fromOption(DateTime.make(Number(text) * 1000)).pipe(
                    Effect.mapError(() => invalid("Expected seconds within the range of a DateTime", text))
                ),
            encode: (date: DateTime.Utc) => {
                const millis = DateTime.toEpochMillis(date);
                return millis % 1000 === 0
                    ? Effect.succeed(`${millis / 1000}`)
                    : Effect.fail(invalid("Expected a whole number of seconds", date));
            },
        })
    )
);

/** A C# enum written as its number, read as the name the game gives that number. */
const enumeration = <const Names extends ReadonlyArray<string>>(names: Names) =>
    Int32.pipe(
        Schema.decodeTo(
            Schema.Literals(names),
            SchemaTransformation.transformEffect({
                decode: (value: number) => {
                    const name = names[value];
                    return name === undefined
                        ? Effect.fail(invalid(`Expected one of 0 to ${names.length - 1}`, value))
                        : Effect.succeed(name);
                },
                encode: (name: Names[number]) => Effect.succeed(names.indexOf(name)),
            })
        )
    );

/** Integers separated by commas, empty for none. */
const IntList = Schema.String.pipe(NimblebitSchema.split(), Schema.decodeTo(Schema.Array(Int32)));

/** A player's id, empty while the game has none. */
const PlayerId = Schema.Union([Schema.Literal(""), NimblebitConfig.PlayerIdSchema]);

/**
 * The player's auth salt, a UUID read as a `Redacted` so that printing or
 * logging a save does not show it, or empty while the game has none, as with
 * the id (not seen: every save the probe read held a salt).
 */
const PlayerSalt = Schema.Union([Schema.Literal(""), NimblebitConfig.PlayerAuthKeySchema]);

// ---------------------------------------------------------------------------
// Items
// ---------------------------------------------------------------------------

/**
 * The kinds of job a car can be on (`TRJobType`), by the number the save
 * writes.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const JobType = enumeration(["Standard", "LocalEvent", "GlobalEvent", "VIP", "Parts", "Crate", "SpecialCrate"]);

/**
 * What a station yard item is (`TRYardType`), by the number the save writes.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const YardType = enumeration(["engine", "fuel", "none"]);

/**
 * A job (`TRJobInfo`): a car (`id`, a car id) waiting in a city or hauled by a
 * train from city `s` to city `e`, how many cars it fills (`c`), the seed of
 * its passengers (`p`) and its kind (`t`).
 *
 * @since 1.0.0
 * @category Schemas
 */
export const Job = blockObject({
    id: Int32,
    s: Int32,
    e: Int32,
    p: Int32,
    c: Int32,
    t: JobType,
});

/**
 * A city the player has (`TRCity`): its id, how many jobs can wait there
 * (`mlo`), and `j`, the jobs waiting (`[jcount]` then `[j0]`, `[j1]`...),
 * which the game only writes when there are any.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const City = blockObject(
    {
        id: Int32,
        mlo: Int32,
        j: Schema.optionalKey(Schema.Array(Job)),
    },
    { j: { count: "jcount", prefix: "j" } }
);

/**
 * A track (`TRTrack`): its id, its owner (`oid`) and whether it is
 * electrified (`e`).
 *
 * @since 1.0.0
 * @category Schemas
 */
export const Track = blockObject({
    id: Int32,
    oid: Int32,
    e: Bit,
});

/**
 * Parts toward an engine (`TRPartsInfo`): the engine's id and how many.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const Parts = blockObject({
    eID: Int32,
    c: Int32,
});

/**
 * Unopened crates of one level (`TRCrateInfo`): the level, `-1` for special
 * crates, and how many.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const Crate = blockObject({
    l: Int32,
    c: Int32,
});

/**
 * Engines or fuel cars waiting in the station yard (`TRYardInfo`): the
 * engine's id, how many and which (`t`).
 *
 * @since 1.0.0
 * @category Schemas
 */
export const YardItem = blockObject({
    eID: Int32,
    c: Int32,
    t: YardType,
});

/**
 * The city event (`TREvents`): its seed, the cars delivered toward it
 * (`edel`), its city and how many goals were completed.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const Event = blockObject({
    eseed: Int32,
    edel: Int32,
    ecity: Int32,
    ecom: Int32,
});

/**
 * One day's takings (`TRDailyStat`): the day, revenue, miles, cars and crates.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const DailyStat = blockObject({
    d: UnixSeconds,
    r: Int32,
    m: Int32,
    c: Int32,
    cr: Int32,
});

/**
 * The player's stats (`TRStats`): `ds`, the recent days (`[dscount]` then
 * `[ds0]`, `[ds1]`...), then the totals of miles, cars, crates, bux and events.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const Stats = blockObject(
    {
        ds: Schema.Array(DailyStat),
        tm: Int64,
        tc: Int32,
        tcr: Int32,
        tb: Int32,
        te: Int32,
    },
    { ds: { count: "dscount", prefix: "ds" } }
);

/**
 * A friend (`TRFriend`): their player id (`c`) and the name the player gave
 * them (`n`).
 *
 * @since 1.0.0
 * @category Schemas
 */
export const Friend = blockObject({
    c: NimblebitConfig.PlayerIdSchema,
    n: Schema.String,
});

const friendBlock = /\[c\][\s\S]*?\[c\]\[n\][\s\S]*?\[n\]/y;

/**
 * The friends list: each friend's blocks, joined with commas. A name may hold
 * a comma, so the list is split after each friend's closing `[n]` rather than
 * at every comma.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const Friends = Schema.String.pipe(
    Schema.decodeTo(
        Schema.Array(Schema.String),
        SchemaTransformation.transformEffect({
            decode: (text: string) => {
                const friends: Array<string> = [];
                let at = 0;
                while (at < text.length) {
                    if (friends.length > 0) {
                        if (text[at] !== ",") return Effect.fail(invalid(`Expected a comma at ${at}`, text));
                        at++;
                    }
                    friendBlock.lastIndex = at;
                    const match = friendBlock.exec(text);
                    if (match === null) return Effect.fail(invalid(`Expected [c]...[c][n]...[n] at ${at}`, text));
                    friends.push(match[0]);
                    at += match[0].length;
                }
                return Effect.succeed(friends);
            },
            encode: (friends: ReadonlyArray<string>) => Effect.succeed(friends.join(",")),
        })
    ),
    Schema.decodeTo(Schema.Array(Friend))
);

/**
 * The regions the player holds a license for, in the order the game lists
 * them.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const Licenses = blockList(Schema.Literals(Cities.regions), { count: "licenseCount", prefix: "lic" });

/**
 * Achievement progress (`NBAchievement`), percent complete by `awd` and the
 * achievement's number (`TRAchievementType`), in the game's order.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const Awards = Schema.String.pipe(
    Schema.decodeTo(
        Schema.Record(Schema.String, Schema.String),
        SchemaTransformation.transformEffect({
            decode: (text: string) => {
                const blocks = splitBlocks(text);
                if (blocks === undefined || !blocks.every(({ key }) => /^awd\d+$/.test(key))) {
                    return Effect.fail(invalid("Expected [awd<n>] blocks", text));
                }
                const awards: Record<string, string> = {};
                for (const { key, value } of blocks) {
                    if (Object.hasOwn(awards, key)) return Effect.fail(invalid(`[${key}] appears twice`, text));
                    awards[key] = value;
                }
                return Effect.succeed(awards);
            },
            encode: (awards: Readonly<Record<string, string>>) =>
                Effect.succeed(joinBlocks(Object.entries(awards).map(([key, value]) => ({ key, value })))),
        })
    ),
    Schema.decodeTo(Schema.Record(Schema.String.check(Schema.isPattern(/^awd\d+$/)), Int32))
);

/**
 * A leg of a trip (`TRTripLeg`): the track and the city it starts from, and
 * `o`, written only once the leg's cars are unloaded.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const TripLeg = blockObject({
    tID: Int32,
    sID: Int32,
    o: Schema.optionalKey(Bit),
});

/**
 * A train's trip (`TRTrip`): when it started, `com` and `off`, written only
 * once it is complete and once it is unloaded, and `l`, its legs (`[lCount]`
 * then `[l0]`, `[l1]`...).
 *
 * @since 1.0.0
 * @category Schemas
 */
export const Trip = blockObject(
    {
        sTime: UnixSeconds,
        com: Schema.optionalKey(Bit),
        off: Schema.optionalKey(Bit),
        l: Schema.Array(TripLeg),
    },
    { l: { count: "lCount", prefix: "l" } }
);

/**
 * A train (`TRTrainInfo`): its id, engine (`eId`) and engine layout (`eL`),
 * trips made (`nT`), last arrival (`l`), fuel (`f`), last repair (`lR`),
 * broken part (`b`), trips since braking (`bt`), color (`clr`), `pin`,
 * written only when pinned, `j`, the jobs it hauls (`[jcount]` then `[j0]`,
 * `[j1]`...), and its trip.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const Train = blockObject(
    {
        id: Int32,
        eId: Int32,
        eL: Schema.String,
        nT: Int32,
        l: UnixSeconds,
        f: Int32,
        lR: Int32,
        b: Int32,
        bt: Int32,
        clr: Int32,
        pin: Schema.optionalKey(Bit),
        j: Schema.Array(Job),
        trip: Schema.optionalKey(Trip),
    },
    { j: { count: "jcount", prefix: "j" } }
);

// ---------------------------------------------------------------------------
// The save
// ---------------------------------------------------------------------------

/**
 * A save as `TRPlayer.ToBlockStr()` writes it, with the game's keys:
 *
 * - `x`, `l`, `c`, `b`: xp, level, coins and bux; `curTrain`: the train in view.
 * - `v`: the game version that wrote it; `gift`: the player's gift id, once
 *   they have one.
 * - `pID`, `pS`, `pE`: the player's id, auth salt and email, the last two only
 *   in the copy the game keeps (and `pE` only once there is an email), and
 *   read as `Redacted` values; `pV`: written while the player is a VIP.
 * - `cities`, `tracks`, `parts`, `crates`, `yard`, `event`, `stats`,
 *   `licenses`, `awards`, `trains`: see each item's schema.
 * - `tut`, `bonus`, `tips`: the tutorial steps, bonuses and tips done;
 *   `tutorialTimestamp`: seconds since 1970 of the last tutorial step, or -1.
 * - `PFri`: friends; `PLFP`, `PLFB`: the lost and found's parts (engine ids)
 *   and bux.
 * - `nPCT`, `nFBT`: when the next progressive gift cycle and the next free bux
 *   are due, as C# `DateTime` ticks (`TRProgGifts` counts in ticks); `cPC`,
 *   `cPRI`: the gift cycle and reward index; `jBE`: when the job boost ends.
 * - `CoinsFree`, `BuxFree`, `CratesFree`, `CratesSpecialFree`: what the player
 *   was given for free; `timeInGame`: seconds played.
 *
 * Decoding fails on any block not listed here, on a missing, repeated or
 * reordered one, and on a value not written the game's way, so any text this
 * decodes encodes back to the same text, byte for byte, with no exceptions.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const SaveData = blockObject({
    x: Int64,
    l: Int32,
    curTrain: Int32,
    c: Int32,
    b: Int32,
    v: Schema.String,
    gift: Schema.optionalKey(Schema.String),
    pID: PlayerId,
    pS: Schema.optionalKey(PlayerSalt),
    pE: Schema.optionalKey(NimblebitConfig.PlayerEmailSchema),
    pV: Schema.optionalKey(Bit),
    cities: blockList(City, { count: "ccount", prefix: "c", countAfter: true }),
    tracks: blockList(Track, { count: "trackcount", prefix: "t", countAfter: true }),
    parts: blockList(Parts, { count: "pcount", prefix: "p" }),
    crates: blockList(Crate, { count: "ccount", prefix: "c" }),
    yard: blockList(YardItem, { count: "ycount", prefix: "y" }),
    event: Event,
    stats: Stats,
    tut: IntList,
    tutorialTimestamp: Double,
    bonus: IntList,
    tips: IntList,
    PFri: Friends,
    PLFP: IntList,
    PLFB: Int32,
    licenses: Licenses,
    awards: Awards,
    trains: blockList(Train, { count: "tcount", prefix: "t" }),
    nPCT: Int64,
    cPC: Int64,
    cPRI: Int64,
    nFBT: Int64,
    jBE: Int64,
    CoinsFree: Int64,
    BuxFree: Int64,
    CratesFree: Int64,
    CratesSpecialFree: Int64,
    timeInGame: Int64,
});

// ---------------------------------------------------------------------------
// The server's copy
// ---------------------------------------------------------------------------

const streamThrough = (bytes: Uint8Array, transform: CompressionStream | DecompressionStream): Promise<Uint8Array> =>
    new Response(new Blob([new Uint8Array(bytes)]).stream().pipeThrough(transform))
        .arrayBuffer()
        .then((buffer) => new Uint8Array(buffer));

/**
 * A save as the server holds it: the bytes of `data` in a `sync/pull`
 * response, once base64 decoded, are the save's UTF-8 text deflated with zlib
 * (`NBSync.encodeSave`, without the `pS` and `pE` blocks, which
 * `pushToServer` leaves out). Inflating and deflating use the platform's
 * `DecompressionStream` and `CompressionStream`, so this needs no dependency.
 * Decoding fails on bytes that are not zlib or do not inflate to UTF-8 text,
 * and keeps a leading byte order mark, which {@link SaveData} then rejects
 * rather than dropping it. Any bytes this decodes encode to bytes that inflate
 * to the same text, byte for byte, but are not the game's bytes, since its
 * zlib compresses differently.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const SaveDataFromBytes = Schema.Uint8Array.pipe(
    Schema.decodeTo(
        Schema.String,
        SchemaTransformation.transformEffect({
            decode: (bytes: Uint8Array) =>
                Effect.tryPromise({
                    try: () => streamThrough(bytes, new DecompressionStream("deflate")),
                    catch: () => invalid("Expected a zlib stream", bytes),
                }).pipe(
                    Effect.flatMap((inflated) =>
                        Effect.try({
                            try: () => new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(inflated),
                            catch: () => invalid("Expected UTF-8 text", inflated),
                        })
                    )
                ),
            encode: (text: string) =>
                Effect.tryPromise({
                    try: () => streamThrough(new TextEncoder().encode(text), new CompressionStream("deflate")),
                    catch: () => invalid("Could not deflate the save", text),
                }),
        })
    ),
    Schema.decodeTo(SaveData)
);
