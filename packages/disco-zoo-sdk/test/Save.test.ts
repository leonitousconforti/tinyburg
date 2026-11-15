import { DateTime, Effect, Redacted, Schema } from "effect";

import * as fs from "node:fs";
import * as util from "node:util";
import * as zlib from "node:zlib";

import { assert, describe, expect, it } from "@effect/vitest";
import { Animals, Decorations, Hats, Pets, Regions, Save, Toys } from "@tinyburg/disco-zoo-sdk";

const fixture = (name: string): string => fs.readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8");

const decode = Schema.decodeUnknownEffect(Save.SaveData);
const encode = Schema.encodeEffect(Save.SaveData);

const saves = ["fresh.save", "grown-stats.save", "grown-pets.save", "grown-lounge.save", "grown-zoo.save"] as const;

// What the game's Java `SyncPush` removes before it compresses and uploads the
// save (the patterns that apply to Disco Zoo's nested `SettingsData`).
const serverCopy = (text: string): string =>
    text
        .replace(/,\\\\\\"playerSalt\\\\\\":\\\\\\".*?\\\\\\"/g, "")
        .replace(/,\\\\\\"playerEmail\\\\\\":\\\\\\".*?\\\\\\"/g, "");

// The game's SettingsData as plain JSON, for comparing with decoded values
const RawSettings = Schema.fromJsonString(
    Schema.Struct({
        localDataString: Schema.fromJsonString(
            Schema.Struct({
                SettingsData: Schema.fromJsonString(
                    Schema.Struct({ playerSalt: Schema.String, playerEmail: Schema.String })
                ),
            })
        ),
    })
);
const rawSettings = (text: string) => Schema.decodeSync(RawSettings)(text).localDataString.SettingsData;

// For JSON.stringify of a decoded save, which holds bigints
const bigintToString = (_key: string, value: unknown): unknown =>
    typeof value === "bigint" ? value.toString() : value;

const JsonText = Save.MiniJson(Schema.MutableJson);
const unknownKey = "fromANewerGame";
const unknownValue: Schema.MutableJson = { list: [1, "two", null, true, { deep: "d\u00e9j\u00e0" }], n: -7 };

// Adds an unknown key to every non-empty JSON object in every layer of a save
// (the CloudSave, both DataManager objects, every item and the objects inside
// items), as each object's first or last key, and writes the layers back as
// the game's MiniJson does.
const addUnknownKeys = (text: string, position: "first" | "last"): string => {
    const visit = (value: Schema.MutableJson): Schema.MutableJson => {
        if (typeof value === "string") return value.startsWith("{") ? addUnknownKeys(value, position) : value;
        if (Array.isArray(value)) return value.map(visit);
        if (value === null || typeof value !== "object") return value;
        const entries = Object.entries(value).map(([key, item]) => [key, visit(item)] as const);
        if (entries.length === 0) return value;
        const extra = [unknownKey, unknownValue] as const;
        return Object.fromEntries(position === "first" ? [extra, ...entries] : [...entries, extra]);
    };
    return Schema.encodeSync(JsonText)(visit(Schema.decodeSync(JsonText)(text)));
};

const animalSlugs = new Set<string>(Animals.animals.map((animal) => animal.slug));
const regionSlugs = new Set<string>(Regions.regions.map((region) => region.slug));
const hatCharacters = new Set<string>(Hats.hats.map((hat) => hat.character));
const decorationCharacters = new Set<string>(Decorations.decorations.map((decoration) => decoration.character));
const toyCharacters = new Set<string>(Toys.toys.map((toy) => toy.character));
const petSpecies = new Set<string>(Pets.species.map((species) => species.slug));
const quirkSlugs = new Set<string>(Pets.quirks.map((quirk) => quirk.slug));

