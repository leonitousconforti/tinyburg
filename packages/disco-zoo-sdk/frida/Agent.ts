/**
 * Disco Zoo's agent, which `Generate.ts` loads into the game: insight's own
 * RPCs, plus readers for the game's data tables.
 */

import "@efffrida/polyfills";
import "frida-il2cpp-bridge";

import { Array, Cause, Effect, Layer, Record, Schedule, Tuple, pipe } from "effect";
import { RpcServer } from "effect/rpc";

import { Assembly, Class, FridaIl2cppBridge } from "@efffrida/il2cpp-bridge";
import { RpcsLive, serve } from "@tinyburg/insight/frida/Agent";

import { DiscoZooRpcs, Rpcs } from "./Rpcs.ts";

/**
 * A static field's value, failing while it is null or while il2cpp has not
 * initialized its class: il2cpp allocates a class's static fields only then,
 * and reading one before would crash the game.
 */
const readStatic = <T extends Il2Cpp.Field.Type>(
    klass: Il2Cpp.Class,
    name: string
): Effect.Effect<T, Cause.NoSuchElementError> =>
    Effect.suspend(() => {
        if (klass.staticFieldsData.isNull()) {
            return Effect.fail(new Cause.NoSuchElementError(`${klass.name} is not initialized yet`));
        }

        const value = klass.field<T>(name).value;
        const isNull =
            (value instanceof Il2Cpp.Object || value instanceof Il2Cpp.Array || value instanceof Il2Cpp.String) &&
            value.isNull();

        return isNull
            ? Effect.fail(new Cause.NoSuchElementError(`${klass.name}.${name} is null`))
            : Effect.succeed(value);
    });

/**
 * Like {@link readStatic}, but waits up to five minutes for the field: Disco
 * Zoo runs slowly under the emulator's ARM translation and sets up its data
 * some time after il2cpp is ready.
 */
const waitForStatic = <T extends Il2Cpp.Field.Type>(klass: Il2Cpp.Class, name: string) =>
    Effect.retry(
        readStatic<T>(klass, name),
        Schedule.addDelay(Schedule.recurs(60), () => Effect.succeed("5 seconds"))
    );

/**
 * The fields below are read straight from memory, without calling into the
 * game. Each throws on a null object or string, which fails the RPC instead
 * of crashing the game with a null dereference.
 */
const object = (owner: Il2Cpp.Object, name: string): Il2Cpp.Object => {
    const value = owner.field<Il2Cpp.Object>(name).value;
    if (value.isNull()) throw new Error(`${owner.class.name}.${name} is null`);
    return value;
};

const string = (owner: Il2Cpp.Object, name: string): string => {
    const value = owner.field<Il2Cpp.String>(name).value;
    if (value.isNull() || value.content === null) throw new Error(`${owner.class.name}.${name} is null`);
    return value.content;
};

const int = (owner: Il2Cpp.Object, name: string): number => owner.field<number>(name).value;
const double = (owner: Il2Cpp.Object, name: string): number => owner.field<number>(name).value;
const boolean = (owner: Il2Cpp.Object, name: string): boolean => owner.field<boolean>(name).value;
const char = (owner: Il2Cpp.Object, name: string): string => String.fromCharCode(owner.field<number>(name).value);

/** A float as C# writes it: 0.15 rather than 0.15000000596046448. */
const single = (owner: Il2Cpp.Object, name: string): number => {
    const value = owner.field<number>(name).value;
    for (let precision = 1; precision < 9; precision++) {
        const shortest = Number(value.toPrecision(precision));
        if (Math.fround(shortest) === value) return shortest;
    }
    return value;
};

const int64 = (owner: Il2Cpp.Object, name: string): number => {
    const value = Number(owner.field<Int64>(name).value.toString());
    if (!Number.isSafeInteger(value)) throw new Error(`${owner.class.name}.${name} is not a safe integer`);
    return value;
};

