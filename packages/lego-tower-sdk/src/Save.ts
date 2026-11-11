/**
 * LEGO Tower's save. The game (version 1.27.2) keeps it as one JSON string:
 * `LTPlayer._Save` fills an `LTSave` with `LTPlayer.PlayerDict()` and
 * `LTowerController.ToDSO()`, serializes it with `LTSave.ToJson`
 * (Newtonsoft.Json, no indentation) and stores it in PlayerPrefs under
 * `"LGTower"`; `LTPlayer.LoadFromDisk` reads that string back with
 * `JsonConvert.DeserializeObject<LTSave>`, and a save pulled from the sync
 * server reaches `LTPlayer.HandleSyncSave` as the same JSON. The game skips
 * saving while the intro box of a new tower is up.
 *
 * Determined on an Android emulator with Frida: the save strings in the test
 * fixtures are what `LTSave.ToJson` returned when the game's own
 * `LTPlayer._Save` ran (the PlayerPrefs value read back was identical), on a
 * tower fresh out of the intro and again after adding pieces, found bux, a
 * visit, a tip, a blocked code and a friend through the game's `LTPlayer`
 * methods. Which methods save and load, and the keys of the parts no
 * captured save held (missions, friend metadata), come from disassembling the
 * game's IL2CPP binary and its Java code.
 *
 * Newtonsoft.Json writes a C# `double` with a decimal point (`1000.0`), and
 * `long`s such as `DateTime` ticks past 2^53, so the save is read with a JSON
 * reader that keeps both. Decoding drops nothing: keys this module does not
 * model (a newer game version may add some to the save or to any object in
 * it) are kept, and encoding writes them back. Encoding a decoded save string
 * the game wrote gives back the same bytes, except for key order:
 *
 * - integer-like keys (the piece ids some dictionaries are keyed by) come
 *   first in their object, in ascending order, because JavaScript objects
 *   order such keys that way;
 * - in each object, the other keys this module models are written in the
 *   order it lists them (the order game version 1.27.2 writes them), and
 *   the keys it does not model after them, in the order they were read.
 *
 * Any other JSON that decodes (with whitespace, escapes the game would not
 * write, or numbers spelled another way, such as `1.50`, or `1000` for a C#
 * `double`) encodes to the same values written the way the game writes
 * them, not to the same bytes. The player's sync secret (`playerS`) and email
 * (`playerE`) decode to `Redacted` values, so printing or logging a decoded
 * save does not show them; encoding writes them back as they were.
 *
 * The sync server holds the save zlib-compressed, without the player's
 * secret and email ({@link SaveDataFromBytes}): the game's
 * `com.nimblebit.nbsync.SyncPush` cuts those out and compresses the rest with
 * `NBSync.compress`, which on the emulator gave the same bytes as zlib's
 * defaults.
 *
 * @since 1.0.0
 */

import type * as SchemaAST from "effect/SchemaAST";

import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import * as SchemaIssue from "effect/SchemaIssue";
import * as SchemaTransformation from "effect/SchemaTransformation";

import * as NimblebitConfig from "@tinyburg/nimblebit-sdk/NimblebitConfig";

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
 * (`1000.0`), where an integer holding the same value is `1000`, so the
 * reader keeps such a number in this wrapper and the writer formats it back
 * the way the game does. `single` marks a C# `float`, whose shortest text can
 * be shorter than a double's.
 *
 * @since 1.0.0
 * @category Models
 */
export class JsonDouble {
    readonly value: number;
    readonly single: boolean;
    constructor(value: number, single = false) {
        this.value = value;
        this.single = single;
    }
}

class JsonSyntaxError {
    readonly message: string;
    constructor(message: string) {
        this.message = message;
    }
}

