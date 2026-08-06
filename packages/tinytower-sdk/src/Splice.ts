/**
 * Moving one thing out of a tower and into another.
 *
 * An escrow holds an item by taking it out of its owner's save and keeping it
 * until a trade settles, then putting it into somebody else's. Both halves are
 * expressed here as {@link SaveDiffer.SavePatch} values: {@link extract} returns
 * the patch it applied alongside the {@link Holding} to keep, and {@link insert}
 * turns a holding back into a patch. Nothing here talks to the network or a
 * database, so the risky part of a trade is a pure function that can be tested
 * against real saves.
 *
 * ## What can move
 *
 * A {@link Selector} names something in a save; the matching {@link Holding} is
 * what escrow keeps. Floors, bitizens, costumes, pets, the roof/lift/lobby
 * fittings a player has collected, and currency.
 *
 * ## Refusing rather than guessing
 *
 * `SaveDiffer` will make any edit asked of it. This module is the layer that
 * says no, and it says no whenever the result would be a save that contradicts
 * itself: a tower with no lobby, a bitizen whose home does not exist, a costume
 * removed from a wardrobe while somebody is still wearing it, a fitting sold
 * out from under the tower using it, a balance spent past zero.
 *
 * What it does *not* encode is whether a thing ought to be tradeable at all.
 * That is a marketplace decision and belongs further up. One consequence worth
 * stating plainly: `bux` and `gold` are bought with real money in NimbleBit's
 * own storefront, and `specs/MONETIZATION.md` calls substituting for their IAP
 * revenue the fastest route to a cease and desist. Moving them is mechanically
 * sound and implemented here; allowing players to trade them is a separate
 * decision, and not one this module makes.
 *
 * ## Which bitizens travel with a floor
 *
 * A bitizen names the floor they live on and the floor they work on by *type*
 * (`homeIndex` and `workIndex` are positions in the `Floors.floors` catalogue,
 * not positions in the tower), and every bitizen observed so far has a home
 * while plenty have no job. That gives one rule that keeps every reference
 * valid on both sides of a trade:
 *
 * > A bitizen travels if and only if their home travels.
 *
 * So a residential floor leaves with its residents, who arrive jobless because
 * the floor they worked on stayed behind. A commercial floor leaves empty, and
 * the bitizens who worked there stay in their homes and become jobless. The
 * alternative — sending workers along with a shop — would land them in a tower
 * with no home to point at, which is exactly the sort of half-understood edit
 * this module refuses to make. A bitizen moved on their own is the same rule
 * read backwards: the receiving tower must already have their home floor.
 *
 * ## Two of a kind
 *
 * Because the reference is by type, a tower holding two floors of the same type
 * gives no way to say which of them a bitizen belongs to, and extraction
 * refuses with `AmbiguousFloor`. Real towers almost never hit this — of thirty
 * one surveyed, one had duplicates and they were all empty construction sites —
 * but insertion does not stop a trade from creating the situation, so a player
 * who accepts a second Regal Apts. can no longer trade either of them. Fixing
 * that needs a rule about which copy owns whom, which is a game design question
 * rather than a parsing one.
 *
 * @since 1.0.0
 * @category Splice
 */

import * as Array from "effect/Array";
import * as Data from "effect/Data";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

import * as Bitizens from "./Bitizens.ts";
import * as Floors from "./Floors.ts";
import * as SaveDiffer from "./SaveDiffer.ts";

/**
 * Why a splice was refused.
 *
 * Every one of these means "this edit was not attempted", never "this edit was
 * half applied".
 *
 * @since 1.0.0
 * @category Errors
 */
export type SpliceErrorReason =
    | "FloorNotFound"
    | "FloorNotTradeable"
    | "UnknownFloor"
    | "AmbiguousFloor"
    | "TowerTooTall"
    | "BundleMismatch"
    | "BitizenNotFound"
    | "NoHomeFloor"
    | "NotOwned"
    | "InUse"
    | "InvalidAmount"
    | "InsufficientFunds";

/**
 * A refused splice.
 *
 * @since 1.0.0
 * @category Errors
 */
