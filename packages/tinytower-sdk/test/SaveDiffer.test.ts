import { Effect, Schema, SchemaAST } from "effect";

import { describe, expect, it } from "@effect/vitest";
import { SaveDiffer, TinyTower } from "@tinyburg/tinytower-sdk";

import { loadCorpus } from "./utils/snapshots.ts";

type SaveData = SaveDiffer.SaveData;

const corpus = await Effect.runPromise(loadCorpus);
const { differ } = SaveDiffer;

/** Collections are multisets, and `diff` is exact up to their order. */
const normalized = (save: SaveData): SaveData =>
    Object.assign(
        {},
        save,
        Object.fromEntries(
            SaveDiffer.COLLECTION_FIELDS.flatMap((collection) => {
                const items = save[collection];
                return items === undefined ? [] : [[collection, [...items].sort()] as const];
            })
        )
    );

/** Asserts `patch(before, diff(before, after))` is `after`, and returns the patch. */
const expectExact = (before: SaveData, after: SaveData, label?: string): SaveDiffer.SavePatch => {
    const patch = differ.diff(before, after);
    expect(normalized(differ.patch(before, patch)), label).toStrictEqual(normalized(after));
    return patch;
};

/** A save with one field overwritten, whatever its type. */
const withField = (save: SaveData, field: string, value: unknown): SaveData =>
    Object.assign({}, save, { [field]: value });

/**
 * A save with one optional field left out, and the raw entries that followed
 * it where decoding a file without it would put them. That is `FieldUnset`'s
 * hand over, which the round trip test below holds to the encoder.
 */
const withoutField = (save: SaveData, field: string): SaveData => differ.patch(save, [{ _tag: "FieldUnset", field }]);

/** The fields of `SaveData` a save may leave out, read from the schema. */
const optionalFields: ReadonlyArray<string> = (() => {
    const ast = SchemaAST.toType(TinyTower.SaveData.ast.thunk());
    return SchemaAST.isObjects(ast)
        ? ast.propertySignatures.filter(({ type }) => SchemaAST.isOptional(type)).map(({ name }) => String(name))
        : [];
})();

/** What the save's raw entries follow: modelled fields and other raw entries. */
const followed = (save: SaveData): ReadonlySet<string> =>
    new Set(
        Object.values(save.$unknown).flatMap(({ $locationMetadata: { after } }) =>
            typeof after === "string" ? [after] : []
        )
    );

const encode = Schema.encodeSync(TinyTower.SaveData);

const roundTrip = (save: SaveData): SaveData => Schema.decodeSync(TinyTower.SaveData)(encode(save));

/** The last raw entry of the run that follows `start`, or `start` itself if nothing does. */
const endOfRun = (save: SaveData, start: string): string => {
    const next = new Map(
        Object.entries(save.$unknown).map(([key, { $locationMetadata }]) => [$locationMetadata.after, key] as const)
    );
    let end = start;
    for (let key = next.get(end); key !== undefined; key = next.get(key)) end = key;
    return end;
};

/**
 * A save with one more raw entry right after `after`, built by hand the way
 * decoding a file holding it would give it: whatever followed `after` now
 * follows the new entry, which sits just before it in file order.
 */
const withRawEntry = (save: SaveData, key: string, value: string, after: string): SaveData => {
    const entries = Object.entries(save.$unknown);
    const added = [key, { value, $locationMetadata: { after } }] as const;
    const at = entries.findIndex(([, entry]) => entry.$locationMetadata.after === after);
    if (at === -1) return { ...save, $unknown: Object.fromEntries([...entries, added]) };
    const [follower, entry] = entries[at];
    return {
        ...save,
        $unknown: Object.fromEntries([
            ...entries.slice(0, at),
            added,
            [follower, { ...entry, $locationMetadata: { after: key } }],
            ...entries.slice(at + 1),
        ]),
    };
};

/** A save without one raw entry, built by hand: whatever followed it follows what it followed. */
const withoutRawEntry = (save: SaveData, key: string): SaveData => {
    const { [key]: removed, ...rest } = save.$unknown;
    return {
        ...save,
        $unknown: Object.fromEntries(
            Object.entries(rest).map(([other, entry]) =>
                entry.$locationMetadata.after === key
                    ? [other, { ...entry, $locationMetadata: removed.$locationMetadata }]
                    : [other, entry]
            )
        ),
    };
};

