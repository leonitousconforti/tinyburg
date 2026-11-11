/**
 * Bit City's save: the game's `GameState` object as JSON, written by
 * Newtonsoft.Json.
 *
 * `Player.Save()` builds a `GameState`, serializes it with
 * `JsonConvert.SerializeObject` and stores the string under the PlayerPrefs key
 * `bitcity3` (`Player.SaveKey`). `Player.LoadFromDisk()` reads that key back and
 * deserializes it into a `GameState`. The game only stores a save whose
 * `pTaps` is at least 1, so a fresh install still in its tutorial has none.
 *
 * The cloud copy (`/sync/pull/bc/...`, see `BitCity.sync_pullSave`) is the
 * same JSON without the `playerS` and `playerE` keys, zlib-compressed: the
 * game's `NBSync.decodeSave` turns the pulled base64 `data` into the save
 * string by base64-decoding and inflating it. {@link SaveDataFromBytes} reads
 * those bytes.
 *
 * Determined against Bit City 1.6.0 on an Android emulator with Frida: by
 * hooking `JsonConvert.SerializeObject`, `PlayerPrefs.SetString` and
 * `NBSync.decodeSave` while the game saved and pulled its save from the
 * server, by reading the calls `Player.Save()` and `Player.LoadFromDisk()`
 * make, and by growing a city with the game's own methods (buying and building
 * lots, upgrades, vehicles and missions) to see every key filled in. The test
 * fixtures are those saves, with the player's id and secret replaced.
 *
 * The JSON is decoded losslessly: numbers keep their exact text until a field's
 * schema reads them, so C# `long` values above 2^53 (`cLastEarnTime`, in
 * `DateTime` ticks) survive. Keys this module does not model, which a newer
 * game version could add to the save, its lots or its progressive rewards, are
 * kept as they were read, as {@link JsonValue}s (numbers as their source text;
 * typed `unknown` on the decoded side), and written back; encoding checks their
 * values against {@link JsonValue} again. The player's auth salt (`playerS`)
 * and email (`playerE`) decode to `Redacted` values, so printing or logging a
 * decoded save does not show them. This needs `JSON.parse` source text access
 * and `JSON.rawJSON` (Node.js 21 and later).
 *
 * Encoding writes JSON the way the game does: no whitespace, Newtonsoft's
 * string escapes (`\"`, `\\`, `\b`, `\t`, `\n`, `\f`, `\r`, `\u00XX` for other
 * control characters, and `\u0085`, `\u2028`, `\u2029`; everything else as
 * is), and doubles as the game's Mono runtime formats them (`50000.0`,
 * `1E+15`, 17 digits when 15 do not round-trip). Encoding a decoded save the
 * game wrote gives back the same string, byte for byte, with these exceptions:
 *
 * - Keys that look like array indexes ("0", "1", ...) come first in their
 *   object, in ascending order, as JavaScript objects order such keys.
 * - In the save, in each lot and in `progressiveRewards`, the keys this module
 *   models come back in the order it lists them (the game's order), followed
 *   by the keys it does not model, in the order they were read. Dictionaries
 *   (`cLots`, `uCounts`, ...) keep their keys in the order they were read.
 *
 * A string the game would not write (whitespace between tokens, other escapes
 * such as `\/` or `\u0041`, a double in a modeled field written with other
 * digits) decodes, and is written back the game's way.
 *
 * @since 1.0.0
 */

import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import * as SchemaIssue from "effect/SchemaIssue";
import * as SchemaTransformation from "effect/SchemaTransformation";

import * as NimblebitConfig from "@tinyburg/nimblebit-sdk/NimblebitConfig";
import * as NimblebitSchema from "@tinyburg/nimblebit-sdk/NimblebitSchema";

import * as Buildings from "./Buildings.ts";

/**
 * A JSON number exactly as the save wrote it, made by `JSON.rawJSON`:
 * `rawJSON` is its source text, which encoding writes back unchanged.
 *
 * @since 1.0.0
 * @category Models
 */
export interface RawJson {
    readonly rawJSON: string;
}

/**
 * A JSON value as this module reads one: what `JSON.parse` gives, except that
 * every number is a {@link RawJson} holding its source text, so no digit or
 * decimal point is lost.
 *
 * @since 1.0.0
 * @category Models
 */
