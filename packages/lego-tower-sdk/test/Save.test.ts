import { Effect, Exit, Redacted, Schema } from "effect";

import * as fs from "node:fs";
import * as path from "node:path";
import * as url from "node:url";
import * as util from "node:util";
import * as zlib from "node:zlib";

import { describe, expect, it } from "@effect/vitest";
import { Floors, Minifigures, Missions, Pieces, Save, Sets } from "@tinyburg/lego-tower-sdk";

const fixturesDir = path.join(path.dirname(url.fileURLToPath(import.meta.url)), "fixtures");

/** Every captured save, by file name, exactly as the game wrote it (redacted). */
const fixtures = fs
    .readdirSync(fixturesDir)
    .filter((file) => file.endsWith(".txt"))
    .sort()
    .map((file) => [file, fs.readFileSync(path.join(fixturesDir, file), "utf8")] as const);

/** The save as SyncPush sends it: without the player's secret and email. */
const withoutSecrets = (text: string): string =>
    text
        .replace(/,"playerS":".*?"/, "")
        .replace(/,"playerE":".*?"/, "")
        .replace(/,"playerE":null/, "");

const pieceIds = new Set<string>(Pieces.pieces.map((piece) => piece.id));
const floorIds = new Set<string>(Floors.floors.map((floor) => floor.id));
const setIds = new Set<string>([
    ...Floors.floors.map((floor) => floor.id),
    ...Sets.roofs,
    ...Sets.elevators,
    ...Sets.vehicles.map((vehicle) => vehicle.id),
    ...Sets.vipVehicles,
    ...Sets.skylines,
]);
const characterIds = new Set<string>(Object.keys(Minifigures.hiddenCharacters));
const missionIds = new Set<string>(Missions.missions.map((mission) => mission.id));

/** JSON.stringify, writing bigints (the C# longs) as their digits. */
const stringify = (value: unknown): string =>
    JSON.stringify(value, (_key, item: unknown) => (typeof item === "bigint" ? item.toString() : item));

/** The decoded save as a person printing or logging it would see it. */
const printed = (value: unknown): string => `${util.inspect(value, { depth: null })}\n${stringify(value)}`;

const enriched = (): string => fixtures.find(([file]) => file === "enriched.txt")![1];

