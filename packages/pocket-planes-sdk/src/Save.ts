/**
 * Pocket Planes's save (game version 2.17.3).
 *
 * The save is the JSON string `PPSave.ToJson` makes with Newtonsoft.Json:
 * `Player.saveJson()` returns it, `Player._Save` keeps it in PlayerPrefs under
 * `Player.SaveKey`, and `Player.FromJSON` loads it. Its keys are `PPSave`'s
 * field names (the coins and bux `Currency` fields are written as the numbers
 * `c` and `b`), and the item schemas below keep the names of the game's
 * classes and fields.
 *
 * For the sync server, `NBSync.pushToServer` sends `NBSync.encodeSave` of
 * `Player.saveJson()`, and the `/sync/pull/` and `/friend/pull_game/`
 * responses go through `NBSync.decodeSave` before `Player.FromJSON`. Those two
 * call the game's Java `NBSync.compress` and `NBSync.decompress`: UTF-8, zlib
 * (`java.util.zip.Deflater` at its default level) and base64. So the bytes the
 * SDK's sync pull returns (`data` after base64) are the zlib-compressed save,
 * which `SaveDataFromBytes` reads.
 *
 * How this was determined: saves taken from the game on an emulator with a
 * Frida agent (`Player.saveJson()` of a fresh game, of one grown through the
 * game's own methods, and of crafted content loaded with `Player.FromJSON`),
 * the field types the game's classes declare, and the game's code
 * (disassembly of `NBSync`, `Player._Save`, `PaintColor.ToString` and
 * `BitizenInfo.ToDict`, and the Java `NBSync` class). The test fixtures are
 * those saves, with the player's id and auth salt replaced by fakes.
 *
 * Decoding drops nothing: a key the schemas do not model (one a newer game
 * version adds, say) is kept on its object as a {@link JsonValue} and written
 * back. C# `long` and `ulong` fields decode to `bigint`, since some hold
 * `DateTime` ticks (`nFBT` and `nPCT` are `DateTime.UtcNow.Ticks` plus a
 * delay), which a JSON number loses digits of.
 *
 * Round trips: encoding a decoded save gives back the string it was decoded
 * from, byte for byte, for a save the game wrote (each fixture does), with two
 * exceptions:
 *
 * - A JavaScript object puts keys that are array indexes (integers from 0 to
 *   4294967294, written without a sign or leading zeros) before all other
 *   keys, in ascending order. So a dictionary keyed by them comes back sorted
 *   if the game wrote it in another order: the integer keys of
 *   `carrierPorts` (both levels), `cityJobsAdWatched`, `eventCounts` and the
 *   inner dictionaries of `refresh`, the days that key `dailyStats`, and any
 *   such key the schemas do not model or that is inside a value they do not
 *   model.
 * - A key the schemas do not model comes back after the keys they do model
 *   on the same object, wherever the game wrote it.
 *
 * Numbers are written the way the game writes them, so they come back as
 * read: a C# `double` with .NET's `ToString("R")` as Unity's runtime does it
 * (15 significant digits when those read back as the same value, 17
 * otherwise), a `float` likewise with 7 or 9 digits of its 32-bit value,
 * exponent notation (`1E-05`, `1E+15`) for an exponent below -4 or at least
 * the digit count, and `.0` after a whole number (`843.0`). Strings get
 * Newtonsoft.Json's escaping. Input the game would not write (whitespace,
 * other escapes or number spellings) decodes, and encodes the way the game
 * would write it, except that a number with a decimal point or exponent in a
 * value the schemas do not model is written back as it was spelled.
 *
 * @since 1.0.0
 */

import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import * as SchemaIssue from "effect/SchemaIssue";
import * as SchemaTransformation from "effect/SchemaTransformation";

import { NimblebitConfig, NimblebitSchema } from "@tinyburg/nimblebit-sdk";

// ---------------------------------------------------------------------------
// JSON as Newtonsoft.Json writes it
// ---------------------------------------------------------------------------

/**
 * A JSON value as this module reads one: what `JSON.parse` gives, except that
 * an integer too large for a double to hold exactly (a C# `long` such as
 * `DateTime` ticks) is a `bigint`, so no digit is lost, and a number written
 * with a decimal point or an exponent is a {@link JsonDouble}.
 *
 * @since 1.0.0
 * @category Models
 */
export type JsonValue =
    | null
    | boolean
    | number
    | bigint
    | JsonDouble
    | string
    | ReadonlyArray<JsonValue>
    | { readonly [key: string]: JsonValue };