export type JsonValue =
    | null
    | boolean
    | string
    | RawJson
    | ReadonlyArray<JsonValue>
    | { readonly [key: string]: JsonValue };

/** The parts of `JSON` this module uses, including the newer source text APIs. */
interface SourceTextJson {
    parse(
        text: string,
        reviver: (key: string, value: unknown, context?: { readonly source?: string | undefined }) => unknown
    ): unknown;
    rawJSON(text: string): RawJson;
    isRawJSON(value: unknown): value is RawJson;
}

// The lib typings this repo compiles against predate JSON.parse source text
// access and JSON.rawJSON, which every runtime the SDK supports has.
//
// oxlint-disable-next-line typescript/no-unsafe-type-assertion
const Json = globalThis.JSON as unknown as SourceTextJson;

/** A number in the save's JSON, kept as its source text. */
const JsonNumber = Schema.declare((input: unknown): input is RawJson => Json.isRawJSON(input), {
    expected: "a JSON number",
});

/**
 * Any {@link JsonValue}, for the keys of the save that this module does not
 * model. Decoding and encoding leave it as it is.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const JsonValue: Schema.Codec<JsonValue> = Schema.Union([
    Schema.Null,
    Schema.Boolean,
    Schema.String,
    JsonNumber,
    Schema.Array(Schema.suspend((): Schema.Codec<JsonValue> => JsonValue)),
    Schema.Record(
        Schema.String,
        Schema.suspend((): Schema.Codec<JsonValue> => JsonValue)
    ),
]);

/**
 * The value of a key a struct does not model: a {@link JsonValue} in the save
 * and when encoding, typed `unknown` once decoded, because TypeScript applies
 * an index signature's type to the modeled keys as well, whose decoded values
 * (numbers, dates, `Redacted`) are not JSON values.
 */
const UnmodeledValue = JsonValue.pipe(
    Schema.decodeTo(Schema.Unknown, SchemaTransformation.passthroughSubtype<unknown, JsonValue>())
);

/**
 * A struct that keeps the keys it does not model, so a save from a newer game
 * version decodes and writes back whole. The rest record only covers the keys
 * outside `fields`: a record over every key would also check the modeled
 * ones, which are not JSON values once decoded.
 */
const withRest = <const Fields extends Schema.Struct.Fields>(fields: Fields) => {
    const modeled = new Set(Object.keys(fields));
    const UnmodeledKey = Schema.String.check(
        Schema.makeFilter((key: string) => !modeled.has(key), { expected: "a key the schema does not model" })
    );
    return Schema.StructWithRest(Schema.Struct(fields), [Schema.Record(UnmodeledKey, UnmodeledValue)]);
};

const integerText = /^-?(?:0|[1-9]\d*)$/;

/**
 * Formats a double like the game: Mono's `double.ToString("R")` (15
 * significant digits when they round-trip, 17 otherwise, switching to
 * `E+XX` notation like .NET's "G" format) followed by Newtonsoft's rule that a
 * double always has a decimal point or an exponent.
 */
const formatDouble = (value: number): string => {
    if (value === 0) return Object.is(value, -0) ? "-0.0" : "0.0";
    const precision = Number(value.toPrecision(15)) === value ? 15 : 17;
    const [mantissa = "", exponentText = "0"] = Math.abs(value)
        .toExponential(precision - 1)
        .split("e");
    const digits = mantissa.replace(".", "").replace(/0+$/, "");
    const exponent = Number(exponentText);
    const scale = exponent + 1;

    let text: string;
    if (scale > precision || scale < -3) {
        const magnitude = Math.abs(exponent);
        text =
            digits.slice(0, 1) +
            (digits.length > 1 ? `.${digits.slice(1)}` : "") +
            (exponent < 0 ? "E-" : "E+") +
            (magnitude < 10 ? `0${magnitude}` : `${magnitude}`);
    } else if (scale <= 0) {
        text = `0.${"0".repeat(-scale)}${digits}`;
    } else if (scale >= digits.length) {
        text = digits + "0".repeat(scale - digits.length);
    } else {
        text = `${digits.slice(0, scale)}.${digits.slice(scale)}`;
    }

    text = (value < 0 ? "-" : "") + text;
    return /[.E]/.test(text) ? text : `${text}.0`;
};

