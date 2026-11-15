/**
 * Tiny Tower Vegas's save: what the static `VPlayer.ToBlock()` writes, which
 * `VGame.SaveToDisk` keeps in the `vegas` PlayerPref and `VPlayer.FromBlock`
 * reads back when the tower loads (and again in `VGame.OnCloudData` for a
 * cloud save). It is Nimblebit's block format, the one Pocket Trains uses:
 * each value written by `Block.Val(key, value, num)` or `NBUtils.blockStr` as
 * `[key]value[key]`, where a numbered block appends its number to the key
 * (`[story1]...[story1]`), and objects are blocks nested in blocks. Values are
 * C#'s `ToString()` of the field: `True`/`False` for a `bool` (but `p_preg`
 * is written as `1`), the enum's name for a `VIPType`, its number for the
 * other enums. The blocks are read here rather than with
 * `NimblebitSchema.parseNimblebitObject`, which finds a key anywhere in the
 * text: the floors and posts are numbered blocks after a count, a floor
 * writes only its non-zero stock and sale slots and its occupied beds, each
 * by slot number, and many blocks are only written when they are set.
 *
 * The server's copy is the same text: `NBSync.pushToServer` passes the Java
 * plugin (`com.nimblebit.nbsync.NBSync.NBSyncPushSave`) the name of the
 * PlayerPref to read (`NBSync._prefName`) rather than the text, and unlike
 * Pocket Trains nothing is left out: the save pulled back still held the
 * player's salt and email. {@link SaveDataFromBytes} reads the bytes
 * `sync/pull` hands back.
 *
 * Determined against Tiny Tower Vegas 1.5.2 (Android, arm64) in two ways.
 * Offline, by disassembling `VPlayer.ToBlock`, `VFloor.ToBlock`,
 * `VBitizen.ToBlock`, `VBBPost.ToBlock`, `VMission.ToBlock`, `Block.Val`,
 * `NBUtils.blockStr` and `NBSync.pushToServer` in the APK's `libil2cpp.so`,
 * with the keys read from the metadata's string literals: that gives the
 * order of the blocks and the condition each optional block is written under.
 * Then on an emulator with a Frida probe (November 2026), from text the game
 * wrote: two fresh installs' saves, one grown by calling the game's own
 * methods (`VTowerPage.BuildNewFloor`, `TrySpawnVIP`, the `VPlayer` setters),
 * ones where the probe also set the fields that only some floors, posts and
 * bitizens have, so that every optional block was written, the save the game
 * pulled back from the server, and what `Block.Val` writes for a range of
 * floats. The fixtures under `test/fixtures` are those saves, with the
 * player's id, auth salt and email replaced. Every key the game writes is
 * modeled, in the game's order.
 *
 * Decoding never drops part of a save: a block this module does not know, such
 * as one a later version of the game adds, fails to decode, as does a missing
 * or reordered block, text between blocks, or a value written another way than
 * the game writes it, in the save and in every object nested in it (a floor,
 * a bitizen, a post, the mission). In exchange, the round trip is exact: every
 * text that decodes encodes back to the same text, byte for byte, with no
 * exceptions.
 *
 * The player's auth salt (`p_ps`) and email (`p_em`) decode to `Redacted`
 * values, with `NimblebitConfig.PlayerAuthKeySchema` (which also requires the
 * salt to be a UUID) and `NimblebitConfig.PlayerEmailSchema`, so printing or
 * logging a decoded save does not show them; `Redacted.value` reads them.
 *
 * C# `long` and `ulong` values are `bigint`s: the save holds `DateTime` ticks
 * (`f_od`, `bb_date` and the floor timers) and a `ulong` (`tp`), which are
 * past what a `number` holds exactly. A C# `float` keeps the seven digits the
 * game writes, and only reads text written the way C# writes it with `.` for
 * the decimal point: the game writes `f_sln` and `bb_ft` in the device's
 * culture, so a save from a device that uses `,` fails to decode.
 *
 * @since 1.0.0
 * @category Save
 */

import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import * as SchemaAST from "effect/SchemaAST";
import * as SchemaIssue from "effect/SchemaIssue";
import * as SchemaTransformation from "effect/SchemaTransformation";

import { NimblebitConfig, NimblebitSchema } from "@tinyburg/nimblebit-sdk";

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