describe("SaveData", () => {
    for (const name of saves) {
        it.effect(`${name} round trips byte for byte`, () =>
            Effect.gen(function* () {
                const text = fixture(name);
                const save = yield* decode(text);
                expect(yield* encode(save)).toBe(text);
            })
        );

        it.effect(`${name} as the sync server holds it round trips through the bytes`, () =>
            Effect.gen(function* () {
                const text = serverCopy(fixture(name));
                const save = yield* decode(text);
                expect(save.localDataString.SettingsData.playerSalt).toBeUndefined();
                expect(save.localDataString.SettingsData.playerEmail).toBeUndefined();
                expect(yield* encode(save)).toBe(text);

                const bytes = new Uint8Array(zlib.deflateSync(Buffer.from(text, "utf8")));
                const fromBytes = yield* Schema.decodeEffect(Save.SaveDataFromBytes)(bytes);
                const encoded = yield* Schema.encodeEffect(Save.SaveDataFromBytes)(fromBytes);
                expect(zlib.inflateSync(encoded).toString("utf8")).toBe(text);
            })
        );

        it.effect(`${name} refers only to animals, regions, items and pets the game has`, () =>
            Effect.gen(function* () {
                const save = yield* decode(fixture(name));
                const { PetManager, PlayerData, QuestManager, ZooData } = save.globalDataString;
                expect(save.dataVersion).toBe(14);
                expect(save.xp).toBe(PlayerData.xp);
                const ticks = DateTime.isDateTime(PlayerData.ticks) ? PlayerData.ticks : PlayerData.ticks.date;
                expect(DateTime.getPartUtc(ticks, "year")).toBe(2026);

                const regions = [
                    PlayerData.currentRegion,
                    PlayerData.currentSpaceRegion,
                    PlayerData.binocularRegion,
                    PetManager.loungeRegion,
                    ...Object.keys(PlayerData.unlockedRegionAccounts),
                    ...Object.keys(PlayerData.trophyAccounts),
                    ...PetManager.seenRegionSlugs,
                    ...save.localDataString.SceneryData.sceneryLotDatas.map((lot) => lot.regionSlug),
                ];
                for (const region of regions.filter((region) => region !== undefined)) {
                    expect(regionSlugs).toContain(region);
                }

                const animals = [
                    ...ZooData.penDatas.map((pen) => pen.animal),
                    ...ZooData.customPenDatas.map((names) => names.animalSlug),
                    ...Object.keys(QuestManager.heldAnimals),
                    ...QuestManager.quests.flatMap((quest) => quest.animals),
                ];
                for (const animal of animals) expect(animalSlugs).toContain(animal);

                const hats = [
                    ...PlayerData.hats,
                    ...PetManager.loungeHats,
                    ...ZooData.penDatas.flatMap((pen) => pen.hats),
                ].map((entry) => entry.character);
                for (const hat of hats) expect(hatCharacters).toContain(hat);
                for (const { hat } of ZooData.customPenDatas.flatMap((names) => names.namedAnimals)) {
                    if (hat !== "-") expect(hatCharacters).toContain(hat);
                }

                const decorations = [
                    ...PlayerData.decor.map((entry) => entry.character),
                    ...PetManager.loungeDecor,
                    ...ZooData.penDatas.flatMap((pen) => pen.decor),
                ];
                for (const decoration of decorations.filter((slot) => slot !== "")) {
                    expect(decorationCharacters).toContain(decoration);
                }

                const toys = [
                    ...PlayerData.toys.map((entry) => entry.character),
                    PetManager.loungeToy,
                    ...ZooData.penDatas.map((pen) => pen.toy),
                ];
                for (const toy of toys.filter((toy) => toy !== "")) expect(toyCharacters).toContain(toy);

                const pets = [PetManager.rescuePet, PetManager.hospitalPet, ...PetManager.loungePets].filter(
                    (pet) => "species" in pet
                );
                for (const pet of pets) {
                    expect(petSpecies).toContain(pet.species);
                    expect(pet.gradeIndex).toBeLessThan(Pets.grades.length);
                    for (const quirk of pet.quirks) expect(quirkSlugs).toContain(quirk.slug);
                }
            })
        );
    }

    it.effect("decodes what the grown saves hold", () =>
        Effect.gen(function* () {
            const zoo = yield* decode(fixture("grown-zoo.save"));
            const { PetManager, PlayerData, QuestManager, ZooData } = zoo.globalDataString;
            expect(PlayerData.currentRegion).toBe("Farm");
            expect(PlayerData.binocularRegion).toBe("Farm");
            expect(ZooData.penDatas.map((pen) => [pen.animal, pen.count])).toStrictEqual([
                ["sheep", 3],
                ["pig", 1],
                ["rabbit", 0],
            ]);
            expect(ZooData.penDatas[0]?.hats).toStrictEqual([
                { character: "1", count: 1 },
                { character: "!", count: 2 },
            ]);
            expect(ZooData.penDatas[0]?.decor).toStrictEqual(["", "S", "", "F"]);
            expect(ZooData.customPenDatas).toStrictEqual([
                {
                    animalSlug: "sheep",
                    namedAnimals: [
                        { hat: "1", variantIndex: 0, name: "Woolly" },
                        { hat: "2", variantIndex: 1, name: "Baa Baa" },
                    ],
                },
                { animalSlug: "pig", namedAnimals: [{ hat: "5", variantIndex: 0, name: "Oink" }] },
            ]);
            expect(QuestManager.heldAnimals).toStrictEqual({ sheep: 3 });
            expect(QuestManager.quests.map((quest) => quest.owner)).toStrictEqual(["Venus", "Uranus"]);
            expect(PetManager.hospitalPetHealState).toBe("Healing");
            expect(PetManager.healTicksLeft).toBe(65_936_274_414n);
            expect(PetManager.loungePets[0]?.quirks[0]).toStrictEqual({ slug: "food_food_3", isRare: true });
            expect(PetManager.loungePets[0]?.quality).toBeCloseTo(0.6159045);

            const scenery = zoo.localDataString.SceneryData.sceneryLotDatas;
            expect(scenery[0]?.penSlug).toBe(ZooData.penDatas[0]?.slug);
            expect(scenery[0]?.pathCells[0]).toStrictEqual({ col: 0, row: 3, shape: 2 });

            const stats = yield* decode(fixture("grown-stats.save"));
            expect(stats.globalDataString.PlayerData.hats).toStrictEqual([
                { character: "1", count: 2 },
                { character: "!", count: 1 },
            ]);
            expect(stats.globalDataString.StatsData.coinAccounts).toStrictEqual({ probe: 1500 });
            expect(Object.keys(stats.globalDataString.PlayerData.unlockedRegionAccounts)).toHaveLength(14);
        })
    );

    for (const name of ["grown-zoo.save", "grown-pets.save"] as const) {
        it.effect(`${name} keeps keys it does not model in every object and writes them back`, () =>
            Effect.gen(function* () {
                const last = addUnknownKeys(fixture(name), "last");
                expect(last).not.toBe(fixture(name));
                const save = yield* decode(last);
                expect(yield* encode(save)).toBe(last);

                const { localDataString: local, globalDataString: global } = save;
                const objects = [
                    save,
                    local,
                    global,
                    local.SceneryData,
                    local.SettingsData,
                    local.StoreData,
                    global.PlayerData,
                    global.ZooData,
                    global.StatsData,
                    global.QuestManager,
                    global.PetManager,
                    global.LoonManager,
                    ...local.SceneryData.sceneryLotDatas,
                    ...global.ZooData.penDatas,
                    ...global.QuestManager.quests,
                    ...global.PetManager.loungePets,
                    ...[global.PetManager.rescuePet, global.PetManager.hospitalPet].filter(
                        (pet) => Object.keys(pet).length > 0
                    ),
                ];
                for (const object of objects) expect(object[unknownKey]).toStrictEqual(unknownValue);

                // Unknown keys read before the known ones are written after them
                const first = addUnknownKeys(fixture(name), "first");
                expect(yield* encode(yield* decode(first))).toBe(last);
            })
        );
    }

    it.effect("decodes the player's salt and email to Redacted values", () =>
        Effect.gen(function* () {
            const email = "player@example.com";
            const text = fixture("grown-zoo.save").replace(
                String.raw`\\\"playerEmail\\\":\\\"\\\"`,
                String.raw`\\\"playerEmail\\\":\\\"${email}\\\"`
            );
            const raw = rawSettings(text);
            expect(raw.playerEmail).toBe(email);

            const save = yield* decode(text);
            const { playerEmail, playerSalt } = save.localDataString.SettingsData;
            assert(Redacted.isRedacted(playerSalt) && Redacted.isRedacted(playerEmail));
            expect(Redacted.value(playerSalt)).toBe(raw.playerSalt);
            expect(Redacted.value(playerEmail)).toBe(email);
            for (const shown of [
                // String() of each
                util.format("%s %s", playerSalt, playerEmail),
                util.inspect(save, { depth: null }),
                JSON.stringify(save, bigintToString),
            ]) {
                expect(shown).not.toContain(raw.playerSalt);
                expect(shown).not.toContain(email);
            }
            expect(yield* encode(save)).toBe(text);
        })
    );

    it.effect("keeps an empty salt and email as empty strings and fails on a salt that is not a UUID", () =>
        Effect.gen(function* () {
            const salt = rawSettings(fixture("fresh.save")).playerSalt;
            const text = fixture("fresh.save").replace(salt, "");
            expect(rawSettings(text).playerSalt).toBe("");
            const save = yield* decode(text);
            expect(save.localDataString.SettingsData.playerSalt).toBe("");
            expect(save.localDataString.SettingsData.playerEmail).toBe("");
            expect(yield* encode(save)).toBe(text);

            const notUuid = fixture("fresh.save").replace(salt, "not-a-uuid");
            expect((yield* Effect.exit(decode(notUuid)))._tag).toBe("Failure");
        })
    );

    it.effect("decodes the two DataManager strings on their own", () =>
        Effect.gen(function* () {
            const raw = yield* Schema.decodeEffect(
                Schema.fromJsonString(
                    Schema.Struct({ localDataString: Schema.String, globalDataString: Schema.String })
                )
            )(fixture("grown-zoo.save"));
            const global = yield* Schema.decodeEffect(Save.GlobalData)(raw.globalDataString);
            expect(yield* Schema.encodeEffect(Save.GlobalData)(global)).toBe(raw.globalDataString);
            const local = yield* Schema.decodeEffect(Save.LocalData)(raw.localDataString);
            expect(yield* Schema.encodeEffect(Save.LocalData)(local)).toBe(raw.localDataString);
        })
    );
});