/** A C# `double`. */
const Double = JsonNumber.pipe(
    Schema.decodeTo(
        Schema.Finite,
        SchemaTransformation.transformEffect({
            decode: (raw, options) => {
                const value = Number(raw.rawJSON);
                return Number.isFinite(value)
                    ? Effect.succeed(value)
                    : Effect.fail(new SchemaIssue.InvalidValue({ expected: "a finite double" }, raw.rawJSON, options));
            },
            encode: (value) => Effect.succeed(Json.rawJSON(formatDouble(value))),
        })
    )
);

/**
 * A C# `int`, or a `long` that holds a count. Fails to decode a value past
 * 2^53 rather than losing digits.
 */
const Int = JsonNumber.pipe(
    Schema.decodeTo(
        Schema.Int,
        SchemaTransformation.transformEffect({
            decode: (raw, options) => {
                const value = Number(raw.rawJSON);
                return integerText.test(raw.rawJSON) && Number.isSafeInteger(value)
                    ? Effect.succeed(value)
                    : Effect.fail(new SchemaIssue.InvalidValue({ expected: "a safe integer" }, raw.rawJSON, options));
            },
            encode: (value) => Effect.succeed(Json.rawJSON(`${value}`)),
        })
    )
);

/** A C# `long` that can pass 2^53, such as a tick count. */
const Long = JsonNumber.pipe(
    Schema.decodeTo(
        Schema.BigInt,
        SchemaTransformation.transformEffect({
            decode: (raw, options) =>
                integerText.test(raw.rawJSON)
                    ? Effect.succeed(BigInt(raw.rawJSON))
                    : Effect.fail(new SchemaIssue.InvalidValue({ expected: "an integer" }, raw.rawJSON, options)),
            encode: (value) => Effect.succeed(Json.rawJSON(`${value}`)),
        })
    )
);

/** A `DateTime` written as its tick count. */
const Ticks = Long.pipe(Schema.decodeTo(NimblebitSchema.CSharpDate));

const ticksPerSecond = 10_000_000n;
const ticksPerDay = 86_400n * ticksPerSecond;
const unixEpochTicks = 621_355_968_000_000_000n;

/** Days since 1970-01-01 of a proleptic Gregorian date (Howard Hinnant's days_from_civil). */
const daysFromCivil = (year: number, month: number, day: number): number => {
    const y = month <= 2 ? year - 1 : year;
    const era = Math.floor(y / 400);
    const yearOfEra = y - era * 400;
    const dayOfYear = Math.floor((153 * (month + (month > 2 ? -3 : 9)) + 2) / 5) + day - 1;
    const dayOfEra = yearOfEra * 365 + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100) + dayOfYear;
    return era * 146_097 + dayOfEra - 719_468;
};

/** The proleptic Gregorian date of a day count since 1970-01-01 (civil_from_days). */
const civilFromDays = (days: number): readonly [year: number, month: number, day: number] => {
    const z = days + 719_468;
    const era = Math.floor(z / 146_097);
    const dayOfEra = z - era * 146_097;
    const yearOfEra = Math.floor(
        (dayOfEra - Math.floor(dayOfEra / 1460) + Math.floor(dayOfEra / 36_524) - Math.floor(dayOfEra / 146_096)) / 365
    );
    const dayOfYear = dayOfEra - (365 * yearOfEra + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100));
    const monthIndex = Math.floor((5 * dayOfYear + 2) / 153);
    const day = dayOfYear - Math.floor((153 * monthIndex + 2) / 5) + 1;
    const month = monthIndex < 10 ? monthIndex + 3 : monthIndex - 9;
    return [yearOfEra + era * 400 + (month <= 2 ? 1 : 0), month, day];
};

const pad = (value: number | bigint, width: number): string => `${value}`.padStart(width, "0");

/** Writes ticks the way Newtonsoft writes a UTC `DateTime`: trailing zeros of the fraction dropped. */
const formatUtcTicks = (ticks: bigint): string => {
    const sinceEpoch = ticks - unixEpochTicks;
    let days = sinceEpoch / ticksPerDay;
    let remainder = sinceEpoch % ticksPerDay;
    if (remainder < 0n) {
        remainder += ticksPerDay;
        days -= 1n;
    }
    const [year, month, day] = civilFromDays(Number(days));
    const seconds = Number(remainder / ticksPerSecond);
    const fraction = pad(remainder % ticksPerSecond, 7).replace(/0+$/, "");
    const time = `${pad(Math.floor(seconds / 3600), 2)}:${pad(Math.floor(seconds / 60) % 60, 2)}:${pad(seconds % 60, 2)}`;
    return `${pad(year, 4)}-${pad(month, 2)}-${pad(day, 2)}T${time}${fraction === "" ? "" : `.${fraction}`}Z`;
};

