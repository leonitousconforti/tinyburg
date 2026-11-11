import { Effect, Redacted, Schema } from "effect";

import * as fs from "node:fs";
import * as util from "node:util";

import { describe, expect, it } from "@effect/vitest";
import { Bitizens, Cities, Planes, Save, Skins } from "@tinyburg/pocket-planes-sdk";

const fixture = (name: string): string => fs.readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8");

const decode = Schema.decodeUnknownEffect(Save.SaveData);
const encode = Schema.encodeEffect(Save.SaveData);

const planeIds = new Set(Planes.planes.map((plane) => plane.id));
const cityIds = new Set(Cities.cities.map((city) => city.id));
const skins = new Map<string, Skins.Skin>(Skins.skins.map((skin) => [skin.id, skin]));

const saves = ["fresh.txt", "enriched.txt", "loaded.txt"] as const;

/** Replaces `from`, which must occur exactly once in `text`, with `to`. */
const replaceOnce = (text: string, from: string, to: string): string => {
    expect(text.split(from)).toHaveLength(2);
    return text.replace(from, () => to);
};

/** Expects `value` to hold exactly the keys `schema` models, in its order. */
const expectModeled = (value: object, schema: { readonly schema: { readonly fields: object } }): void => {
    expect(Object.keys(value)).toEqual(Object.keys(schema.schema.fields));
};