/**
 * A JSON number written with a decimal point or an exponent. Newtonsoft.Json
 * writes a C# `double` or `float` that way even when it holds a whole number
 * (`843.0`), where an integer holding the same value is `843`, so the reader
 * keeps such a number in this wrapper. `text` is the number as the save
 * spelled it, which the writer writes back as is; without it, the writer
 * spells `value` the way the game does, as a C# `float` when `single` is set
 * and as a `double` otherwise.
 *
 * @since 1.0.0
 * @category Models
 */
export class JsonDouble {
    readonly value: number;
    readonly single: boolean;
    readonly text: string | undefined;
    constructor(value: number, single = false, text?: string) {
        this.value = value;
        this.single = single;
        this.text = text;
    }
}

interface JsonError {
    readonly message: string;
}

const jsonError = (message: string): JsonError => ({ message });

const isJsonError = (u: unknown): u is JsonError =>
    typeof u === "object" && u !== null && "message" in u && Object.keys(u).length === 1;

const numberPattern = /-?(?:0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?/y;

const parseJson = (text: string): JsonValue => {
    let index = 0;

    const fail = (message: string): never => {
        throw jsonError(`${message} at position ${index}`);
    };

    const skipWhitespace = (): void => {
        while (index < text.length) {
            const code = text.charCodeAt(index);
            if (code !== 0x20 && code !== 0x09 && code !== 0x0a && code !== 0x0d) return;
            index++;
        }
    };

    const expect = (literal: string): void => {
        if (!text.startsWith(literal, index)) fail(`Expected ${literal}`);
        index += literal.length;
    };

    const parseString = (): string => {
        index++;
        let out = "";
        let start = index;
        for (;;) {
            if (index >= text.length) return fail("Unterminated string");
            const code = text.charCodeAt(index);
            if (code === 0x22) {
                out += text.slice(start, index);
                index++;
                return out;
            }
            if (code < 0x20) return fail("Unescaped control character in string");
            if (code !== 0x5c) {
                index++;
                continue;
            }
            out += text.slice(start, index);
            const escape = text[index + 1];
            switch (escape) {
                case '"':
                case "\\":
                case "/":
                    out += escape;
                    break;
                case "b":
                    out += "\b";
                    break;
                case "f":
                    out += "\f";
                    break;
                case "n":
                    out += "\n";
                    break;
                case "r":
                    out += "\r";
                    break;
                case "t":
                    out += "\t";
                    break;
                case "u": {
                    const hex = text.slice(index + 2, index + 6);
                    if (!/^[\dA-Fa-f]{4}$/.test(hex)) return fail("Invalid unicode escape");
                    out += String.fromCharCode(Number.parseInt(hex, 16));
                    index += 4;
                    break;
                }
                default:
                    return fail("Invalid escape");
            }
            index += 2;
            start = index;
        }
    };

    const parseNumber = (): number | bigint | JsonDouble => {
        numberPattern.lastIndex = index;
        const match = numberPattern.exec(text);
        if (match === null) return fail("Unexpected character");
        index = numberPattern.lastIndex;
        const literal = match[0];
        const number = Number(literal);
        if (match[1] !== undefined || match[2] !== undefined) return new JsonDouble(number, false, literal);
        // An integer literal a double cannot hold exactly (a C# long such as
        // DateTime ticks) is kept whole.
        return Number.isSafeInteger(number) ? number : BigInt(literal);
    };

    const parseValue = (): JsonValue => {
        skipWhitespace();
        switch (text[index]) {
            case "{": {
                index++;
                const object: Record<string, JsonValue> = {};
                skipWhitespace();
                if (text[index] === "}") {
                    index++;
                    return object;
                }
                for (;;) {
                    skipWhitespace();
                    if (text[index] !== '"') return fail("Expected a property name");
                    const key = parseString();
                    skipWhitespace();
                    expect(":");
                    const value = parseValue();
                    // defineProperty, so that a "__proto__" key is a key
                    Object.defineProperty(object, key, { value, enumerable: true, writable: true, configurable: true });
                    skipWhitespace();
                    if (text[index] === ",") {
                        index++;
                        continue;
                    }
                    expect("}");
                    return object;
                }
            }
            case "[": {
                index++;
                const array: Array<JsonValue> = [];
                skipWhitespace();
                if (text[index] === "]") {
                    index++;
                    return array;
                }
                for (;;) {
                    array.push(parseValue());
                    skipWhitespace();
                    if (text[index] === ",") {
                        index++;
                        continue;
                    }
                    expect("]");
                    return array;
                }
            }
            case '"':
                return parseString();
            case "t":
                expect("true");
                return true;
            case "f":
                expect("false");
                return false;
            case "n":
                expect("null");
                return null;
            case undefined:
                return fail("Unexpected end of input");
            default:
                return parseNumber();
        }
    };

    const value = parseValue();
    skipWhitespace();
    if (index !== text.length) fail("Unexpected trailing characters");
    return value;
};

// Newtonsoft.Json's default escaping: quotes, backslashes and control
// characters, plus U+0085, U+2028 and U+2029. Everything else is written as is.
const quote = (string: string): string => {
    let out = '"';
    let start = 0;
    for (let index = 0; index < string.length; index++) {
        const code = string.charCodeAt(index);
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
            out += string.slice(start, index) + escaped;
            start = index + 1;
        }
    }
    return `${out}${string.slice(start)}"`;
};

