/**
 * LEGO Tower's agent, which `Generate.ts` loads into the game: insight's own
 * RPCs, plus readers for the game's data tables.
 */

import "@efffrida/polyfills";
import "frida-il2cpp-bridge";

import { Array, Effect, Layer, Option, Record, Schedule, Tuple, pipe } from "effect";
import { RpcServer } from "effect/rpc";

import { Assembly, Class, Extensions, FridaIl2cppBridge } from "@efffrida/il2cpp-bridge";
import { RpcsLive, readEnum, serve, waitForInstance } from "@tinyburg/insight/frida/Agent";

import { LegoTowerRpcs, Rpcs } from "./Rpcs.ts";

type StringArray = Il2Cpp.Array<Il2Cpp.String>;
type EnumArray = Il2Cpp.Array<Il2Cpp.ValueType>;

// LEGO Tower runs under Android's ARM translation, so it takes a while to
// load its tables: check every 2 seconds, for up to 3 minutes
const loading = Schedule.addDelay(Schedule.recurs(90), () => Effect.succeed("2 seconds"));

// Each string of an array, dying on a null one, which would otherwise shift
// every record after it out of line with the table's other arrays
const readStrings = (array: StringArray, what: string): Effect.Effect<Array<string>> =>
    Effect.forEach(Array.fromIterable(array), (string, index) =>
        string.isNull() ? Effect.die(`${what}[${index}] is null`) : Effect.succeed(string.content!)
    );

// A string's content, dying on a null string: reading the content of a null
// string dereferences NULL inside the game
const contentOf = (string: Il2Cpp.String, what: string): string => {
    if (string.isNull()) throw new Error(`${what} is null`);
    return string.content!;
};

// Each enum of an array, by name
const readEnums = (array: EnumArray): Array<string> =>
    Array.map(Array.fromIterable(array), (value) => value.toString());

// The shortest number a float reads back as, 0.1 rather than 0.10000000149011612
const readSingle = (single: number): number =>
    pipe(
        Array.range(1, 9),
        Array.map((precision) => Number(single.toPrecision(precision))),
        Array.findFirst((decimal) => Math.fround(decimal) === single),
        Option.getOrElse(() => single)
    );

// A SerializableDictionary subclass, such as DictionaryOfStringAndString, is
// not generic itself: its key and value classes are its parent's
const liftSerializableDictionary = <K extends Il2Cpp.Field.Type, V extends Il2Cpp.Field.Type>(
    object: Il2Cpp.Object
): Extensions.Dictionary<K, V> => {
    const dictionary = Extensions.Dictionary.lift<K, V>(object);
    const generics = dictionary.class.parent?.generics ?? [];
    dictionary.class.generics[0] = generics[0];
    dictionary.class.generics[1] = generics[1];
    return dictionary;
};

// The keys of a hidden character's details, by the field each becomes:
// its pieces, its BrickBook post, its prop and its minifigure
const hiddenCharacterKeys = {
    headTop: "ht",
    head: "h",
    torso: "t",
    legs: "l",
    brickBookPost: "bb",
    prop: "prop",
    minifigure: "mfig",
} as const;

// Dies unless the parallel arrays of a table are all as long
const sameLength = (what: string, arrays: ReadonlyArray<ReadonlyArray<unknown>>): Effect.Effect<void> => {
    const lengths = Array.map(arrays, (array) => array.length);
    return Array.every(lengths, (length) => length === lengths[0])
        ? Effect.void
        : Effect.die(`Expected the arrays of ${what} to be as long, but they are ${lengths.join(", ")} long`);
};

