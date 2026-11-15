/**
 * Disco Zoo's save (game version 1.6.3, save `dataVersion` 14).
 *
 * The game keeps its state in two `DataManager`s. The "global" one holds the
 * `PlayerData`, `ZooData`, `StatsData`, `QuestManager`, `PetManager` and
 * `LoonManager`, the "local" one the `SceneryData`, `SettingsData` and
 * `StoreData`. `DataManager.GetSaveDataString` writes each with the game's
 * MiniJson as a JSON object from the data's name to the JSON string of its
 * `GetJSON()` (so every item is JSON inside a JSON string), and
 * `DataManager.LoadDataFromString` reads it back. The game writes those two
 * strings to `global.data` and `local.data` in its files directory, and
 * `CloudManager.Save` copies them into a `CloudSave`, whose `ToJson()` it
 * keeps in PlayerPrefs under `discozoo` (`CloudManager.SaveKey`). That string,
 * `{"localDataString":...,"globalDataString":...,"dataVersion":14,"xp":...}`,
 * is {@link SaveData}; {@link GlobalData} and {@link LocalData} are the two
 * `DataManager` strings.
 *
 * For the sync server, `NBSync.savePlayer` hands the PlayerPrefs key
 * (`NBSync._prefName`, also `discozoo`) to the game's Java `SyncPush`
 * service, which reads that preference, URL-decodes it, removes the player's
 * salt and email (`,\"playerSalt\":\"...\"` and `,\"playerEmail\":\"...\"`
 * inside the nested `SettingsData`), and posts `NBSync.compress` of it: UTF-8,
 * zlib (`java.util.zip.Deflater` at its default level) and base64. So the
 * bytes the SDK's sync pull returns (`data` after base64) are the
 * zlib-compressed save without those two keys, which
 * {@link SaveDataFromBytes} reads; the salt and email are optional for that
 * reason. Both decode to `Redacted` values (`""` while the game has none), so
 * printing or logging a decoded save does not show them.
 *
 * How this was determined: saves taken from the game on an emulator with a
 * Frida agent (`GetSaveDataString` of both managers, `CloudSave.ToJson`, the
 * PlayerPrefs value and the two files, which matched each other, for a fresh
 * game and for one grown with the game's own methods: debug unlocks, stats,
 * hats, decorations, toys, name tags, pets, a generated scenery lot, and pens
 * loaded through `LoadDataFromString` and written back by the game), the
 * field types the game's classes declare, the game's `MiniJson.Json.Serialize`
 * run on a test string, and the game's Java code (disassembly of `NBSync` and
 * `SyncPush`). The test fixtures are those saves, with the player's id and
 * salt replaced by fakes.
 *
 * Numbers the game writes as strings stay strings in the save, so C# `long`
 * values (`DateTime` ticks, timers, coin totals) decode to `bigint` without
 * losing digits.
 *
 * Every JSON object in the save (the `CloudSave`, the two `DataManager`
 * objects, each item and the objects inside items, such as pens, quests, pets
 * and scenery lots) keeps the keys this module does not model, such as ones a
 * newer game version adds, as JSON values beside the keys it does, and
 * encoding writes them back. Decoding never drops a key the game wrote.
 *
 * Round trips: decoding a save string the game wrote and encoding it again
 * gives back the same string, byte for byte, whenever every key in it is one
 * this module models, as in every save game version 1.6.3 writes. Every
 * known exception:
 *
 * - Encoding writes each object's unknown keys after its known keys (in the
 *   order they were read), so unknown keys read before or between known ones
 *   move to the end of their object.
 * - Unknown keys' values are read with `JSON.parse` and written the way
 *   MiniJson writes them, so strings, booleans, `null` and integers up to
 *   2^53 come back as they were, but a number that JavaScript writes
 *   differently (exponent notation such as `1E-05`, a trailing `.0`, an
 *   integer past 2^53) changes, and keys that look like array indexes
 *   (`"5"`) inside an unknown object move to its start.
 * - A key of an {@link AccountData} that looks like an array index would move
 *   to the start too (the game's keys are names).
 * - Text the game does not write (whitespace, other escapes, floats not in
 *   `float.ToString()` form, a key written twice in a JSON object, which
 *   keeps the last) decodes, but encodes in the game's form.
 *
 * {@link SaveDataFromBytes} gives back the same save string, with the same
 * exceptions, but not necessarily the same compressed bytes.
 *
 * @since 1.0.0
 */