const isoUtc = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,7}))?Z$/;

/**
 * A UTC `DateTime` as Newtonsoft writes it (`2026-11-11T01:42:05.22799Z`), to
 * ticks. Only accepts the exact text the game would write back.
 */
const UtcTicksFromString = Schema.String.pipe(
    Schema.decodeTo(
        Schema.BigInt,
        SchemaTransformation.transformEffect({
            decode: (text, options) => {
                const match = isoUtc.exec(text);
                if (match !== null) {
                    const [, year, month, day, hours, minutes, seconds, fraction = ""] = match;
                    const days = daysFromCivil(Number(year), Number(month), Number(day));
                    const ticks =
                        unixEpochTicks +
                        BigInt(days) * ticksPerDay +
                        BigInt(Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds)) * ticksPerSecond +
                        BigInt(fraction.padEnd(7, "0"));
                    if (formatUtcTicks(ticks) === text) return Effect.succeed(ticks);
                }
                return Effect.fail(
                    new SchemaIssue.InvalidValue({ expected: "a UTC date as Newtonsoft writes it" }, text, options)
                );
            },
            encode: (ticks) => Effect.succeed(formatUtcTicks(ticks)),
        })
    )
);

/**
 * A `DateTime` the game wrote as a string: decoded when it is a UTC date in
 * Newtonsoft's format, otherwise kept as the string it is.
 */
const NewtonsoftDate = Schema.Union([
    UtcTicksFromString.pipe(Schema.decodeTo(NimblebitSchema.CSharpDate)),
    Schema.String,
]);

const zoneTypes = Object.values(Buildings.zoneType);

/** A `ZoneType` written as the enum's number: its members in declaration order, from 0. */
const ZoneType = Int.pipe(
    Schema.decodeTo(
        Schema.Literals(zoneTypes),
        SchemaTransformation.transformEffect({
            decode: (index, options) => {
                const zone = zoneTypes[index];
                return zone === undefined
                    ? Effect.fail(new SchemaIssue.InvalidValue({ expected: "a ZoneType" }, index, options))
                    : Effect.succeed(zone);
            },
            encode: (zone) => Effect.succeed(zoneTypes.indexOf(zone)),
        })
    )
);

/**
 * One lot of the city (`GameState.cLots`), the game's `DSO` dictionary for a
 * `Lot`. Keys:
 *
 * - `l`: the lot's level.
 * - `z`: its zone, the `ZoneType` enum written as its number.
 * - `f`: the prefab of the building on it (see `Buildings.buildings`, plus
 *   `power_N` for the power plant), or `""` while the lot is empty.
 * - `r`: the building's rotation in degrees.
 * - `b`: a time in ticks counted from the game's `GameState.RefDateTicks`
 *   (2016-11-01), set when a building goes up and `0` on lots never built on.
 *   What exactly it times is inferred, not confirmed.
 * - `h`: whether the building is historical.
 *
 * Other keys are kept as {@link JsonValue}s (typed `unknown`).
 *
 * @since 1.0.0
 * @category Schemas
 */
export const Lot = withRest({
    l: Int,
    z: ZoneType,
    f: Schema.String,
    r: Double,
    b: Long,
    h: Schema.Boolean,
});

/**
 * The state of the progressive (ad and free) rewards, the game's
 * `ProgressiveRewards`. Only these four properties are saved; other keys are
 * kept as {@link JsonValue}s (typed `unknown`).
 *
 * @since 1.0.0
 * @category Schemas
 */
export const ProgressiveRewards = withRest({
    currentCycleIndex: Int,
    currentCycleRewardIndex: Int,
    lastCycle: NewtonsoftDate,
    lastFreeReward: NewtonsoftDate,
});