export class SpliceError extends Data.TaggedError("SpliceError")<{
    readonly reason: SpliceErrorReason;
    readonly message: string;
}> {}

/**
 * The three fittings a tower wears: its roof, its elevator, and its lobby.
 *
 * Each is a pair of save fields — the collection of ones owned, and the id of
 * the one currently installed.
 *
 * @since 1.0.0
 * @category Models
 */
export const FITTING_KINDS = ["roof", "lift", "lobby"] as const;

/**
 * @since 1.0.0
 * @category Models
 */
export type FittingKind = (typeof FITTING_KINDS)[number];

/** @internal */
const FITTING_COLLECTIONS = {
    roof: "roofs",
    lift: "lifts",
    lobby: "lobbies",
} as const satisfies Record<FittingKind, SaveDiffer.CollectionField>;

/**
 * The currencies a tower holds. `gold` is golden tickets.
 *
 * @since 1.0.0
 * @category Models
 */
export const CURRENCIES = SaveDiffer.CURRENCIES;

/**
 * @since 1.0.0
 * @category Models
 */
export type Currency = (typeof CURRENCIES)[number];

/**
 * A floor and the bitizens that came with it.
 *
 * The floor's `storyHeight` is normalised to `0`, because where it used to sit
 * in its old tower means nothing in its new one.
 *
 * @since 1.0.0
 * @category Models
 */
export const FloorHolding = Schema.TaggedStruct("Floor", {
    floor: Floors.Floor,
    bitizens: Schema.Array(Bitizens.Bitizen),
});

/**
 * One bitizen, travelling alone.
 *
 * @since 1.0.0
 * @category Models
 */
export const BitizenHolding = Schema.TaggedStruct("Bitizen", {
    bitizen: Bitizens.Bitizen,
});

/**
 * A costume, named the way the save names it.
 *
 * Not checked against `Costumes.costumes`: real wardrobes hold around three
 * hundred costumes while the catalogue generated from the current build lists
 * two hundred and thirty nine, so an unrecognised name means the catalogue is
 * behind, not that the save is wrong.
 *
 * @since 1.0.0
 * @category Models
 */
export const CostumeHolding = Schema.TaggedStruct("Costume", {
    costume: Schema.String,
});

/**
 * A pet.
 *
 * @since 1.0.0
 * @category Models
 */
export const PetHolding = Schema.TaggedStruct("Pet", {
    pet: Schema.String,
});

/**
 * A roof, elevator or lobby that is owned but not installed.
 *
 * @since 1.0.0
 * @category Models
 */
export const FittingHolding = Schema.TaggedStruct("Fitting", {
    fitting: Schema.Literals(FITTING_KINDS),
    id: Schema.String,
});

/**
 * An amount of one currency.
 *
 * @since 1.0.0
 * @category Models
 */
export const CurrencyHolding = Schema.TaggedStruct("Currency", {
    currency: Schema.Literals(CURRENCIES),
    amount: Schema.Number,
});

/**
 * What an escrow holds between a deposit and a withdrawal.
 *
 * One schema for every kind of tradeable, so an escrow row needs one column and
 * one decoder no matter what is in it.
 *
 * @since 1.0.0
 * @category Models
 */
export const Holding = Schema.Union([
    FloorHolding,
    BitizenHolding,
    CostumeHolding,
    PetHolding,
    FittingHolding,
    CurrencyHolding,
]);

/**
 * @since 1.0.0
 * @category Models
 */
export type Holding = Schema.Schema.Type<typeof Holding>;

/**
 * Kept for the floor case, which is the one with a payload worth naming.
 *
 * @since 1.0.0
 * @category Models
 */
export type FloorBundle = Schema.Schema.Type<typeof FloorHolding>;

/**
 * Names the thing to take out of a save.
 *
 * Floors and bitizens are addressed by position because that is how a player
 * points at one; everything else is addressed by identity.
 *
 * @since 1.0.0
 * @category Models
 */
export const Selector = Schema.Union([
    Schema.TaggedStruct("Floor", { storyHeight: Schema.Number }),
    Schema.TaggedStruct("Bitizen", { index: Schema.Number }),
    CostumeHolding,
    PetHolding,
    FittingHolding,
    CurrencyHolding,
]);