import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import * as SchemaGetter from "effect/SchemaGetter";
import * as SchemaIssue from "effect/SchemaIssue";
import * as SchemaTransformation from "effect/SchemaTransformation";

import * as NimblebitConfig from "@tinyburg/nimblebit-sdk/NimblebitConfig";
import * as NimblebitSchema from "@tinyburg/nimblebit-sdk/NimblebitSchema";

// ---------------------------------------------------------------------------
// MiniJson
// ---------------------------------------------------------------------------

// MiniJson's string escaping: quotes, backslashes and the named control
// characters, and `\uXXXX` (lowercase hex, per UTF-16 unit) for everything
// outside printable ASCII. Checked against the game's `MiniJson.Json.Serialize`.
const quote = (string: string): string => {
    let out = '"';
    for (let index = 0; index < string.length; index++) {
        const code = string.charCodeAt(index);
        if (code === 0x22) out += '\\"';
        else if (code === 0x5c) out += "\\\\";
        else if (code === 0x08) out += "\\b";
        else if (code === 0x0c) out += "\\f";
        else if (code === 0x0a) out += "\\n";
        else if (code === 0x0d) out += "\\r";
        else if (code === 0x09) out += "\\t";
        else if (code >= 0x20 && code <= 0x7e) out += string[index];
        else out += `\\u${code.toString(16).padStart(4, "0")}`;
    }
    return `${out}"`;
};

interface JsonError {
    readonly message: string;
}

const writeMiniJson = (value: unknown): string => {
    if (value === null) return "null";
    if (typeof value === "boolean") return value ? "true" : "false";
    if (typeof value === "string") return quote(value);
    if (typeof value === "number") {
        if (!Number.isFinite(value)) throw { message: `Cannot write ${value}` } satisfies JsonError;
        return String(value);
    }
    if (Array.isArray(value)) return `[${value.map(writeMiniJson).join(",")}]`;
    if (typeof value === "object") {
        const entries = Object.entries(value).filter(([, item]) => item !== undefined);
        return `{${entries.map(([key, item]) => `${quote(key)}:${writeMiniJson(item)}`).join(",")}}`;
    }
    throw { message: `Cannot write a ${typeof value}` } satisfies JsonError;
};

const MiniJsonString = new SchemaTransformation.Transformation(
    SchemaGetter.parseJson<string>(),
    SchemaGetter.transformEffect((value: Schema.MutableJson, options): Effect.Effect<string, SchemaIssue.Issue> => {
        try {
            return Effect.succeed(writeMiniJson(value));
        } catch (error) {
            const message = typeof error === "object" && error !== null && "message" in error ? error.message : error;
            return Effect.fail(new SchemaIssue.InvalidValue({ message: String(message) }, value, options));
        }
    })
);

/**
 * A JSON string as the game's MiniJson writes it, decoded with `schema`.
 * Encoding writes MiniJson's text again: no whitespace, keys in the order the
 * encoded value has them (for the save's objects, the keys this module models
 * in the game's order, then the ones it does not), and non-ASCII characters
 * escaped.
 *
 * @since 1.0.0
 * @category Primitives
 */
export const MiniJson = <S extends Schema.Top>(schema: S) =>
    Schema.String.pipe(Schema.decodeTo(Schema.MutableJson, MiniJsonString), Schema.decodeTo(schema));

/**
 * A JSON object with the keys `fields` models, which also keeps every other
 * key as a JSON value, so that a save from a newer game version still writes
 * back whole. The rest record only takes keys that are not in `fields`, so the
 * known keys' decoded values (`bigint`, `Redacted`, ...) need not be JSON.
 */
