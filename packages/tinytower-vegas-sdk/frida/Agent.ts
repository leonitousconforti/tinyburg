/**
 * Tiny Tower Vegas's agent, which `Generate.ts` loads into the game: insight's
 * own RPCs, plus readers for the game's data tables.
 */

import "@efffrida/polyfills";
import "frida-il2cpp-bridge";

import { Array, Cause, Effect, Function, Layer, Record, Schedule, Schema, Tuple, pipe } from "effect";
import { RpcServer } from "effect/rpc";

import { Assembly, Class, Extensions, FridaIl2cppBridge } from "@efffrida/il2cpp-bridge";
import {
    RpcsLive,
    liftNimblebitDSO,
    readEnum,
    readString,
    serve,
    waitForInstance,
} from "@tinyburg/insight/frida/Agent";

import { Character, Elevator, Floor, Mission, Roof, Rpcs, TinyTowerVegasRpcs } from "./Rpcs.ts";

// The game fills its data tables some time after il2cpp is ready
const untilLoaded = Schedule.addDelay(Schedule.recurs(60), () => Effect.succeed("2 seconds"));

// The keys of each data table's DSOs that generate reads, by their name in TypeScript
const floorKeys = {
    name: "name",
    type: "type",
    subtype: "subType",
    buxcost: "buxCost",
    chipcost: "chipCost",
    character: "character",
    prods: "products",
    stocktime: "stockTime",
    holiday: "holiday",
};
const elevatorKeys = {
    name: "name",
    buxcost: "buxCost",
    chipcost: "chipCost",
    holiday: "holiday",
};
const roofKeys = {
    name: "name",
    buxcost: "buxCost",
    chipcost: "chipCost",
    platform: "platform",
    holiday: "holiday",
    hidden: "hidden",
};

// Reads a DSO value of the types the data tables use: strings, ints,
// booleans, enums (by member name) and string arrays. Anything else comes
// back as is, for the schema to reject.
const readDsoValue = (value: Il2Cpp.Object): unknown => {
    if (value.isNull()) return null;
    const klass = value.class;
    switch (klass.type.name) {
        case "System.String":
            return new Il2Cpp.String(value.handle).content;
        case "System.Int32":
        case "System.Boolean":
            return value.unbox().field<number | boolean>("m_value").value;
        case "System.String[]":
            return Array.map(Array.fromIterable(new Il2Cpp.Array<Il2Cpp.String>(value.handle)), (item) =>
                item.isNull() ? null : item.content
            );
        default:
            return klass.isEnum ? value.toString() : value;
    }
};

// Reads the given keys of a data table's DSO, leaving out the ones it does not have
const readDso =
    (keys: Readonly<Record<string, string>>) =>
    (object: Il2Cpp.Object): Record<string, unknown> => {
        const dso = liftNimblebitDSO(object);
        return pipe(
            Record.toEntries(keys),
            Array.map(([key, name]) => Tuple.make(Il2Cpp.string(key), name)),
            Array.filter(([key]) => dso.containsKey(key)),
            Array.map(([key, name]) => Tuple.make(name, readDsoValue(dso.get(key)))),
            Record.fromEntries
        );
    };

// A string field's content, dying on a null string: reading the content of a
// null string dereferences NULL inside the game
const stringField = (object: Il2Cpp.Object, name: string): string => {
    const value = object.field<Il2Cpp.String>(name).value;
    if (value.isNull()) throw new Error(`${object.class.name}.${name} is null`);
    return value.content!;
};

const readMission = (mission: Il2Cpp.Object): Record<string, unknown> => {
    const prop = mission.field<Il2Cpp.String>("propStr").value;
    return {
        id: mission.field<number>("id").value,
        type: mission.field<Il2Cpp.ValueType>("mType").value.toString(),
        text: stringField(mission, "text"),
        characterId: stringField(mission, "charId"),
        ...(prop.isNull() ? {} : { prop: prop.content }),
        floorType: mission.field<Il2Cpp.ValueType>("floorType").value.toString(),
        count: mission.field<number>("count").value,
    };
};