/**
 * @since 1.0.0
 * @category Models
 */
export type Selector = Schema.Schema.Type<typeof Selector>;

/**
 * The result of taking something out of a save.
 *
 * @since 1.0.0
 * @category Models
 */
export interface Extraction {
    /** The owner's tower with the item gone. */
    readonly save: SaveDiffer.SaveData;
    /** What to put in escrow. */
    readonly holding: Holding;
    /** The edit that was applied, worth keeping for an audit trail. */
    readonly patch: SaveDiffer.SavePatch;
}

/**
 * The index a bitizen carries when a floor reference points at nothing: no job,
 * or in the doorman's case no home either. Every save observed uses `-1`.
 *
 * @internal
 */
const NOWHERE = -1;

/**
 * A bitizen tied to the thing being traded, and where they sit in `bzns`.
 *
 * @internal
 */
interface Occupant {
    readonly bitizen: SaveDiffer.Bitizen;
    readonly index: number;
}

/**
 * Floor kinds that are part of the building rather than something a player
 * could reasonably hand over. The lobby is every tower's ground floor, and
 * empty floors are construction sites.
 *
 * @internal
 */
const UNTRADEABLE_TYPES: ReadonlySet<string> = new Set(["Lobby", "Empty", "None"]);

/**
 * Recovers the catalogue position a decoded `floorId` came from.
 *
 * `Floors.Floor` decodes that position into a `{ name, type }` pair, and no two
 * catalogue entries share a pair, so this is exact. It matches from the end
 * because that is the direction the schema itself encodes in.
 *
 * @since 1.0.0
 * @category Utilities
 */
export const catalogIndex = (floorId: { readonly name: string; readonly type: string }): Option.Option<number> =>
    Array.findLastIndex(Floors.floors, (entry) => entry.name === floorId.name && entry.type === floorId.type);

/** @internal */
const refuse = (reason: SpliceErrorReason, message: string): SpliceError => new SpliceError({ reason, message });

/**
 * Everyone in the tower, including the doorman, who lives outside `bzns` but
 * wears costumes and keeps pets like anybody else.
 *
 * @internal
 */
const everyone = (save: SaveDiffer.SaveData): ReadonlyArray<SaveDiffer.Bitizen> => [...save.bzns, save.doorman];

/**
 * Checks a floor is the sort of thing that may change hands at all, and returns
 * the catalogue position it occupies.
 *
 * Says nothing about the tower around it: that is the caller's job, because a
 * floor arriving from escrow has no position yet.
 *
 * @internal
 */
const requireTradeable = (floor: SaveDiffer.Floor): Effect.Effect<number, SpliceError, never> => {
    if (UNTRADEABLE_TYPES.has(floor.floorId.type)) {
        return Effect.fail(refuse("FloorNotTradeable", `A floor of type ${floor.floorId.type} cannot be traded`));
    }

    return Option.match(catalogIndex(floor.floorId), {
        onSome: Effect.succeed,
        onNone: () =>
            Effect.fail(refuse("UnknownFloor", `${floor.floorId.name} is not in this version's floor catalogue`)),
    });
};

/**
 * A bitizen who no longer works anywhere. Their dream job is an aspiration
 * rather than a reference to a floor, so it survives the move; being *placed*
 * in it does not.
 *
 * @internal
 */
const laidOff = (bitizen: SaveDiffer.Bitizen): SaveDiffer.Bitizen => ({
    ...bitizen,
    workIndex: NOWHERE,
    placedDreamJob: false,
});

/**
 * A bitizen with nothing borrowed from their old tower's wardrobe.
 *
 * Every bitizen observed wears a costume their player owns, so a costumed
 * bitizen arriving somewhere that has never unlocked it would be a state the
 * game has not been seen to produce. Sending them plain avoids finding out the
 * hard way, and avoids minting a second copy of a wardrobe unlock.
 *
 * @internal
 */
