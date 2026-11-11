import { Effect, Redacted, Result, Schema } from "effect";

import * as fs from "node:fs";
import * as util from "node:util";
import * as zlib from "node:zlib";

import { describe, expect, it } from "@effect/vitest";
import { Cars, Cities, Engines, Save, Tracks } from "@tinyburg/pocket-trains-sdk";

const fixture = (name: string): string => fs.readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8");

/**
 * Saves Pocket Trains 1.10.2 wrote on an emulator, with the player's id and
 * salt replaced: a fresh install's, the copy `TRPlayer.saveGame` kept after the
 * probe grew the game, the copy `sync/pull` handed back, and a save the game's
 * `NBSync.encodeSave` deflated (`encoded-by-game.b64`).
 */
const fixtures = ["fresh.txt", "enriched.txt", "enriched-server.txt", "encoded-by-game.txt"] as const;

/** The salt the fixtures hold in place of the player's. */
const salt = "00000000-0000-0000-0000-000000000000";

const decode = Schema.decodeUnknownEffect(Save.SaveData);
const encode = Schema.encodeEffect(Save.SaveData);

const cityIds = new Set<number>(Cities.cities.map((city) => city.id));
const engineIds = new Set<number>(Engines.engines.map((engine) => engine.id));
const carIds = new Set<number>(Cars.cars.map((car) => car.id));
const tracksById = new Map<number, (typeof Tracks.tracks)[number]>(Tracks.tracks.map((track) => [track.id, track]));

describe("SaveData", () => {
    it.effect.each(fixtures)("%s encodes back to the same text", (name) =>
        Effect.gen(function* () {
            const text = fixture(name);
            const save = yield* decode(text);
            expect(yield* encode(save)).toBe(text);
        })
    );

    it.effect.each(fixtures)("%s only refers to things the game has", (name) =>
        Effect.gen(function* () {
            const save = yield* decode(fixture(name));
            const jobs = [...save.cities.flatMap((city) => city.j ?? []), ...save.trains.flatMap((train) => train.j)];

            for (const city of save.cities) expect(cityIds).toContain(city.id);
            for (const track of save.tracks) expect(tracksById.has(track.id)).toBe(true);
            for (const job of jobs) {
                expect(carIds).toContain(job.id);
                expect(cityIds).toContain(job.s);
                expect(cityIds).toContain(job.e);
            }
            for (const id of [
                ...save.trains.map((train) => train.eId),
                ...save.parts.map((parts) => parts.eID),
                ...save.yard.map((item) => item.eID),
                ...save.PLFP,
            ]) {
                expect(engineIds).toContain(id);
            }
            expect(cityIds).toContain(save.event.ecity);

            // Each leg runs along a track that touches the city it leaves.
            for (const leg of save.trains.flatMap((train) => train.trip?.l ?? [])) {
                const track = tracksById.get(leg.tID);
                expect(track).toBeDefined();
                expect([track?.cityAId, track?.cityBId]).toContain(leg.sID);
            }
        })
    );

    it.effect("reads the fresh save", () =>
        Effect.gen(function* () {
            const save = yield* decode(fixture("fresh.txt"));
            expect(save.pID).toBe("TEST01");
            expect(save.pS !== undefined && save.pS !== "" && Redacted.value(save.pS)).toBe(salt);
            expect(save.x).toBe(2500n);
            expect(save.trains.map((train) => train.trip?.com)).toStrictEqual([true, true]);
            expect(save.licenses).toStrictEqual(["Europe"]);
            expect(save.PFri).toStrictEqual([]);
            expect(save.tut).toStrictEqual([]);
            expect(save.tutorialTimestamp).toBe(-1);
        })
    );

    it.effect("reads the enriched save", () =>
        Effect.gen(function* () {
            const save = yield* decode(fixture("enriched.txt"));
            expect(save.gift).toBe("GIFT01");
            expect(save.pV).toBe(true);
            expect(save.PFri).toStrictEqual([
                { c: "FRND1", n: "Probe Pal" },
                { c: "FRND2", n: "Pal Two" },
            ]);
            expect(save.awards).toStrictEqual({ awd1: 100, awd5: 50 });
            expect(save.licenses).toStrictEqual(["Europe", "Asia"]);
            expect(save.crates.map((crate) => crate.l)).toStrictEqual([1, 3, -1]);
            expect(save.yard.map((item) => item.t)).toStrictEqual(["engine", "fuel", "engine", "fuel"]);
            expect(save.trains[0]?.pin).toBe(true);
            expect(save.trains[0]?.j.map((job) => job.t)).toStrictEqual(["Standard", "VIP"]);
            expect(save.cities[1]?.j).toHaveLength(2);
            expect(save.cities[0]?.j).toBeUndefined();
            // A trip the game had completed but not unloaded.
            expect(save.trains[1]?.trip).toMatchObject({ com: true, l: [{ tID: 64, sID: 52, o: true }] });
            expect(save.trains[1]?.trip).not.toHaveProperty("off");
            expect(save.tut).toHaveLength(43);
            expect(save.tutorialTimestamp).toBe(1794361234.25);
            expect(save.stats.ds.map((day) => day.d.epochMilliseconds)).toStrictEqual([1794355200000, 1375228800000]);
        })
    );

    it.effect("keeps ticks past 2^53 exact", () =>
        Effect.gen(function* () {
            const text = fixture("enriched.txt");
            const save = yield* decode(text);
            expect(save.nPCT).toBe(638981234567890123n);
            expect(save.nFBT).toBe(638981234567899999n);
            expect(Number(save.nPCT) > Number.MAX_SAFE_INTEGER).toBe(true);
            expect(yield* encode(save)).toContain("[nPCT]638981234567890123[nPCT]");
        })
    );

    it.effect("reads the server's copy, which has no salt or email", () =>
        Effect.gen(function* () {
            const save = yield* decode(fixture("enriched-server.txt"));
            expect(save).not.toHaveProperty("pS");
            expect(save).not.toHaveProperty("pE");
            expect(save.pV).toBe(true);
        })
    );

    it.effect.each(["fresh.txt", "enriched.txt", "encoded-by-game.txt"] as const)(
        "%s keeps the salt and email out of what it prints",
        (name) =>
            Effect.gen(function* () {
                const text = fixture(name);
                const save = yield* decode(text);
                expect(Redacted.isRedacted(save.pS)).toBe(true);
                const email = /\[pE\](.*?)\[pE\]/.exec(text)?.[1];
                if (email !== undefined) {
                    expect(Redacted.isRedacted(save.pE)).toBe(true);
                    expect(save.pE !== undefined && Redacted.value(save.pE)).toBe(email);
                }
                for (const printed of [
                    util.inspect(save, { depth: null }),
                    yield* Schema.encodeEffect(Schema.fromJsonString(Schema.Unknown))({ pS: save.pS, pE: save.pE }),
                ]) {
                    expect(printed).not.toContain(salt);
                    if (email !== undefined) expect(printed).not.toContain(email);
                }
            })
    );

    it.effect("reads an empty salt and writes it back", () =>
        Effect.gen(function* () {
            const text = fixture("fresh.txt").replace(`[pS]${salt}[pS]`, "[pS][pS]");
            expect(text).toContain("[pS][pS]");
            const save = yield* decode(text);
            expect(save.pS).toBe("");
            expect(yield* encode(save)).toBe(text);
        })
    );

    it.effect.each([
        ["a salt that is not a UUID", (text: string) => text.replace(`[pS]${salt}[pS]`, "[pS]not-a-uuid[pS]")],
        ["a count that disagrees", (text: string) => text.replace("[ccount]5[ccount]", "[ccount]6[ccount]")],
        ["an unknown block", (text: string) => text.replace("[timeInGame]", "[new]1[new][timeInGame]")],
        ["text between blocks", (text: string) => text.replace("[l]1[l]", "[l]1[l] ")],
        ["a number written another way", (text: string) => text.replace("[c]10000[c]", "[c]1e4[c]")],
        ["blocks out of order", (text: string) => text.replace("[x]2500[x][l]1[l]", "[l]1[l][x]2500[x]")],
    ] as const)("fails on %s", ([, change]) =>
        Effect.gen(function* () {
            const text = fixture("fresh.txt");
            const changed = change(text);
            expect(changed).not.toBe(text);
            expect(Result.isFailure(yield* Effect.result(decode(changed)))).toBe(true);
        })
    );
});