/** A slot number, or a count, as C# writes a non-negative `int`. */
const indexPattern = /^(?:0|[1-9]\d*)$/;

/** An integer as C# writes it: no leading zeros, no `+`, no `-0`. */
const numberPattern = /^(?:0|-?[1-9]\d*)$/;

/** The number after `prefix` in `key`, if `key` is `prefix` and a number matching `pattern`. */
const numberAfter = (key: string | undefined, prefix: string, pattern: RegExp): string | undefined => {
    if (key === undefined || !key.startsWith(prefix)) return undefined;
    const rest = key.slice(prefix.length);
    return pattern.test(rest) ? rest : undefined;
};

/**
 * How a field that is not a single block sits among an object's blocks:
 *
 * - `Counted`: a `count` block holding the number of items, then one block per
 *   item keyed `prefix0`, `prefix1` and so on. The field is the array of the
 *   items' blocks.
 * - `Numbered`: a `count` block, then one block per item keyed `prefix` and
 *   any number. The field is an array of `{ [number]: n, [item]: block }`.
 * - `Slots`: zero or more blocks keyed `prefix` and a slot number, in
 *   ascending order, for the slots that are set. The field is a record of
 *   the blocks by slot number.
 * - `Group`: like `Slots`, but each slot is a block keyed `keys[0]` and the
 *   slot number followed by any of the other `keys` with the same number, in
 *   that order. The field is a record by slot number of records by key.
 */
type Layout =
    | { readonly _tag: "Counted"; readonly count: string; readonly prefix: string }
    | {
          readonly _tag: "Numbered";
          readonly count: string;
          readonly prefix: string;
          readonly number: string;
          readonly item: string;
      }
    | { readonly _tag: "Slots"; readonly prefix: string }
    | { readonly _tag: "Group"; readonly keys: readonly [string, ...Array<string>] };

type Encoded =
    | string
    | ReadonlyArray<string>
    | ReadonlyArray<Readonly<Record<string, string>>>
    | Readonly<Record<string, string>>
    | Readonly<Record<string, Readonly<Record<string, string>>>>;

const bySlot = <A>(record: Readonly<Record<string, A>>): Array<readonly [string, A]> =>
    Object.entries(record).sort(([a], [b]) => Number(a) - Number(b));

/**
 * An object written as a run of blocks, one per field, keyed by the field's
 * name and in the order the fields are declared, which is the game's order. A
 * field in `layouts` is written as its {@link Layout}. An optional field may
 * be missing. Any other missing, extra or reordered block fails to decode, so
 * whatever decodes encodes back to the same text.
 */
