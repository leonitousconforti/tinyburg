import { Effect, Option, Schema } from "effect";

import { describe, expect, it } from "@effect/vitest";
import { Bitizens, Floors, SaveDiffer, Splice, TinyTower } from "@tinyburg/tinytower-sdk";

import { loadCorpus } from "./utils/snapshots.ts";

type SaveData = SaveDiffer.SaveData;
type Bitizen = SaveDiffer.Bitizen;
type Floor = SaveDiffer.Floor;

const corpus = await Effect.runPromise(loadCorpus);
const saves = corpus.map(({ save }) => save);

/** The first save, or pair of saves, in the corpus that has what a test needs. */
const findIn = <A>(pick: (save: SaveData) => A | undefined): readonly [SaveData, A] => {
    for (const save of saves) {
        const found = pick(save);
        if (found !== undefined) return [save, found];
    }
    throw new Error("No snapshot in the corpus has what this test needs");
};

const findPair = <A>(
    pick: (giver: SaveData, receiver: SaveData) => A | undefined
): readonly [SaveData, SaveData, A] => {
    for (const giver of saves) {
        for (const receiver of saves) {
            if (giver === receiver) continue;
            const found = pick(giver, receiver);
            if (found !== undefined) return [giver, receiver, found];
        }
    }
    throw new Error("No two snapshots in the corpus have what this test needs");
};

const catalogIndex = (floor: Floor): number => Option.getOrThrow(Splice.catalogIndex(floor.floorId));

/** Floors above the lobby that can be traded and have no twin in their tower. */
const tradeableFloors = (save: SaveData): ReadonlyArray<readonly [number, Floor]> =>
    [...save.stories.entries()].filter(
        ([storyHeight, floor]) =>
            storyHeight > 0 &&
            floor.floorId.type !== "Lobby" &&
            floor.floorId.type !== "Empty" &&
            save.stories.filter((other) => other.floorId.name === floor.floorId.name).length === 1
    );

/**
 * What a bitizen should look like on arrival: no job, no pet, and the empty
 * costume every real save writes for having none.
 */
const arrived = (bitizen: Bitizen): Bitizen => {
    const { pet: _pet, ...rest } = bitizen;
    return { ...rest, costume: "", workIndex: -1, placedDreamJob: false };
};

const isCostumed = (bitizen: Bitizen): boolean => bitizen.costume !== undefined && bitizen.costume !== "";

const everyone = (save: SaveData): ReadonlyArray<Bitizen> => [...save.bzns, save.doorman];

/** Asserts a bitizen goes out the way the game writes a plain one: an empty costume, and no pet. */
const expectPlain = Effect.fnUntraced(function* (bitizen: Bitizen) {
    const encoded = yield* Schema.encodeEffect(Bitizens.Bitizen)(bitizen);
    expect(encoded).toContain("[c][c]");
    expect(encoded).not.toContain("[p]");
});

const count = (items: ReadonlyArray<string> | undefined, item: string): number =>
    (items ?? []).filter((candidate) => candidate === item).length;

/** A floor whose `floorId` the catalogue has never heard of. */
const unknownFloor = (floor: Floor): Floor =>
    Object.assign({}, floor, { floorId: { name: "Nowhere Apts.", type: "Residential" } });

const roundTrip = Effect.fnUntraced(function* (save: SaveData) {
    const encoded = yield* Schema.encodeEffect(TinyTower.SaveData)(save);
    return yield* Schema.decodeEffect(TinyTower.SaveData)(encoded);
});

/** Why a splice was refused, or a reason no splice has when it went through. */
const refusal = (
    effect: Effect.Effect<unknown, Splice.SpliceError>
): Effect.Effect<Splice.SpliceErrorReason | "nothing, it went through"> =>
    Effect.match(effect, {
        onFailure: (error) => error.reason,
        onSuccess: () => "nothing, it went through" as const,
    });

/** The floor bundle a floor extraction holds. */
const floorBundle = (holding: Splice.Holding): Splice.FloorBundle => {
    if (holding._tag !== "Floor") throw new Error(`Expected a floor bundle, not a ${holding._tag}`);
    return holding;
};