const withRest = <Fields extends Schema.Struct.Fields>(fields: Fields) => {
    const known = new Set(Object.keys(fields));
    return Schema.StructWithRest(Schema.Struct(fields), [
        Schema.Record(Schema.String.check(Schema.makeFilter((key: string) => !known.has(key))), Schema.Json),
    ]);
};

// ---------------------------------------------------------------------------
// Values the game writes as strings
// ---------------------------------------------------------------------------

const canonicalInt = /^-?(?:0|[1-9]\d*)$/;

/**
 * A C# `int` the game writes as a string (`"42"`).
 *
 * @since 1.0.0
 * @category Primitives
 */
export const IntString = Schema.String.check(Schema.isPattern(canonicalInt)).pipe(
    Schema.decodeTo(Schema.Int, SchemaTransformation.numberFromString)
);

/**
 * A C# `long` the game writes as a string, decoded to a `bigint` since some
 * (`DateTime` ticks) do not fit a double.
 *
 * @since 1.0.0
 * @category Primitives
 */
export const LongString = Schema.String.check(Schema.isPattern(canonicalInt)).pipe(
    Schema.decodeTo(Schema.BigInt, SchemaTransformation.bigintFromString)
);

/**
 * A C# `bool` the game writes as `"1"` or `"0"`.
 *
 * @since 1.0.0
 * @category Primitives
 */
export const BitString = Schema.Literals(["0", "1"]).pipe(
    Schema.decodeTo(
        Schema.Boolean,
        SchemaTransformation.transform({
            decode: (bit) => bit === "1",
            encode: (value): "0" | "1" => (value ? "1" : "0"),
        })
    )
);

// C# `float.ToString()` (Mono's "G7"): up to 7 significant digits, fixed
// notation for exponents from -4 to 6 and `1.5E-05` style otherwise.
const formatSingle = (value: number): string => {
    if (value === 0) return "0";
    const [mantissa = "", exponentText = "0"] = value.toExponential(6).split("e");
    const exponent = Number(exponentText);
    const digits = mantissa.replace("-", "").replace(".", "").replace(/0+$/, "");
    const sign = value < 0 ? "-" : "";
    if (exponent < -4 || exponent >= 7) {
        const significand = digits.length > 1 ? `${digits[0]}.${digits.slice(1)}` : digits;
        return `${sign}${significand}E${exponent < 0 ? "-" : "+"}${String(Math.abs(exponent)).padStart(2, "0")}`;
    }
    if (exponent < 0) return `${sign}0.${"0".repeat(-exponent - 1)}${digits}`;
    const whole = digits.slice(0, exponent + 1).padEnd(exponent + 1, "0");
    const fraction = digits.slice(exponent + 1);
    return fraction === "" ? `${sign}${whole}` : `${sign}${whole}.${fraction}`;
};

/**
 * A C# `float` the game writes as a string with `float.ToString()`, such as
 * `"0.05211356"` or `"4538.044"`. It decodes to a number and encodes with the
 * same up-to-7-significant-digit formatting, which gives back the game's text.
 *
 * @since 1.0.0
 * @category Primitives
 */
export const SingleString = Schema.String.check(Schema.isPattern(/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:E[+-]\d{2,})?$/)).pipe(
    Schema.decodeTo(
        Schema.Finite,
        SchemaTransformation.transform({ decode: (text) => Number(text), encode: formatSingle })
    )
);

/**
 * A C# `Dictionary<string, int>` the game writes as `key:value` pairs joined
 * by `,` (`DZUtils.StringifyDict`), such as `"Moon:1,Farm:1"`. Keys are names
 * (regions, tutorials, stat ids), which keep their order in a record; a key
 * that looks like an array index (`"5"`) would move to the start. A key that
 * appears twice fails to decode instead of losing one of its counts.
 *
 * @since 1.0.0
 * @category Primitives
 */