const numberLiteral = /(-?(?:0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?)/y;

const readJson = (text: string): JsonValue => {
    let at = 0;
    const fail = (message: string): never => {
        throw new JsonSyntaxError(`${message} at offset ${at}`);
    };
    const skipSpace = (): void => {
        while (at < text.length && " \t\n\r".includes(text.charAt(at))) at++;
    };
    const literal = (word: string): void => {
        if (!text.startsWith(word, at)) fail(`Expected ${word}`);
        at += word.length;
    };
    const readString = (): string => {
        at++;
        let out = "";
        for (;;) {
            const char = text[at];
            if (char === undefined) return fail("Unterminated string");
            if (char === '"') {
                at++;
                return out;
            }
            if (char < " ") return fail("Control character in string");
            if (char !== "\\") {
                out += char;
                at++;
                continue;
            }
            const escape = text[at + 1];
            const simple =
                escape === undefined
                    ? undefined
                    : { '"': '"', "\\": "\\", "/": "/", b: "\b", f: "\f", n: "\n", r: "\r", t: "\t" }[escape];
            if (simple !== undefined) {
                out += simple;
                at += 2;
            } else if (escape === "u" && /^[\dA-Fa-f]{4}$/.test(text.slice(at + 2, at + 6))) {
                out += String.fromCharCode(Number.parseInt(text.slice(at + 2, at + 6), 16));
                at += 6;
            } else {
                return fail("Invalid escape");
            }
        }
    };
    const readNumber = (): number | bigint | JsonDouble => {
        numberLiteral.lastIndex = at;
        const match = numberLiteral.exec(text);
        if (match === null) return fail("Unexpected character");
        at = numberLiteral.lastIndex;
        const value = Number(match[1]);
        if (match[2] !== undefined || match[3] !== undefined) return new JsonDouble(value);
        return Number.isSafeInteger(value) ? value : BigInt(match[1]);
    };
    const readValue = (): JsonValue => {
        skipSpace();
        switch (text[at]) {
            case "{": {
                at++;
                const object: Record<string, JsonValue> = {};
                skipSpace();
                if (text[at] === "}") {
                    at++;
                    return object;
                }
                for (;;) {
                    skipSpace();
                    if (text[at] !== '"') return fail("Expected a key");
                    const key = readString();
                    skipSpace();
                    literal(":");
                    // defineProperty, so that a "__proto__" key is a key
                    Object.defineProperty(object, key, {
                        value: readValue(),
                        enumerable: true,
                        writable: true,
                        configurable: true,
                    });
                    skipSpace();
                    if (text[at] === "}") {
                        at++;
                        return object;
                    }
                    literal(",");
                }
            }
            case "[": {
                at++;
                const array: Array<JsonValue> = [];
                skipSpace();
                if (text[at] === "]") {
                    at++;
                    return array;
                }
                for (;;) {
                    array.push(readValue());
                    skipSpace();
                    if (text[at] === "]") {
                        at++;
                        return array;
                    }
                    literal(",");
                }
            }
            case '"':
                return readString();
            case "t":
                literal("true");
                return true;
            case "f":
                literal("false");
                return false;
            case "n":
                literal("null");
                return null;
            case undefined:
                return fail("Unexpected end of input");
            default:
                return readNumber();
        }
    };
    const value = readValue();
    skipSpace();
    if (at !== text.length) fail("Unexpected text after the value");
    return value;
};

/**
 * `value` in .NET's general format with `precision` significant digits
 * (`ToString("G17")` and the like): trailing zeros dropped, and exponent
 * notation (`1.5E+20`, `1E-05`) when the exponent is -5 or less, or at least
 * `precision`.
 */
const formatGeneral = (value: number, precision: number): string => {
    const exponential = value.toExponential(precision - 1);
    const split = exponential.indexOf("e");
    const mantissa = exponential.slice(0, split);
    const exponent = Number(exponential.slice(split + 1));
    const negative = mantissa.startsWith("-");
    const digits = mantissa.replace(/^-/, "").replace(".", "").replace(/0+$/, "") || "0";
    const sign = negative ? "-" : "";
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

/**
 * A C# `double` or `float` as Newtonsoft.Json writes it in this game:
 * `ToString("R")` the way Unity's runtime does it, which tries 15 significant
 * digits (7 for a float) and falls back to 17 (9) when those do not read back
 * as the same value, and `.0` added when the text would otherwise read as an
 * integer.
 */
const formatFloat = ({ single, value }: JsonDouble): string => {
    if (Number.isNaN(value)) return "NaN";
    if (!Number.isFinite(value)) return value > 0 ? "Infinity" : "-Infinity";
    if (value === 0) return Object.is(value, -0) ? "-0.0" : "0.0";
    const [short, long] = single ? [7, 9] : [15, 17];
    const roundTrips = (text: string): boolean =>
        single ? Math.fround(Number(text)) === Math.fround(value) : Number(text) === value;
    const shortText = formatGeneral(value, short);
    const text = roundTrips(shortText) ? shortText : formatGeneral(value, long);
    return /[.E]/.test(text) ? text : `${text}.0`;
};

const quote = (text: string): string => {
    let out = '"';
    for (const char of text) {
        const code = char.charCodeAt(0);
        if (char === '"') out += '\\"';
        else if (char === "\\") out += "\\\\";
        else if (char === "\n") out += "\\n";
        else if (char === "\r") out += "\\r";
        else if (char === "\t") out += "\\t";
        else if (char === "\b") out += "\\b";
        else if (char === "\f") out += "\\f";
        else if (code < 0x20 || code === 0x85 || code === 0x2028 || code === 0x2029) {
            out += `\\u${code.toString(16).padStart(4, "0")}`;
        } else out += char;
    }
    return `${out}"`;
};

const writeJson = (value: unknown): string => {
    if (value === null) return "null";
    if (value instanceof JsonDouble) return formatFloat(value);
    switch (typeof value) {
        case "boolean":
            return value ? "true" : "false";
        case "bigint":
            return value.toString();
        case "number":
            if (!Number.isFinite(value)) throw new JsonSyntaxError(`Cannot write ${value} as an integer`);
            return String(value);
        case "string":
            return quote(value);
        case "object":
            if (Array.isArray(value)) return `[${value.map(writeJson).join(",")}]`;
            return `{${Object.entries(value)
                .filter(([, item]) => item !== undefined)
                .map(([key, item]) => `${quote(key)}:${writeJson(item)}`)
                .join(",")}}`;
        default:
            throw new JsonSyntaxError(`Cannot write a ${typeof value}`);
    }
};

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

/**
 * Any JSON value, for the parts of the save the game keeps as
 * `Dictionary<string, object>` with no fixed shape, and for keys a newer game
 * version adds. A float literal stays a {@link JsonDouble}, so it writes back
 * as it was read.
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
 * {@link JsonDouble}, so that a whole number writes back as `1000.0`.
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
 * A C# `float` (`System.Single`), like {@link Double} but written with the
 * shortest text that reads back as the same 32-bit float.
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

const minSafeInteger = BigInt(Number.MIN_SAFE_INTEGER);
const maxSafeInteger = BigInt(Number.MAX_SAFE_INTEGER);

/**
 * A C# `long` (`System.Int64`) that can go past 2^53, such as `DateTime`
 * ticks, decoded to a `bigint` so that no digit is lost. It encodes to a
 * number when a double holds the value exactly, and to a `bigint` otherwise.
 *
 * @since 1.0.0
 * @category Primitives
 */
export const Long = Schema.Union([Schema.Int, Schema.BigInt]).pipe(
    Schema.decodeTo(
        Schema.BigInt,
        SchemaTransformation.transform({
            decode: (value: number | bigint): bigint => (typeof value === "bigint" ? value : BigInt(value)),
            encode: (value: bigint): number | bigint =>
                value >= minSafeInteger && value <= maxSafeInteger ? Number(value) : value,
        })
    )
);

/**
 * A dictionary with keys that vary, such as piece ids or friend codes.
 */
const Dictionary = <Value extends Schema.Top>(value: Value) => Schema.Record(Schema.String, value);

/**
 * Keeps keys a struct does not model, so that a save from a newer game
 * version still writes back whole. Encoding writes them after the modeled
 * keys.
 */
const withRest = <Fields extends Schema.Struct.Fields>(fields: Fields) =>
    Schema.StructWithRest(Schema.Struct(fields), [Schema.Record(Schema.String, JsonValue)]);

// ---------------------------------------------------------------------------
// Save items
// ---------------------------------------------------------------------------

/**
 * What the sync server last told the game about a friend (`LTFriendMeta`):
 * their level, avatar and game version. Newtonsoft.Json writes the class's
 * public fields, which these keys are; a friend added by code has none
 * (`m` is null) until the game fetches it, and no captured save had one, so
 * every key is optional here.
 *
 * @since 1.0.0
 * @category Save items
 */
export const LTFriendMeta = withRest({
    level: Schema.optionalKey(Schema.Int),
    avatar: Schema.optionalKey(Schema.NullOr(Dictionary(JsonValue))),
    vip: Schema.optionalKey(Schema.Int),
    ts: Schema.optionalKey(Schema.Int),
    rpid: Schema.optionalKey(Schema.NullOr(Schema.String)),
    rfid: Schema.optionalKey(Schema.NullOr(Schema.String)),
    mg: Schema.optionalKey(Schema.Int),
    ver: Schema.optionalKey(Schema.NullOr(Schema.String)),
});

/**
 * A friend (`LTFriend`): their player id (`i`), the name the player gave them
 * (`n`), what the server last said about them (`m`), and `l`, a C# `long`
 * the game leaves 0 for a friend added by code.
 *
 * @since 1.0.0
 * @category Save items
 */
export const LTFriend = withRest({
    i: Schema.String,
    n: Schema.String,
    m: Schema.NullOr(LTFriendMeta),
    l: Long,
});

/**
 * A mission, as `LTMissionInfo.ToDict` writes it: a character's mission in
 * the player's `charMissions`, or the tower's current `mission`. `id` is a
 * mission id from the missions table and `type` the `LTMissionType` value
 * (Newtonsoft.Json writes enums as numbers); the rest depends on the kind of
 * mission. No captured save held a mission, so the keys come from the
 * game's code and are all optional here.
 *
 * @since 1.0.0
 * @category Save items
 */
export const Mission = withRest({
    id: Schema.optionalKey(Schema.String),
    type: Schema.optionalKey(Schema.Int),
    propCount: Schema.optionalKey(Schema.Int),
    sourceUfid: Schema.optionalKey(Long),
    missionUfid: Schema.optionalKey(Long),
    headTop: Schema.optionalKey(Schema.NullOr(Schema.String)),
    head: Schema.optionalKey(Schema.NullOr(Schema.String)),
    torso: Schema.optionalKey(Schema.NullOr(Schema.String)),
    legs: Schema.optionalKey(Schema.NullOr(Schema.String)),
});

/**
 * A minifigure, as `LTMinifigController.ToDSO` writes it: a resident, worker
 * or visitor in the tower's `figs`, or the tower's `doorman`. The four piece
 * ids (`htPiece` head top, `hPiece` head, `tPiece` torso, `lPiece` legs) are
 * ids from the pieces table, and the floor ids are content ids from the
 * floors table, empty when the minifigure has no home or job.
 *
 * @since 1.0.0
 * @category Save items
 */
export const Minifig = withRest({
    ufid: Long,
    fname: Schema.String,
    dreamFloor: Schema.String,
    homeFloor: Schema.String,
    workFloor: Schema.String,
    vip: Schema.Int,
    skCre: Schema.Int,
    skFoo: Schema.Int,
    skSer: Schema.Int,
    skRec: Schema.Int,
    skRet: Schema.Int,
    htPiece: Schema.String,
    hPiece: Schema.String,
    tPiece: Schema.String,
    lPiece: Schema.String,
    dreamed: Schema.Boolean,
    hc: Schema.String,
    from: Schema.String,
});

/**
 * A floor of the tower, as `LTFloorController.ToDSO` writes it. `content` is
 * the floor's id in the floors table, `resIds` and `workerIds` are the
 * `ufid`s of the minifigures living and working there, and `openDate`,
 * `prodOutTimes` and `stockArrivalTimes` (one per product tier) are C#
 * `long` times, 0 in every captured save, read as `bigint`s in case they hold
 * `DateTime` ticks.
 *
 * @since 1.0.0
 * @category Save items
 */
export const Floor = withRest({
    content: Schema.String,
    level: Schema.Int,
    gold: Schema.Boolean,
    resIds: Schema.Array(Long),
    workerIds: Schema.Array(Long),
    openDate: Long,
    prodOutTimes: Schema.Array(Long),
    stockArrivalTimes: Schema.Array(Long),
    brickColor: Schema.Int,
});

/**
 * The player's progress, as `LTPlayer.PlayerDict` writes it into the save's
 * `playerDict`. `pieces` and `foundPieces` count the pieces owned and found
 * by piece id, `sets` holds the floors, roofs, lifts and skylines unlocked
 * (by set id), `foundChars`, `charMissions` and `charLevels` the hidden characters
 * found, their missions and their levels, and `pFees` the parking fees by
 * vehicle. `ageEnteredTicks` and `timestamp` are C# `DateTime` ticks.
 *
 * @since 1.0.0
 * @category Save items
 */
export const Player = withRest({
    tp: Schema.Int,
    tut: Schema.Int,
    coins: Double,
    bux: Schema.Int,
    gold: Schema.Int,
    maxgold: Schema.Int,
    foundBux: Schema.Int,
    ltv: Schema.Int,
    foundPieces: Dictionary(Schema.Int),
    pieces: Dictionary(Schema.Int),
    sets: Dictionary(Schema.Boolean),
    foundChars: Dictionary(Schema.Boolean),
    charMissions: Dictionary(Mission),
    charLevels: Dictionary(Schema.Int),
    ageEnteredTicks: Long,
    isAdult: Schema.Boolean,
    clubDayRem: Schema.Int,
    playDay: Schema.Int,
    playTimeToday: Double,
    totalPlayTime: Double,
    clubTrialed: Schema.Boolean,
    infChecked: Schema.Boolean,
    starterBought: Schema.Boolean,
    reqFloor: Schema.String,
    reqPiece: Schema.String,
    rHand: Schema.Boolean,
    autoLift: Schema.Boolean,
    redMot: Schema.Boolean,
    muteBB: Schema.Boolean,
    muteQS: Schema.Boolean,
    buxTip: Schema.Int,
    timestamp: Long,
    wnShown: Schema.String,
    pFees: Dictionary(Double),
});

/**
 * The tower, as `LTowerController.ToDSO` writes it into the save's
 * `towerDict`: the skyline, roof and lift set ids, the floors from the lobby
 * up, the doorman and the other minifigures, the current mission (only while
 * one is running) and the BrickBook posts, whose shape this module leaves
 * open. `liftSpeed` is a C# `float`. `lastRentDay`, `lastDailyPiece` and
 * `nextDailyCol` are C# `long`s, 0 in every captured save, read as `bigint`s
 * in case they hold `DateTime` ticks.
 *
 * @since 1.0.0
 * @category Save items
 */
export const Tower = withRest({
    skyline: Schema.String,
    roof: Schema.String,
    lift: Schema.String,
    liftSpeed: Float,
    topColor: Schema.Int,
    lastRentDay: Long,
    lastDailyPiece: Long,
    nextDailyCol: Long,
    nextDailyIndex: Schema.Int,
    floors: Schema.Array(Floor),
    doorman: Minifig,
    lifeFigs: Schema.Int,
    figs: Schema.Array(Minifig),
    mission: Schema.optionalKey(Mission),
    bbPosts: Schema.Array(Dictionary(JsonValue)),
    bbUnread: Schema.Int,
});

/**
 * The save (`LTSave`): who the player is, their friends and the friends they
 * visited, tipped and blocked, and the player and tower dictionaries. The
 * game leaves `playerDict` and `towerDict` null until it first saves a built
 * tower. `timestamp` is C# `DateTime` ticks.
 *
 * `playerI` is the player's id and `playerS` their sync secret (`playerE`
 * their email once registered, null until then), so a save string on the
 * device should be handled like a credential. `playerS` and `playerE` decode
 * to `Redacted` values (`NimblebitConfig.PlayerAuthKeySchema` and
 * `NimblebitConfig.PlayerEmailSchema` from `@tinyburg/nimblebit-sdk`), so
 * printing or logging a decoded save does not show them, and encode back to
 * the same strings. `playerS` must be a UUID, as the sync server hands it
 * out, or null, which is what Newtonsoft.Json writes for a C# string the game
 * never set (no captured save had a null `playerS`). The copy the game pushes
 * to the sync server has `playerS` and `playerE` cut out
 * (`com.nimblebit.nbsync.SyncPush`), which is why they are optional.
 *
 * @since 1.0.0
 * @category Save items
 */
export const LTSave = withRest({
    playerI: Schema.String,
    playerS: Schema.optionalKey(Schema.NullOr(NimblebitConfig.PlayerAuthKeySchema)),
    playerR: Schema.Int,
    playerE: Schema.optionalKey(Schema.NullOr(NimblebitConfig.PlayerEmailSchema)),
    pVer: Schema.String,
    timestamp: Long,
    friends: Schema.Array(LTFriend),
    visits: Dictionary(Long),
    vtips: Dictionary(Long),
    blocked: Schema.Array(Schema.String),
    playerDict: Schema.NullOr(Player),
    towerDict: Schema.NullOr(Tower),
});

const fromJsonError = (error: unknown, input: unknown, options: SchemaAST.ParseOptions): SchemaIssue.Issue =>
    new SchemaIssue.InvalidValue(
        { message: error instanceof JsonSyntaxError ? error.message : String(error) },
        input,
        options
    );

/**
 * The save string to its JSON value and back, both as Newtonsoft.Json reads
 * and writes them.
 */
const SaveJson = SchemaTransformation.transformEffect({
    decode: (text: string, options): Effect.Effect<JsonValue, SchemaIssue.Issue> =>
        Effect.try({ try: () => readJson(text), catch: (error) => fromJsonError(error, text, options) }),
    encode: (value: JsonValue, options): Effect.Effect<string, SchemaIssue.Issue> =>
        Effect.try({ try: () => writeJson(value), catch: (error) => fromJsonError(error, value, options) }),
});

/**
 * Any JSON text to its {@link JsonValue} and back, reading and writing
 * numbers the way Newtonsoft.Json does: C# longs past 2^53 stay whole, and a
 * number written with a decimal point keeps it.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const NewtonsoftJson: Schema.decodeTo<Schema.Codec<JsonValue>, Schema.String> = Schema.String.pipe(
    Schema.decodeTo(JsonValue, SaveJson)
);

/**
 * LEGO Tower's save string, as `LTSave.ToJson` writes it and
 * `LTPlayer.LoadFromDisk` reads it back, decoded to an {@link LTSave}.
 *
 * Decoding keeps keys the schemas do not model, at the top level and in every
 * object of the save (friends, missions, minifigures, floors, the player and
 * tower dictionaries), and encoding writes them back. Encoding a save string
 * the game wrote gives back the same bytes, except that integer-like keys
 * (the piece ids some dictionaries are keyed by) come first in their object
 * in ascending order, and that in each object the keys this module does not
 * model come after the ones it does, which are written in the order game
 * version 1.27.2 writes them. Other JSON that decodes (whitespace, other
 * escapes or number spellings) encodes to the same values in the game's
 * formatting, not to the same bytes.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const SaveData = NewtonsoftJson.pipe(
    Schema.decodeTo(LTSave, SchemaTransformation.passthroughSupertype<(typeof LTSave)["Encoded"], JsonValue>())
);

const streamThrough = (bytes: Uint8Array, transform: CompressionStream | DecompressionStream): Promise<Uint8Array> =>
    new Response(new Blob([bytes.slice()]).stream().pipeThrough(transform))
        .arrayBuffer()
        .then((buffer) => new Uint8Array(buffer));

/**
 * zlib-compressed UTF-8 to the string and back, as the game's
 * `com.nimblebit.nbsync.NBSync.compress` (`java.util.zip.Deflater` with its
 * defaults, then Base64) and `decompress` do it.
 */
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
 * A save as the sync server holds it: the `data` of a sync pull, after
 * Base64 decoding, is the save string compressed with zlib. The game pushes
 * it from `com.nimblebit.nbsync.SyncPush`, which reads the save from
 * PlayerPrefs, cuts out `playerS` and `playerE`, and compresses it with
 * `NBSync.compress` (`Deflater`, then Base64 with `NO_WRAP`); a pull goes
 * back through `NBSync.decodeSave` (Base64, `Inflater`) to
 * `LTPlayer.HandleSyncSave`. The game's `NBSync.encodeSave` gave exactly
 * Base64 of zlib's default compression on the emulator; no server response
 * was fetched to compare. Decoding and encoding are asynchronous (they use
 * the platform's `DecompressionStream` and `CompressionStream`), so use the
 * effectful or promise based decode and encode functions with it.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const SaveDataFromBytes = Schema.Uint8Array.pipe(Schema.decodeTo(SaveData, ZlibUtf8));