/**
 * The game's `GameState`, keys in the order the game writes them. `p` keys
 * come from `Player`, `c` keys from `City`, `u` from `UpgradeDefs`:
 *
 * - `pCoins`, `pBux`, `pKeys`: currencies; `pKeysSpent`; `pPig`: the piggy
 *   bank; `pBoostLeft`: double time left.
 * - `pTaps`: taps so far (the game refuses to save while it is 0).
 * - `pCityLvl`: the city reached; `pTutStep`: the tutorial step (5 when done).
 * - `pBuildings`: special buildings owned, by prefab; `pPastEarnRates`.
 * - `pVer`: the game version that wrote the save; `pCompls`; `pInfinite`.
 * - `cCarsUnlocked`, `cPlanesUnlocked`, `cBoatsUnlocked`: vehicles bought.
 * - `cLastEarnTime`: when earnings were last collected; `cTotalEarn`,
 *   `cBankEarn` (`-1.7976931348623157E+308`, `double.MinValue`, until the bank
 *   has earned).
 * - `cLots`: the lots, by the name of their `Lot` object.
 * - `uCounts`: upgrades bought, by upgrade id (see `Upgrades.upgrades`).
 * - `cComplMiss`: missions completed, by mission id; `cMissId` and `cMissProg`:
 *   the current mission and its progress (see `Missions.missions`).
 * - `playerI`, `playerS`, `playerR`, `playerE`: the player's cloud id, secret
 *   salt, registered flag (`"0"` or `"1"`) and email, `null` until known. The
 *   salt and email decode to `Redacted` values (`Redacted.value` reads them).
 *   The cloud copy has no `playerS` or `playerE` key.
 * - `progressiveRewards`.
 *
 * Other keys are kept as {@link JsonValue}s (typed `unknown`). Meanings come
 * from the game's field names and from how values changed as a city grew; the
 * dictionaries left empty by those tests (`pBuildings`, `pPastEarnRates`) are
 * typed from the game's field types.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const GameState = withRest({
    pCoins: Double,
    pBux: Double,
    pPig: Double,
    pKeys: Double,
    pKeysSpent: Double,
    pBoostLeft: Double,
    pTaps: Int,
    pCityLvl: Int,
    pTutStep: Int,
    pBuildings: Schema.Record(Schema.String, Int),
    pVer: Schema.String,
    pCompls: Int,
    pInfinite: Schema.Boolean,
    pPastEarnRates: Schema.Record(Schema.String, Double),
    cCarsUnlocked: Int,
    cPlanesUnlocked: Int,
    cBoatsUnlocked: Int,
    cLastEarnTime: Ticks,
    cTotalEarn: Double,
    cBankEarn: Double,
    cLots: Schema.Record(Schema.String, Lot),
    uCounts: Schema.Record(Schema.String, Int),
    cComplMiss: Schema.Record(Schema.String, Int),
    cMissId: Schema.String,
    cMissProg: Double,
    playerI: Schema.NullOr(NimblebitConfig.PlayerIdSchema),
    playerS: Schema.optionalKey(Schema.NullOr(NimblebitConfig.PlayerAuthKeySchema)),
    playerR: Schema.NullOr(Schema.String),
    playerE: Schema.optionalKey(Schema.NullOr(NimblebitConfig.PlayerEmailSchema)),
    progressiveRewards: ProgressiveRewards,
});

/** Parses JSON, keeping every number as its source text. */
const parseKeepingNumbers = (text: string): unknown =>
    Json.parse(text, (_key, value, context) =>
        typeof value === "number" && context?.source !== undefined ? Json.rawJSON(context.source) : value
    );

/**
 * Quotes a string with Newtonsoft.Json's default escaping: quotes,
 * backslashes and control characters, plus U+0085, U+2028 and U+2029, which
 * `JSON.stringify` leaves raw. Everything else is written as is.
 */
const quote = (text: string): string => {
    let out = '"';
    let start = 0;
    for (let index = 0; index < text.length; index++) {
        const code = text.charCodeAt(index);
        let escaped: string | undefined;
        if (code === 0x22) escaped = '\\"';
        else if (code === 0x5c) escaped = "\\\\";
        else if (code === 0x08) escaped = "\\b";
        else if (code === 0x09) escaped = "\\t";
        else if (code === 0x0a) escaped = "\\n";
        else if (code === 0x0c) escaped = "\\f";
        else if (code === 0x0d) escaped = "\\r";
        else if (code < 0x20 || code === 0x85 || code === 0x2028 || code === 0x2029) {
            escaped = `\\u${code.toString(16).padStart(4, "0")}`;
        }
        if (escaped !== undefined) {
            out += text.slice(start, index) + escaped;
            start = index + 1;
        }
    }
    return `${out}${text.slice(start)}"`;
};