export const AccountData = Schema.String.pipe(
    NimblebitSchema.split(),
    Schema.decodeTo(
        Schema.Record(Schema.String, Schema.Int),
        SchemaTransformation.transformEffect({
            decode: (pairs: ReadonlyArray<string>, options) => {
                const out: Record<string, number> = {};
                for (const pair of pairs) {
                    const separator = pair.lastIndexOf(":");
                    const count = pair.slice(separator + 1);
                    if (separator < 0 || !canonicalInt.test(count)) {
                        return Effect.fail(
                            new SchemaIssue.InvalidValue({ message: 'Expected "key:value"' }, pair, options)
                        );
                    }
                    const key = pair.slice(0, separator);
                    if (Object.hasOwn(out, key)) {
                        return Effect.fail(
                            new SchemaIssue.InvalidValue({ message: `Duplicate key "${key}"` }, pair, options)
                        );
                    }
                    Object.defineProperty(out, key, {
                        value: Number(count),
                        enumerable: true,
                        writable: true,
                        configurable: true,
                    });
                }
                return Effect.succeed(out);
            },
            encode: (record) => Effect.succeed(Object.entries(record).map(([key, count]) => `${key}:${count}`)),
        })
    )
);

/**
 * How many of each hat, decoration or toy: the game's `HatSet`, `DecorSet` and
 * `ToySet`, written as the item's character and its count, joined by `;` (for
 * example `"12;!1"` is two `1` hats and one `!` hat). Kept as a list of
 * entries in the game's order, since the characters include digits, which a
 * record would reorder.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const ItemSet = Schema.String.pipe(
    NimblebitSchema.split({ separator: ";" }),
    Schema.decodeTo(
        Schema.Array(Schema.Struct({ character: Schema.String, count: Schema.Int })),
        SchemaTransformation.transformEffect({
            decode: (entries: ReadonlyArray<string>, options) => {
                const out: Array<{ readonly character: string; readonly count: number }> = [];
                for (const entry of entries) {
                    const count = entry.slice(1);
                    if (entry.length < 2 || !canonicalInt.test(count)) {
                        return Effect.fail(
                            new SchemaIssue.InvalidValue(
                                { message: "Expected a character and a count" },
                                entry,
                                options
                            )
                        );
                    }
                    out.push({ character: entry.slice(0, 1), count: Number(count) });
                }
                return Effect.succeed<ReadonlyArray<{ readonly character: string; readonly count: number }>>(out);
            },
            encode: (entries) => Effect.succeed(entries.map(({ character, count }) => `${character}${count}`)),
        })
    )
);

/**
 * The decorations placed in a pen (the game's `DecorPenSet`): one slot per
 * spot, joined by `;`, each holding a decoration's character or nothing (an
 * empty pen is `";;;"`).
 *
 * @since 1.0.0
 * @category Schemas
 */
export const DecorPenSet = Schema.String.pipe(NimblebitSchema.split({ separator: ";" }));