describe("Splice.extract", () => {
    it.effect("refuses a floor the tower does not have", () =>
        Effect.gen(function* () {
            const save = saves[0];
            expect(yield* refusal(Splice.extract(save, { _tag: "Floor", storyHeight: save.stories.length }))).toBe(
                "FloorNotFound"
            );
        })
    );

    it.effect("refuses the lobby and empty floors", () =>
        Effect.gen(function* () {
            expect(yield* refusal(Splice.extract(saves[0], { _tag: "Floor", storyHeight: 0 }))).toBe(
                "FloorNotTradeable"
            );

            const [save, storyHeight] = findIn((save) => {
                const index = save.stories.findIndex((floor, height) => height > 0 && floor.floorId.type === "Empty");
                return index === -1 ? undefined : index;
            });
            expect(yield* refusal(Splice.extract(save, { _tag: "Floor", storyHeight }))).toBe("FloorNotTradeable");
        })
    );

    it.effect("refuses a floor the catalogue does not know", () =>
        Effect.gen(function* () {
            const [save, [storyHeight, floor]] = findIn((save) => tradeableFloors(save)[0]);
            const strange = SaveDiffer.differ.patch(save, [
                { _tag: "FloorReplaced", storyHeight, floor: unknownFloor(floor) },
            ]);
            expect(yield* refusal(Splice.extract(strange, { _tag: "Floor", storyHeight }))).toBe("UnknownFloor");
        })
    );

    it.effect("refuses a floor with a twin in the same tower", () =>
        Effect.gen(function* () {
            const [save, [storyHeight, floor]] = findIn((save) => tradeableFloors(save)[0]);
            const twinned = SaveDiffer.differ.patch(save, [{ _tag: "FloorAppended", floor }]);
            expect(yield* refusal(Splice.extract(twinned, { _tag: "Floor", storyHeight }))).toBe("AmbiguousFloor");
        })
    );

    it.effect("takes a residential floor with its residents, laid off and undressed", () =>
        Effect.gen(function* () {
            const [save, [storyHeight, floor]] = findIn((save) =>
                tradeableFloors(save).find(
                    ([, floor]) =>
                        floor.floorId.type === "Residential" &&
                        save.bzns.some(
                            (bitizen) =>
                                bitizen.homeIndex === catalogIndex(floor) &&
                                bitizen.workIndex !== -1 &&
                                (isCostumed(bitizen) || bitizen.pet !== undefined)
                        )
                )
            );
            const home = catalogIndex(floor);
            const residents = save.bzns.filter((bitizen) => bitizen.homeIndex === home);

            const extraction = yield* Splice.extract(save, { _tag: "Floor", storyHeight });

            expect(extraction.holding).toStrictEqual({
                _tag: "Floor",
                floor: { ...floor, storyHeight: 0 },
                bitizens: residents.map(arrived),
            });
            for (const bitizen of floorBundle(extraction.holding).bitizens) yield* expectPlain(bitizen);
            expect(extraction.save.bzns).toStrictEqual(save.bzns.filter((bitizen) => bitizen.homeIndex !== home));
            expect(extraction.save.stories).toStrictEqual(
                save.stories
                    .filter((_, height) => height !== storyHeight)
                    .map((other, height) => ({ ...other, storyHeight: height }))
            );
            expect(extraction.patch.at(-1)).toStrictEqual({ _tag: "FloorRemoved", storyHeight });
            expect(SaveDiffer.differ.patch(save, extraction.patch)).toStrictEqual(extraction.save);
            expect(yield* roundTrip(extraction.save)).toStrictEqual(extraction.save);
        })
    );

    it.effect("takes a shop without its workers, who stay at home without a job", () =>
        Effect.gen(function* () {
            const [save, [storyHeight, floor]] = findIn((save) =>
                tradeableFloors(save).find(
                    ([, floor]) =>
                        floor.floorId.type !== "Residential" &&
                        save.bzns.some((bitizen) => bitizen.workIndex === catalogIndex(floor))
                )
            );
            const shop = catalogIndex(floor);

            const extraction = yield* Splice.extract(save, { _tag: "Floor", storyHeight });

            expect(extraction.holding).toStrictEqual({
                _tag: "Floor",
                floor: { ...floor, storyHeight: 0 },
                bitizens: [],
            });
            expect(extraction.save.bzns).toStrictEqual(
                save.bzns.map((bitizen) =>
                    bitizen.workIndex === shop ? { ...bitizen, workIndex: -1, placedDreamJob: false } : bitizen
                )
            );
            expect(extraction.save.stories).toHaveLength(save.stories.length - 1);
            expect(yield* roundTrip(extraction.save)).toStrictEqual(extraction.save);
        })
    );

    it.effect("refuses a bitizen the tower does not have", () =>
        Effect.gen(function* () {
            const save = saves[0];
            expect(yield* refusal(Splice.extract(save, { _tag: "Bitizen", index: save.bzns.length }))).toBe(
                "BitizenNotFound"
            );
        })
    );

    it.effect("takes a lone bitizen, laid off and undressed", () =>
        Effect.gen(function* () {
            const [save, index] = findIn((save) => {
                const index = save.bzns.findIndex((bitizen) => isCostumed(bitizen) && bitizen.workIndex !== -1);
                return index === -1 ? undefined : index;
            });

            const extraction = yield* Splice.extract(save, { _tag: "Bitizen", index });

            expect(extraction.holding).toStrictEqual({ _tag: "Bitizen", bitizen: arrived(save.bzns[index]) });
            yield* expectPlain(arrived(save.bzns[index]));
            expect(extraction.save.bzns).toStrictEqual(save.bzns.filter((_, position) => position !== index));
            expect(extraction.patch).toStrictEqual([{ _tag: "BitizenRemoved", index }]);
        })
    );

    it.effect("refuses an item the tower does not own", () =>
        Effect.gen(function* () {
            const save = saves[0];
            for (const selector of [
                { _tag: "Costume", costume: "no such costume" },
                { _tag: "Pet", pet: "no_such_pet" },
                { _tag: "Fitting", fitting: "roof", id: "999999" },
            ] as const) {
                expect(yield* refusal(Splice.extract(save, selector))).toBe("NotOwned");
            }
        })
    );

    it.effect("refuses a costume being worn, a pet being kept, and the installed fitting", () =>
        Effect.gen(function* () {
            const [wearing, costume] = findIn(
                (save) =>
                    everyone(save).find(
                        (bitizen) => bitizen.costume !== undefined && save.costumes.includes(bitizen.costume)
                    )?.costume
            );
            expect(yield* refusal(Splice.extract(wearing, { _tag: "Costume", costume }))).toBe("InUse");

            const [keeping, pet] = findIn(
                (save) =>
                    everyone(save).find(
                        (bitizen) => bitizen.pet !== undefined && (save.pets ?? []).includes(bitizen.pet)
                    )?.pet
            );
            expect(yield* refusal(Splice.extract(keeping, { _tag: "Pet", pet }))).toBe("InUse");

            const [installed] = findIn((save) => (save.roofs.includes(String(save.roof)) ? true : undefined));
            expect(
                yield* refusal(
                    Splice.extract(installed, { _tag: "Fitting", fitting: "roof", id: String(installed.roof) })
                )
            ).toBe("InUse");
        })
    );

    it.effect("takes one copy of an item nobody is using", () =>
        Effect.gen(function* () {
            const [save, costume] = findIn((save) =>
                save.costumes.find((costume) => !Splice.inUse(save, { _tag: "Costume", costume }))
            );
            const extraction = yield* Splice.extract(save, { _tag: "Costume", costume });
            expect(extraction.holding).toStrictEqual({ _tag: "Costume", costume });
            expect(count(extraction.save.costumes, costume)).toBe(count(save.costumes, costume) - 1);
            expect(extraction.save.costumes).toHaveLength(save.costumes.length - 1);

            // One observed tower lists the same roof twice. Taking one leaves the other.
            const [twice, roof] = findIn((save) =>
                save.roofs.find((roof) => count(save.roofs, roof) > 1 && roof !== String(save.roof))
            );
            const fitting = yield* Splice.extract(twice, { _tag: "Fitting", fitting: "roof", id: roof });
            expect(count(fitting.save.roofs, roof)).toBe(count(twice.roofs, roof) - 1);
            expect(fitting.patch).toStrictEqual([{ _tag: "ItemsRevoked", collection: "roofs", items: [roof] }]);
        })
    );

    it.effect("refuses an amount that is not a whole number above zero", () =>
        Effect.gen(function* () {
            for (const amount of [0, -5, 1.5, Number.NaN]) {
                expect(yield* refusal(Splice.extract(saves[0], { _tag: "Currency", currency: "coins", amount }))).toBe(
                    "InvalidAmount"
                );
            }
        })
    );

    it.effect("refuses to spend past the balance, and takes what is there", () =>
        Effect.gen(function* () {
            const save = saves[0];
            expect(
                yield* refusal(Splice.extract(save, { _tag: "Currency", currency: "bux", amount: save.bux + 1 }))
            ).toBe("InsufficientFunds");

            const extraction = yield* Splice.extract(save, { _tag: "Currency", currency: "bux", amount: save.bux });
            expect(extraction.save.bux).toBe(0);
            expect(extraction.holding).toStrictEqual({ _tag: "Currency", currency: "bux", amount: save.bux });
        })
    );
});