/**
 * Writes an encoded save as Newtonsoft.Json does, without whitespace. Numbers
 * are all {@link RawJson} by now and are written as their text; keys in
 * insertion order, as `JSON.stringify` orders them.
 */
const writeJson = (value: unknown): string => {
    if (value === null) return "null";
    if (Json.isRawJSON(value)) return value.rawJSON;
    switch (typeof value) {
        case "boolean":
            return value ? "true" : "false";
        case "string":
            return quote(value);
        case "object":
            if (Array.isArray(value)) return `[${value.map(writeJson).join(",")}]`;
            return `{${Object.entries(value)
                .filter(([, item]) => item !== undefined)
                .map(([key, item]) => `${quote(key)}:${writeJson(item)}`)
                .join(",")}}`;
        default:
            throw new TypeError(`Cannot write a ${typeof value} into the save`);
    }
};

/**
 * Bit City's save: the string the game stores under the PlayerPrefs key
 * `bitcity3` (and that `Player.LoadFromDisk()` reads), or the inflated cloud
 * copy, decoded into a {@link GameState}.
 *
 * Encoding a decoded save the game wrote gives back the same string, byte for
 * byte, with two exceptions: keys that look like array indexes ("0", "1", ...)
 * come first in their object, in ascending order; and in the save, each lot and
 * `progressiveRewards`, the keys this module models come back in its order (the
 * game's), followed by the keys it does not model, in the order they were
 * read. A string the game would not write decodes and is written back the
 * game's way (see the module documentation).
 *
 * @since 1.0.0
 * @category Schemas
 */
export const SaveData = Schema.String.pipe(
    Schema.decodeTo(
        GameState,
        SchemaTransformation.transformEffect({
            decode: (text, options) =>
                Effect.try({
                    try: () => parseKeepingNumbers(text),
                    catch: () => new SchemaIssue.InvalidValue({ expected: "a JSON save" }, text, options),
                }).pipe(
                    // GameState's encoded side checks the parsed value next.
                    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
                    Effect.map((parsed) => parsed as (typeof GameState)["Encoded"])
                ),
            encode: (state, options) =>
                Effect.try({
                    try: () => writeJson(state),
                    catch: () => new SchemaIssue.InvalidValue({ expected: "a save to write as JSON" }, state, options),
                }),
        })
    )
);

/** Runs bytes through a compression stream. */
const transformBytes = (
    bytes: Uint8Array,
    stream: CompressionStream | DecompressionStream,
    onError: () => SchemaIssue.Issue
) =>
    Effect.tryPromise({
        try: () => new Response(new Blob([bytes.slice()]).stream().pipeThrough(stream)).arrayBuffer(),
        catch: onError,
    }).pipe(Effect.map((buffer) => new Uint8Array(buffer)));

/**
 * Bit City's cloud save: the bytes of the base64 `data` the server returns for
 * `/sync/pull/bc/...` (what `BitCity.sync_pullSave` returns), which are the
 * save string without its `playerS` and `playerE` keys, zlib-compressed.
 *
 * Verified by inflating the `data` the game pulled and comparing it with the
 * string `NBSync.decodeSave` returned for it. Encoding compresses with the
 * runtime's zlib at its default level, which gave back the server's exact
 * bytes on Node.js. Leave `playerS` and `playerE` out to match what the game
 * uploads.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const SaveDataFromBytes = Schema.Uint8Array.pipe(
    Schema.decodeTo(
        SaveData,
        SchemaTransformation.transformEffect({
            decode: (bytes, options) => {
                const invalid = () =>
                    new SchemaIssue.InvalidValue({ expected: "a zlib-compressed save" }, bytes, options);
                return transformBytes(bytes, new DecompressionStream("deflate"), invalid).pipe(
                    Effect.flatMap((inflated) =>
                        Effect.try({
                            try: () => new TextDecoder("utf-8", { fatal: true }).decode(inflated),
                            catch: invalid,
                        })
                    )
                );
            },
            encode: (text, options) =>
                transformBytes(
                    new TextEncoder().encode(text),
                    new CompressionStream("deflate"),
                    () => new SchemaIssue.InvalidValue({ expected: "a save to compress" }, text, options)
                ),
        })
    )
);