describe("SaveDataFromBytes", () => {
    const decodeBytes = Schema.decodeUnknownEffect(Save.SaveDataFromBytes);
    const encodeBytes = Schema.encodeEffect(Save.SaveDataFromBytes);

    it.effect("reads what the game's NBSync.encodeSave wrote", () =>
        Effect.gen(function* () {
            const bytes = new Uint8Array(Buffer.from(fixture("encoded-by-game.b64"), "base64"));
            expect(bytes[0]).toBe(0x78);
            const fromBytes = yield* decodeBytes(bytes);
            expect(fromBytes).toStrictEqual(yield* decode(fixture("encoded-by-game.txt")));
        })
    );

    it.effect("writes zlib that inflates to the same save", () =>
        Effect.gen(function* () {
            const text = fixture("enriched-server.txt");
            const save = yield* decode(text);
            const bytes = yield* encodeBytes(save);
            expect(zlib.inflateSync(bytes).toString("utf8")).toBe(text);
            expect(yield* decodeBytes(bytes)).toStrictEqual(save);
        })
    );

    it.effect("fails on a byte order mark rather than dropping it", () =>
        Effect.gen(function* () {
            const bytes = new Uint8Array(zlib.deflateSync(`\uFEFF${fixture("fresh.txt")}`));
            expect(Result.isFailure(yield* Effect.result(decodeBytes(bytes)))).toBe(true);
        })
    );

    it.effect("fails on bytes that are not zlib", () =>
        Effect.gen(function* () {
            const result = yield* Effect.result(decodeBytes(new TextEncoder().encode(fixture("fresh.txt"))));
            expect(Result.isFailure(result)).toBe(true);
        })
    );
});