describe("Splice.inUse", () => {
    it.effect("counts the doorman's costume and pet, even when nobody else has them", () =>
        Effect.gen(function* () {
            const [wearing, costume] = findIn((save) => {
                const { costume } = save.doorman;
                return costume !== undefined &&
                    costume !== "" &&
                    save.costumes.includes(costume) &&
                    !save.bzns.some((bitizen) => bitizen.costume === costume)
                    ? costume
                    : undefined;
            });
            expect(Splice.inUse(wearing, { _tag: "Costume", costume })).toBe(true);
            expect(yield* refusal(Splice.extract(wearing, { _tag: "Costume", costume }))).toBe("InUse");

            const [keeping, pet] = findIn((save) => {
                const { pet } = save.doorman;
                return pet !== undefined &&
                    (save.pets ?? []).includes(pet) &&
                    !save.bzns.some((bitizen) => bitizen.pet === pet)
                    ? pet
                    : undefined;
            });
            expect(Splice.inUse(keeping, { _tag: "Pet", pet })).toBe(true);
            expect(yield* refusal(Splice.extract(keeping, { _tag: "Pet", pet }))).toBe("InUse");
        })
    );

    it.effect("agrees with extract about every costume, pet and fitting a tower owns, and so does canExtract", () =>
        Effect.gen(function* () {
            for (const save of saves.slice(0, 4)) {
                const owned: ReadonlyArray<Splice.Owned> = [
                    ...save.costumes.map((costume) => ({ _tag: "Costume", costume }) as const),
                    ...(save.pets ?? []).map((pet) => ({ _tag: "Pet", pet }) as const),
                    ...save.roofs.map((id) => ({ _tag: "Fitting", fitting: "roof", id }) as const),
                    ...save.lifts.map((id) => ({ _tag: "Fitting", fitting: "lift", id }) as const),
                    ...save.lobbies.map((id) => ({ _tag: "Fitting", fitting: "lobby", id }) as const),
                ];
                for (const item of [...owned, { _tag: "Pet", pet: "" } as const]) {
                    const outcome = yield* Effect.result(Splice.extract(save, item));
                    const refusedInUse = outcome._tag === "Failure" && outcome.failure.reason === "InUse";
                    expect(refusedInUse, JSON.stringify(item)).toBe(Splice.inUse(save, item));
                    expect(Splice.canExtract(save, item), JSON.stringify(item)).toBe(outcome._tag === "Success");
                }
            }
        })
    );
});