describe("SaveData", () => {
    for (const name of saves) {
        it.effect(`${name} round trips byte for byte`, () =>
            Effect.gen(function* () {
                const text = fixture(name);
                const save = yield* decode(text);
                expect(yield* encode(save)).toBe(text);
            })
        );

        it.effect(`${name} has no key the schemas do not model`, () =>
            Effect.gen(function* () {
                // Unmodeled keys would be kept, so check that the fixture has
                // none: every object holds exactly its schema's keys.
                const save = yield* decode(fixture(name));
                expectModeled(save, Save.PPSave);
                expectModeled(save.wheelTickets, Save.Currency);
                for (const part of [...save.Parts, ...save.lfParts]) expectModeled(part, Save.Part);
                for (const friend of save.f) expectModeled(friend, Save.PPFriend);
                for (const item of save.ShopLog) expectModeled(item, Save.ShopLogItem);

                const bitizens: Array<object> = [];
                const cargoDetails: Array<(typeof Save.CargoDetails)["Type"]> = [];
                const planes = [...save.Planes, ...save.Hangar];
                const cargo = [...save.Cities.flatMap((city) => city.Cargo), ...planes.flatMap((plane) => plane.Cargo)];
                for (const plane of planes) {
                    expectModeled(plane, Save.PlaneInfo);
                    expectModeled(plane.Trip, Save.Trip);
                    for (const leg of plane.Trip.Legs) expectModeled(leg, Save.TripLeg);
                    bitizens.push(plane.Pilot);
                }
                for (const city of save.Cities) expectModeled(city, Save.CityInfo);
                for (const item of cargo) {
                    expectModeled(item, Save.Cargo);
                    cargoDetails.push(item.details);
                }
                for (const item of save.CargoLog) {
                    expectModeled(item, Save.CargoLog);
                    cargoDetails.push(item.details);
                }
                for (const details of cargoDetails) {
                    expectModeled(details, Save.CargoDetails);
                    if (details.b !== null) bitizens.push(details.b);
                    if (details.c !== null) expectModeled(details.c, Save.CrateInfo);
                }
                for (const entry of save.bb) {
                    expectModeled(entry, Save.BBEntry);
                    if (entry.b !== null) bitizens.push(entry.b);
                }
                for (const bitizen of bitizens) expectModeled(bitizen, Save.BitizenData);
                for (const progress of [save.g, save.pg].filter((progress) => progress !== null)) {
                    expectModeled(progress, Save.GlobalEventProgress);
                    for (const reward of progress.r) if (reward.Key === 2) expectModeled(reward.Value, Save.Part);
                }
            })
        );

        it.effect(`${name} decodes the auth salt to a Redacted value`, () =>
            Effect.gen(function* () {
                const text = fixture(name);
                const salt = /"playerS":"([^"]+)"/.exec(text)?.[1];
                expect(salt).toBeDefined();

                const save = yield* decode(text);
                const { playerS } = save;
                if (playerS === null || salt === undefined) return expect.unreachable();
                expect(Redacted.isRedacted(playerS)).toBe(true);
                expect(Redacted.value(playerS)).toBe(salt);
                // Printing or logging the save does not show it.
                expect(util.format("%s", playerS)).not.toContain(salt);
                expect(util.inspect(save, { depth: null })).not.toContain(salt);
            })
        );

        it.effect(`${name} refers only to planes, cities and skins the game has`, () =>
            Effect.gen(function* () {
                const save = yield* decode(fixture(name));
                expect(save.v).toBe("2.17.3");

                const planes = [...save.Planes, ...save.Hangar];
                for (const id of [...planes, ...save.Parts, ...save.lfParts].map((item) => item.plane_id)) {
                    expect(planeIds).toContain(id);
                }

                const legs = planes.flatMap((plane) => plane.Trip.Legs);
                const cargo = [...save.Cities.flatMap((city) => city.Cargo), ...planes.flatMap((plane) => plane.Cargo)];
                for (const id of [
                    ...save.Cities.map((city) => city.city_id),
                    ...save.cityUnlock,
                    ...save.jobPoolCityIds,
                    ...legs.flatMap((leg) => [leg.start_city, leg.end_city]),
                    ...cargo.flatMap((item) => [item.start_city, item.end_city]),
                ]) {
                    expect(cityIds).toContain(id);
                }

                for (const plane of planes) {
                    if (plane.skin !== null) expect(skins.get(plane.skin)?.planeIds).toContain(plane.plane_id);
                }
                for (const skin of save.skins) expect(skins.has(skin)).toBe(true);

                for (const { r } of [save.g, save.pg].filter((progress) => progress !== null)) {
                    for (const reward of r) {
                        if (reward.Key === 2) expect(planeIds).toContain(reward.Value.plane_id);
                        if (reward.Key === 3) expect(skins.has(reward.Value)).toBe(true);
                    }
                }

                for (const { BA } of planes.map((plane) => plane.Pilot)) {
                    const firstNames = BA.male ? Bitizens.maleNames : Bitizens.femaleNames;
                    expect(BA.firstNameIdx).toBeLessThan(firstNames.length);
                    expect(BA.lastNameIdx).toBeLessThan(Bitizens.lastNames.length);
                    expect(BA.$unknown).toEqual([]);
                }
            })
        );
    }

    it.effect("keeps the game's floats, escapes and big longs as written", () =>
        Effect.gen(function* () {
            // loaded.txt is crafted content that the game loaded with
            // Player.FromJSON and wrote back with Player.saveJson
            const save = yield* decode(fixture("loaded.txt"));
            expect(save.mapY).toBe(843);
            expect(save.Planes[0]?.Trip.Legs[2]?.distance).toBe(0.30000000000000004);
            expect(save.airlineName).toBe('Probe "Air" \\ / \u00e9 \u2708 \t \u0085 \u2028 <&> \ud83d\ude80');
            expect(save.nFBT).toBe(638981234567890124n);
            expect(save.nMST).toBe(9007199254740993n);
            expect(save.carrierPorts["91"]?.["22"]).toBe(638981234567890123n);
        })
    );

    it.effect("decodes a registered player's email to a Redacted value", () =>
        Effect.gen(function* () {
            const email = "probe@example.com";
            const text = replaceOnce(fixture("loaded.txt"), '"playerE":null', `"playerE":"${email}"`);
            const save = yield* decode(text);
            if (save.playerE === null) return expect.unreachable();
            expect(Redacted.value(save.playerE)).toBe(email);
            expect(util.inspect(save, { depth: null })).not.toContain(email);
            expect(yield* encode(save)).toBe(text);
        })
    );

    it.effect("keeps keys the schemas do not model", () =>
        Effect.gen(function* () {
            const text = fixture("loaded.txt");
            const leg = '"distance":1234.5678,"speed_bonus":0.25}';
            const unknownValue = '{"a":[1,2.50,null,"x",true],"b":1E+07,"c":638981234567890123,"7":{}}';

            // At the end of an object, an unknown key writes back where it was.
            const atEnd = replaceOnce(
                replaceOnce(text, leg, leg.replace("}", ',"newLegKey":0.10}')),
                '"bldCRem":0}',
                `"bldCRem":0,"newSaveKey":${unknownValue}}`
            );
            const save = yield* decode(atEnd, { onExcessProperty: "error" });
            expect(save["newSaveKey"]).toEqual({
                "7": {},
                a: [1, new Save.JsonDouble(2.5, false, "2.50"), null, "x", true],
                b: new Save.JsonDouble(1e7, false, "1E+07"),
                c: 638981234567890123n,
            });
            expect(save.Planes[0]?.Trip.Legs[1]?.["newLegKey"]).toEqual(new Save.JsonDouble(0.1, false, "0.10"));
            // Except that "7", an array index, goes first in its object.
            const sortedValue = '{"7":{},"a":[1,2.50,null,"x",true],"b":1E+07,"c":638981234567890123}';
            expect(yield* encode(save)).toBe(atEnd.replace(unknownValue, sortedValue));

            // Elsewhere, it moves after the keys the schema models, and an
            // array index key to the front.
            const inMiddle = replaceOnce(
                replaceOnce(text, leg, `"newLegKey":[0.10],${leg}`),
                '"wheelTickets":',
                `"newSaveKey":${unknownValue},"9":"nine","wheelTickets":`
            );
            const moved = yield* decode(inMiddle);
            expect(moved["9"]).toBe("nine");
            expect(yield* encode(moved)).toBe(
                `{"9":"nine",${atEnd.replace('"newLegKey":0.10', '"newLegKey":[0.10]').replace(unknownValue, sortedValue).slice(1)}`
            );
        })
    );

    it.effect("writes floats and doubles the way the game does", () =>
        Effect.gen(function* () {
            const text = fixture("loaded.txt");
            // [field as in loaded.txt, how a save could spell it, how the game
            // writes that value]
            const cases: ReadonlyArray<readonly [string, string, string]> = [
                // TripLeg.distance, a C# double: 15 significant digits when
                // they read back as the same double, else 17, even where 16
                // would do (JavaScript's shortest is 163.9499902278185)
                ['"distance":1234.5678', "163.94999022781849", "163.94999022781849"],
                ['"distance":1234.5678', "163.9499902278185", "163.94999022781849"],
                ['"distance":1234.5678', "0.1", "0.1"],
                ['"distance":1234.5678', "1000", "1000.0"],
                ['"distance":1234.5678', "-2.5e0", "-2.5"],
                ['"distance":1234.5678', "0.0001", "0.0001"],
                ['"distance":1234.5678', "0.00001", "1E-05"],
                ['"distance":1234.5678', "123456789012345.0", "123456789012345.0"],
                ['"distance":1234.5678', "1e15", "1E+15"],
                ['"distance":1234.5678', "1.2345678901234567e20", "1.2345678901234567E+20"],
                // TripLeg.speed_bonus and PPSave.mapX, C# floats: 7 digits of
                // the 32-bit value when they read back as the same float,
                // else 9
                ['"speed_bonus":0.25', "0.30000000000000004", "0.3"],
                ['"speed_bonus":0.25', "0.100000001490116", "0.1"],
                ['"mapX":936.25', "10000000.0", "1E+07"],
                ['"mapX":936.25', "16777217.0", "16777216.0"],
                ['"mapX":936.25', "123456792.0", "123456792.0"],
                ['"mapX":936.25', "0.00001", "1E-05"],
            ];
            for (const [field, written, expected] of cases) {
                const key = field.slice(0, field.indexOf(":") + 1);
                const save = yield* decode(replaceOnce(text, field, `${key}${written}`));
                expect(yield* encode(save), `${key}${written}`).toBe(replaceOnce(text, field, `${key}${expected}`));
            }
        })
    );

    it.effect("keeps longs past 2^53 whole", () =>
        Effect.gen(function* () {
            // DateTime ticks, as nFBT holds once the free bux timer runs; a
            // plain JSON.parse reads it as 638981234567890200
            const ticks = 638981234567890123n;
            const text = fixture("fresh.txt").replace('"nFBT":0', `"nFBT":${ticks}`);
            const save = yield* decode(text);
            expect(save.nFBT).toBe(ticks);
            expect(yield* encode(save)).toBe(text);
        })
    );
});

describe("SaveDataFromBytes", () => {
    it.effect("reads the bytes the game's NBSync.encodeSave made", () =>
        Effect.gen(function* () {
            // The base64-decoded output of NBSync.encodeSave(Player.saveJson())
            // on the game, after loaded.txt was loaded
            const bytes = new Uint8Array(fs.readFileSync(new URL("./fixtures/loaded.zlib", import.meta.url)));
            const save = yield* Schema.decodeUnknownEffect(Save.SaveDataFromBytes)(bytes);
            expect(yield* encode(save)).toBe(fixture("loaded.txt"));

            const again = yield* Schema.encodeEffect(Save.SaveDataFromBytes)(save);
            expect(yield* Schema.decodeUnknownEffect(Save.SaveDataFromBytes)(again)).toEqual(save);
        })
    );
});