// `value` in .NET's general format with `precision` significant digits
// (`ToString("G17")` and the like): trailing zeros dropped, and exponent
// notation (`1.5E+20`, `1E-05`) when the exponent is below -4 or at least
// `precision`.
const formatGeneral = (value: number, precision: number): string => {
    const exponential = value.toExponential(precision - 1);
    const split = exponential.indexOf("e");
    const mantissa = exponential.slice(0, split);
    const exponent = Number(exponential.slice(split + 1));
    const sign = mantissa.startsWith("-") ? "-" : "";
    const digits = mantissa.replace(/^-/, "").replace(".", "").replace(/0+$/, "") || "0";
    if (exponent < -4 || exponent >= precision) {
        const fraction = digits.slice(1);
        const exponentPart = `E${exponent < 0 ? "-" : "+"}${String(Math.abs(exponent)).padStart(2, "0")}`;
        return `${sign}${digits[0]}${fraction === "" ? "" : `.${fraction}`}${exponentPart}`;
    }
    if (exponent < 0) return `${sign}0.${"0".repeat(-exponent - 1)}${digits}`;
    const whole = digits.slice(0, exponent + 1).padEnd(exponent + 1, "0");
    const fraction = digits.slice(exponent + 1);
    return `${sign}${whole}${fraction === "" ? "" : `.${fraction}`}`;
};

// A C# double or float as Newtonsoft.Json writes it in this game:
// `ToString("R")` the way Unity's runtime does it, which tries 15 significant
// digits (7 for a float) and falls back to 17 (9) when those do not read back
// as the same value, with `.0` added when the text would otherwise read as an
// integer. A float is the 32-bit float nearest `value`, as the game would hold
// it.
const formatFloat = (value: number, single: boolean): string => {
    if (!Number.isFinite(value)) throw jsonError(`Cannot write ${value}`);
    if (value === 0) return Object.is(value, -0) ? "-0.0" : "0.0";
    const exact = single ? Math.fround(value) : value;
    const [short, long] = single ? [7, 9] : [15, 17];
    const roundTrips = (text: string): boolean => (single ? Math.fround(Number(text)) : Number(text)) === exact;
    const shortText = formatGeneral(exact, short);
    const text = roundTrips(shortText) ? shortText : formatGeneral(exact, long);
    return /[.E]/.test(text) ? text : `${text}.0`;
};

const writeJson = (value: unknown): string => {
    let out = "";
    const write = (value: unknown): void => {
        if (value === null) {
            out += "null";
        } else if (value instanceof JsonDouble) {
            out += value.text ?? formatFloat(value.value, value.single);
        } else if (typeof value === "boolean") {
            out += value ? "true" : "false";
        } else if (typeof value === "bigint") {
            out += value.toString();
        } else if (typeof value === "number") {
            if (!Number.isFinite(value)) throw jsonError(`Cannot write ${value}`);
            out += Number.isInteger(value) ? BigInt(value).toString() : formatFloat(value, false);
        } else if (typeof value === "string") {
            out += quote(value);
        } else if (Array.isArray(value)) {
            out += "[";
            for (let index = 0; index < value.length; index++) {
                if (index > 0) out += ",";
                write(value[index]);
            }
            out += "]";
        } else if (typeof value === "object") {
            out += "{";
            let first = true;
            for (const [key, item] of Object.entries(value)) {
                if (item === undefined) continue;
                if (!first) out += ",";
                first = false;
                out += `${quote(key)}:`;
                write(item);
            }
            out += "}";
        } else {
            throw jsonError(`Cannot write a ${typeof value}`);
        }
    };
    write(value);
    return out;
};

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

/**
 * Any JSON value, for keys the schemas do not model (from a newer game
 * version, say). A number with a decimal point stays a {@link JsonDouble}
 * with its text, so it writes back as it was read.
 *
 * @since 1.0.0
 * @category Primitives
 */