// Splitting an empty list gives one empty name. Nothing may treat that as an
// item: not the check for what is in use (every undressed bitizen wears an
// empty costume), not extraction, and not delivery.
describe("empty names", () => {
    it.effect("are no item: nothing uses one, and extract and insert refuse one", () =>
        Effect.gen(function* () {
            const save = saves[0];
            const phantom: SaveData = {
                ...save,
                costumes: [...save.costumes, ""],
                pets: [...(save.pets ?? []), ""],
                roofs: [...save.roofs, ""],
            };
            expect(everyone(phantom).some((bitizen) => bitizen.costume === "")).toBe(true);

            for (const item of [
                { _tag: "Costume", costume: "" },
                { _tag: "Pet", pet: "" },
                { _tag: "Fitting", fitting: "roof", id: "" },
            ] as const) {
                expect(Splice.inUse(phantom, item), item._tag).toBe(false);
                expect(Splice.canExtract(phantom, item), item._tag).toBe(false);
                expect(yield* refusal(Splice.extract(phantom, item)), item._tag).toBe("InvalidItem");
                expect(yield* refusal(Splice.insert(save, item)), item._tag).toBe("InvalidItem");
            }
        })
    );

    it.effect("an emptied wardrobe reads back empty and offers nothing, and the next pet lands cleanly", () =>
        Effect.gen(function* () {
            const [petless] = findIn((save) => (save.pets === undefined ? true : undefined));
            const given = yield* Splice.insert(petless, { _tag: "Pet", pet: "rat" });
            const { save: emptied } = yield* Splice.extract(given, { _tag: "Pet", pet: "rat" });
            expect(emptied.pets).toStrictEqual([]);

            const reread = yield* roundTrip(emptied);
            expect(reread).toStrictEqual(emptied);
            expect((reread.pets ?? []).filter((pet) => Splice.canExtract(reread, { _tag: "Pet", pet }))).toStrictEqual(
                []
            );

            const regiven = yield* Splice.insert(reread, { _tag: "Pet", pet: "fox" });
            expect(yield* Schema.encodeEffect(TinyTower.SaveData)(regiven)).toContain("[Ppets]fox[Ppets]");

            const unclothed = yield* roundTrip({ ...petless, costumes: [] });
            expect(unclothed.costumes).toStrictEqual([]);
        })
    );
});