/** The modelled fields of a save that a raw entry follows. */
const fieldsLeadingRuns = (save: SaveData): ReadonlyArray<string> => {
    const leaders = followed(save);
    return Object.keys(save).filter((key) => key !== "$unknown" && leaders.has(key));
};

/**
 * Asserts that unsetting `field` and encoding the result loses no other raw
 * entry, and that each one still follows what the patch said it follows.
 */
const expectUnsetSurvives = (save: SaveData, field: string, label: string): void => {
    const patched = differ.patch(save, [{ _tag: "FieldUnset", field }]);
    const decoded = roundTrip(patched);
    expect(Object.keys(decoded.$unknown).sort(), label).toStrictEqual(
        Object.keys(save.$unknown)
            .filter((key) => key !== field)
            .sort()
    );
    expect(decoded, label).toStrictEqual(patched);
};

/**
 * A save with a raw entry following every modelled field that had none, so that
 * whatever an unset field hands its raw entries to already has some.
 */
const crowded = (save: SaveData): SaveData => {
    const leaders = followed(save);
    return differ.patch(
        save,
        Object.keys(save)
            .filter((field) => field !== "$unknown" && !leaders.has(field))
            .map((field) => ({ _tag: "RawEntrySet", key: `spliceTest_${field}`, value: "1", after: field }))
    );
};

const replaceAt = <A>(values: ReadonlyArray<A>, index: number, value: A): ReadonlyArray<A> =>
    values.map((existing, position) => (position === index ? value : existing));

const removeAt = <A>(values: ReadonlyArray<A>, index: number): ReadonlyArray<A> =>
    values.filter((_, position) => position !== index);

const renumbered = (stories: ReadonlyArray<SaveDiffer.Floor>): ReadonlyArray<SaveDiffer.Floor> =>
    stories.map((floor, storyHeight) => ({ ...floor, storyHeight }));

/** The edits a player makes while playing, and a few Splice makes, each applied to one save. */
const playerEdits = (save: SaveData): ReadonlyArray<readonly [string, SaveData]> => {
    const middle = Math.floor(save.stories.length / 2);
    const floor = save.stories[middle];
    const bitizenIndex = Math.floor(save.bzns.length / 2);
    const bitizen = save.bzns[bitizenIndex];
    const rebuiltAs = save.stories.find((other) => other.floorId.name !== floor.floorId.name)!.floorId;
    const rawKey = Object.keys(save.$unknown)[0];

    return [
        [
            "floor appended",
            {
                ...save,
                stories: [...save.stories, { ...save.stories[1], storyHeight: save.stories.length, level: 1 }],
            },
        ],
        ["floor levelled", { ...save, stories: replaceAt(save.stories, middle, { ...floor, level: floor.level + 1 }) }],
        [
            "floor rebuilt",
            { ...save, stories: replaceAt(save.stories, middle, { ...floor, floorId: rebuiltAs, level: 1 }) },
        ],
        [
            "floor restocked",
            { ...save, stories: replaceAt(save.stories, middle, { ...floor, stocks: [1n, 2n, 3n], stockingTier: 0 }) },
        ],
        // Every observed save numbers its floors by position, but nothing stops one
        // from saying otherwise, and matching floors ignores the number.
        [
            "floor misnumbered",
            { ...save, stories: replaceAt(save.stories, middle, { ...floor, storyHeight: save.stories.length + 7 }) },
        ],
        ["middle floor removed", { ...save, stories: renumbered(removeAt(save.stories, middle)) }],
        [
            "bitizen edited",
            { ...save, bzns: replaceAt(save.bzns, bitizenIndex, { ...bitizen, customName: "Spliced" }) },
        ],
        ["bitizen added", { ...save, bzns: [...save.bzns, { ...bitizen, customName: "Newcomer" }] }],
        ["bitizen removed", { ...save, bzns: removeAt(save.bzns, bitizenIndex) }],
        ["doorman changed", { ...save, doorman: { ...save.doorman, customName: "Doorman" } }],
        ["coins changed", { ...save, coins: save.coins + 1234 }],
        // Decoding `[Pc]-0[Pc]` gives `-0`, which no distance lands on.
        ["coins written as -0", { ...save, coins: -0 }],
        ["bux spent", { ...save, bux: Math.max(0, save.bux - 7) }],
        ["gold changed", { ...save, gold: save.gold + 3 }],
        ["points scored", { ...save, totalPoints: save.totalPoints + 100n }],
        ["roof installed", { ...save, roof: save.roof + 1 }],
        ["setting toggled", { ...save, sfx: save.sfx === 0 ? 1 : 0 }],
        ["lobby renamed", { ...save, lobbyName: `${save.lobbyName} two` }],
        ["costume granted", { ...save, costumes: [...save.costumes, "splice test costume"] }],
        ["costume revoked", { ...save, costumes: save.costumes.slice(1) }],
        ["duplicate roof granted", { ...save, roofs: [...save.roofs, ...save.roofs.slice(0, 1)] }],
        ["pets reordered", { ...save, pets: [...(save.pets ?? [])].reverse() }],
        ["lift speed set", { ...save, liftSpeed: (save.liftSpeed ?? 9) + 0.25 }],
        ["lift speed removed", withoutField(save, "liftSpeed")],
        ["piggy bank removed", withoutField(save, "Ppig")],
        ["piggy bank added", { ...save, Ppig: "1234" }],
        ["pets removed", withoutField(save, "pets")],
        ["mission removed", withoutField(save, "mission")],
        ["friends cleared", { ...save, friends: "" }],
        ["friends removed", withoutField(save, "friends")],
        ["bitbook cleared", { ...save, bbPosts: [] }],
        ["raw entry added", withRawEntry(save, "spliceTest", "42", "bbpost")],
        ...(rawKey === undefined
            ? []
            : ([
                  [
                      "raw entry changed",
                      {
                          ...save,
                          $unknown: { ...save.$unknown, [rawKey]: { ...save.$unknown[rawKey], value: "changed" } },
                      },
                  ],
                  ["raw entry removed", withoutRawEntry(save, rawKey)],
              ] as const)),
    ];
};