const undressed = (bitizen: SaveDiffer.Bitizen): SaveDiffer.Bitizen => {
    const { costume: _costume, pet: _pet, ...rest } = bitizen;
    return rest;
};

/** @internal */
const extractFloorAt = (
    save: SaveDiffer.SaveData,
    storyHeight: number
): Effect.Effect<Extraction, SpliceError, never> =>
    Effect.gen(function* () {
        const floor = yield* Option.match(Array.get(save.stories, storyHeight), {
            onSome: Effect.succeed,
            onNone: () => Effect.fail(refuse("FloorNotFound", `This tower has no floor at height ${storyHeight}`)),
        });

        // The ground floor is the tower's lobby, and a tower without one is not
        // a tower. Everything above it is fair game if its type allows.
        if (storyHeight === 0) {
            return yield* refuse("FloorNotTradeable", "The ground floor is the tower's lobby and cannot be traded");
        }

        const floorIndex = yield* requireTradeable(floor);

        const copies = Array.filter(save.stories, (other) =>
            Option.match(catalogIndex(other.floorId), { onSome: (index) => index === floorIndex, onNone: () => false })
        );
        if (copies.length > 1) {
            return yield* refuse(
                "AmbiguousFloor",
                `This tower holds ${copies.length} copies of ${floor.floorId.name}, so there is no way to tell which bitizens belong to the one being traded`
            );
        }

        const isResidential = floor.floorId.type === "Residential";

        // Residents leave with the floor; workers stay put and lose their job.
        // Both cases end with every remaining reference pointing at something
        // real.
        const occupants = (of: (bitizen: SaveDiffer.Bitizen) => boolean): ReadonlyArray<Occupant> =>
            save.bzns.flatMap((bitizen, index) => (of(bitizen) ? [{ bitizen, index }] : []));

        const movers = isResidential ? occupants((bitizen) => bitizen.homeIndex === floorIndex) : [];
        const stayers = isResidential ? [] : occupants((bitizen) => bitizen.workIndex === floorIndex);

        const patch: SaveDiffer.SavePatch = [
            ...Array.reverse(movers).map(({ index }): SaveDiffer.SaveOp => ({ _tag: "BitizenRemoved", index })),
            ...stayers.map(
                ({ bitizen, index }): SaveDiffer.SaveOp => ({
                    _tag: "BitizenReplaced",
                    index,
                    bitizen: laidOff(bitizen),
                })
            ),
            { _tag: "FloorRemoved", storyHeight },
        ];

        return {
            save: SaveDiffer.differ.patch(save, patch),
            holding: {
                _tag: "Floor",
                floor: { ...floor, storyHeight: 0 },
                bitizens: movers.map(({ bitizen }) => laidOff(bitizen)),
            },
            patch,
        } satisfies Extraction;
    });

/** @internal */
const extractBitizenAt = (save: SaveDiffer.SaveData, index: number): Effect.Effect<Extraction, SpliceError, never> =>
    Effect.gen(function* () {
        const bitizen = yield* Option.match(Array.get(save.bzns, index), {
            onSome: Effect.succeed,
            onNone: () => Effect.fail(refuse("BitizenNotFound", `This tower has no bitizen at position ${index}`)),
        });

        const patch: SaveDiffer.SavePatch = [{ _tag: "BitizenRemoved", index }];
        return {
            save: SaveDiffer.differ.patch(save, patch),
            holding: { _tag: "Bitizen", bitizen: undressed(laidOff(bitizen)) },
            patch,
        } satisfies Extraction;
    });

/**
 * Takes an owned thing out of a collection, provided nobody is using it.
 *
 * @internal
 */
const extractOwned = (
    save: SaveDiffer.SaveData,
    options: {
        readonly collection: SaveDiffer.CollectionField;
        readonly item: string;
        readonly noun: string;
        readonly inUseBy: () => Option.Option<string>;
        readonly holding: Holding;
    }
): Effect.Effect<Extraction, SpliceError, never> =>
    Effect.gen(function* () {
        if (!(save[options.collection] ?? []).includes(options.item)) {
            return yield* refuse("NotOwned", `This tower does not own the ${options.noun} ${options.item}`);
        }

        const inUse = options.inUseBy();
        if (Option.isSome(inUse)) {
            return yield* refuse("InUse", inUse.value);
        }

        const patch: SaveDiffer.SavePatch = [
            { _tag: "ItemsRevoked", collection: options.collection, items: [options.item] },
        ];
        return {
            save: SaveDiffer.differ.patch(save, patch),
            holding: options.holding,
            patch,
        } satisfies Extraction;
    });