describe("Splice.insert", () => {
    it.effect("refuses a floor that is not tradeable or not in the catalogue", () =>
        Effect.gen(function* () {
            const save = saves[0];
            const lobby = save.stories[0];
            expect(yield* refusal(Splice.insert(save, { _tag: "Floor", floor: lobby, bitizens: [] }))).toBe(
                "FloorNotTradeable"
            );
            expect(
                yield* refusal(
                    Splice.insert(save, { _tag: "Floor", floor: unknownFloor(save.stories[1]), bitizens: [] })
                )
            ).toBe("UnknownFloor");
        })
    );

    it.effect("refuses a floor when the tower is at its height limit", () =>
        Effect.gen(function* () {
            const [giver, receiver, storyHeight] = findPair((giver) => tradeableFloors(giver)[0]?.[0]);
            const { holding } = yield* Splice.extract(giver, { _tag: "Floor", storyHeight });
            expect(yield* refusal(Splice.insert(receiver, holding, { maxStories: receiver.stories.length }))).toBe(
                "TowerTooTall"
            );
            const landed = yield* Splice.insert(receiver, holding, { maxStories: receiver.stories.length + 1 });
            expect(landed.stories).toHaveLength(receiver.stories.length + 1);
        })
    );

    it.effect("refuses a bundle carrying a bitizen who lives elsewhere", () =>
        Effect.gen(function* () {
            const [save, [storyHeight, floor]] = findIn((save) =>
                tradeableFloors(save).find(([, floor]) => floor.floorId.type === "Residential")
            );
            const stranger = save.bzns.find((bitizen) => bitizen.homeIndex !== catalogIndex(floor))!;
            const holding = floorBundle((yield* Splice.extract(save, { _tag: "Floor", storyHeight })).holding);
            expect(
                yield* refusal(Splice.insert(saves[0], { ...holding, bitizens: [...holding.bitizens, stranger] }))
            ).toBe("BundleMismatch");
        })
    );

    it.effect("refuses a bitizen with no home in the receiving tower", () =>
        Effect.gen(function* () {
            const [receiver, missing] = findIn((save) => {
                const present = new Set(save.stories.map(catalogIndex));
                const index = Floors.floors.findIndex(
                    (entry, index) => entry.type === "Residential" && !present.has(index)
                );
                return index === -1 ? undefined : index;
            });
            const bitizen = { ...receiver.bzns[0], homeIndex: missing };
            expect(yield* refusal(Splice.insert(receiver, { _tag: "Bitizen", bitizen }))).toBe("NoHomeFloor");
        })
    );

    it.effect("refuses an item the receiving tower already owns", () =>
        Effect.gen(function* () {
            const [save, pet] = findIn((save) => save.pets?.[0]);
            for (const holding of [
                { _tag: "Costume", costume: save.costumes[0] },
                { _tag: "Pet", pet },
                { _tag: "Fitting", fitting: "lift", id: save.lifts[0] },
            ] as const) {
                expect(yield* refusal(Splice.insert(save, holding))).toBe("AlreadyOwned");
            }
        })
    );

    it.effect("refuses an amount that is not a whole number above zero", () =>
        Effect.gen(function* () {
            for (const amount of [0, -1, 2.5]) {
                expect(yield* refusal(Splice.insert(saves[0], { _tag: "Currency", currency: "gold", amount }))).toBe(
                    "InvalidAmount"
                );
            }
        })
    );

    it.effect("delivers bitizens laid off and undressed, however the holding carried them", () =>
        Effect.gen(function* () {
            const [receiver, bitizen] = findIn((save) =>
                save.bzns.find((bitizen) => isCostumed(bitizen) && bitizen.workIndex !== -1)
            );
            const landed = yield* Splice.insert(receiver, { _tag: "Bitizen", bitizen });
            expect(landed.bzns).toStrictEqual([...receiver.bzns, arrived(bitizen)]);
            expect(Splice.holdingPatch({ _tag: "Bitizen", bitizen })).toStrictEqual([
                { _tag: "BitizenAdded", bitizen: arrived(bitizen) },
            ]);
            yield* expectPlain(landed.bzns[receiver.bzns.length]);

            // Residents arriving with their floor too, even from a bundle that
            // still carries their costume, pet and job.
            const [giver, [storyHeight, floor]] = findIn((save) =>
                tradeableFloors(save).find(
                    ([, floor]) =>
                        floor.floorId.type === "Residential" &&
                        save.bzns.some((resident) => resident.homeIndex === catalogIndex(floor))
                )
            );
            const [, pet] = findIn((save) => everyone(save).find((other) => other.pet !== undefined)?.pet);
            const extraction = yield* Splice.extract(giver, { _tag: "Floor", storyHeight });
            const extracted = floorBundle(extraction.holding);
            const bundle: Splice.FloorBundle = {
                ...extracted,
                bitizens: extracted.bitizens.map((resident) => ({
                    ...resident,
                    costume: "splice test costume",
                    pet,
                    workIndex: catalogIndex(floor),
                    placedDreamJob: true,
                })),
            };
            const residents = bundle.bitizens.map(arrived);
            expect(residents.length).toBeGreaterThan(0);

            const refunded = yield* Splice.insert(extraction.save, bundle);
            expect(refunded.bzns).toStrictEqual([...extraction.save.bzns, ...residents]);
            expect(Splice.holdingPatch(bundle)).toStrictEqual([
                { _tag: "FloorAppended", floor: bundle.floor },
                ...residents.map((resident) => ({ _tag: "BitizenAdded", bitizen: resident })),
            ]);
            for (const resident of refunded.bzns.slice(extraction.save.bzns.length)) yield* expectPlain(resident);
        })
    );
});