const blockObject = <const Fields extends Schema.Struct.Fields>(
    fields: Fields,
    layouts: { readonly [K in keyof Fields]?: Layout } = {}
) => {
    const to = Schema.Struct(fields);
    type To = (typeof to)["Encoded"];
    const order = Object.keys(fields);
    const optional = new Set(order.filter((field) => SchemaAST.isOptional(fields[field].ast)));
    const layoutOf: Readonly<Record<string, Layout | undefined>> = layouts;

    const decode = (text: string): Effect.Effect<To, SchemaIssue.Issue> => {
        const blocks = splitBlocks(text);
        if (blocks === undefined) return Effect.fail(invalid("Expected a run of [key]value[key] blocks", text));
        const out: Record<string, Encoded> = {};
        let at = 0;

        const counted = (count: string, read: (index: number) => boolean): string | undefined => {
            if (blocks[at]?.key !== count) return `Expected [${count}] at block ${at}`;
            const length = blocks[at++].value;
            if (!indexPattern.test(length)) return `Expected [${count}] to hold a count`;
            for (let index = 0; index < Number(length); index++) {
                if (!read(index)) return `Expected ${length} items after [${count}], found ${index}`;
            }
            return undefined;
        };

        for (const field of order) {
            const layout = layoutOf[field];
            if (layout === undefined) {
                if (blocks[at]?.key === field) out[field] = blocks[at++].value;
                else if (!optional.has(field)) return Effect.fail(invalid(`Expected [${field}] at block ${at}`, text));
                continue;
            }
            switch (layout._tag) {
                case "Counted": {
                    const items: Array<string> = [];
                    const error = counted(layout.count, (index) => {
                        if (blocks[at]?.key !== `${layout.prefix}${index}`) return false;
                        items.push(blocks[at++].value);
                        return true;
                    });
                    if (error !== undefined) return Effect.fail(invalid(error, text));
                    out[field] = items;
                    break;
                }
                case "Numbered": {
                    const items: Array<Record<string, string>> = [];
                    const error = counted(layout.count, () => {
                        const number = numberAfter(blocks[at]?.key, layout.prefix, numberPattern);
                        if (number === undefined) return false;
                        items.push({ [layout.number]: number, [layout.item]: blocks[at++].value });
                        return true;
                    });
                    if (error !== undefined) return Effect.fail(invalid(error, text));
                    out[field] = items;
                    break;
                }
                case "Slots": {
                    const slots: Record<string, string> = {};
                    let last = -1;
                    for (
                        let slot = numberAfter(blocks[at]?.key, layout.prefix, indexPattern);
                        slot !== undefined;
                        slot = numberAfter(blocks[at]?.key, layout.prefix, indexPattern)
                    ) {
                        if (Number(slot) <= last)
                            return Effect.fail(invalid(`[${blocks[at].key}] is out of order`, text));
                        last = Number(slot);
                        slots[slot] = blocks[at++].value;
                    }
                    out[field] = slots;
                    break;
                }
                case "Group": {
                    const [lead, ...rest] = layout.keys;
                    const slots: Record<string, Record<string, string>> = {};
                    let last = -1;
                    for (
                        let slot = numberAfter(blocks[at]?.key, lead, indexPattern);
                        slot !== undefined;
                        slot = numberAfter(blocks[at]?.key, lead, indexPattern)
                    ) {
                        if (Number(slot) <= last)
                            return Effect.fail(invalid(`[${blocks[at].key}] is out of order`, text));
                        last = Number(slot);
                        const entry: Record<string, string> = { [lead]: blocks[at++].value };
                        for (const key of rest)
                            if (blocks[at]?.key === `${key}${slot}`) entry[key] = blocks[at++].value;
                        slots[slot] = entry;
                    }
                    out[field] = slots;
                    break;
                }
            }
        }
        if (at < blocks.length) return Effect.fail(invalid(`Unexpected [${blocks[at].key}] at block ${at}`, text));
        // Bridges an untyped runtime boundary: each field holds its block's
        // text, or its layout's texts, which is the struct's encoded side.
        //
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion
        return Effect.succeed(out as To);
    };

    const encode = (object: To): Effect.Effect<string, SchemaIssue.Issue> => {
        // Bridges an untyped runtime boundary, the other way.
        //
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion
        const record = object as Readonly<Record<string, Encoded | undefined>>;
        const blocks: Array<Block> = [];
        for (const field of order) {
            const value = record[field];
            if (value === undefined) continue;
            const layout = layoutOf[field];
            if (layout === undefined) {
                if (typeof value !== "string") return Effect.fail(invalid(`[${field}] is not a single block`, object));
                blocks.push({ key: field, value });
                continue;
            }
            // Bridges an untyped runtime boundary: the struct's encoded side
            // holds what the layout's decode produced.
            //
            // oxlint-disable-next-line typescript/no-unsafe-type-assertion
            const items = value as ReadonlyArray<string> & ReadonlyArray<Readonly<Record<string, string>>>;
            // oxlint-disable-next-line typescript/no-unsafe-type-assertion
            const slots = value as Readonly<Record<string, string>> &
                Readonly<Record<string, Readonly<Record<string, string>>>>;
            switch (layout._tag) {
                case "Counted":
                    blocks.push({ key: layout.count, value: `${items.length}` });
                    items.forEach((item: string, index) =>
                        blocks.push({ key: `${layout.prefix}${index}`, value: item })
                    );
                    break;
                case "Numbered":
                    blocks.push({ key: layout.count, value: `${items.length}` });
                    for (const item of items as ReadonlyArray<Readonly<Record<string, string>>>) {
                        blocks.push({ key: `${layout.prefix}${item[layout.number]}`, value: item[layout.item] });
                    }
                    break;
                case "Slots":
                    for (const [slot, item] of bySlot<string>(slots)) {
                        blocks.push({ key: `${layout.prefix}${slot}`, value: item });
                    }
                    break;
                case "Group":
                    for (const [slot, entry] of bySlot<Readonly<Record<string, string>>>(slots)) {
                        for (const key of layout.keys) {
                            const item = entry[key];
                            if (item !== undefined) blocks.push({ key: `${key}${slot}`, value: item });
                        }
                    }
                    break;
            }
        }
        return Effect.succeed(joinBlocks(blocks));
    };

    return Schema.String.pipe(Schema.decodeTo(to, SchemaTransformation.transformEffect({ decode, encode })));
};