/** Some other value for a field, going by its schema type, or nothing for a type with no generic change. */
const changedValue = (type: string, current: unknown): unknown => {
    switch (type) {
        case "Number": {
            return (typeof current === "number" ? current : 0) + 1;
        }
        case "BigInt": {
            return (typeof current === "bigint" ? current : 0n) + 1n;
        }
        case "String": {
            return `${typeof current === "string" ? current : ""}x`;
        }
        case "Arrays": {
            return [...(globalThis.Array.isArray(current) ? current : []), "x"];
        }
        default: {
            return undefined;
        }
    }
};

// Many of these walk the whole corpus, and since tests run concurrently, the
// time the others spend counts against each one's clock too.
describe("SaveDiffer", { timeout: 60_000 }, () => {
    it("loads every snapshot in the corpus", () => {
        expect(corpus.length).toBeGreaterThanOrEqual(31);
    });

    it("finds nothing to change between a save and itself", () => {
        for (const { save } of corpus) {
            expect(differ.diff(save, save)).toStrictEqual([]);
        }
    });

    it.each(corpus.map(({ id }, index) => [id, index] as const))(
        "diffs snapshot %s against the next one exactly",
        (_, index) => {
            const before = corpus[index].save;
            const after = corpus[(index + 1) % corpus.length].save;
            expectExact(before, after);
            expectExact(after, before);
        }
    );

    it.each(corpus.map(({ id, save }) => [id, save] as const))(
        "diffs snapshot %s against edited copies of itself exactly",
        (_, save) => {
            for (const [edit, edited] of playerEdits(save)) {
                expectExact(save, edited, edit);
                expectExact(edited, save, `${edit}, undone`);
            }
        }
    );

    it.effect("leaves a patched save encodable without losing anything", () =>
        Effect.gen(function* () {
            for (const [index, { save }] of corpus.entries()) {
                const next = corpus[(index + 1) % corpus.length].save;
                const patched = differ.patch(save, differ.diff(save, next));
                const encoded = yield* Schema.encodeEffect(TinyTower.SaveData)(patched);
                expect(yield* Schema.decodeEffect(TinyTower.SaveData)(encoded)).toStrictEqual(patched);
            }
        })
    );

    // The encoder only writes a raw entry after something it writes, so an
    // entry left following a field or raw entry that is gone is dropped on the
    // way out. `diff` never relies on the hand over (it places every entry it
    // compares), so this is the test that does.
    it("unsets what raw entries follow without losing them on the way out", () => {
        // Two examples of each optional field that raw entries follow, and of
        // each place a raw entry with followers can stand. The newer saves all
        // share one layout, and a round trip is too slow to repeat for each.
        const examples = new Map<string, ReadonlyArray<readonly [string, SaveData, string]>>();
        for (const { id, save } of corpus) {
            const leaders = followed(save);
            for (const field of [...optionalFields, ...Object.keys(save.$unknown)].filter((key) => leaders.has(key))) {
                const after = Object.hasOwn(save.$unknown, field) ? save.$unknown[field].$locationMetadata.after : null;
                const kind = !Object.hasOwn(save.$unknown, field)
                    ? field
                    : typeof after === "string" && Object.hasOwn(save.$unknown, after)
                      ? "a raw entry in a run"
                      : "a raw entry heading a run";
                const found = examples.get(kind) ?? [];
                if (found.length < 2) examples.set(kind, [...found, [id, save, field]]);
            }
        }
        expect([...examples.keys()]).toEqual(
            expect.arrayContaining(["PHP", "friends", "a raw entry heading a run", "a raw entry in a run"])
        );

        for (const [id, save, field] of [...examples.values()].flat()) {
            expectUnsetSurvives(save, field, `${field} in ${id}`);
            // A modelled field's raw entries join the end of the run already
            // following the field before it, rather than starting a second one.
            if (!Object.hasOwn(save.$unknown, field)) {
                expectUnsetSurvives(crowded(save), field, `${field} in ${id}, behind other raw entries`);
            }
        }
    });

    // The encoder writes one run of raw entries per field and one successor
    // per entry, so two entries following the same thing lose one branch on
    // the way out. Placing an entry has to splice it into the chain instead.
    describe("raw entries in the file", () => {
        it("splices new entries in after every field with a run and in the middle of a run", () => {
            for (const { id, save } of corpus) {
                const leaders = followed(save);
                const places = [
                    ...fieldsLeadingRuns(save),
                    ...Object.keys(save.$unknown)
                        .filter((key) => leaders.has(key))
                        .slice(0, 1),
                ];
                const additions = places.map((after, index) => [`spliceTest${index}`, String(index), after] as const);
                const patched = differ.patch(
                    save,
                    additions.map(([key, value, after]) => ({ _tag: "RawEntrySet", key, value, after }))
                );
                expect(patched, id).toStrictEqual(
                    additions.reduce((built, [key, value, after]) => withRawEntry(built, key, value, after), save)
                );
                expect(roundTrip(patched), id).toStrictEqual(patched);
            }
        });

        it("moves an entry after a field with a run, closing up the run it left", () => {
            let moved = 0;
            for (const { id, save } of corpus) {
                const leaders = followed(save);
                const fields = fieldsLeadingRuns(save);
                const head = Object.entries(save.$unknown).find(
                    ([key, { $locationMetadata }]) =>
                        leaders.has(key) && fields.includes($locationMetadata.after ?? "") && fields.length > 1
                );
                if (head === undefined) continue;
                const [key, entry] = head;
                const target = fields.find((field) => field !== entry.$locationMetadata.after)!;

                const patched = differ.patch(save, [{ _tag: "RawEntrySet", key, value: entry.value, after: target }]);
                expect(patched, id).toStrictEqual(withRawEntry(withoutRawEntry(save, key), key, entry.value, target));
                expect(roundTrip(patched), id).toStrictEqual(patched);
                moved++;
            }
            expect(moved).toBeGreaterThan(0);
        });

        it("puts an entry that is unset and set again back exactly where it was", () => {
            for (const { id, save } of corpus) {
                for (const [key, entry] of Object.entries(save.$unknown)) {
                    const { after } = entry.$locationMetadata;
                    expect(
                        differ.patch(save, [
                            { _tag: "FieldUnset", field: key },
                            { _tag: "RawEntrySet", key, value: entry.value, after: after ?? null },
                        ]),
                        `${key} in ${id}`
                    ).toStrictEqual(save);
                }
            }
        });

        it("replays one tower's new entry into another that added its own in the same place", () => {
            const before = corpus[0].save;
            const end = endOfRun(before, "bbpost");
            const fromB = withRawEntry(before, "fromB", "1", end);
            const fromC = withRawEntry(before, "fromC", "2", end);
            expect(roundTrip(fromB)).toStrictEqual(fromB);

            const patch = differ.diff(before, fromB);
            expect(patch).toStrictEqual([{ _tag: "RawEntrySet", key: "fromB", value: "1", after: end }]);
            const replayed = differ.patch(fromC, patch);
            expect(replayed).toStrictEqual(withRawEntry(fromC, "fromB", "1", end));
            expect(roundTrip(replayed)).toStrictEqual(replayed);
        });

        it("replays a diff between two towers onto a third without losing the third's own entries", () => {
            for (const [index, { id, save }] of corpus.entries()) {
                const patch = differ.diff(
                    corpus[(index + 1) % corpus.length].save,
                    corpus[(index + 2) % corpus.length].save
                );
                const unset = new Set(patch.flatMap((op) => (op._tag === "FieldUnset" ? [op.field] : [])));
                const replayed = differ.patch(save, patch);
                for (const key of Object.keys(save.$unknown).filter((key) => !unset.has(key))) {
                    expect(Object.keys(replayed.$unknown), id).toContain(key);
                }
                expect(roundTrip(replayed), id).toStrictEqual(replayed);
            }
        });

        it("puts an entry after null at the very start of the file, where decoding finds it again", () => {
            const save = corpus[0].save;
            const first = differ.patch(save, [{ _tag: "RawEntrySet", key: "spliceTest", value: "7", after: null }]);
            expect(encode(first).startsWith("[_save][spliceTest]7[spliceTest]")).toBe(true);
            expect(roundTrip(first)).toStrictEqual(first);

            const second = differ.patch(first, [{ _tag: "RawEntrySet", key: "spliceTest2", value: "8", after: null }]);
            expect(encode(second).startsWith("[_save][spliceTest2]8[spliceTest2][spliceTest]7[spliceTest]")).toBe(true);
            expect(roundTrip(second)).toStrictEqual(second);
        });

        it("leaves an entry where it is when after is left out, and adds a new one at the end of the file", () => {
            const save = corpus[0].save;
            const leaders = followed(save);
            const [key, entry] = Object.entries(save.$unknown).find(([other]) => leaders.has(other))!;

            const updated = differ.patch(save, [{ _tag: "RawEntrySet", key, value: "changed" }]);
            expect(updated).toStrictEqual({
                ...save,
                $unknown: { ...save.$unknown, [key]: { ...entry, value: "changed" } },
            });
            expect(roundTrip(updated)).toStrictEqual(updated);

            const added = differ.patch(save, [{ _tag: "RawEntrySet", key: "spliceTest", value: "1" }]);
            expect(added).toStrictEqual(withRawEntry(save, "spliceTest", "1", endOfRun(save, "bbpost")));
            expect(encode(added).endsWith("[spliceTest]1[spliceTest][_save]")).toBe(true);
            expect(roundTrip(added)).toStrictEqual(added);
        });

        it("treats an after naming nothing the save has, or the entry itself, as left out", () => {
            const save = corpus[0].save;
            const [key] = Object.keys(save.$unknown);
            const leftOut = differ.patch(save, [{ _tag: "RawEntrySet", key, value: "x" }]);
            for (const after of ["noSuchEntry", key]) {
                expect(differ.patch(save, [{ _tag: "RawEntrySet", key, value: "x", after }]), after).toStrictEqual(
                    leftOut
                );
            }
            expect(
                differ.patch(save, [{ _tag: "RawEntrySet", key: "spliceTest", value: "1", after: "noSuchEntry" }])
            ).toStrictEqual(differ.patch(save, [{ _tag: "RawEntrySet", key: "spliceTest", value: "1" }]));
        });

        // The encoder writes a raw key under its field's tag if it names one,
        // and decoding reads a field's tag as that field: such a key would
        // overwrite coins, cut the pets down, or leave stories undecodable.
        it("refuses a key the file cannot hold as a raw entry, wherever it is put", () => {
            const save = corpus[0].save;
            for (const key of ["coins", "Pc", "pets", "Ppets", "stories", "Ppig", "x[Pc", "", "__proto__", "a]b"]) {
                for (const op of [
                    { _tag: "RawEntrySet", key, value: "123", after: null },
                    { _tag: "RawEntrySet", key, value: "123", after: "bbpost" },
                    { _tag: "RawEntrySet", key, value: "123" },
                ] as const) {
                    const patched = differ.patch(save, [op]);
                    expect(patched, JSON.stringify(op)).toBe(save);
                    expect(roundTrip(patched), JSON.stringify(op)).toStrictEqual(save);
                }
            }

            // A bracket is fine as long as the key's own tag holds no field's.
            const kept = differ.patch(save, [{ _tag: "RawEntrySet", key: "a[b", value: "123", after: null }]);
            expect(kept.$unknown["a[b"]).toStrictEqual({ value: "123", $locationMetadata: { after: null } });
            expect(roundTrip(kept)).toStrictEqual(kept);
        });

        it("puts an entry after a field the save lacks where that field's own entries would go", () => {
            const [save, field] = corpus.flatMap(({ save }) =>
                ["PHP", "PVF", "Ppig", "Pplim"].flatMap((field) =>
                    Reflect.get(save, field) === undefined ? [[save, field] as const] : []
                )
            )[0];
            const place = { _tag: "RawEntrySet", key: "spliceTest", value: "1", after: field } as const;
            const patched = differ.patch(save, [place]);
            expect(patched).toStrictEqual(
                differ.patch(save, [{ _tag: "FieldSet", field, value: "1" }, place, { _tag: "FieldUnset", field }])
            );
            expect(patched.$unknown["spliceTest"].$locationMetadata.after).not.toBe(field);
            expect(roundTrip(patched)).toStrictEqual(patched);
        });
    });

    describe("small patches for single edits", () => {
        const save = corpus[0].save;
        const edits = new Map(playerEdits(save));
        const patchFor = (edit: string): SaveDiffer.SavePatch => expectExact(save, edits.get(edit)!);
        const middle = Math.floor(save.stories.length / 2);
        const bitizenIndex = Math.floor(save.bzns.length / 2);

        it("a floor built on top is one FloorAppended", () => {
            const appended = edits.get("floor appended")!.stories.at(-1);
            expect(patchFor("floor appended")).toStrictEqual([{ _tag: "FloorAppended", floor: appended }]);
        });

        it.each(["floor levelled", "floor rebuilt", "floor restocked", "floor misnumbered"])(
            "a %s in place is one FloorReplaced",
            (edit) => {
                expect(patchFor(edit)).toStrictEqual([
                    { _tag: "FloorReplaced", storyHeight: middle, floor: edits.get(edit)!.stories[middle] },
                ]);
            }
        );

        it("a floor removed from the middle is one FloorRemoved, whatever it does to the heights above", () => {
            expect(patchFor("middle floor removed")).toStrictEqual([{ _tag: "FloorRemoved", storyHeight: middle }]);
        });

        it("a bitizen edited in place is one BitizenReplaced", () => {
            expect(patchFor("bitizen edited")).toStrictEqual([
                {
                    _tag: "BitizenReplaced",
                    index: bitizenIndex,
                    bitizen: edits.get("bitizen edited")!.bzns[bitizenIndex],
                },
            ]);
        });

        it("a bitizen added is one BitizenAdded", () => {
            expect(patchFor("bitizen added")).toStrictEqual([
                { _tag: "BitizenAdded", bitizen: edits.get("bitizen added")!.bzns.at(-1) },
            ]);
        });

        it("a bitizen removed is one BitizenRemoved", () => {
            expect(patchFor("bitizen removed")).toStrictEqual([{ _tag: "BitizenRemoved", index: bitizenIndex }]);
        });

        it("a removal anywhere in the list is one removal", () => {
            for (const index of [0, 1, save.bzns.length - 1]) {
                expect(expectExact(save, { ...save, bzns: removeAt(save.bzns, index) })).toStrictEqual([
                    { _tag: "BitizenRemoved", index },
                ]);
            }
            for (const storyHeight of [1, 2, save.stories.length - 1]) {
                const after = { ...save, stories: renumbered(removeAt(save.stories, storyHeight)) };
                expect(expectExact(save, after)).toStrictEqual([{ _tag: "FloorRemoved", storyHeight }]);
            }
        });

        it("currencies and running totals move by a distance", () => {
            expect(patchFor("coins changed")).toStrictEqual([{ _tag: "CounterAdjusted", counter: "coins", by: 1234 }]);
            expect(patchFor("gold changed")).toStrictEqual([{ _tag: "CounterAdjusted", counter: "gold", by: 3 }]);
            expect(patchFor("points scored")).toStrictEqual([
                { _tag: "CounterAdjusted", counter: "totalPoints", by: 100 },
            ]);
        });

        it("a counter that lands on -0 is set rather than moved, and stays -0", () => {
            for (const counter of ["coins", "gold"] as const) {
                const patch = expectExact(save, withField(save, counter, -0), counter);
                expect(patch).toStrictEqual([{ _tag: "FieldSet", field: counter, value: "-0" }]);
                expect(Object.is(differ.patch(save, patch)[counter], -0)).toBe(true);
            }
        });

        it("ids and settings are set rather than adjusted", () => {
            expect(patchFor("roof installed")).toStrictEqual([
                { _tag: "FieldSet", field: "roof", value: String(save.roof + 1) },
            ]);
            expect(patchFor("setting toggled")).toStrictEqual([
                { _tag: "FieldSet", field: "sfx", value: save.sfx === 0 ? "1" : "0" },
            ]);
        });

        it("collections change by the items that came and went", () => {
            expect(patchFor("costume granted")).toStrictEqual([
                { _tag: "ItemsGranted", collection: "costumes", items: ["splice test costume"] },
            ]);
            expect(patchFor("costume revoked")).toStrictEqual([
                { _tag: "ItemsRevoked", collection: "costumes", items: save.costumes.slice(0, 1) },
            ]);
            expect(patchFor("duplicate roof granted")).toStrictEqual([
                { _tag: "ItemsGranted", collection: "roofs", items: save.roofs.slice(0, 1) },
            ]);
            expect(patchFor("pets reordered")).toStrictEqual([]);
        });

        it("a raw entry added after a field with a run is one RawEntrySet", () => {
            expect(fieldsLeadingRuns(save)).toContain("bbpost");
            expect(patchFor("raw entry added")).toStrictEqual([
                { _tag: "RawEntrySet", key: "spliceTest", value: "42", after: "bbpost" },
            ]);
            expect(roundTrip(edits.get("raw entry added")!)).toStrictEqual(edits.get("raw entry added"));
        });

        it("optional fields are set and unset", () => {
            expect(patchFor("piggy bank removed")).toStrictEqual([{ _tag: "FieldUnset", field: "Ppig" }]);
            expect(patchFor("lift speed removed")).toStrictEqual(
                save.liftSpeed === undefined ? [] : [{ _tag: "FieldUnset", field: "liftSpeed" }]
            );
            expect(patchFor("pets removed")).toStrictEqual([{ _tag: "FieldUnset", field: "pets" }]);
        });
    });

    it("sees a change to every field SaveData has", () => {
        const ast = SchemaAST.toType(TinyTower.SaveData.ast.thunk());
        expect(SchemaAST.isObjects(ast)).toBe(true);
        if (!SchemaAST.isObjects(ast)) return;

        // Lists of structured values with their own operations, covered by the
        // corpus and edit tests above rather than by a generic change here.
        const structured = new Set(["stories", "bzns", "doorman", "mission", "friends", "bbPosts", "$unknown"]);
        const save = corpus[0].save;

        for (const property of ast.propertySignatures) {
            const field = String(property.name);
            if (structured.has(field)) continue;

            const value = changedValue(property.type._tag, Reflect.get(save, field));
            expect(value, `SaveData.${field} is neither scalar nor a collection, so diff may not see it`).toBeDefined();
            if (value === undefined) continue;

            const changed = withField(save, field, value);
            expect(
                expectExact(save, changed, field).length,
                `a change to SaveData.${field} went unseen`
            ).toBeGreaterThan(0);

            if (SchemaAST.isOptional(property.type)) {
                expectExact(changed, withoutField(changed, field));
                expectExact(withoutField(changed, field), changed);
            }
        }
    });

    it("tells apart numbers JSON cannot write", () => {
        const [withMission, mission] = corpus.flatMap(({ save }) =>
            save.mission === undefined ? [] : [[save, save.mission] as const]
        )[0];
        const notANumber = { ...withMission, mission: { ...mission, type: Number.NaN } };
        const infinite = { ...withMission, mission: { ...mission, type: Number.POSITIVE_INFINITY } };
        expect(expectExact(notANumber, infinite)).toStrictEqual([{ _tag: "MissionSet", mission: infinite.mission }]);
        expect(expectExact(infinite, notANumber)).toStrictEqual([{ _tag: "MissionSet", mission: notANumber.mission }]);

        const save = corpus[0].save;
        const level = (value: number): SaveData => ({
            ...save,
            stories: replaceAt(save.stories, 1, { ...save.stories[1], level: value }),
        });
        const patch = expectExact(level(0), level(-0));
        expect(patch).toStrictEqual([{ _tag: "FloorReplaced", storyHeight: 1, floor: level(-0).stories[1] }]);
        expect(Object.is(differ.patch(level(0), patch).stories[1].level, -0)).toBe(true);
        expect(expectExact(level(-0), level(0))).toHaveLength(1);
    });

    it.effect("keeps a patch's meaning through a JSON round trip", () =>
        Effect.gen(function* () {
            const save = corpus[0].save;
            const targets = [...playerEdits(save).map(([, edited]) => edited), corpus[1].save];
            for (const target of targets) {
                const patch = differ.diff(save, target);
                const json = JSON.stringify(yield* Schema.encodeEffect(SaveDiffer.SavePatch)(patch));
                const parsed: unknown = JSON.parse(json);
                const decoded = yield* Schema.decodeUnknownEffect(SaveDiffer.SavePatch)(parsed);
                expect(differ.patch(save, decoded)).toStrictEqual(differ.patch(save, patch));
            }
        })
    );

    describe("patch", () => {
        const save = corpus[0].save;

        it("revokes one copy of an item per listed item", () => {
            const roofs = withField(save, "roofs", ["9", "9", "1"]);
            expect(
                differ.patch(roofs, [{ _tag: "ItemsRevoked", collection: "roofs", items: ["9"] }]).roofs
            ).toStrictEqual(["9", "1"]);
            expect(
                differ.patch(roofs, [{ _tag: "ItemsRevoked", collection: "roofs", items: ["9", "9", "7"] }]).roofs
            ).toStrictEqual(["1"]);
        });

        it("grants one copy per listed item, duplicates included", () => {
            const roofs = withField(save, "roofs", ["1"]);
            expect(
                differ.patch(roofs, [{ _tag: "ItemsGranted", collection: "roofs", items: ["1", "2"] }]).roofs
            ).toStrictEqual(["1", "1", "2"]);
        });

        it("adjusts counters only", () => {
            expect(differ.patch(save, [{ _tag: "CounterAdjusted", counter: "coins", by: 5 }]).coins).toBe(
                save.coins + 5
            );
            expect(differ.patch(save, [{ _tag: "CounterAdjusted", counter: "roof", by: 5 }])).toStrictEqual(save);
            expect(differ.patch(save, [{ _tag: "CounterAdjusted", counter: "notARealCounter", by: 5 }])).toStrictEqual(
                save
            );
        });

        it("is total: positions and raw keys that do not exist change nothing", () => {
            const nowhere = save.stories.length + 10;
            expect(
                differ.patch(save, [
                    { _tag: "FloorRemoved", storyHeight: nowhere },
                    { _tag: "FloorReplaced", storyHeight: nowhere, floor: save.stories[1] },
                    { _tag: "BitizenRemoved", index: save.bzns.length },
                    { _tag: "BitizenReplaced", index: save.bzns.length, bitizen: save.bzns[0] },
                    { _tag: "FieldSet", field: "notARawEntry", value: "1" },
                    { _tag: "FieldSet", field: "constructor", value: "1" },
                    { _tag: "FieldUnset", field: "constructor" },
                    { _tag: "FieldUnset", field: "coins" },
                    { _tag: "FieldSet", field: "coins", value: "not a number" },
                ])
            ).toStrictEqual(save);
        });

        it("creates an optional field the save lacks", () => {
            const lacking = withoutField(save, "Ppig");
            expect(differ.patch(lacking, [{ _tag: "FieldSet", field: "Ppig", value: "77" }]).Ppig).toBe("77");
        });
    });
});
