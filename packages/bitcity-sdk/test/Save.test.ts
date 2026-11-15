import { DateTime, Effect, Redacted, Schema } from "effect";

import * as fs from "node:fs";
import { inspect } from "node:util";

import { describe, expect, it } from "@effect/vitest";
import { Buildings, Missions, Save, Upgrades } from "@tinyburg/bitcity-sdk";

/*
  Saves Bit City 1.6.0 wrote on an emulator, with the player's id and secret
  replaced: `fresh-save.txt` right after the tutorial, `grown-save.txt` after
  buying and building lots, upgrades, vehicles and missions, both as the game
  stored them in PlayerPrefs. The probe skipped the tutorial (Player.tutStep set
  to its last step) and set Player._taps to 1, without which the game refuses to
  store a save; the rest was the game's own methods. `cloud-save.base64.txt` is the grown save as the
  server returned it (base64 of zlib), recompressed after the id was replaced.
  An editor may add a final newline, which is not part of a save.
*/
const fixture = (name: string): string =>
    fs.readFileSync(new URL(`fixtures/${name}`, import.meta.url), "utf8").replace(/\n$/, "");

const saves = {
    fresh: fixture("fresh-save.txt"),
    grown: fixture("grown-save.txt"),
};

const cloudBytes = new Uint8Array(Buffer.from(fixture("cloud-save.base64.txt"), "base64"));

const strict = { onExcessProperty: "error" } as const;

const decodeSave = (text: string) => Schema.decodeEffect(Save.SaveData)(text, strict);

const dateOf = (value: DateTime.Utc | { readonly date: DateTime.Utc } | string) =>
    typeof value === "string" ? undefined : DateTime.isDateTime(value) ? value : value.date;