// ---------------------------------------------------------------------------
// Values
// ---------------------------------------------------------------------------

/** An integer as C#'s `ToString()` writes it, which is the only way it reads back the same. */
const integer = Schema.String.check(Schema.isPattern(numberPattern));

/** A C# `int`. */
const Int32 = integer.pipe(Schema.decodeTo(Schema.Int.check(Schema.isInt32()), SchemaTransformation.numberFromString));

/** A C# `uint`. */
const UInt32 = integer.pipe(
    Schema.decodeTo(Schema.Int.check(Schema.isUint32()), SchemaTransformation.numberFromString)
);

/** A C# `long`, as a `bigint`. */
const Int64 = integer.pipe(
    Schema.decodeTo(
        Schema.BigInt.check(Schema.isBetweenBigInt({ minimum: -(2n ** 63n), maximum: 2n ** 63n - 1n })),
        SchemaTransformation.bigintFromString
    )
);

/** A C# `ulong`, as a `bigint`. */
const UInt64 = integer.pipe(
    Schema.decodeTo(
        Schema.BigInt.check(Schema.isBetweenBigInt({ minimum: 0n, maximum: 2n ** 64n - 1n })),
        SchemaTransformation.bigintFromString
    )
);

/**
 * Writes a C# `float` the way its `ToString()` does (the `G` format, which for
 * a `float` keeps seven significant digits): without trailing zeros, and in
 * scientific notation with a two digit exponent below 1e-4 and from 1e7 up
 * (`1E-05`, `1.234568E+07`).
 */
const formatSingle = (value: number): string => {
    if (value === 0) return "0";
    const [mantissa, power] = value.toExponential(6).split("e");
    const exponent = Number(power);
    const negative = mantissa.startsWith("-");
    const digits = mantissa.replace("-", "").replace(".", "").replace(/0+$/, "");
    const sign = negative ? "-" : "";
    if (exponent >= 7 || exponent < -4) {
        const fraction = digits.length > 1 ? `.${digits.slice(1)}` : "";
        const magnitude = `${Math.abs(exponent)}`.padStart(2, "0");
        return `${sign}${digits[0]}${fraction}E${exponent < 0 ? "-" : "+"}${magnitude}`;
    }
    if (exponent < 0) return `${sign}0.${"0".repeat(-exponent - 1)}${digits}`;
    const whole = digits.slice(0, exponent + 1).padEnd(exponent + 1, "0");
    const fraction = digits.slice(exponent + 1);
    return fraction.length > 0 ? `${sign}${whole}.${fraction}` : `${sign}${whole}`;
};

/**
 * A C# `float`, only as its `ToString()` writes it under a culture that uses
 * `.` for the decimal point (the game writes `f_sln` and `bb_ft` in the
 * device's culture, `p_lspd` in the invariant one).
 */
const Single = Schema.String.pipe(
    Schema.decodeTo(
        Schema.Finite,
        SchemaTransformation.transformEffect({
            decode: (text: string) => {
                const number = Number(text);
                return Number.isFinite(number) && formatSingle(number) === text
                    ? Effect.succeed(number)
                    : Effect.fail(invalid("Expected a float written the way C# writes one", text));
            },
            encode: (number: number) => Effect.succeed(formatSingle(number)),
        })
    )
);

/** A C# `bool`, written `True` or `False`. */
const Bool = Schema.Literals(["True", "False"]).pipe(
    Schema.decodeTo(
        Schema.Boolean,
        SchemaTransformation.transform({
            decode: (text) => text === "True",
            encode: (flag): "True" | "False" => (flag ? "True" : "False"),
        })
    )
);