describe("extract then insert", () => {
    it.effect("moves a costume, a pet, a bitizen, coins and a floor between towers without losing any", () =>
        Effect.gen(function* () {
            const [costumeGiver, costumeReceiver, costume] = findPair((giver, receiver) =>
                giver.costumes.find(
                    (costume) =>
                        !Splice.inUse(giver, { _tag: "Costume", costume }) && !receiver.costumes.includes(costume)
                )
            );
            const [petGiver, petReceiver, pet] = findPair((giver, receiver) =>
                giver.pets?.find((pet) => !Splice.inUse(giver, { _tag: "Pet", pet }) && !receiver.pets?.includes(pet))
            );
            const [bitizenGiver, bitizenReceiver, index] = findPair((giver, receiver) => {
                const homes = new Set(receiver.stories.map(catalogIndex));
                const index = giver.bzns.findIndex((bitizen) => homes.has(bitizen.homeIndex));
                return index === -1 ? undefined : index;
            });
            const [floorGiver, floorReceiver, storyHeight] = findPair((giver, receiver) => {
                const present = new Set(receiver.stories.map((floor) => floor.floorId.name));
                return tradeableFloors(giver).find(
                    ([, floor]) => floor.floorId.type === "Residential" && !present.has(floor.floorId.name)
                )?.[0];
            });

            const moves: ReadonlyArray<readonly [SaveData, SaveData, Splice.Selector]> = [
                [costumeGiver, costumeReceiver, { _tag: "Costume", costume }],
                [petGiver, petReceiver, { _tag: "Pet", pet }],
                [bitizenGiver, bitizenReceiver, { _tag: "Bitizen", index }],
                [saves[0], saves[1], { _tag: "Currency", currency: "coins", amount: 1000 }],
                [floorGiver, floorReceiver, { _tag: "Floor", storyHeight }],
            ];

            for (const [giver, receiver, selector] of moves) {
                const extraction = yield* Splice.extract(giver, selector);
                const received = yield* Splice.insert(receiver, extraction.holding);

                expect(yield* roundTrip(extraction.save)).toStrictEqual(extraction.save);
                expect(yield* roundTrip(received)).toStrictEqual(received);
                for (const arrival of received.bzns.slice(receiver.bzns.length)) yield* expectPlain(arrival);

                switch (selector._tag) {
                    case "Costume": {
                        expect(count(extraction.save.costumes, costume)).toBe(count(giver.costumes, costume) - 1);
                        expect(count(received.costumes, costume)).toBe(1);
                        break;
                    }
                    case "Pet": {
                        expect(count(extraction.save.pets, pet)).toBe(count(giver.pets, pet) - 1);
                        expect(count(received.pets, pet)).toBe(1);
                        break;
                    }
                    case "Bitizen": {
                        expect(extraction.save.bzns).toHaveLength(giver.bzns.length - 1);
                        expect(received.bzns).toStrictEqual([...receiver.bzns, arrived(giver.bzns[index])]);
                        break;
                    }
                    case "Currency": {
                        expect(extraction.save.coins).toBe(giver.coins - 1000);
                        expect(received.coins).toBe(receiver.coins + 1000);
                        break;
                    }
                    case "Floor": {
                        const residents = floorBundle(extraction.holding).bitizens;
                        expect(received.stories).toHaveLength(receiver.stories.length + 1);
                        expect(received.stories.at(-1)).toStrictEqual({
                            ...giver.stories[storyHeight],
                            storyHeight: receiver.stories.length,
                        });
                        expect(received.bzns).toStrictEqual([...receiver.bzns, ...residents]);
                        expect(extraction.save.bzns).toHaveLength(giver.bzns.length - residents.length);
                        break;
                    }
                    default: {
                        expect.unreachable();
                    }
                }
            }
        })
    );

    it.effect("keeps a holding's meaning through a JSON round trip", () =>
        Effect.gen(function* () {
            const [save, [storyHeight]] = findIn((save) =>
                tradeableFloors(save).find(([, floor]) => floor.floorId.type === "Residential")
            );
            const { holding, patch } = yield* Splice.extract(save, { _tag: "Floor", storyHeight });
            const encodedHolding = JSON.stringify(yield* Schema.encodeEffect(Splice.Holding)(holding));
            const encodedPatch = JSON.stringify(yield* Schema.encodeEffect(SaveDiffer.SavePatch)(patch));
            const parsedHolding: unknown = JSON.parse(encodedHolding);
            const parsedPatch: unknown = JSON.parse(encodedPatch);
            expect(yield* Schema.decodeUnknownEffect(Splice.Holding)(parsedHolding)).toStrictEqual(holding);
            expect(yield* Schema.decodeUnknownEffect(SaveDiffer.SavePatch)(parsedPatch)).toStrictEqual(patch);
        })
    );
});