export const JsonValue: Schema.Codec<JsonValue> = Schema.Union([
    Schema.Null,
    Schema.Boolean,
    Schema.Finite,
    Schema.BigInt,
    Schema.instanceOf(JsonDouble),
    Schema.String,
    Schema.Array(Schema.suspend((): Schema.Codec<JsonValue> => JsonValue)),
    Schema.Record(
        Schema.String,
        Schema.suspend((): Schema.Codec<JsonValue> => JsonValue)
    ),
]);

/**
 * A C# `double` (`System.Double`). It decodes to a number and encodes to a
 * {@link JsonDouble}, so that it writes back the way the game writes it: a
 * whole number as `843.0`, and 17 significant digits when 15 do not read
 * back as the same value.
 *
 * @since 1.0.0
 * @category Primitives
 */
export const Double = Schema.Union([Schema.instanceOf(JsonDouble), Schema.Finite]).pipe(
    Schema.decodeTo(
        Schema.Finite,
        SchemaTransformation.transform({
            decode: (value: JsonDouble | number): number => (value instanceof JsonDouble ? value.value : value),
            encode: (value: number): JsonDouble | number => new JsonDouble(value),
        })
    )
);

/**
 * A C# `float` (`System.Single`), like {@link Double} but written the way the
 * game writes a float: 7 significant digits of the value as a 32-bit float,
 * or 9 when 7 do not read back as the same float.
 *
 * @since 1.0.0
 * @category Primitives
 */
export const Float = Schema.Union([Schema.instanceOf(JsonDouble), Schema.Finite]).pipe(
    Schema.decodeTo(
        Schema.Finite,
        SchemaTransformation.transform({
            decode: (value: JsonDouble | number): number => (value instanceof JsonDouble ? value.value : value),
            encode: (value: number): JsonDouble | number => new JsonDouble(value, true),
        })
    )
);

// A struct that keeps the keys it does not model as JSON values, after the
// ones it does, so that a save from a newer game version decodes and writes
// back whole. The rest record only covers the keys outside `fields`: a record
// over every key would also check the modeled ones, and some of their decoded
// values (the `Redacted` auth salt and email) are not JSON values.
const withRest = <const Fields extends Schema.Struct.Fields>(fields: Fields) => {
    const modeled = new Set(Object.keys(fields));
    const UnmodeledKey = Schema.String.check(
        Schema.makeFilter((key: string) => !modeled.has(key), { expected: "a key the schema does not model" })
    );
    return Schema.StructWithRest(Schema.Struct(fields), [Schema.Record(UnmodeledKey, JsonValue)]);
};

const minSafe = BigInt(Number.MIN_SAFE_INTEGER);
const maxSafe = BigInt(Number.MAX_SAFE_INTEGER);

/**
 * A C# `long` or `ulong` (`System.Int64`, `System.UInt64`), decoded to a
 * `bigint` so that values past 2^53, such as `DateTime` ticks, survive. It
 * reads a JSON number or the `bigint` this module's reader makes of a large
 * integer, and writes a number whenever a double can hold the value exactly.
 *
 * @since 1.0.0
 * @category Primitives
 */
export const Long = Schema.Union([Schema.Int, Schema.BigInt]).pipe(
    Schema.decodeTo(
        Schema.BigInt,
        SchemaTransformation.transform({
            decode: (value: number | bigint): bigint => (typeof value === "bigint" ? value : BigInt(value)),
            encode: (value: bigint): number | bigint => (value >= minSafe && value <= maxSafe ? Number(value) : value),
        })
    )
);

/**
 * A key of a C# `Dictionary<int, ...>`, which JSON writes as a string. A
 * JavaScript object puts keys from "0" to "4294967294" first, in ascending
 * order, so a dictionary keyed by them encodes in that order, whatever order
 * the game wrote them in.
 *
 * @since 1.0.0
 * @category Primitives
 */
export const IntKey = Schema.String.check(Schema.isPattern(/^-?(?:0|[1-9]\d*)$/));

/**
 * A C# `DateTime` as Newtonsoft.Json writes it (ISO 8601 with up to seven
 * fractional digits, and `Z`, an offset or nothing depending on the value's
 * `DateTimeKind`). Kept as the string so it writes back unchanged.
 *
 * @since 1.0.0
 * @category Primitives
 */
export const DateTimeString = Schema.String.check(
    Schema.isPattern(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,7})?(?:Z|[+-]\d{2}:\d{2})?$/)
);

// ---------------------------------------------------------------------------
// Save items
// ---------------------------------------------------------------------------

const canonicalInt = /^-?(?:0|[1-9]\d*)$/;

const paintChannels = ["r1", "g1", "b1", "r2", "g2", "b2", "r3", "g3", "b3"] as const;