/** A flag the game writes as an empty block when it is set, and not at all otherwise. */
const Flag = Schema.Literal("").pipe(
    Schema.decodeTo(
        Schema.Literal(true),
        SchemaTransformation.transform({
            decode: () => true as const,
            encode: () => "" as const,
        })
    )
);

/** A flag the game writes as `1` when it is set, and not at all otherwise. */
const One = Schema.Literal("1").pipe(
    Schema.decodeTo(
        Schema.Literal(true),
        SchemaTransformation.transform({
            decode: () => true as const,
            encode: () => "1" as const,
        })
    )
);

/** Strings separated by commas. */
const StringList = Schema.String.pipe(NimblebitSchema.split());

/** Integers separated by commas. */
const IntList = Schema.String.pipe(NimblebitSchema.split(), Schema.decodeTo(Schema.Array(Int32)));

/** A slot number of a floor's stock, sale or bed. */
const Slot = Schema.String.check(Schema.isPattern(indexPattern));

// ---------------------------------------------------------------------------
// Items
// ---------------------------------------------------------------------------

/**
 * The jobs a VIP can have (`VIPType`), written by name.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const VIPType = Schema.Literals(["None", "Applicant", "Engineer", "TravelAgent", "Deliveryman", "Bellhop"]);

/**
 * A bitizen (`VBitizen.ToBlock`): the seed its looks and name come from
 * (`b_seed`), `b_df`, its dream floor's id, written once it has one, `b_cn`,
 * its costume, written when it wears one (`construction` for the builders on
 * an unfinished floor, a character's costume for a character), and `!`, an
 * empty block written while its `dreamed` flag is set.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const Bitizen = blockObject({
    b_seed: Int32,
    b_df: Schema.optionalKey(Int32),
    b_cn: Schema.optionalKey(Schema.String),
    "!": Schema.optionalKey(Flag),
});

/**
 * The mission in progress (`VMission.ToBlock`): its id (`m_id`), the floor it
 * is about (`m_fid`), `m_pr`, the props to find, written when it has any, how
 * many (`m_cnt`), the floor type it is about as the `FloorType` number
 * (`m_ft`), and `m_com`, an empty block written once it is complete.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const Mission = blockObject({
    m_id: UInt32,
    m_fid: Int32,
    m_pr: Schema.optionalKey(Schema.String),
    m_cnt: Int32,
    m_ft: Int32,
    m_com: Schema.optionalKey(Flag),
});

/**
 * A Bitbook post (`VBBPost.ToBlock`): the post's id in the game's post table
 * (`bb_tid`), who posted it, the first of these that is set (`bb_bzn`, a
 * bitizen; else `bb_chr`, a character's id; else `bb_selem` and `bb_sname`, a
 * sprite and a name), when, as C# `DateTime` ticks (`bb_date`), the text
 * (`bb_txt`), the media's `PostMediaType` number (`bb_mt`) and path (`bb_mp`),
 * `bb_ft`, a time written when it is above zero, and the likes (`bb_lks`).
 *
 * @since 1.0.0
 * @category Schemas
 */
export const Post = blockObject({
    bb_tid: Int32,
    bb_bzn: Schema.optionalKey(Bitizen),
    bb_chr: Schema.optionalKey(Schema.String),
    bb_selem: Schema.optionalKey(Schema.String),
    bb_sname: Schema.optionalKey(Schema.String),
    bb_date: Int64,
    bb_txt: Schema.String,
    bb_mt: Int32,
    bb_mp: Schema.String,
    bb_ft: Schema.optionalKey(Single),
    bb_lks: Int32,
});

/**
 * A floor's occupied bed or slot (`VFloor._residents`), by slot number: the
 * bitizen (`f_bzn`), and on a lobby its VIP job (`f_vpt`), or on a hotel its
 * checkout time (`f_cot`, `VFloor._checkoutTimes`, a C# `long`, by its name
 * `DateTime` ticks) and stay length (`f_sln`, `VFloor._stayLengths`, a
 * `float`).
 *
 * @since 1.0.0
 * @category Schemas
 */
export const Resident = Schema.Struct({
    f_bzn: Bitizen,
    f_vpt: Schema.optionalKey(VIPType),
    f_cot: Schema.optionalKey(Int64),
    f_sln: Schema.optionalKey(Single),
});