describe("SaveData", () => {
    for (const [name, text] of Object.entries(saves)) {
        it.effect(`${name} save round trips byte for byte`, () =>
            Effect.gen(function* () {
                const decoded = yield* decodeSave(text);
                const encoded = yield* Schema.encodeEffect(Save.SaveData)(decoded);
                expect(encoded).toBe(text);
                expect(JSON.parse(encoded)).toStrictEqual(JSON.parse(text));
            })
        );
    }

    it.effect("keeps a tick count above 2^53 exact", () =>
        Effect.gen(function* () {
            const ticks = BigInt(/"cLastEarnTime":(\d+)/.exec(saves.grown)?.[1] ?? "0");
            expect(ticks > 2n ** 53n).toBe(true);

            const decoded = yield* decodeSave(saves.grown);
            const date = dateOf(decoded.cLastEarnTime);
            expect(date && DateTime.getPartUtc(date, "year")).toBe(2026);
            expect(yield* Schema.encodeEffect(Save.SaveData)(decoded)).toContain(`"cLastEarnTime":${ticks},`);
        })
    );

    it.effect("decodes the fresh save's player and progress", () =>
        Effect.gen(function* () {
            const decoded = yield* decodeSave(saves.fresh);
            expect(decoded.pVer).toBe("1.6.0");
            expect(decoded.pTutStep).toBe(5);
            expect(decoded.playerI).toBe("TEST1");
            expect(
                decoded.playerS !== undefined && decoded.playerS !== null && Redacted.isRedacted(decoded.playerS)
            ).toBe(true);
            expect(decoded.playerE).toBeNull();
            expect(dateOf(decoded.progressiveRewards.lastCycle)).toBeDefined();
            expect(dateOf(decoded.progressiveRewards.lastFreeReward)).toBeDefined();
        })
    );

    it.effect("names zones and buildings that exist in the generated tables", () =>
        Effect.gen(function* () {
            const { cLots } = yield* decodeSave(saves.grown);
            expect(cLots["LotBank"]?.z).toBe("Bank");
            expect(cLots["LotCityHall"]?.z).toBe("Cityhall");
            expect(cLots["LotPower"]?.z).toBe("Power");
            expect(cLots["LotParking"]?.z).toBe("Parking");

            const built = Object.values(cLots).filter((lot) => lot.f !== "");
            expect(built.length).toBeGreaterThan(4);
            for (const lot of built) {
                expect(
                    Buildings.buildings.some((building) => building.prefab === lot.f && building.type === lot.z)
                ).toBe(true);
            }
        })
    );

    it.effect("counts upgrades and missions that exist in the generated tables", () =>
        Effect.gen(function* () {
            const decoded = yield* decodeSave(saves.grown);
            const upgradeIds = new Set<string>(Upgrades.upgrades.map((upgrade) => upgrade.id));
            const missionIds = new Set<string>(Missions.missions.map((mission) => mission.id));

            expect(Object.keys(decoded.uCounts).length).toBeGreaterThan(0);
            for (const id of Object.keys(decoded.uCounts)) expect(upgradeIds.has(id)).toBe(true);

            expect(Object.keys(decoded.cComplMiss).length).toBeGreaterThan(0);
            for (const id of Object.keys(decoded.cComplMiss)) expect(missionIds.has(id)).toBe(true);
            expect(missionIds.has(decoded.cMissId)).toBe(true);
        })
    );

    it.effect("writes doubles the way the game does", () =>
        Effect.gen(function* () {
            const decoded = yield* decodeSave(saves.fresh);
            const cases = [
                [50000, "50000.0"],
                [0.1 + 0.2, "0.30000000000000004"],
                [1e15, "1E+15"],
                [0.00001, "1E-05"],
                // The game writes 17 digits when 15 do not round-trip, even if 16 would
                [999999998020.2898, "999999998020.28979"],
                [-1.7976931348623157e308, "-1.7976931348623157E+308"],
            ] as const;
            for (const [value, text] of cases) {
                const encoded = yield* Schema.encodeEffect(Save.SaveData)({ ...decoded, pCoins: value });
                expect(encoded).toContain(`{"pCoins":${text},`);
                expect((yield* decodeSave(encoded)).pCoins).toBe(value);
            }
        })
    );

    it.effect("does not show the salt or email when a decoded save is printed", () =>
        Effect.gen(function* () {
            const salt = /"playerS":"([^"]+)"/.exec(saves.fresh)?.[1] ?? "";
            expect(salt).not.toBe("");
            const email = "someone@example.com";
            const text = saves.fresh.replace('"playerE":null', `"playerE":${JSON.stringify(email)}`);
            expect(text).not.toBe(saves.fresh);

            const decoded = yield* decodeSave(text);
            const { playerE, playerS } = decoded;
            expect(playerS !== undefined && playerS !== null && Redacted.value(playerS)).toBe(salt);
            expect(playerE !== undefined && playerE !== null && Redacted.value(playerE)).toBe(email);
            for (const printed of [
                inspect(playerS),
                inspect(playerE),
                JSON.stringify({ playerS, playerE }),
                inspect(decoded, { depth: null }),
            ]) {
                expect(printed).not.toContain(salt);
                expect(printed).not.toContain(email);
            }
            expect(yield* Schema.encodeEffect(Save.SaveData)(decoded)).toBe(text);
        })
    );

    it.effect("keeps keys it does not model and writes them after the known ones", () =>
        Effect.gen(function* () {
            const extra = '{"a":[1,2.50,1e5,-0,"x\\u2028y",null,true,{}],"b":12345678901234567890}';
            // Where a newer game version might write them: among the known keys.
            const inside = saves.grown
                .replace('"pVer":', `"zNew":${extra},"pVer":`)
                .replace('"LotBank":{', '"LotBank":{"q":7,')
                .replace('"lastCycle":', '"lastCycleWas":"x","lastCycle":');
            // Where encoding writes them: after the known keys of the same object.
            const atEnd = saves.grown
                .replace(/"LotBank":\{[^}]*/, (lot) => `${lot},"q":7`)
                .replace(/"lastFreeReward":"[^"]*"/, (key) => `${key},"lastCycleWas":"x"`)
                .replace(/}$/, `,"zNew":${extra}}`);
            expect(new Set([saves.grown, inside, atEnd]).size).toBe(3);

            const decoded = yield* Schema.decodeEffect(Save.SaveData)(inside);
            expect(Object.keys(decoded)).toContain("zNew");
            expect(decoded.cLots["LotBank"]?.["q"]).toHaveProperty("rawJSON", "7");
            expect(decoded.progressiveRewards["lastCycleWas"]).toBe("x");
            expect(yield* decodeSave(inside)).toStrictEqual(decoded);

            const encoded = yield* Schema.encodeEffect(Save.SaveData)(decoded);
            expect(encoded).toBe(atEnd);
            expect(JSON.parse(encoded)).toStrictEqual(JSON.parse(inside));
            expect(yield* Schema.encodeEffect(Save.SaveData)(yield* decodeSave(atEnd))).toBe(atEnd);
        })
    );

    it.effect("refuses to write a key it does not model unless it holds a JsonValue", () =>
        Effect.gen(function* () {
            const decoded = yield* decodeSave(saves.fresh);
            for (const value of [5, 5n, undefined, () => 5]) {
                const error = yield* Effect.flip(Schema.encodeEffect(Save.SaveData)({ ...decoded, zNew: value }));
                expect(error._tag).toBe("SchemaError");
            }
        })
    );

    it.effect("escapes strings the way Newtonsoft.Json does", () =>
        Effect.gen(function* () {
            const decoded = yield* decodeSave(saves.fresh);
            const value = 'a\u2028b\u2029c\u0085d"e\\f\ng\r\t\b\f\u0001\u001fé😀\u007f/';
            const encoded = yield* Schema.encodeEffect(Save.SaveData)({ ...decoded, cMissId: value });
            expect(encoded).toContain(
                '"cMissId":"a\\u2028b\\u2029c\\u0085d\\"e\\\\f\\ng\\r\\t\\b\\f\\u0001\\u001fé😀\u007f/",'
            );
            expect((yield* decodeSave(encoded)).cMissId).toBe(value);
        })
    );

    it.effect("refuses an integer it cannot hold exactly", () =>
        Effect.gen(function* () {
            const text = saves.fresh.replace('"pTaps":1,', '"pTaps":9007199254740993,');
            expect(text).not.toBe(saves.fresh);
            const error = yield* Effect.flip(decodeSave(text));
            expect(error._tag).toBe("SchemaError");
        })
    );
});

describe("SaveDataFromBytes", () => {
    it.effect("decodes the cloud save and encodes the same bytes", () =>
        Effect.gen(function* () {
            const decoded = yield* Schema.decodeEffect(Save.SaveDataFromBytes)(cloudBytes, strict);
            const encoded = yield* Schema.encodeEffect(Save.SaveDataFromBytes)(decoded);
            expect(encoded).toStrictEqual(cloudBytes);
        })
    );

    it.effect("is the stored save without playerS and playerE", () =>
        Effect.gen(function* () {
            const cloud = yield* Schema.decodeEffect(Save.SaveDataFromBytes)(cloudBytes, strict);
            const { playerS: _playerS, playerE: _playerE, ...stored } = yield* decodeSave(saves.grown);
            expect("playerS" in cloud || "playerE" in cloud).toBe(false);
            expect(yield* Schema.encodeEffect(Save.SaveData)(cloud)).toBe(
                yield* Schema.encodeEffect(Save.SaveData)(stored)
            );
        })
    );
});
