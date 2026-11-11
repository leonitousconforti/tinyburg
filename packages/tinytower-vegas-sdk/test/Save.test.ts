import { Effect, Redacted, Result, Schema } from "effect";

import * as fs from "node:fs";
import * as util from "node:util";
import * as zlib from "node:zlib";

import { describe, expect, it } from "@effect/vitest";
import { Characters, Elevators, Floors, Missions, Roofs, Save } from "@tinyburg/tinytower-vegas-sdk";

const fixture = (name: string): string => fs.readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8");

/**
 * Saves Tiny Tower Vegas 1.5.2 wrote on an emulator, with the player's id,
 * salt and email replaced: two fresh installs' (one before its first Bitbook
 * post), one the probe grew by calling the game's own methods (`grown.txt`),
 * one where it also set the fields that only some floors and bitizens have
 * (`enriched.txt`), two with posts that have media and each kind of poster
 * (`post-media.txt`, `post-sources.txt`), and the copy `NBSync.decodeSave` made of what `sync/pull`
 * handed back (`pulled.txt`).
 */
const fixtures = [
    "fresh.txt",
    "fresh-no-posts.txt",
    "grown.txt",
    "enriched.txt",
    "post-media.txt",
    "post-sources.txt",
    "pulled.txt",
] as const;

/** The fake salt and email the fixtures hold in place of the player's. */
const salt = "00000000-0000-0000-0000-000000000000";
const email = "player@example.com";

const decode = Schema.decodeUnknownEffect(Save.SaveData);
const encode = Schema.encodeEffect(Save.SaveData);

const characterIds = new Set<string>(Characters.characters.map((character) => character.id));
const missionIds = new Set<number>(
    [...Missions.tutorialMissions, ...Missions.missions, ...Missions.tipMissions].map((mission) => mission.id)
);