/**
 * A floor (`VFloor.ToBlock`): its id in the game's floor table (`f_id`, 0 for
 * one still being built), when it opens or opened (`f_od`, C# `DateTime`
 * ticks, 0 for none), its stocking base time (`f_sbt`), and, written only
 * when they apply:
 *
 * - `f_si`, `f_st`: the tier being stocked (`_stockingTier`) and when
 *   stocking started (`_stockingStartTime`), while the tier is 0 or more.
 * - `f_fpd`: on a casino, `_lastFreePlayDay`.
 * - `f_chps`, `f_bwon`: the chips spent and bux won on it, once above zero.
 * - `f_stk`: the stock in each slot (`_stocks`), for the slots above zero.
 * - `f_lst`: each slot's last sale (`_lastSaleTicks`), for the slots above
 *   zero.
 * - `f_bzn`: the bitizens on it by slot, see {@link Resident}.
 *
 * `f_st`, `f_fpd`, `f_lst` and `f_cot` are C# `long`s; the values in the
 * fixtures were set by the probe, so their units are only known from the
 * fields' names.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const Floor = blockObject(
    {
        f_id: Int32,
        f_od: Int64,
        f_sbt: Int32,
        f_si: Schema.optionalKey(Int32),
        f_st: Schema.optionalKey(Int64),
        f_fpd: Schema.optionalKey(Int64),
        f_chps: Schema.optionalKey(Int32),
        f_bwon: Schema.optionalKey(Int32),
        f_stk: Schema.Record(Slot, Int32),
        f_lst: Schema.Record(Slot, Int64),
        f_bzn: Schema.Record(Slot, Resident),
    },
    {
        f_stk: { _tag: "Slots", prefix: "f_stk" },
        f_lst: { _tag: "Slots", prefix: "f_lst" },
        f_bzn: { _tag: "Group", keys: ["f_bzn", "f_vpt", "f_cot", "f_sln"] },
    }
);

/**
 * A floor of the tower and the story it is on (`[story<n>]`).
 *
 * @since 1.0.0
 * @category Schemas
 */
export const Story = Schema.Struct({
    story: Int32,
    floor: Floor,
});

// ---------------------------------------------------------------------------
// The save
// ---------------------------------------------------------------------------