/**
 * A name tag (the game's `NamedAnimalData`), written as the hat's character
 * (`-` for none), the variant index (one digit) and the name, such as
 * `"10Woolly"`. Pets without a name tag carry `"-0~~~"`.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const NamedAnimalData = Schema.String.pipe(
    Schema.decodeTo(
        Schema.Struct({
            hat: Schema.String,
            variantIndex: Schema.Int.check(Schema.isBetween({ minimum: 0, maximum: 9 })),
            name: Schema.String,
        }),
        SchemaTransformation.transformEffect({
            decode: (text: string, options) =>
                /^.\d/s.test(text)
                    ? Effect.succeed({ hat: text.slice(0, 1), variantIndex: Number(text[1]), name: text.slice(2) })
                    : Effect.fail(
                          new SchemaIssue.InvalidValue(
                              { message: "Expected a hat character, a variant digit and a name" },
                              text,
                              options
                          )
                      ),
            encode: ({ hat, name, variantIndex }) => Effect.succeed(`${hat}${variantIndex}${name}`),
        })
    )
);

/**
 * The name tags of one kind of animal (the game's `CustomPenData`), written as
 * the animal's slug, `:` and its name tags joined by `;`, such as
 * `"sheep:10Woolly;21Baa Baa"`.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const CustomPenData = Schema.String.pipe(
    Schema.decodeTo(
        Schema.Struct({ animalSlug: Schema.String, namedAnimals: Schema.String }),
        SchemaTransformation.transformEffect({
            decode: (text: string, options) => {
                const separator = text.indexOf(":");
                return separator < 0
                    ? Effect.fail(new SchemaIssue.InvalidValue({ message: 'Expected "animal:names"' }, text, options))
                    : Effect.succeed({ animalSlug: text.slice(0, separator), namedAnimals: text.slice(separator + 1) });
            },
            encode: ({ animalSlug, namedAnimals }) => Effect.succeed(`${animalSlug}:${namedAnimals}`),
        })
    ),
    Schema.decodeTo(
        Schema.Struct({
            animalSlug: Schema.String,
            namedAnimals: Schema.String.pipe(
                NimblebitSchema.split({ separator: ";" }),
                Schema.decodeTo(Schema.Array(NamedAnimalData))
            ),
        })
    )
);

const commaList = Schema.String.pipe(NimblebitSchema.split());

/**
 * A list of C# `int`s the game writes joined by `,` (`StoreData`'s prices and
 * sales).
 *
 * @since 1.0.0
 * @category Primitives
 */
export const IntList = commaList.pipe(Schema.decodeTo(Schema.Array(IntString)));

// "a:b:c", three ints
const IntTriple = Schema.String.pipe(
    Schema.decodeTo(
        Schema.Tuple([Schema.Int, Schema.Int, Schema.Int]),
        SchemaTransformation.transformEffect({
            decode: (text: string, options) => {
                const [a = "", b = "", c = "", ...rest] = text.split(":");
                return rest.length === 0 && [a, b, c].every((part) => canonicalInt.test(part))
                    ? Effect.succeed([Number(a), Number(b), Number(c)] as const)
                    : Effect.fail(new SchemaIssue.InvalidValue({ message: 'Expected "int:int:int"' }, text, options));
            },
            encode: ([a, b, c]) => Effect.succeed(`${a}:${b}:${c}`),
        })
    )
);

/**
 * A path tile in a pen's scenery (the game's `PathCell`), written as
 * `col:row:shape`, where `shape` is the game's `PathShape` enum value.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const PathCell = IntTriple.pipe(
    Schema.decodeTo(
        Schema.Struct({ col: Schema.Int, row: Schema.Int, shape: Schema.Int }),
        SchemaTransformation.transform({
            decode: ([col, row, shape]) => ({ col, row, shape }),
            encode: ({ col, row, shape }) => [col, row, shape] as const,
        })
    )
);

/**
 * A scenery object in a pen (the game's `CollidableCell`), written as
 * `col:row:index`, where `index` picks one of the region theme's collidables.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const CollidableCell = IntTriple.pipe(
    Schema.decodeTo(
        Schema.Struct({ col: Schema.Int, row: Schema.Int, index: Schema.Int }),
        SchemaTransformation.transform({
            decode: ([col, row, index]) => ({ col, row, index }),
            encode: ({ col, index, row }) => [col, row, index] as const,
        })
    )
);

/**
 * A pet's quirk (the game's `PetQuirk`): the quirk's slug from `Pets.quirks`,
 * with a `+` after it for a rare one (`PetQuirk.isRare`, the only other state a
 * quirk has).
 *
 * @since 1.0.0
 * @category Schemas
 */
export const PetQuirk = Schema.String.pipe(
    Schema.decodeTo(
        Schema.Struct({ slug: Schema.String, isRare: Schema.Boolean }),
        SchemaTransformation.transform({
            decode: (text) =>
                text.endsWith("+") ? { slug: text.slice(0, -1), isRare: true } : { slug: text, isRare: false },
            encode: ({ isRare, slug }) => (isRare ? `${slug}+` : slug),
        })
    )
);