/** @internal */
const extractCurrency = (
    save: SaveDiffer.SaveData,
    currency: Currency,
    amount: number
): Effect.Effect<Extraction, SpliceError, never> =>
    Effect.gen(function* () {
        if (!Number.isSafeInteger(amount) || amount <= 0) {
            return yield* refuse("InvalidAmount", `${amount} is not a whole number of ${currency} above zero`);
        }

        const balance = save[currency];
        if (balance < amount) {
            return yield* refuse("InsufficientFunds", `This tower holds ${balance} ${currency}, not ${amount}`);
        }

        const patch: SaveDiffer.SavePatch = [{ _tag: "CounterAdjusted", counter: currency, by: -amount }];
        return {
            save: SaveDiffer.differ.patch(save, patch),
            holding: { _tag: "Currency", currency, amount },
            patch,
        } satisfies Extraction;
    });

/**
 * Takes something out of a save, leaving a tower that still makes sense.
 *
 * @since 1.0.0
 * @category Splice
 */
export const extract: (save: SaveDiffer.SaveData, selector: Selector) => Effect.Effect<Extraction, SpliceError, never> =
    Effect.fn("Splice.extract")(function* (save: SaveDiffer.SaveData, selector: Selector) {
        switch (selector._tag) {
            case "Floor": {
                return yield* extractFloorAt(save, selector.storyHeight);
            }
            case "Bitizen": {
                return yield* extractBitizenAt(save, selector.index);
            }
            case "Costume": {
                return yield* extractOwned(save, {
                    collection: "costumes",
                    item: selector.costume,
                    noun: "costume",
                    holding: { _tag: "Costume", costume: selector.costume },
                    inUseBy: () =>
                        everyone(save).some((bitizen) => bitizen.costume === selector.costume)
                            ? Option.some(`Somebody in this tower is wearing the ${selector.costume} costume`)
                            : Option.none(),
                });
            }
            case "Pet": {
                return yield* extractOwned(save, {
                    collection: "pets",
                    item: selector.pet,
                    noun: "pet",
                    holding: { _tag: "Pet", pet: selector.pet },
                    inUseBy: () =>
                        everyone(save).some((bitizen) => bitizen.pet === selector.pet)
                            ? Option.some(`Somebody in this tower keeps a ${selector.pet}`)
                            : Option.none(),
                });
            }
            case "Fitting": {
                return yield* extractOwned(save, {
                    collection: FITTING_COLLECTIONS[selector.fitting],
                    item: selector.id,
                    noun: selector.fitting,
                    holding: { _tag: "Fitting", fitting: selector.fitting, id: selector.id },
                    inUseBy: () =>
                        String(save[selector.fitting]) === selector.id
                            ? Option.some(`This tower is using ${selector.fitting} ${selector.id} right now`)
                            : Option.none(),
                });
            }
            case "Currency": {
                return yield* extractCurrency(save, selector.currency, selector.amount);
            }
        }
    });

/**
 * The patch that puts a holding into a tower.
 *
 * Every operation it produces is position-free, so it means the same thing
 * against any save: a floor lands on top, an item joins a collection, a balance
 * moves up by what was taken. That is what makes a holding replayable into a
 * tower other than the one it came from, and it is why the patch can be written
 * out to a database and applied days later without being recomputed.
 *
 * @since 1.0.0
 * @category Splice
 */