const LegoTowerRpcsLive = LegoTowerRpcs.toLayer(
    Effect.gen(function* () {
        // Caches
        const assemblyCached = yield* Assembly.assemblyCached;
        const tryClassCached = yield* Class.tryClassCached;
        const tryFieldCached = yield* Class.tryFieldCached;

        // Loading necessary classes
        yield* waitForInstance("LTFloorTable", "instance", loading);
        yield* waitForInstance("LTPieceTable", "instance", loading);
        yield* waitForInstance("LTMissionTable", "instance", loading);
        yield* waitForInstance("LTowerController", "instance", loading);

        // Global assemblies
        const CSharpAssembly = yield* assemblyCached("Assembly-CSharp");

        // The instance of one of the game's table singletons
        const tableInstance = Effect.fnUntraced(function* (className: string) {
            const TableClass = yield* tryClassCached(CSharpAssembly.image, className);
            const InstanceField = yield* tryFieldCached<Il2Cpp.Object>(TableClass, "instance");
            return InstanceField.value;
        });

        // Get all floors implementation
        const getAllFloors = Effect.fnUntraced(
            function* () {
                const LTFloorTypeClass = yield* tryClassCached(CSharpAssembly.image, "LTFloorType");
                const LTFloorTable = yield* tableInstance("LTFloorTable");

                const types = readEnum(LTFloorTypeClass);
                const ids = yield* readStrings(LTFloorTable.field<StringArray>("_floorIds").value, "_floorIds");
                const floorTypes = readEnums(LTFloorTable.field<EnumArray>("_floorTypes").value);
                yield* sameLength("floors", [ids, floorTypes]);

                const floors = Array.zipWith(ids, floorTypes, (id, type) => ({ id, type }));
                return { types, floors };
            },
            FridaIl2cppBridge.il2cppPerformEffect(),
            Effect.orDie
        );

        // Get all sets implementation
        const getAllSets = Effect.fnUntraced(
            function* () {
                const LTFloorTable = yield* tableInstance("LTFloorTable");
                const readIds = (field: string) => readStrings(LTFloorTable.field<StringArray>(field).value, field);

                const roofs = yield* readIds("_roofIds");
                const elevators = yield* readIds("_liftIds");
                const vipVehicles = yield* readIds("_vipVehicleIds");
                const skylines = yield* readIds("_skylineIds");
                const clubExclusive = yield* readIds("_exlusiveSets");
                const promotional = yield* readIds("_promoSets");

                const vehicleIds = yield* readIds("_vehicleIds");
                const vehicleCosts = Array.map(
                    Array.fromIterable(LTFloorTable.field<Il2Cpp.Array<number>>("_vehicleCosts").value),
                    readSingle
                );
                yield* sameLength("vehicles", [vehicleIds, vehicleCosts]);
                const vehicles = Array.zipWith(vehicleIds, vehicleCosts, (id, cost) => ({ id, cost }));

                return { roofs, elevators, vehicles, vipVehicles, skylines, clubExclusive, promotional };
            },
            FridaIl2cppBridge.il2cppPerformEffect(),
            Effect.orDie
        );

        // Get all pieces implementation
        const getAllPieces = Effect.fnUntraced(
            function* () {
                const LTPieceTypeClass = yield* tryClassCached(CSharpAssembly.image, "LTPieceType");
                const LTPieceTableClass = yield* tryClassCached(CSharpAssembly.image, "LTPieceTable");
                const GoldRarityField = yield* tryFieldCached<number>(LTPieceTableClass, "GoldRarity");
                const SilverRarityField = yield* tryFieldCached<number>(LTPieceTableClass, "SilverRarity");
                const LTPieceTable = yield* tableInstance("LTPieceTable");

                const types = readEnum(LTPieceTypeClass);
                const ids = yield* readStrings(LTPieceTable.field<StringArray>("_pieceIds").value, "_pieceIds");
                const pieceTypes = readEnums(LTPieceTable.field<EnumArray>("_pieceTypes").value);
                const rarities = Array.map(
                    Array.fromIterable(LTPieceTable.field<Il2Cpp.Array<number>>("_pieceRarities").value),
                    readSingle
                );
                const pedestrians = Array.fromIterable(LTPieceTable.field<Il2Cpp.Array<boolean>>("_piecePeds").value);
                yield* sameLength("pieces", [ids, pieceTypes, rarities, pedestrians]);

                const shortIds = pipe(
                    liftSerializableDictionary<Il2Cpp.String, Il2Cpp.String>(
                        LTPieceTable.field<Il2Cpp.Object>("ShortIds").value
                    ).entries,
                    Array.map(([long, short]) =>
                        Tuple.make(contentOf(long, "a ShortIds key"), contentOf(short, "a ShortIds value"))
                    ),
                    Record.fromEntries
                );

                const pieces = yield* Effect.forEach(ids, (id, index) =>
                    id in shortIds
                        ? Effect.succeed({
                              id,
                              shortId: shortIds[id],
                              type: pieceTypes[index],
                              rarity: rarities[index],
                              pedestrian: pedestrians[index],
                          })
                        : Effect.die(`Piece ${id} has no short id`)
                );

                return {
                    types,
                    goldRarity: readSingle(GoldRarityField.value),
                    silverRarity: readSingle(SilverRarityField.value),
                    pieces,
                };
            },
            FridaIl2cppBridge.il2cppPerformEffect(),
            Effect.orDie
        );

        // Get all missions implementation
        const getAllMissions = Effect.fnUntraced(
            function* () {
                const LTMissionTypeClass = yield* tryClassCached(CSharpAssembly.image, "LTMissionType");
                const LTMissionTable = yield* tableInstance("LTMissionTable");
                const readIds = (field: string) => readStrings(LTMissionTable.field<StringArray>(field).value, field);

                const types = readEnum(LTMissionTypeClass);
                const ids = yield* readIds("_missionIds");
                const vehicles = yield* readIds("_missionVehicleIds");
                const holidays = yield* readIds("_missionHolidays");
                const missionTypes = readEnums(LTMissionTable.field<EnumArray>("_missionTypes").value);
                yield* sameLength("missions", [ids, missionTypes, vehicles, holidays]);

                const missions = Array.map(ids, (id, index) => ({
                    id,
                    type: missionTypes[index],
                    vehicle: vehicles[index],
                    holiday: holidays[index],
                }));
                const props = yield* readIds("_props");
                return { types, missions, props };
            },
            FridaIl2cppBridge.il2cppPerformEffect(),
            Effect.orDie
        );

        // Get all minifigures implementation
        const getAllMinifigures = Effect.fnUntraced(
            function* () {
                const LTMinifigControllerClass = yield* tryClassCached(CSharpAssembly.image, "LTMinifigController");
                const LTPieceTable = yield* tableInstance("LTPieceTable");
                const staticField = (name: string) =>
                    Effect.map(tryFieldCached<Il2Cpp.Object>(LTMinifigControllerClass, name), (field) => field.value);

                // Each name list, by language
                const readNames = Effect.fnUntraced(function* (name: string) {
                    const dictionary = Extensions.Dictionary.lift<Il2Cpp.String, StringArray>(yield* staticField(name));
                    const entries = yield* Effect.forEach(dictionary.entries, ([language, names]) => {
                        const key = contentOf(language, `a ${name} language`);
                        return Effect.map(readStrings(names, `${name}[${key}]`), (strings) => Tuple.make(key, strings));
                    });
                    return Record.fromEntries(entries);
                });

                // Each hidden character's details, by the name of its field
                const readHiddenCharacter = Effect.fnUntraced(function* (name: string, object: Il2Cpp.Object) {
                    const details = pipe(
                        Extensions.Dictionary.lift<Il2Cpp.String, Il2Cpp.String>(object).entries,
                        Array.map(([key, value]) =>
                            Tuple.make(contentOf(key, `a ${name} detail`), contentOf(value, `${name} detail`))
                        ),
                        Record.fromEntries
                    );

                    const unknownKeys = Array.difference(Record.keys(details), Record.values(hiddenCharacterKeys));
                    if (unknownKeys.length > 0) {
                        return yield* Effect.die(
                            `Hidden character ${name} has unknown details ${unknownKeys.join(", ")}`
                        );
                    }

                    return yield* Effect.all(
                        Record.map(hiddenCharacterKeys, (key) =>
                            key in details
                                ? Effect.succeed(details[key])
                                : Effect.die(`Hidden character ${name} has no ${key}`)
                        )
                    );
                });

                const hiddenCharacters = yield* pipe(
                    Extensions.Dictionary.lift<Il2Cpp.String, Il2Cpp.Object>(yield* staticField("hiddenChars")).entries,
                    Effect.forEach(([name, object]) => {
                        const key = contentOf(name, "a hiddenChars key");
                        return Effect.map(readHiddenCharacter(key, object), (details) => Tuple.make(key, details));
                    }),
                    Effect.map(Record.fromEntries)
                );

                const readHair = Effect.fnUntraced(function* (name: string) {
                    const list = Extensions.List.lift<Il2Cpp.String>(yield* staticField(name));
                    return yield* readStrings(list.toArray, name);
                });
                const readPieces = (field: string) => readStrings(LTPieceTable.field<StringArray>(field).value, field);

                return {
                    maleNames: yield* readNames("maleNames"),
                    femaleNames: yield* readNames("femaleNames"),
                    surnames: yield* readNames("surnames"),
                    hiddenCharacters,
                    pedestrianPieces: {
                        maleHair: yield* readHair("pedHairM"),
                        femaleHair: yield* readHair("pedHairF"),
                        heads: yield* readPieces("_pedHeads"),
                        torsos: yield* readPieces("_pedTorsos"),
                        legs: yield* readPieces("_pedLegs"),
                    },
                };
            },
            FridaIl2cppBridge.il2cppPerformEffect(),
            Effect.orDie
        );

        return {
            GetAllFloors: getAllFloors,
            GetAllSets: getAllSets,
            GetAllPieces: getAllPieces,
            GetAllMissions: getAllMissions,
            GetAllMinifigures: getAllMinifigures,
        };
    }).pipe(FridaIl2cppBridge.il2cppPerformEffect())
);

serve(RpcServer.layer(Rpcs).pipe(Layer.provide([RpcsLive, LegoTowerRpcsLive])));