// ---------------------------------------------------------------------------
// Save items, keyed as the game's `GetJSON` methods write them
// ---------------------------------------------------------------------------

/**
 * The player's progress (the game's `PlayerData`). `currentRegion` and
 * `binocularRegion` are left out while the game has none.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const PlayerData = withRest({
    coins: IntString,
    bux: IntString,
    spaceCoins: IntString,
    xp: IntString,
    // The game's clock as `DateTime` ticks (the time of the first launch in
    // every save taken; read as UTC, the emulator's time zone)
    ticks: LongString.pipe(Schema.decodeTo(NimblebitSchema.CSharpDate)),
    totalInGameTicks: LongString,
    totalRealWorldTicks: LongString,
    discoTicksLeft: LongString,
    incidentTicksLeft: LongString,
    zoopediaPurchased: IntString,
    partyLighting: Schema.String,
    bestCarsPassed: IntString,
    bestFunkyCarsPassed: IntString,
    hasBeenFunky: BitString,
    currentRegion: Schema.optionalKey(Schema.String),
    currentSpaceRegion: Schema.String,
    tutorialAccounts: AccountData,
    unlockedRegionAccounts: AccountData,
    trophyAccounts: AccountData,
    hats: ItemSet,
    decor: ItemSet,
    toys: ItemSet,
    areToysUnlocked: BitString,
    hasReceivedSantaHats: BitString,
    hasStarterPack: BitString,
    piggyBux: IntString,
    piggyBankLevel: IntString,
    areRewardsUnlocked: BitString,
    dayIndex: IntString,
    lastDayPlayed: IntString,
    lastYearPlayed: IntString,
    weekSeed: IntString,
    numNameTags: IntString,
    binocularRegion: Schema.optionalKey(Schema.String),
});

/**
 * A pen (the game's `PenData`): the animal it holds, how many, its coins and
 * timers, and the hats, decorations and toy in it. `slug` is the pen's own
 * random id.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const PenData = withRest({
    animal: Schema.String,
    slug: Schema.String,
    count: IntString,
    bilcoins: LongString,
    awakeTicksLeft: LongString,
    buildTicksLeft: LongString,
    wakeUpBonus: IntString,
    hats: ItemSet,
    decor: DecorPenSet,
    toy: Schema.String,
});

/**
 * The zoo (the game's `ZooData`): its pens, and its name tags as
 * `CustomPenData`s joined by `|`.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const ZooData = withRest({
    penDatas: Schema.Array(PenData),
    customPenDatas: Schema.String.pipe(
        NimblebitSchema.split({ separator: "|" }),
        Schema.decodeTo(Schema.Array(CustomPenData))
    ),
});

/**
 * Lifetime totals (the game's `StatsData`), with what each currency was
 * earned on.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const StatsData = withRest({
    coinAccounts: AccountData,
    buxAccounts: AccountData,
    spaceCoinAccounts: AccountData,
    statAccounts: AccountData,
    totalCoinsEarned: IntString,
    totalBuxEarned: IntString,
    totalSpaceCoinsEarned: IntString,
    totalCoinsSpent: IntString,
    totalBuxSpent: IntString,
    totalSpaceCoinsSpent: IntString,
    totalDiamondsEarnedPreviously: IntString,
    numTimeRewinds: IntString,
    actualTimeRewinds: IntString,
    extraTimeRewinds: IntString,
    totalPetsHealed: IntString,
});

/**
 * A space quest (the game's `Quest`): its space coin reward, who asks (a
 * `QuestOwner` slug, such as `Venus`), and the animals it needs, joined by
 * `,`.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const Quest = withRest({
    reward: IntString,
    owner: Schema.String,
    animals: commaList,
});

/**
 * Space quests (the game's `QuestManager`): the animals held for them (animal
 * slug to count) and the open quests.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const QuestManager = withRest({
    heldAnimals: AccountData,
    quests: Schema.Array(Quest),
    canQuest: BitString,
});

/**
 * A pet (the game's `PetData`). `nameData` is its name tag.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const PetData = withRest({
    breedIndex: IntString,
    variationIndex: IntString,
    quality: SingleString,
    healDuration: SingleString,
    gradeIndex: IntString,
    nameData: NamedAnimalData,
    species: Schema.String,
    quirks: commaList.pipe(Schema.decodeTo(Schema.Array(PetQuirk))),
});

// `{}`, which the game writes for no pet
const NoPet = Schema.Record(Schema.String, Schema.Never);

/**
 * Pets (the game's `PetManager`): the rescue and hospital pets (`{}` when
 * there is none), the lounge and its pets, and progress towards upgrades.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const PetManager = withRest({
    nextPetID: IntString,
    totalPetsGivenAway: IntString,
    loungeSlots: IntString,
    loungeSlotsMax: IntString,
    currentUpgradeTier: IntString,
    petsGivenAwaySinceLastUpgrade: IntString,
    healTicksLeft: LongString,
    hospitalPetHealState: Schema.Literals(["None", "Injured", "Healing", "Healed"]),
    hasRescuedPet: BitString,
    rescuesUntilNextPet: IntString,
    rescuePet: Schema.Union([PetData, NoPet]),
    hospitalPet: Schema.Union([PetData, NoPet]),
    hasAdoptedPet: BitString,
    loungeRegion: Schema.String,
    loungeHats: ItemSet,
    loungeDecor: DecorPenSet,
    loungeToy: Schema.String,
    loungePets: Schema.Array(PetData),
    seenRegionSlugs: commaList,
});

/**
 * The disco ball drop game (the game's `LoonManager`). The board, upcoming
 * balls and trophies are the game's own strings, kept as they are.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const LoonManager = withRest({
    isGameOver: BitString,
    hasBeatenScore: BitString,
    score: IntString,
    bestScore: IntString,
    bestCombo: IntString,
    totalDiscoBallsMade: IntString,
    totalDiscoBallsMerged: IntString,
    totalDiscoBallHits: IntString,
    upcomingString: Schema.String,
    ballString: Schema.String,
    trophyString: Schema.String,
    totalBalls: IntString,
    dropsUntilDart: IntString,
    hasMergedDisco: BitString,
    dangerTime: SingleString,
    dangerIndex: IntString,
});

/**
 * The scenery generated for a pen (the game's `SceneryLotData`): its grid size,
 * path and scenery objects.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const SceneryLotData = withRest({
    penSlug: Schema.String,
    regionSlug: Schema.String,
    cols: IntString,
    rows: IntString,
    pathCells: commaList.pipe(Schema.decodeTo(Schema.Array(PathCell))),
    collidableCells: commaList.pipe(Schema.decodeTo(Schema.Array(CollidableCell))),
});

/**
 * The pens' scenery (the game's `SceneryData`).
 *
 * @since 1.0.0
 * @category Schemas
 */