describe("Save", () => {
    it("found the captured saves", () => {
        expect(fixtures.map(([file]) => file)).toEqual(expect.arrayContaining(["enriched.txt", "fresh.txt"]));
    });

    it.effect("reads what the game's NBSync.encodeSave made of a save", () =>
        Effect.gen(function* () {
            // enriched.txt without the secrets, through the game's own encodeSave
            // (com.nimblebit.nbsync.NBSync.compress) on the emulator: Base64 of
            // the bytes a sync pull's data holds.
            const base64 = fs.readFileSync(path.join(fixturesDir, "enriched.pushed.b64"), "utf8");
            const bytes = new Uint8Array(Buffer.from(base64, "base64"));
            const enriched = fixtures.find(([file]) => file === "enriched.txt")![1];

            const save = yield* Schema.decodeEffect(Save.SaveDataFromBytes)(bytes);
            expect(save).toStrictEqual(yield* Schema.decodeEffect(Save.SaveData)(withoutSecrets(enriched)));
            expect(zlib.inflateSync(bytes).toString("utf8")).toBe(withoutSecrets(enriched));

            // Encoding compresses the same way the game does.
            const encoded = yield* Schema.encodeEffect(Save.SaveDataFromBytes)(
                yield* Schema.decodeEffect(Save.SaveData)(withoutSecrets(enriched))
            );
            expect(zlib.inflateSync(encoded).toString("utf8")).toBe(yield* Schema.encodeEffect(Save.SaveData)(save));
            expect(Buffer.from(zlib.deflateSync(withoutSecrets(enriched))).toString("base64")).toBe(base64);
        })
    );

    for (const [file, text] of fixtures) {
        describe(file, () => {
            it.effect("decodes", () =>
                Effect.gen(function* () {
                    const save = yield* Schema.decodeEffect(Save.SaveData)(text);
                    expect(save.pVer).toBe("1.27.2");
                })
            );

            it.effect("round trips without losing anything", () =>
                Effect.gen(function* () {
                    const save = yield* Schema.decodeEffect(Save.SaveData)(text);
                    const encoded = yield* Schema.encodeEffect(Save.SaveData)(save);

                    // Same JSON, with C# longs read as bigints and floats kept as
                    // written, in any key order.
                    const original = yield* Schema.decodeEffect(Save.NewtonsoftJson)(text);
                    const written = yield* Schema.decodeEffect(Save.NewtonsoftJson)(encoded);
                    expect(written).toStrictEqual(original);

                    // Byte for byte what the writer makes of the original; that
                    // differs from the original only where JavaScript orders
                    // integer-like dictionary keys (piece ids) first.
                    expect(encoded).toBe(yield* Schema.encodeEffect(Save.NewtonsoftJson)(original));
                    expect(encoded.length).toBe(text.length);
                    expect(encoded.split("").sort().join("")).toBe(text.split("").sort().join(""));
                })
            );

            it.effect("keeps every digit of the C# longs", () =>
                Effect.gen(function* () {
                    const save = yield* Schema.decodeEffect(Save.SaveData)(text);
                    const timestamp = /"timestamp":(\d+)/.exec(text)?.[1];
                    expect(timestamp).toBeDefined();
                    expect(save.timestamp).toBe(BigInt(timestamp!));
                    if (save.playerDict !== null) {
                        expect(save.playerDict.timestamp > BigInt(Number.MAX_SAFE_INTEGER)).toBe(true);
                    }
                })
            );

            it.effect("decodes the player's secret to a Redacted value", () =>
                Effect.gen(function* () {
                    const salt = /"playerS":"(.*?)"/.exec(text)?.[1];
                    expect(salt).toBeDefined();
                    const save = yield* Schema.decodeEffect(Save.SaveData)(text);
                    const playerS = save.playerS;
                    if (playerS === undefined || playerS === null) return expect.unreachable();

                    expect(Redacted.isRedacted(playerS)).toBe(true);
                    expect(Redacted.value(playerS)).toBe(salt);
                    expect(printed(playerS)).not.toContain(salt!);
                    expect(printed(save)).not.toContain(salt!);
                })
            );

            it.effect("reads the copy the sync server holds", () =>
                Effect.gen(function* () {
                    // What com.nimblebit.nbsync.SyncPush pushes: the save without
                    // playerS and playerE, zlib-compressed (java.util.zip.Deflater
                    // with its defaults, which node:zlib's defaults match).
                    const pushed = withoutSecrets(text);
                    expect(pushed).not.toContain("playerS");
                    const bytes = new Uint8Array(zlib.deflateSync(pushed));

                    const save = yield* Schema.decodeEffect(Save.SaveDataFromBytes)(bytes);
                    expect(save).toStrictEqual(yield* Schema.decodeEffect(Save.SaveData)(pushed));
                    expect(save.playerS).toBeUndefined();

                    const encoded = yield* Schema.encodeEffect(Save.SaveDataFromBytes)(save);
                    expect(zlib.inflateSync(encoded).toString("utf8")).toBe(
                        yield* Schema.encodeEffect(Save.SaveData)(save)
                    );
                })
            );

            it.effect("names only things the game data has", () =>
                Effect.gen(function* () {
                    const { playerDict: player, towerDict: tower } = yield* Schema.decodeEffect(Save.SaveData)(text);
                    expect(player).not.toBeNull();
                    expect(tower).not.toBeNull();
                    if (player === null || tower === null) return;

                    for (const id of Object.keys(player.pieces)) expect(pieceIds, id).toContain(id);
                    for (const id of Object.keys(player.foundPieces)) expect(pieceIds, id).toContain(id);
                    for (const id of Object.keys(player.sets)) expect(setIds, id).toContain(id);
                    for (const id of Object.keys(player.foundChars)) expect(characterIds, id).toContain(id);
                    for (const id of Object.keys(player.charMissions)) expect(characterIds, id).toContain(id);

                    expect(setIds).toContain(tower.skyline);
                    expect(setIds).toContain(tower.roof);
                    expect(setIds).toContain(tower.lift);
                    expect(tower.floors[0]?.content).toMatch(/^Floor_Lobby/);
                    for (const floor of tower.floors) expect(floorIds, floor.content).toContain(floor.content);
                    for (const fig of [tower.doorman, ...tower.figs]) {
                        for (const id of [fig.htPiece, fig.hPiece, fig.tPiece, fig.lPiece]) {
                            expect(pieceIds, id).toContain(id);
                        }
                        if (fig.dreamFloor !== "") expect(floorIds).toContain(fig.dreamFloor);
                    }
                    for (const mission of [...Object.values(player.charMissions), tower.mission]) {
                        if (mission?.id !== undefined) expect(missionIds).toContain(mission.id);
                    }
                })
            );
        });
    }

    it.effect("decodes a registered player's email to a Redacted value", () =>
        Effect.gen(function* () {
            const email = "player@example.com";
            const text = enriched().replace('"playerE":null', `"playerE":"${email}"`);
            expect(text).toContain(email);

            const save = yield* Schema.decodeEffect(Save.SaveData)(text);
            const playerE = save.playerE;
            if (playerE === undefined || playerE === null) return expect.unreachable();
            expect(Redacted.isRedacted(playerE)).toBe(true);
            expect(Redacted.value(playerE)).toBe(email);
            expect(printed(save)).not.toContain(email);

            const encoded = yield* Schema.encodeEffect(Save.SaveData)(save);
            expect(encoded).toBe(
                (yield* Schema.encodeEffect(Save.SaveData)(
                    yield* Schema.decodeEffect(Save.SaveData)(enriched())
                )).replace('"playerE":null', `"playerE":"${email}"`)
            );
        })
    );

    it.effect("accepts a null secret and rejects one that is not a UUID", () =>
        Effect.gen(function* () {
            const unset = enriched().replace(/"playerS":".*?"/, '"playerS":null');
            const save = yield* Schema.decodeEffect(Save.SaveData)(unset);
            expect(save.playerS).toBeNull();
            const encoded = yield* Schema.encodeEffect(Save.SaveData)(save);
            expect(yield* Schema.decodeEffect(Save.NewtonsoftJson)(encoded)).toStrictEqual(
                yield* Schema.decodeEffect(Save.NewtonsoftJson)(unset)
            );

            const notUuid = enriched().replace(/"playerS":".*?"/, '"playerS":"not-a-uuid"');
            const exit = yield* Effect.exit(Schema.decodeEffect(Save.SaveData)(notUuid));
            expect(Exit.isFailure(exit)).toBe(true);
        })
    );

    it.effect("keeps keys it does not model and writes them after the known ones", () =>
        Effect.gen(function* () {
            // Keys a newer game version could add: at the top level, in a
            // friend, in the tower's doorman and in its first floor, each put
            // first in its object.
            const added = [
                '"newRoot":{"a":1.0,"b":[1,2.5],"c":12345678901234567890}',
                '"newFriend":null',
                '"newFig":"x"',
                '"newFloor":12345678901234567890',
            ] as const;
            const original = enriched();
            const text = original
                .replace(/^\{/, `{${added[0]},`)
                .replace('"friends":[{', `"friends":[{${added[1]},`)
                .replace('"doorman":{', `"doorman":{${added[2]},`)
                .replace('"floors":[{', `"floors":[{${added[3]},`);
            for (const key of added) expect(text).toContain(`${key},`);

            const save = yield* Schema.decodeEffect(Save.SaveData)(text);
            expect(save["newRoot"]).toStrictEqual({
                a: new Save.JsonDouble(1),
                b: [1, new Save.JsonDouble(2.5)],
                c: 12345678901234567890n,
            });
            expect(save.friends[0]?.["newFriend"]).toBeNull();
            expect(save.towerDict?.doorman["newFig"]).toBe("x");
            expect(save.towerDict?.floors[0]?.["newFloor"]).toBe(12345678901234567890n);

            // Each added key is written last in its object (right before the
            // brace that closes it), and taking them out again gives what the
            // original encodes to, byte for byte.
            const encoded = yield* Schema.encodeEffect(Save.SaveData)(save);
            let stripped = encoded;
            for (const key of added) {
                expect(stripped).toContain(`,${key}}`);
                stripped = stripped.replace(`,${key}}`, "}");
            }
            expect(stripped).toBe(
                yield* Schema.encodeEffect(Save.SaveData)(yield* Schema.decodeEffect(Save.SaveData)(original))
            );
            expect(yield* Schema.decodeEffect(Save.SaveData)(encoded)).toStrictEqual(save);
        })
    );

    it.effect("writes the keys it models in the order the game writes them", () =>
        Effect.gen(function* () {
            const original = enriched();
            const swapped = original.replace('"playerR":0,"playerE":null', '"playerE":null,"playerR":0');
            expect(swapped).not.toBe(original);
            expect(yield* Schema.encodeEffect(Save.SaveData)(yield* Schema.decodeEffect(Save.SaveData)(swapped))).toBe(
                yield* Schema.encodeEffect(Save.SaveData)(yield* Schema.decodeEffect(Save.SaveData)(original))
            );
        })
    );
});