/**
 * A plane's paint job (the game's `PaintColor`), which `PlaneInfo.paint`
 * writes as three `r,g,b` colors joined by `:`.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const Paint = Schema.String.pipe(
    Schema.decodeTo(
        Schema.Struct({
            r1: Schema.Int,
            g1: Schema.Int,
            b1: Schema.Int,
            r2: Schema.Int,
            g2: Schema.Int,
            b2: Schema.Int,
            r3: Schema.Int,
            g3: Schema.Int,
            b3: Schema.Int,
        }),
        SchemaTransformation.transformEffect({
            decode: (paint: string, options) => {
                const colors = paint.split(":").map((color) => color.split(","));
                const values = colors.flat();
                if (colors.length !== 3 || values.length !== 9 || !values.every((value) => canonicalInt.test(value))) {
                    return Effect.fail(
                        new SchemaIssue.InvalidValue({ message: 'Expected "r,g,b:r,g,b:r,g,b"' }, paint, options)
                    );
                }
                return Effect.succeed({
                    r1: Number(values[0]),
                    g1: Number(values[1]),
                    b1: Number(values[2]),
                    r2: Number(values[3]),
                    g2: Number(values[4]),
                    b2: Number(values[5]),
                    r3: Number(values[6]),
                    g3: Number(values[7]),
                    b3: Number(values[8]),
                });
            },
            encode: (paint) =>
                Effect.succeed(
                    [0, 3, 6]
                        .map((start) =>
                            paintChannels
                                .slice(start, start + 3)
                                .map((channel) => paint[channel])
                                .join(",")
                        )
                        .join(":")
                ),
        })
    )
);

/**
 * An amount of a currency (the game's `Currency`), as the save writes
 * `wheelTickets`. `type` is the game's `Currency.Type` (`Bux`, `Coins`,
 * `WheelTickets`, in that order; wheel tickets are 2).
 *
 * @since 1.0.0
 * @category Schemas
 */
export const Currency = withRest({
    amount: Long,
    type: Schema.Int,
});

/**
 * A plane part (the game's `Part`). `part_type` is the game's `PartType`
 * (`body`, `controls`, `engine`, in that order).
 *
 * @since 1.0.0
 * @category Schemas
 */
export const Part = withRest({
    plane_id: Schema.Int,
    part_type: Schema.Int,
});

/**
 * One leg of a trip (the game's `TripLeg`). `distance` is a C# `double` and
 * `speed_bonus` a `float`.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const TripLeg = withRest({
    is_complete: Schema.Boolean,
    offload_complete: Schema.Boolean,
    start_city: Schema.Int,
    end_city: Schema.Int,
    distance: Double,
    speed_bonus: Float,
});

/**
 * A plane's current or last trip (the game's `Trip`). `start_time` is in Unix
 * seconds.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const Trip = withRest({
    evaluated: Schema.Boolean,
    is_complete: Schema.Boolean,
    offload_complete: Schema.Boolean,
    start_time: Long,
    Legs: Schema.Array(TripLeg),
    arrivedLegsCount: Schema.Int,
});

/**
 * A market refresh the player has seen (the game's `ShopLogItem`). `ts` is in
 * seconds since 0001-01-01 (`DateTime.Ticks` / 10^7).
 *
 * @since 1.0.0
 * @category Schemas
 */
export const ShopLogItem = withRest({
    ts: Long,
    seed: Schema.Int,
});

/**
 * A friend the player follows (the game's `PPFriend`).
 *
 * @since 1.0.0
 * @category Schemas
 */
export const PPFriend = withRest({
    name: Schema.NullOr(Schema.String),
    player_id: Schema.String,
    gc: Schema.NullOr(Schema.String),
});

const Bit = Schema.Literals(["0", "1"]).transform([false, true]).pipe(Schema.decodeTo(Schema.Boolean));

const IntFromString = Schema.String.pipe(
    Schema.check(Schema.isPattern(canonicalInt)),
    Schema.decodeTo(Schema.NumberFromString.pipe(Schema.decodeTo(Schema.Int)))
);