/** `NBUtils.toBase26`: digits `A` to `Z`, most significant first. */
const base26 = (value: bigint): string => {
    let out = "";
    let rest = value;
    do {
        out = String.fromCharCode(65 + Number(rest % 26n)) + out;
        rest /= 26n;
    } while (rest > 0n);
    return out;
};

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

            for (const { floor } of save.floors) {
                const info = Floors.floors[floor.f_id];
                expect(info).toBeDefined();
                const residents = Object.values(floor.f_bzn);
                if (residents.some((resident) => resident.f_vpt !== undefined)) expect(info?.type).toBe("Lobby");
                if (residents.some((resident) => resident.f_cot !== undefined)) expect(info?.type).toBe("Hotel");
                if (floor.f_fpd !== undefined) expect(info?.type).toBe("Casino");
            }
            for (const id of [save.p_lobby, ...(save.p_lbys ?? [])]) expect(Floors.floors[id]?.type).toBe("Lobby");
            for (const id of [save.p_roof, ...(save.p_rfs ?? [])]) expect(Roofs.roofs[id]).toBeDefined();
            for (const id of [save.p_lift, ...(save.p_lfs ?? [])]) expect(Elevators.elevators[id]).toBeDefined();
            for (const id of save.p_ch ?? []) expect(characterIds).toContain(id);
            for (const post of save.posts) if (post.bb_chr !== undefined) expect(characterIds).toContain(post.bb_chr);
            if (save.p_miss !== undefined) expect(missionIds).toContain(save.p_miss.m_id);
            // The game's check against editing the currencies.
            expect(save.p_bbhsh).toBe(base26(save.p_bux + save.p_coin + save.p_chip));
        })
    );

    it.effect("reads the fresh save", () =>
        Effect.gen(function* () {
            const save = yield* decode(fixture("fresh.txt"));
            expect(save.ver).toBe("1.5.2");
            expect(save.p_pid).toBe("TEST1");
            expect(save.p_ps && Redacted.value(save.p_ps)).toBe(salt);
            expect(save.p_coin).toBe(42000n);
            expect(save.p_vip).toBe(false);
            expect(save.p_lspd).toBe(1);
            expect(save.floors.map(({ story, floor }) => [story, floor.f_id])).toStrictEqual([
                [1, 100],
                [2, 0],
            ]);
            // The floor being built holds its three builders.
            expect(Object.values(save.floors[1]?.floor.f_bzn ?? {}).map(({ f_bzn }) => f_bzn.b_cn)).toStrictEqual([
                "construction",
                "construction",
                "construction",
            ]);
            expect(save.p_ch).toStrictEqual(["artmajor"]);
            expect(save.p_miss).toStrictEqual({ m_id: 0, m_fid: 0, m_cnt: 3, m_ft: 0 });
            expect(save.posts).toHaveLength(1);
            expect(save.posts[0]?.bb_date).toBe(639299589582086780n);
            expect(save).not.toHaveProperty("p_em");
            expect(save).not.toHaveProperty("tmp");
        })
    );

    it.effect.each([
        [
            "a count that disagrees",
            (text: string) => text.replace("[p_stories]2[p_stories]", "[p_stories]3[p_stories]"),
        ],
        ["an unknown block", (text: string) => text.replace("[tp]", "[new]1[new][tp]")],
        ["text between blocks", (text: string) => text.replace("[lst]0[lst]", "[lst]0[lst] ")],
        [
            "a number written another way",
            (text: string) => text.replace("[p_coin]42000[p_coin]", "[p_coin]4.2e4[p_coin]"),
        ],
        [
            "blocks out of order",
            (text: string) => text.replace("[it]63929958934[it][lst]0[lst]", "[lst]0[lst][it]63929958934[it]"),
        ],
        ["slots out of order", (text: string) => text.replaceAll("[f_bzn0]", "[f_bzn3]")],
        ["a bool written another way", (text: string) => text.replace("[p_vip]False[p_vip]", "[p_vip]false[p_vip]")],
        [
            "an unknown block in a floor",
            (text: string) => text.replace("[f_sbt]1[f_sbt][story1]", "[f_sbt]1[f_sbt][f_new]1[f_new][story1]"),
        ],
        [
            "an unknown slot block in a floor",
            (text: string) => text.replace("[f_bzn2][story2]", "[f_bzn2][f_new0]1[f_new0][story2]"),
        ],
        [
            "an unknown block in a bitizen",
            (text: string) =>
                text.replace("[b_cn]construction[b_cn][f_bzn0]", "[b_cn]construction[b_cn][b_new]1[b_new][f_bzn0]"),
        ],
        [
            "an unknown block in the mission",
            (text: string) => text.replace("[m_ft]0[m_ft]", "[m_ft]0[m_ft][m_new]1[m_new]"),
        ],
        [
            "an unknown block in a post",
            (text: string) => text.replace("[bb_lks]16[bb_lks]", "[bb_lks]16[bb_lks][bb_new]1[bb_new]"),
        ],
        ["a salt that is not a UUID", (text: string) => text.replace(`[p_ps]${salt}[p_ps]`, "[p_ps]not-a-uuid[p_ps]")],
    ] as const)("fails on %s", ([, change]) =>
        Effect.gen(function* () {
            const text = fixture("fresh.txt");
            const changed = change(text);
            expect(changed).not.toBe(text);
            expect(Result.isFailure(yield* Effect.result(decode(changed)))).toBe(true);
        })
    );

    it.effect.each([
        ["a float with more digits than C# writes", "[p_lspd]0.3333333[p_lspd]", "[p_lspd]0.33333334[p_lspd]"],
        ["a float written with a comma", "[f_sln0]2.5[f_sln0]", "[f_sln0]2,5[f_sln0]"],
        ["a flag with a value", "[m_com][m_com]", "[m_com]1[m_com]"],
        ["an unknown VIP job", "[f_vpt1]TravelAgent[f_vpt1]", "[f_vpt1]Pilot[f_vpt1]"],
        ["a ulong past its range", "[tp]18446744073709551615[tp]", "[tp]18446744073709551616[tp]"],
    ] as const)("fails on %s", ([, from, to]) =>
        Effect.gen(function* () {
            const text = fixture("enriched.txt");
            expect(text).toContain(from);
            expect(Result.isFailure(yield* Effect.result(decode(text.replace(from, to))))).toBe(true);
        })
    );

    it.effect("reads the enriched save", () =>
        Effect.gen(function* () {
            const save = yield* decode(fixture("enriched.txt"));
            expect(save.p_vip).toBe(true);
            expect(save.p_lspd).toBe(0.3333333);
            expect(save.p_frnd).toStrictEqual(["FRND1", "AB12C"]);
            expect(save.p_ch).toStrictEqual(["artmajor", "theking"]);
            expect([save.p_avseed, save.p_avcost]).toStrictEqual([12345, "elvis"]);
            expect([save.p_rfs, save.p_lfs, save.p_lbys]).toStrictEqual([
                [0, 3, 6],
                [0, 2],
                [100, 1],
            ]);
            expect(save.p_miss).toStrictEqual({ m_id: 0, m_fid: 0, m_pr: "chip", m_cnt: 3, m_ft: 0, m_com: true });
            expect([save.p_ntm, save.p_tipmiss, save.tmp, save.p_preg]).toStrictEqual([1, 1, "temp", true]);
            expect(save.p_em && Redacted.value(save.p_em)).toBe(email);
            expect(save.posts).toStrictEqual([]);
            expect(save.floors.map(({ story, floor }) => [story, floor.f_id])).toStrictEqual([
                [1, 100],
                [2, 19],
                [3, 9],
                [4, 29],
                [5, 0],
            ]);

            const [lobby, hotel, casino, shop] = save.floors.map(({ floor }) => floor);
            expect(lobby?.f_bzn["1"]).toStrictEqual({ f_bzn: { b_seed: 99, b_df: 3 }, f_vpt: "TravelAgent" });
            expect(hotel?.f_bzn).toStrictEqual({
                "0": {
                    f_bzn: { b_seed: 424242, b_df: 12, b_cn: "elvis", "!": true },
                    f_cot: 639299700000000000n,
                    f_sln: 2.5,
                },
                "2": { f_bzn: { b_seed: -17, b_df: 104 }, f_cot: 639299712345678901n, f_sln: 0.3333333 },
            });
            expect(casino).toMatchObject({ f_fpd: 20403n, f_chps: 150, f_bwon: 20, f_bzn: {} });
            expect(shop).toMatchObject({
                f_si: 1,
                f_st: 639299611111111111n,
                f_stk: { "0": 5, "2": 7 },
                f_lst: { "0": 639299622222222222n, "2": 639299633333333333n },
            });
        })
    );

    it.effect("keeps values past 2^53 exact", () =>
        Effect.gen(function* () {
            const text = fixture("enriched.txt");
            const save = yield* decode(text);
            expect(save.tp).toBe(18446744073709551615n);
            expect(save.floors[1]?.floor.f_bzn["2"]?.f_cot).toBe(639299712345678901n);
            expect(Number(save.tp) > Number.MAX_SAFE_INTEGER).toBe(true);
            const encoded = yield* encode(save);
            expect(encoded).toContain("[tp]18446744073709551615[tp]");
            expect(encoded).toContain("[f_cot2]639299712345678901[f_cot2]");
        })
    );

    // What the game's Block.Val wrote for these floats (Tiny Tower Vegas 1.5.2,
    // en-US), as [value, text].
    const floats = [
        [Math.fround(1 / 3), "0.3333333"],
        [Math.fround(1.1), "1.1"],
        [2.5, "2.5"],
        [Math.fround(0.00001), "1E-05"],
        [Math.fround(0.000012345), "1.2345E-05"],
        [12345678, "1.234568E+07"],
        [10000000, "1E+07"],
        [9999999, "9999999"],
        [Math.fround(1e-7), "1E-07"],
        [Math.fround(123456.7), "123456.7"],
        [1, "1"],
        [16777216, "1.677722E+07"],
        [Math.fround(0.1), "0.1"],
        [-2.5, "-2.5"],
        [Math.fround(1e20), "1E+20"],
        [Math.fround(0.0001), "0.0001"],
    ] as const;

    it.effect.each(floats)("writes the float %s as the game did, %s", ([value, text]) =>
        Effect.gen(function* () {
            const fresh = fixture("fresh.txt");
            const changed = fresh.replace("[p_lspd]1[p_lspd]", `[p_lspd]${text}[p_lspd]`);
            const save = yield* decode(changed);
            // Seven digits are all the game keeps, so the text is the value.
            expect(save.p_lspd).toBe(Number(text));
            expect(yield* encode(save)).toBe(changed);
            expect(yield* encode({ ...save, p_lspd: value })).toBe(changed);
        })
    );

    it.effect("reads the post blocks only some posts have", () =>
        Effect.gen(function* () {
            const save = yield* decode(fixture("post-media.txt"));
            expect(save.posts[0]).toMatchObject({ bb_mt: 1, bb_mp: "probe.png", bb_ft: 2.5, bb_lks: 3 });

            // A post names the first poster it has: a bitizen, a character or a sprite.
            const sources = yield* decode(fixture("post-sources.txt"));
            expect(
                sources.posts.map(({ bb_tid, bb_bzn, bb_chr, bb_selem, bb_sname }) => ({
                    bb_tid,
                    bb_bzn,
                    bb_chr,
                    bb_selem,
                    bb_sname,
                }))
            ).toStrictEqual([
                { bb_tid: 77, bb_bzn: undefined, bb_chr: "theking", bb_selem: undefined, bb_sname: undefined },
                {
                    bb_tid: 512,
                    bb_bzn: { b_seed: 0, b_df: 70, b_cn: "artmajor" },
                    bb_chr: undefined,
                    bb_selem: undefined,
                    bb_sname: undefined,
                },
                { bb_tid: 939, bb_bzn: undefined, bb_chr: undefined, bb_selem: "probe_elem", bb_sname: "Probe Name" },
            ]);
        })
    );

    it.effect("reads the server's copy, which keeps the salt and email", () =>
        Effect.gen(function* () {
            const save = yield* decode(fixture("pulled.txt"));
            expect(save.p_pid).toBe("TEST1");
            expect(save.p_ps && Redacted.value(save.p_ps)).toBe(salt);
            expect(save.p_em && Redacted.value(save.p_em)).toBe(email);
        })
    );

    it.effect.each(["enriched.txt", "pulled.txt"] as const)("%s prints without the salt and email", (name) =>
        Effect.gen(function* () {
            const save = yield* decode(fixture(name));
            expect(Redacted.isRedacted(save.p_ps)).toBe(true);
            expect(Redacted.isRedacted(save.p_em)).toBe(true);
            const printed = [
                // What console.log writes for them.
                util.format("%s %s", save.p_ps, save.p_em),
                JSON.stringify(save, (_key, value: unknown) => (typeof value === "bigint" ? `${value}` : value)),
                util.inspect(save, { depth: null }),
            ];
            for (const text of printed) {
                expect(text).not.toContain(salt);
                expect(text).not.toContain(email);
            }
        })
    );
});