export const holdingPatch = (holding: Holding): SaveDiffer.SavePatch => {
    switch (holding._tag) {
        case "Floor": {
            return [
                { _tag: "FloorAppended", floor: holding.floor },
                ...holding.bitizens.map((bitizen): SaveDiffer.SaveOp => ({ _tag: "BitizenAdded", bitizen })),
            ];
        }
        case "Bitizen": {
            return [{ _tag: "BitizenAdded", bitizen: holding.bitizen }];
        }
        case "Costume": {
            return [{ _tag: "ItemsGranted", collection: "costumes", items: [holding.costume] }];
        }
        case "Pet": {
            return [{ _tag: "ItemsGranted", collection: "pets", items: [holding.pet] }];
        }
        case "Fitting": {
            return [{ _tag: "ItemsGranted", collection: FITTING_COLLECTIONS[holding.fitting], items: [holding.id] }];
        }
        case "Currency": {
            return [{ _tag: "CounterAdjusted", counter: holding.currency, by: holding.amount }];
        }
    }
};

/**
 * Puts an escrowed holding into a save.
 *
 * A floor lands on top of the tower, the way the game places a newly built one.
 * A refund is this same call aimed back at the original owner.
 *
 * @since 1.0.0
 * @category Splice
 */
export const insert: (
    save: SaveDiffer.SaveData,
    holding: Holding,
    options?: { readonly maxStories?: number | undefined }
) => Effect.Effect<SaveDiffer.SaveData, SpliceError, never> = Effect.fn("Splice.insert")(function* (
    save: SaveDiffer.SaveData,
    holding: Holding,
    options?: { readonly maxStories?: number | undefined }
) {
    if (holding._tag === "Floor") {
        const floorIndex = yield* requireTradeable(holding.floor);

        const maxStories = options?.maxStories;
        if (maxStories !== undefined && save.stories.length >= maxStories) {
            return yield* refuse(
                "TowerTooTall",
                `This tower is already ${save.stories.length} floors tall and cannot take another`
            );
        }

        // A bundle whose bitizens do not point at the floor they arrived with
        // would leave dangling references behind, so refuse it rather than
        // repair it.
        const stray = Array.filter(holding.bitizens, (bitizen) => bitizen.homeIndex !== floorIndex);
        if (Array.isReadonlyArrayNonEmpty(stray)) {
            return yield* refuse(
                "BundleMismatch",
                `${stray.length} of this bundle's bitizens do not live on the floor they were bundled with`
            );
        }
    }

    if (holding._tag === "Bitizen") {
        // Arriving alone, a bitizen needs the receiving tower to already have
        // the kind of floor they call home. `-1` means they live nowhere, which
        // the doorman does and which cannot dangle.
        const hasHome =
            holding.bitizen.homeIndex === NOWHERE ||
            save.stories.some((floor) =>
                Option.match(catalogIndex(floor.floorId), {
                    onSome: (index) => index === holding.bitizen.homeIndex,
                    onNone: () => false,
                })
            );
        if (!hasHome) {
            return yield* refuse(
                "NoHomeFloor",
                `This tower has no ${Floors.floors[holding.bitizen.homeIndex]?.name ?? "matching"} floor for the arriving bitizen to live on`
            );
        }
    }

    if (holding._tag === "Currency" && (!Number.isSafeInteger(holding.amount) || holding.amount <= 0)) {
        return yield* refuse("InvalidAmount", `${holding.amount} is not a whole number of ${holding.currency}`);
    }

    return SaveDiffer.differ.patch(save, holdingPatch(holding));
});

/**
 * Takes a floor out of a save, along with any bitizen whose home it was.
 *
 * A convenience over {@link extract} for the case v1 is built around.
 *
 * @since 1.0.0
 * @category Splice
 */
export const extractFloor = (
    save: SaveDiffer.SaveData,
    storyHeight: number
): Effect.Effect<Extraction, SpliceError, never> => extract(save, { _tag: "Floor", storyHeight });

/**
 * Puts an escrowed floor bundle into a save.
 *
 * A convenience over {@link insert}.
 *
 * @since 1.0.0
 * @category Splice
 */
export const insertFloor = (
    save: SaveDiffer.SaveData,
    bundle: FloorBundle,
    options?: { readonly maxStories?: number | undefined }
): Effect.Effect<SaveDiffer.SaveData, SpliceError, never> => insert(save, bundle, options);