/**
 * A bitizen's looks (the `BA` entry of a bitizen's data): the game's
 * `BitizenInfo` fields in the order `BitizenInfo.ToDict` joins them with `,`.
 * Colors are `r:g:b`. `firstNameIdx` indexes `Bitizens.maleNames` or
 * `Bitizens.femaleNames` by `male`, and `lastNameIdx` indexes
 * `Bitizens.lastNames`. Items past the known ones are kept in `$unknown`.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const BitizenAttributes = NimblebitSchema.parseNimblebitOrderedList([
    { property: "male", schema: Bit },
    { property: "firstNameIdx", schema: IntFromString },
    { property: "lastNameIdx", schema: IntFromString },
    { property: "bmonth", schema: IntFromString },
    { property: "bday", schema: IntFromString },
    { property: "skinColorIdx", schema: IntFromString },
    { property: "hairColorIdx", schema: IntFromString },
    { property: "shoeColorIdx", schema: IntFromString },
    { property: "pantsColor", schema: NimblebitSchema.UnityColor },
    { property: "shirtColor", schema: NimblebitSchema.UnityColor },
    { property: "hasGlasses", schema: Bit },
    { property: "glasses", schema: IntFromString },
    { property: "hasTie", schema: Bit },
    { property: "tieColor", schema: NimblebitSchema.UnityColor },
    { property: "hasHairAcc", schema: Bit },
    { property: "hairAcc", schema: IntFromString },
    { property: "hasBHat", schema: Bit },
    { property: "hasMhat", schema: Bit },
    { property: "hasFHat", schema: Bit },
    { property: "hat", schema: IntFromString },
    { property: "hatColor", schema: NimblebitSchema.UnityColor },
    { property: "hasEarrings", schema: Bit },
    { property: "earringColor", schema: NimblebitSchema.UnityColor },
    { property: "hair", schema: IntFromString },
]);

/**
 * A bitizen as the save keeps it (the `Dictionary<string, object>` that
 * `BitizenInfo.ToDict` makes): `c` is the costume (empty for none), `BA` the
 * looks and `v` the VIP type (0 for none). A plane's `Pilot` and a Bitbook
 * post's `b` (which `BBEntry.set_bit` fills from `ToDict`) have this shape; a
 * passenger's `CargoDetails.b` is assumed to.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const BitizenData = withRest({
    c: Schema.String,
    BA: BitizenAttributes,
    v: Long,
});

/**
 * A crate of cargo (the game's `CrateInfo`): `n` is its package name, from
 * `Cargo.packageNames` or `Cargo.vipPackageNames`.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const CrateInfo = withRest({
    p: Schema.Int,
    n: Schema.NullOr(Schema.String),
    i: Schema.Int,
    c: Schema.NullOr(Schema.String),
    ni: Schema.Int,
    s: Schema.Int,
});

/**
 * What a job carries (the game's `CargoDetails`): a passenger in `b` or a
 * crate in `c`.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const CargoDetails = withRest({
    t: Schema.NullOr(Schema.String),
    b: Schema.NullOr(BitizenData),
    c: Schema.NullOr(CrateInfo),
    s: Schema.Int,
});

/**
 * A job, waiting in a city or loaded on a plane (the game's `Cargo`).
 *
 * @since 1.0.0
 * @category Schemas
 */
export const Cargo = withRest({
    start_city: Schema.Int,
    end_city: Schema.Int,
    is_vip: Schema.Boolean,
    num_hops: Schema.Int,
    first_board: Long,
    details: CargoDetails,
});

/**
 * A delivered job (the game's `CargoLog`).
 *
 * @since 1.0.0
 * @category Schemas
 */
export const CargoLog = withRest({
    c: Schema.Int,
    ts: Long,
    details: CargoDetails,
});