describe("MiniJson", () => {
    it.effect("escapes strings as the game's MiniJson.Json.Serialize does", () =>
        Effect.gen(function* () {
            // The game's output for this string, taken on the emulator
            const input = "d\u00e9j\u00e0 \ud83d\ude00 \u007f\"\\/\t\u0001<>&'~";
            const expected = String.raw`"d\u00e9j\u00e0 \ud83d\ude00 \u007f\"\\/\t\u0001<>&'~"`;
            const schema = Save.MiniJson(Schema.String);
            expect(yield* Schema.encodeEffect(schema)(input)).toBe(expected);
            expect(yield* Schema.decodeEffect(schema)(expected)).toBe(input);
        })
    );
});

describe("AccountData", () => {
    it.effect("keeps its keys in order and fails on a key written twice", () =>
        Effect.gen(function* () {
            const accounts = yield* Schema.decodeEffect(Save.AccountData)("Moon:1,Farm:2");
            expect(Object.keys(accounts)).toStrictEqual(["Moon", "Farm"]);
            expect(yield* Schema.encodeEffect(Save.AccountData)(accounts)).toBe("Moon:1,Farm:2");
            const twice = yield* Effect.exit(Schema.decodeEffect(Save.AccountData)("Farm:1,Moon:1,Farm:2"));
            expect(twice._tag).toBe("Failure");
        })
    );
});

describe("SingleString", () => {
    it.effect("writes floats as C#'s float.ToString() does", () =>
        Effect.gen(function* () {
            for (const text of [
                "0",
                "0.05211356",
                "4538.044",
                "14686.28",
                "1E-05",
                "1.5E+07",
                "-2.5",
                "0.0001",
                "1234567",
            ]) {
                const value = yield* Schema.decodeEffect(Save.SingleString)(text);
                expect(yield* Schema.encodeEffect(Save.SingleString)(value)).toBe(text);
            }
        })
    );
});