const readCharacter = (character: Il2Cpp.Object): Record<string, unknown> => ({
    id: stringField(character, "id"),
    name: stringField(character, "name"),
    costume: stringField(character, "costume"),
    missionComplete: stringField(character, "missionComplete"),
    holiday: stringField(character, "holiday"),
});

const TinyTowerVegasRpcsLive = TinyTowerVegasRpcs.toLayer(
    Effect.gen(function* () {
        // Caches
        const assemblyCached = yield* Assembly.assemblyCached;
        const tryClassCached = yield* Class.tryClassCached;
        const tryFieldCached = yield* Class.tryFieldCached;

        // Loading necessary classes
        yield* waitForInstance("VGame", "instance", untilLoaded);

        // Global assemblies
        const CSharpAssembly = yield* assemblyCached("Assembly-CSharp");

        // Reads a static array of the game's data, checking it against the
        // game's own count of it
        const readStaticArray = Effect.fnUntraced(function* (
            className: string,
            fieldName: string,
            countFieldName: string
        ) {
            const klass = yield* tryClassCached(CSharpAssembly.image, className);
            const countField = yield* tryFieldCached<number>(klass, countFieldName);
            const arrayField = yield* tryFieldCached<Il2Cpp.Array<Il2Cpp.Object>>(klass, fieldName);

            const count = countField.value;
            const items = Array.fromIterable(arrayField.value);
            if (items.length !== count || Array.some(items, (item) => item.isNull())) {
                return yield* Effect.die(
                    `Expected ${count} entries in ${className}.${fieldName}, but read ${items.length} with ${Array.filter(items, (item) => item.isNull()).length} null`
                );
            }

            return items;
        });

        // Get all floors implementation
        const getAllFloors = Effect.fnUntraced(
            function* () {
                yield* waitForInstance("VFloorData", "instance", untilLoaded);
                const FloorTypeClass = yield* tryClassCached(CSharpAssembly.image, "FloorType");
                const FloorSubTypeClass = yield* tryClassCached(CSharpAssembly.image, "FloorSubType");
                const floors = yield* readStaticArray("VFloorData", "info", "NUM_FLOORS");

                return {
                    types: readEnum(FloorTypeClass),
                    subTypes: readEnum(FloorSubTypeClass),
                    floors: yield* Schema.decodeUnknownEffect(Schema.Array(Floor))(
                        Array.map(floors, readDso(floorKeys))
                    ),
                };
            },
            FridaIl2cppBridge.il2cppPerformEffect(),
            Effect.orDie
        );

        // Get all elevators implementation
        const getAllElevators = Effect.fnUntraced(
            function* () {
                yield* waitForInstance("VElevatorData", "instance", untilLoaded);
                const elevators = yield* readStaticArray("VElevatorData", "info", "NUM_ELEVATORS");
                return yield* Schema.decodeUnknownEffect(Schema.Array(Elevator))(
                    Array.map(elevators, readDso(elevatorKeys))
                );
            },
            FridaIl2cppBridge.il2cppPerformEffect(),
            Effect.orDie
        );

        // Get all roofs implementation
        const getAllRoofs = Effect.fnUntraced(
            function* () {
                yield* waitForInstance("VRoofData", "instance", untilLoaded);
                const roofs = yield* readStaticArray("VRoofData", "info", "NUM_ROOFS");
                return yield* Schema.decodeUnknownEffect(Schema.Array(Roof))(Array.map(roofs, readDso(roofKeys)));
            },
            FridaIl2cppBridge.il2cppPerformEffect(),
            Effect.orDie
        );

        // Get all missions implementation
        const getAllMissions = Effect.fnUntraced(
            function* () {
                yield* waitForInstance("VMissionData", "instance", untilLoaded);
                const MissionTypeClass = yield* tryClassCached(CSharpAssembly.image, "MissionType");
                const decodeMissions = Function.flow(
                    Array.map(readMission),
                    Schema.decodeUnknownEffect(Schema.Array(Mission))
                );

                const types = readEnum(MissionTypeClass);
                const missions = yield* readStaticArray("VMissionData", "missions", "NUM_MISSIONS");
                const tipMissions = yield* readStaticArray("VMissionData", "tipMissions", "NUM_TIPMISSIONS");
                const tutorialMissions = yield* readStaticArray("VMissionData", "tutMissions", "NUM_TUTMISSIONS");

                return {
                    types,
                    tutorialMissions: yield* decodeMissions(tutorialMissions),
                    tipMissions: yield* decodeMissions(tipMissions),
                    missions: yield* decodeMissions(missions),
                };
            },
            FridaIl2cppBridge.il2cppPerformEffect(),
            Effect.orDie
        );

        // Get all bitizen data implementation
        const getAllBitizenData = Effect.fnUntraced(
            function* () {
                const VBitizenClass = yield* tryClassCached(CSharpAssembly.image, "VBitizen");
                const MaleNamesField = yield* tryFieldCached<Il2Cpp.Array<Il2Cpp.String>>(VBitizenClass, "maleNames");
                const FemaleNamesField = yield* tryFieldCached<Il2Cpp.Array<Il2Cpp.String>>(
                    VBitizenClass,
                    "femaleNames"
                );
                const LastNamesField = yield* tryFieldCached<Il2Cpp.Array<Il2Cpp.String>>(VBitizenClass, "lastNames");
                const CitiesField = yield* tryFieldCached<Il2Cpp.Array<Il2Cpp.String>>(VBitizenClass, "cities");

                // VBitizen's static constructor fills its lists, once the game uses the class
                const [maleNames, femaleNames, lastNames, cities] = yield* Effect.suspend(() => {
                    const lists = Tuple.make(
                        MaleNamesField.value,
                        FemaleNamesField.value,
                        LastNamesField.value,
                        CitiesField.value
                    );
                    return lists.some((list) => list.isNull())
                        ? Effect.fail(new Cause.NoSuchElementError("VBitizen's lists are null"))
                        : Effect.succeed(lists);
                }).pipe(Effect.retry(untilLoaded));

                const readStringArray = Function.flow(
                    Array.fromIterable<Il2Cpp.Field.Type>,
                    Array.filterMap(readString)
                );

                return {
                    maleNames: readStringArray(maleNames),
                    femaleNames: readStringArray(femaleNames),
                    lastNames: readStringArray(lastNames),
                    cities: readStringArray(cities),
                };
            },
            FridaIl2cppBridge.il2cppPerformEffect(),
            Effect.orDie
        );

        // Get all characters implementation
        const getAllCharacters = Effect.fnUntraced(
            function* () {
                yield* waitForInstance("VCharacterTable", "instance", untilLoaded);
                const VCharacterTableClass = yield* tryClassCached(CSharpAssembly.image, "VCharacterTable");
                const VCharacterTableInstanceField = yield* tryFieldCached<Il2Cpp.Object>(
                    VCharacterTableClass,
                    "instance"
                );
                const CharactersField = VCharacterTableInstanceField.value.field<Il2Cpp.Object>("characters");

                const characters = pipe(
                    Extensions.List.lift<Il2Cpp.Object>(CharactersField.value),
                    Array.fromIterable,
                    Array.map(readCharacter)
                );

                return yield* Schema.decodeUnknownEffect(Schema.Array(Character))(characters);
            },
            FridaIl2cppBridge.il2cppPerformEffect(),
            Effect.orDie
        );

        return {
            GetAllFloors: getAllFloors,
            GetAllElevators: getAllElevators,
            GetAllRoofs: getAllRoofs,
            GetAllMissions: getAllMissions,
            GetAllBitizenData: getAllBitizenData,
            GetAllCharacters: getAllCharacters,
        };
    }).pipe(FridaIl2cppBridge.il2cppPerformEffect())
);

serve(RpcServer.layer(Rpcs).pipe(Layer.provide([RpcsLive, TinyTowerVegasRpcsLive])));