/**
 * A Bitbook post (the game's `BBEntry`): `b` is the bitizen who posted it.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const BBEntry = withRest({
    i: Schema.Int,
    l: Schema.Int,
    d: Long,
    m: Schema.NullOr(Schema.String),
    b: Schema.NullOr(BitizenData),
});

/**
 * A global event reward (a `KeyValuePair<GlobalEventRewardType, object>`,
 * which Newtonsoft.Json writes as `{ Key, Value }`): bux (`Key` 0) or coins (1)
 * with an amount, a plane part (2) or a skin id (3). A reward of a type this
 * module does not know fails to decode.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const GlobalEventReward = Schema.Union([
    Schema.Struct({ Key: Schema.Literal(0), Value: Schema.Int }),
    Schema.Struct({ Key: Schema.Literal(1), Value: Schema.Int }),
    Schema.Struct({ Key: Schema.Literal(2), Value: Part }),
    Schema.Struct({ Key: Schema.Literal(3), Value: Schema.String }),
]);

/**
 * The player's progress in a global event (the game's `GlobalEventProgress`).
 * `b` and `u` are the event's start in Unix seconds, `c` its city and `r` its
 * rewards.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const GlobalEventProgress = withRest({
    b: Long,
    u: Long,
    j: Long,
    c: Schema.Int,
    r1: Schema.Boolean,
    r2: Schema.Boolean,
    r3: Schema.Boolean,
    r4: Schema.Boolean,
    r5: Schema.Boolean,
    r: Schema.Array(GlobalEventReward),
});

/**
 * A city the player has unlocked (the game's `CityInfo`). `campaign` is when
 * an advertising campaign started, in Unix seconds. `isClosed` is a read-only
 * property the game writes but does not read back.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const CityInfo = withRest({
    city_id: Schema.Int,
    level: Schema.Int,
    flight_out: Long,
    pass_out: Long,
    cargo_out: Long,
    flight_in: Long,
    pass_in: Long,
    cargo_in: Long,
    closure: Schema.Int,
    deploy_x: Schema.Int,
    deploy_y: Schema.Int,
    campaign: Long,
    Cargo: Schema.Array(Cargo),
    isClosed: Schema.Boolean,
});

/**
 * A plane the player owns (the game's `PlaneInfo`), flying in `Planes` or
 * parked in `Hangar`.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const PlaneInfo = withRest({
    plane_id: Schema.Int,
    eUpgrade: Schema.Int,
    tUpgrade: Schema.Int,
    wUpgrade: Schema.Int,
    paint: Paint,
    skin: Schema.NullOr(Schema.String),
    trips: Long,
    distance: Long,
    longest_flight: Schema.Int,
    most_hops: Schema.Int,
    most_profit: Schema.Int,
    hotdog: Schema.Int,
    Pilot: BitizenData,
    costumes: Schema.Array(Schema.String),
    name: Schema.String,
    total_flight_time: Long,
    total_revenue: Long,
    total_profit: Long,
    Cargo: Schema.Array(Cargo),
    Trip: Trip,
    l: Schema.Boolean,
});

/**
 * The save as a JSON object (the game's `PPSave`), in the game's key order.
 * `c` and `b` are the coins and bux. `playerI`, `playerS` and `playerE` are
 * the player's id, auth salt and email, the last two `Redacted`. Times, where
 * the game's code or a probe showed the unit: `nFBT` and `nPCT` are
 * `DateTime` ticks, `nMST` is Unix seconds, `jobPoolStart` and the keys of
 * `refresh` are seconds since 0001-01-01, and the keys of `dailyStats` are
 * the Unix seconds a day starts at. `events` holds a JSON string of its own
 * (`"null"` when there are none). `mapX`, `mapY`, `mapZ`, `mmapZ` and
 * `planeListY` are C# `float`s.
 *
 * Like every object schema in this module, it keeps the keys it does not
 * model as {@link JsonValue}s and encodes them after the ones it does.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const PPSave = withRest({
    c: Long,
    b: Long,
    wheelTickets: Currency,
    firstLoad: Schema.Boolean,
    hasCrew: Schema.Boolean,
    playerR: Schema.Boolean,
    vi: Schema.Boolean,
    vipPlaneOwned: Schema.Boolean,
    coinsCollectedFree: Long,
    buxCollectedFree: Long,
    bbBadge: Schema.Int,
    eventCount: Schema.Int,
    globalEvent: Schema.Int,
    homeCity: Schema.Int,
    lastPlane: Schema.Int,
    level: Schema.Int,
    lfb: Schema.Int,
    resetCount: Schema.Int,
    slots: Schema.Int,
    mapX: Float,
    mapY: Float,
    mapZ: Float,
    mmapZ: Float,
    planeListY: Float,
    mapPlanesHidden: Schema.NullOr(Schema.Boolean),
    lastPlaneCount: Long,
    timeInGame: Long,
    tp: Long,
    xp: Long,
    achieve: Schema.NullOr(Schema.String),
    airlineName: Schema.NullOr(Schema.String),
    bbEntries: Schema.NullOr(Schema.String),
    landingAlerts: Schema.NullOr(Schema.String),
    playerE: Schema.NullOr(NimblebitConfig.PlayerEmailSchema),
    playerI: Schema.NullOr(NimblebitConfig.PlayerIdSchema),
    playerS: Schema.NullOr(NimblebitConfig.PlayerAuthKeySchema),
    shownTips: Schema.NullOr(Schema.String),
    sounds: Schema.NullOr(Schema.String),
    v: Schema.String,
    events: Schema.NullOr(Schema.String),
    cityUnlock: Schema.Array(Schema.Int),
    localEvents: Schema.Array(Schema.Int),
    bb: Schema.Array(BBEntry),
    CargoLog: Schema.Array(CargoLog),
    Cities: Schema.Array(CityInfo),
    jobPoolStart: Long,
    jobPoolCityIds: Schema.Array(Schema.Int),
    lfParts: Schema.Array(Part),
    Parts: Schema.Array(Part),
    Hangar: Schema.Array(PlaneInfo),
    Planes: Schema.Array(PlaneInfo),
    f: Schema.Array(PPFriend),
    ShopLog: Schema.Array(ShopLogItem),
    refresh: Schema.Record(Schema.String, Schema.Record(IntKey, Schema.Int)),
    dailyStats: Schema.Record(Schema.String, Schema.Record(Schema.String, Long)),
    eventCounts: Schema.Record(Schema.String, Schema.Int),
    globalStats: Schema.Record(Schema.String, Long),
    speedUpFlightAdWatched: Schema.Array(DateTimeString),
    cityJobsAdWatched: Schema.Record(IntKey, Schema.Array(DateTimeString)),
    cPC: Schema.Int,
    cPRI: Schema.Int,
    nFBT: Long,
    nPCT: Long,
    g: Schema.NullOr(GlobalEventProgress),
    pg: Schema.NullOr(GlobalEventProgress),
    carrierPorts: Schema.Record(IntKey, Schema.Record(IntKey, Long)),
    skins: Schema.Array(Schema.String),
    skinPass: Schema.Boolean,
    adSkips: Long,
    nMST: Long,
    mJL: Long,
    bldHQ: Schema.Int,
    bldPRem: Schema.Int,
    bldCRem: Schema.Int,
});

const SaveJson = SchemaTransformation.transformEffect({
    decode: (text: string, options): Effect.Effect<(typeof PPSave)["Encoded"], SchemaIssue.Issue> => {
        try {
            // The parsed value's shape is checked by `PPSave` right after.
            //
            // oxlint-disable-next-line typescript/no-unsafe-type-assertion
            return Effect.succeed(parseJson(text) as (typeof PPSave)["Encoded"]);
        } catch (error) {
            const message = isJsonError(error) ? error.message : String(error);
            return Effect.fail(new SchemaIssue.InvalidValue({ message }, text, options));
        }
    },
    encode: (value: (typeof PPSave)["Encoded"], options): Effect.Effect<string, SchemaIssue.Issue> => {
        try {
            return Effect.succeed(writeJson(value));
        } catch (error) {
            const message = isJsonError(error) ? error.message : String(error);
            return Effect.fail(new SchemaIssue.InvalidValue({ message }, value, options));
        }
    },
});

/**
 * The save string, as `Player.saveJson()` returns it and `Player.FromJSON`
 * loads it, decoded to a `PPSave`. Keys the schemas do not model are kept
 * and written back. Encoding gives back the string the game wrote, byte for
 * byte, except that dictionary keys from "0" to "4294967294" come back first
 * and in ascending order (the integer keys of `carrierPorts`,
 * `cityJobsAdWatched`, `eventCounts` and `refresh`'s inner dictionaries, and
 * the days of `dailyStats`), and keys the schemas do not model come back
 * after the modeled keys of their object; see the module docs.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const SaveData = Schema.String.pipe(Schema.decodeTo(PPSave, SaveJson));

const streamThrough = (bytes: Uint8Array, transform: ReadableWritablePair<Uint8Array, BufferSource>) =>
    new Response(
        new ReadableStream<BufferSource>({
            start: (controller) => {
                controller.enqueue(bytes.slice());
                controller.close();
            },
        }).pipeThrough(transform)
    )
        .arrayBuffer()
        .then((buffer) => new Uint8Array(buffer));

const ZlibUtf8 = SchemaTransformation.transformEffect({
    decode: (bytes: Uint8Array, options): Effect.Effect<string, SchemaIssue.Issue> =>
        Effect.tryPromise({
            try: () =>
                streamThrough(bytes, new DecompressionStream("deflate")).then((inflated) =>
                    new TextDecoder("utf-8", { fatal: true }).decode(inflated)
                ),
            catch: (error) =>
                new SchemaIssue.InvalidValue(
                    { message: `Expected zlib-compressed UTF-8: ${String(error)}` },
                    bytes,
                    options
                ),
        }),
    encode: (text: string, options): Effect.Effect<Uint8Array, SchemaIssue.Issue> =>
        Effect.tryPromise({
            try: () => streamThrough(new TextEncoder().encode(text), new CompressionStream("deflate")),
            catch: (error) =>
                new SchemaIssue.InvalidValue({ message: `Could not compress: ${String(error)}` }, text, options),
        }),
});

/**
 * The save as the sync server holds it: the bytes of the base64 `data` that
 * `/sync/pull/` and `/friend/pull_game/` return (what `sync_pullSave` gives),
 * which are the zlib-compressed UTF-8 save string. It decompresses with the
 * platform's `DecompressionStream`, so it only decodes and encodes with the
 * Effect or Promise APIs, not the sync ones. Compressing again need not give
 * the same bytes as the game's zlib, only bytes the game reads.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const SaveDataFromBytes = Schema.Uint8Array.pipe(Schema.decodeTo(SaveData, ZlibUtf8));