/**
 * A save as `VPlayer.ToBlock()` writes it, with the game's keys:
 *
 * - `ver`: the game version that wrote it; `it`: when the game was installed,
 *   in seconds since 0001-01-01; `lst`: `VPlayer.lastSaleTime` (0 in every
 *   save seen).
 * - `p_coin`, `p_bux`, `p_chip`, `p_winn`: coins, bux, chips and winnings;
 *   `p_cb`, `p_bxb`: the chips and bux bought; `tp`: `VPlayer.tp`, a `ulong`
 *   that `VGame.OnCloudData` reads from a cloud save (what it counts was not
 *   determined).
 * - `p_vip`, `p_sfxon`, `p_muson`, `p_noteson`, `p_bbon`, `p_videoson`,
 *   `p_videoscheck`: VIP status and the options.
 * - `p_roof`, `p_lift`, `p_lobby`: the roof, elevator and lobby in use, and
 *   `p_rfs`, `p_lfs`, `p_lbys`, the ones owned (written when there are any);
 *   `p_lspd`: the elevator's speed.
 * - `p_fwk`, `p_fwkrow`: `lastFireworkDay` and `consecFireworkDays`, the
 *   last fireworks show and how many days in a row.
 * - `floors`: the floors, written as `[p_stories]` (how many) and one
 *   `[story<n>]` per floor, see {@link Story}.
 * - `p_frnd`, `p_ch`: friends' player ids and the characters met, written when
 *   there are any; `p_avseed`, `p_avcost`: the avatar's seed (written when 0
 *   or more) and costume (written when set).
 * - `p_tmi`: the tutorial mission's index; `p_miss`: the mission in progress;
 *   `p_ntm`, `p_tipmiss`: the next tip mission and tip mission index, when
 *   set.
 * - `p_bbhsh`: `p_bux + p_coin + p_chip` in base 26 with `A` for 0
 *   (`NBUtils.toBase26`), a check against editing them, so a save whose
 *   currencies change needs a new one; `tmp`: `temp` once the game believes
 *   the save was tampered with; `posts`: the Bitbook posts, written as
 *   `[p_bbcnt]` (how many) and `[post0]`, `[post1]`..., see {@link Post}.
 * - `p_pid`, `p_ps`: the player's id and auth salt, once registered with
 *   Nimblebit's servers; `p_em`: the player's email, once given; `p_preg`:
 *   written as `1` while `playerRegistered` is set. The salt and email decode
 *   to `Redacted` values; a salt that is not a UUID fails to decode.
 *
 * Every text that decodes encodes back to the same text, byte for byte, with
 * no exceptions: a block this schema does not know fails to decode, here and
 * in the objects nested in the save, instead of being dropped. A save built
 * rather than decoded is written the way the game writes it, a float with the
 * seven significant digits C# keeps (so it decodes to the nearest such
 * number) and slots in ascending order.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const SaveData = blockObject(
    {
        ver: Schema.String,
        it: Int64,
        lst: Int64,
        p_coin: Int64,
        p_bux: Int64,
        p_chip: Int64,
        p_winn: Int64,
        p_vip: Bool,
        p_sfxon: Bool,
        p_muson: Bool,
        p_noteson: Bool,
        p_bbon: Bool,
        p_videoson: Bool,
        p_videoscheck: Bool,
        p_roof: Int32,
        p_lift: Int32,
        p_lobby: Int32,
        p_lspd: Single,
        p_fwk: Int64,
        p_fwkrow: Int32,
        floors: Schema.Array(Story),
        p_frnd: Schema.optionalKey(StringList),
        p_ch: Schema.optionalKey(StringList),
        p_avseed: Schema.optionalKey(Int32),
        p_avcost: Schema.optionalKey(Schema.String),
        p_rfs: Schema.optionalKey(IntList),
        p_lfs: Schema.optionalKey(IntList),
        p_lbys: Schema.optionalKey(IntList),
        p_tmi: Int32,
        p_miss: Schema.optionalKey(Mission),
        p_ntm: Schema.optionalKey(Int32),
        p_tipmiss: Schema.optionalKey(Int32),
        p_cb: Int64,
        p_bxb: Int64,
        p_bbhsh: Schema.String,
        tmp: Schema.optionalKey(Schema.Literal("temp")),
        posts: Schema.Array(Post),
        p_pid: Schema.optionalKey(NimblebitConfig.PlayerIdSchema),
        p_ps: Schema.optionalKey(NimblebitConfig.PlayerAuthKeySchema),
        p_em: Schema.optionalKey(NimblebitConfig.PlayerEmailSchema),
        p_preg: Schema.optionalKey(One),
        tp: UInt64,
    },
    {
        floors: { _tag: "Numbered", count: "p_stories", prefix: "story", number: "story", item: "floor" },
        posts: { _tag: "Counted", count: "p_bbcnt", prefix: "post" },
    }
);

// ---------------------------------------------------------------------------
// The server's copy
// ---------------------------------------------------------------------------

const streamThrough = (bytes: Uint8Array, transform: CompressionStream | DecompressionStream): Promise<Uint8Array> =>
    new Response(new Blob([new Uint8Array(bytes)]).stream().pipeThrough(transform))
        .arrayBuffer()
        .then((buffer) => new Uint8Array(buffer));

/**
 * A save as the server holds it: the bytes of `data` in a `sync/pull`
 * response, once base64 decoded, are the save's UTF-8 text deflated with zlib.
 * `NBSync.getCurrentSave` requests `sync/pull` and hands `data` to
 * `NBSync.decodeSave` (the Java plugin's `decompress`), whose text
 * `VGame.OnCloudData` loads; `NBSync.encodeSave` (`compress`) does the
 * reverse. On the emulator the pulled `data` was a zlib stream (`78 9c`)
 * that decoded to the very save the game had pushed, salt and email
 * included. Inflating and deflating use the platform's `DecompressionStream`
 * and `CompressionStream`, so this needs no dependency. The round trip keeps
 * the text, not the bytes: what it encodes from a decoded save inflates to
 * exactly the text the input inflated to, but need not be the game's bytes,
 * since its zlib may compress differently. The text is read as it is, so a
 * byte order mark before it fails to decode rather than being dropped.
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