describe("SaveDataFromBytes", () => {
    const decodeBytes = Schema.decodeUnknownEffect(Save.SaveDataFromBytes);
    const encodeBytes = Schema.encodeEffect(Save.SaveDataFromBytes);

    it.effect("reads what the game's NBSync.encodeSave wrote", () =>
        Effect.gen(function* () {
            const bytes = new Uint8Array(Buffer.from(fixture("encoded-by-game.b64"), "base64"));
            expect([bytes[0], bytes[1]]).toStrictEqual([0x78, 0x9c]);
            expect(yield* decodeBytes(bytes)).toStrictEqual(yield* decode(fixture("enriched.txt")));
        })
    );

    it.effect("writes zlib that inflates to the same save", () =>
        Effect.gen(function* () {
            const text = fixture("pulled.txt");
            const save = yield* decode(text);
            const bytes = yield* encodeBytes(save);
            expect(zlib.inflateSync(bytes).toString("utf8")).toBe(text);
            expect(yield* decodeBytes(bytes)).toStrictEqual(save);
        })
    );

    it.effect("fails on text that starts with a byte order mark instead of dropping it", () =>
        Effect.gen(function* () {
            const deflate = (text: string) => new Uint8Array(zlib.deflateSync(Buffer.from(text, "utf8")));
            const text = fixture("fresh.txt");
            expect(yield* decodeBytes(deflate(text))).toStrictEqual(yield* decode(text));
            expect(Result.isFailure(yield* Effect.result(decodeBytes(deflate(`\uFEFF${text}`))))).toBe(true);
        })
    );

    it.effect("fails on bytes that are not zlib", () =>
        Effect.gen(function* () {
            const result = yield* Effect.result(decodeBytes(new TextEncoder().encode(fixture("fresh.txt"))));
            expect(Result.isFailure(result)).toBe(true);
        })
    );
});