/** A `List<T>`'s elements, read from its fields. */
const list = (owner: Il2Cpp.Object, name: string): Array<Il2Cpp.Object> => {
    const listObject = object(owner, name);
    const size = listObject.field<number>("_size").value;
    const items = listObject.field<Il2Cpp.Array<Il2Cpp.Object>>("_items").value;
    if (size > 0 && items.isNull()) throw new Error(`${owner.class.name}.${name} has no items`);
    return Array.makeBy(size, (index) => {
        const item = items.get(index);
        if (item.isNull()) throw new Error(`${owner.class.name}.${name}[${index}] is null`);
        return item;
    });
};

const stringArray = (array: Il2Cpp.Array<Il2Cpp.String>): Array<string> =>
    Array.map(Array.fromIterable(array), (string, index) => {
        if (string.isNull() || string.content === null) throw new Error(`Null string at index ${index}`);
        return string.content;
    });

/** Hats and decorations are bought the same way. */
const shopItem = (item: Il2Cpp.Object) => ({
    name: string(item, "name"),
    character: char(item, "character"),
    title: string(item, "title"),
    cost: int(item, "cost"),
    costIsBux: boolean(item, "costIsBux"),
});

const DiscoZooRpcsLive = DiscoZooRpcs.toLayer(
    Effect.gen(function* () {
        // Caches
        const assemblyCached = yield* Assembly.assemblyCached;
        const tryClassCached = yield* Class.tryClassCached;

        // Global assemblies
        const CSharpAssembly = yield* assemblyCached("Assembly-CSharp");

        // Core keeps the game's data tables in static fields
        const coreField = Effect.fnUntraced(function* (name: string) {
            const CoreClass = yield* tryClassCached(CSharpAssembly.image, "Core");
            return yield* waitForStatic<Il2Cpp.Object>(CoreClass, name);
        });

        // Get all animals implementation
        const getAllAnimals = Effect.fnUntraced(
            function* () {
                const animalPedia = yield* coreField("animalPedia");
                const AnimalRarityClass = yield* tryClassCached(CSharpAssembly.image, "AnimalRarity");
                const rarityObjects = yield* Effect.forEach(
                    Array.filter(AnimalRarityClass.fields, (field) => field.isStatic),
                    (field) => waitForStatic<Il2Cpp.Object>(AnimalRarityClass, field.name)
                );

                const rarities = pipe(
                    rarityObjects,
                    Array.map((rarity) =>
                        Tuple.make(string(rarity, "name"), {
                            weight: single(rarity, "weight"),
                            freedomMultiplier: single(rarity, "freedomMultiplier"),
                            rescuesToGetOne: single(rarity, "numRescuesToGetOne"),
                        })
                    ),
                    Record.fromEntries
                );

                const animalObjects = list(animalPedia, "allAnimals");
                if (animalObjects.length === 0) return yield* Effect.die("AnimalPedia.allAnimals is empty");

                const animals = Array.map(animalObjects, (animal, index) => {
                    if (int(animal, "allIndex") !== index) throw new Error(`Animal ${index} is out of order`);
                    const rarity = string(object(animal, "rarity"), "name");
                    if (!(rarity in rarities)) throw new Error(`Animal ${index} has an unknown rarity ${rarity}`);
                    return {
                        slug: string(animal, "slug"),
                        title: string(animal, "title"),
                        titlePlural: string(animal, "titlePlural"),
                        region: string(object(animal, "region"), "slug"),
                        rarity,
                        coinsPerMinute: double(animal, "coinsPerMinute"),
                        buildTicks: int64(animal, "buildTicks"),
                        baseAwakeTicks: int64(animal, "baseAwakeTicks"),
                        awakeIncrementTicks: int64(animal, "awakeIncrementTicks"),
                        pattern: string(object(animal, "tokenPattern"), "stringPattern"),
                    };
                });

                return { rarities, animals };
            },
            FridaIl2cppBridge.il2cppPerformEffect(),
            Effect.orDie
        );

        // Get all regions implementation
        const getAllRegions = Effect.fnUntraced(
            function* () {
                const animalPedia = yield* coreField("animalPedia");
                const regionObjects = list(animalPedia, "regions");
                if (regionObjects.length === 0) return yield* Effect.die("AnimalPedia.regions is empty");

                return Array.map(regionObjects, (region, index) => {
                    if (int(region, "index") !== index) throw new Error(`Region ${index} is out of order`);
                    const aircraft = object(region, "aircraft");
                    return {
                        slug: string(region, "slug"),
                        title: string(region, "title"),
                        isSpaceRegion: boolean(region, "isSpaceRegion"),
                        aircraft: {
                            slug: string(aircraft, "slug"),
                            title: string(aircraft, "title"),
                        },
                        aircraftCost: int(region, "aircraftCost"),
                        aircraftBuxCost: int(region, "aircraftBuxCost"),
                        baseExploreCost: int(region, "baseExploreCost"),
                        maxExploreCost: int(region, "maxExploreCost"),
                        exploreCostIncrement: int(region, "exploreCostIncrement"),
                    };
                });
            },
            FridaIl2cppBridge.il2cppPerformEffect(),
            Effect.orDie
        );

        // Get all pets implementation
        const getAllPets = Effect.fnUntraced(
            function* () {
                const petPedia = yield* coreField("petPedia");
                const PetManagerClass = yield* tryClassCached(CSharpAssembly.image, "PetManager");
                const grades = yield* waitForStatic<Il2Cpp.Array<Il2Cpp.String>>(PetManagerClass, "GRADES");

                const species = Array.map(list(petPedia, "allSpeciesInfos"), (species) => ({
                    slug: string(species, "slug"),
                    title: string(species, "title"),
                    titlePlural: string(species, "titlePlural"),
                    numberOfBreeds: int(species, "numBreeds"),
                }));

                const quirks = Array.map(list(petPedia, "allQuirkInfos"), (quirk) => ({
                    slug: string(quirk, "slug"),
                    id: string(quirk, "id"),
                    group: string(object(quirk, "group"), "tag"),
                    species: stringArray(quirk.field<Il2Cpp.Array<Il2Cpp.String>>("speciesSlugs").value),
                    ailment: string(quirk, "ailment"),
                    charm: string(quirk, "charm"),
                    rareCharm: string(quirk, "rareCharm"),
                }));

                if (species.length === 0 || quirks.length === 0) {
                    return yield* Effect.die("PetPedia has no species or no quirks");
                }

                return { grades: stringArray(grades), species, quirks };
            },
            FridaIl2cppBridge.il2cppPerformEffect(),
            Effect.orDie
        );

        // Get all hats implementation
        const getAllHats = Effect.fnUntraced(
            function* () {
                const hatter = yield* coreField("hatter");
                return Array.map(list(hatter, "allHatDatas"), shopItem);
            },
            FridaIl2cppBridge.il2cppPerformEffect(),
            Effect.orDie
        );

        // Get all decorations implementation
        const getAllDecorations = Effect.fnUntraced(
            function* () {
                const decorator = yield* coreField("decorator");
                return Array.map(list(decorator, "allDecorDatas"), shopItem);
            },
            FridaIl2cppBridge.il2cppPerformEffect(),
            Effect.orDie
        );

        // Get all toys implementation
        const getAllToys = Effect.fnUntraced(
            function* () {
                const toyManager = yield* coreField("toyManager");
                return Array.map(list(toyManager, "allToyDatas"), (toy) => ({
                    name: string(toy, "name"),
                    character: char(toy, "character"),
                    title: string(toy, "title"),
                    description: string(toy, "description"),
                    coinCost: int(toy, "coinCost"),
                    buxCost: int(toy, "buxCost"),
                }));
            },
            FridaIl2cppBridge.il2cppPerformEffect(),
            Effect.orDie
        );

        return {
            GetAllAnimals: getAllAnimals,
            GetAllRegions: getAllRegions,
            GetAllPets: getAllPets,
            GetAllHats: getAllHats,
            GetAllDecorations: getAllDecorations,
            GetAllToys: getAllToys,
        };
    }).pipe(FridaIl2cppBridge.il2cppPerformEffect())
);

serve(RpcServer.layer(Rpcs).pipe(Layer.provide([RpcsLive, DiscoZooRpcsLive])));