export const SceneryData = withRest({
    sceneryLotDatas: Schema.Array(SceneryLotData),
});

/**
 * Settings and the player's sync account (the game's `SettingsData`).
 * `playerSalt` is the player's auth key and `playerEmail` the email they
 * registered with. Both decode to `Redacted` values, so that printing or
 * logging a decoded save does not show them, or to `""` while the game has
 * none (the game writes `""` for the email before the player registers, and
 * the salt is read the same way). Both are missing from the copy of the save
 * the sync server holds.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const SettingsData = withRest({
    sfxOn: Schema.Boolean,
    musicOn: Schema.Boolean,
    firstAnimalNotification: Schema.Boolean,
    allAnimalsNotification: Schema.Boolean,
    petHealedNotification: Schema.Boolean,
    toddlerModeOn: Schema.Boolean,
    isAdAgeConfirmed: Schema.Boolean,
    isSyncAgeConfirmed: Schema.Boolean,
    shouldShowNames: Schema.Boolean,
    newsVersion: Schema.Int,
    storeVersion: Schema.Int,
    hasSeenPrivacyPopup: Schema.Boolean,
    adsEnabled: Schema.Boolean,
    personalizedConsentApplies: Schema.Boolean,
    personalizedAdsEnabled: Schema.Boolean,
    cloudEnabled: Schema.Boolean,
    doNotSellData: Schema.Boolean,
    firebaseEnabled: Schema.Boolean,
    playerID: Schema.String,
    playerSalt: Schema.optionalKey(Schema.Union([Schema.Literal(""), NimblebitConfig.PlayerAuthKeySchema])),
    playerRegistered: Schema.Boolean,
    playerEmail: Schema.optionalKey(Schema.Union([Schema.Literal(""), NimblebitConfig.PlayerEmailSchema])),
    playerRegSent: Schema.Boolean,
});

/**
 * Store prices and sales (the game's `StoreData`), as last fetched.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const StoreData = withRest({
    storeBuxValues: IntList,
    storeCoinsValues: IntList,
    storeSpaceCoinsValues: IntList,
    storeBuxSales: IntList,
    storeCoinsSales: IntList,
    storeSpaceCoinsSales: IntList,
    starter_bux: Schema.Int,
    starter_coins: Schema.Int,
    starter_sale: BitString,
    piggy_base: Schema.Int,
    piggy_increment: Schema.Int,
    piggy_buxPerAnimal: Schema.Int,
    piggy_max: Schema.Int,
    piggy_sale: BitString,
    zoopedia_sale: BitString,
});

// ---------------------------------------------------------------------------
// The save
// ---------------------------------------------------------------------------

/**
 * The "global" `DataManager`'s save string (`global.data`), as
 * `GetSaveDataString` writes it and `LoadDataFromString` reads it.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const GlobalData = MiniJson(
    withRest({
        PlayerData: MiniJson(PlayerData),
        ZooData: MiniJson(ZooData),
        StatsData: MiniJson(StatsData),
        QuestManager: MiniJson(QuestManager),
        PetManager: MiniJson(PetManager),
        LoonManager: MiniJson(LoonManager),
    })
);

/**
 * The "local" `DataManager`'s save string (`local.data`), as
 * `GetSaveDataString` writes it and `LoadDataFromString` reads it.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const LocalData = MiniJson(
    withRest({
        SceneryData: MiniJson(SceneryData),
        SettingsData: MiniJson(SettingsData),
        StoreData: MiniJson(StoreData),
    })
);

/**
 * The game's `CloudSave`: both `DataManager` strings, the save's data version
 * (`Core.dataVersion`) and the player's xp. Like every object in the save, it
 * keeps keys it does not model.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const CloudSave = withRest({
    localDataString: LocalData,
    globalDataString: GlobalData,
    dataVersion: Schema.Int,
    xp: Schema.Int,
});

/**
 * The save string: `CloudSave.ToJson()`, which the game keeps in PlayerPrefs
 * under `discozoo` and the sync server stores (without the player's salt and
 * email). Decoding keeps keys the schema does not model, in every object of
 * the save, and never drops one. Encoding a decoded save gives back the
 * string the game wrote, byte for byte, except that each object's unknown keys
 * are written after its known keys, and that numbers inside unknown keys'
 * values are written the way JavaScript writes them (the module
 * documentation lists every exception).
 *
 * @since 1.0.0
 * @category Schemas
 */
export const SaveData = MiniJson(CloudSave);

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
 * `/sync/pull/` returns (what `sync_pullSave` gives), which are the
 * zlib-compressed UTF-8 save string without the player's salt and email. It
 * decompresses with the platform's `DecompressionStream`, so it only decodes
 * and encodes with the Effect or Promise APIs, not the sync ones. Compressing
 * again need not give the same bytes as the game's zlib, only bytes the game
 * reads.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const SaveDataFromBytes = Schema.Uint8Array.pipe(Schema.decodeTo(SaveData, ZlibUtf8));
