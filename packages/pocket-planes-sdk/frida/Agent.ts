/**
 * Pocket Planes' agent, which `Generate.ts` loads into the game: insight's own
 * RPCs, plus readers for the game's data tables.
 */

import "@efffrida/polyfills";
import "frida-il2cpp-bridge";

import { Array, Effect, Layer, Result, Schedule, Tuple, pipe } from "effect";
import { RpcServer } from "effect/rpc";

import { Assembly, Class, Extensions, FridaIl2cppBridge } from "@efffrida/il2cpp-bridge";
import { RpcsLive, readEnum, serve, waitForInstance } from "@tinyburg/insight/frida/Agent";

import { PocketPlanesRpcs, Rpcs } from "./Rpcs.ts";

// The game fills its tables while it loads, which takes a while on the emulator
const untilLoaded = Schedule.addDelay(Schedule.recurs(45), () => Effect.succeed("2 seconds"));

/** A string field's content, dying on null. */
const readString = (object: Il2Cpp.Object, fieldName: string): string => {
    const value = object.field<Il2Cpp.String>(fieldName).value;
    if (value.isNull() || value.content === null) throw new Error(`${object.class.name}.${fieldName} is null`);
    return value.content;
};

/**
 * A float field's value, as the shortest decimal that is the same float, so
 * 0.3 does not come out as 0.30000001192092896.
 */
const readSingle = (object: Il2Cpp.Object, fieldName: string): number => {
    const value = object.field<number>(fieldName).value;
    for (let precision = 1; precision <= 9; precision++) {
        const candidate = Number(value.toPrecision(precision));
        if (Math.fround(candidate) === value) return candidate;
    }
    return value;
};

/** An enum's member names, by value, read without calling into the game. */
const readEnumNames = (enumClass: Il2Cpp.Class): Map<number, string> =>
    new Map(
        pipe(
            enumClass.fields,
            Array.filter((field) => field.isStatic && field.type.class.handle.equals(enumClass.handle)),
            Array.filterMap((field) => {
                const value = field.value;
                if (!(value instanceof Il2Cpp.ValueType)) return Result.failVoid;
                return Result.succeed(Tuple.make(value.field<number>("value__").value, field.name));
            })
        )
    );

/** An enum field's member name. */
const readEnumField = (object: Il2Cpp.Object, fieldName: string, names: Map<number, string>): string => {
    const value = object.field<Il2Cpp.ValueType>(fieldName).value.field<number>("value__").value;
    const name = names.get(value);
    if (name === undefined) throw new Error(`${object.class.name}.${fieldName} has no member for ${value}`);
    return name;
};

/** The strings of a string array, dying on null so no index shifts. */
const readStringArray = (array: Il2Cpp.Array<Il2Cpp.String>): Array<string> =>
    Array.map(Array.fromIterable(array), (string, index) => {
        if (string.isNull() || string.content === null) throw new Error(`String ${index} is null`);
        return string.content;
    });

/** The objects of a `List<T>`. */
const readObjectList = (object: Il2Cpp.Object): Array<Il2Cpp.Object> =>
    Array.fromIterable(Extensions.List.lift<Il2Cpp.Object>(object));

const PocketPlanesRpcsLive = PocketPlanesRpcs.toLayer(
    Effect.gen(function* () {
        // Caches
        const assemblyCached = yield* Assembly.assemblyCached;
        const tryClassCached = yield* Class.tryClassCached;
        const tryFieldCached = yield* Class.tryFieldCached;

        // Loading necessary classes
        yield* waitForInstance("Game", "instance", untilLoaded);

        // Global assemblies
        const CSharpAssembly = yield* assemblyCached("Assembly-CSharp");

        /** A static `List<T>` table's objects, dying if it is empty. */
        const readTable = Effect.fnUntraced(function* (className: string, fieldName: string) {
            yield* waitForInstance(className, fieldName, untilLoaded);
            const TableClass = yield* tryClassCached(CSharpAssembly.image, className);
            const TableField = yield* tryFieldCached<Il2Cpp.Object>(TableClass, fieldName);
            const objects = readObjectList(TableField.value);
            if (objects.length === 0) return yield* Effect.die(`${className}.${fieldName} is empty`);
            return objects;
        });

        // Get all cities implementation
        const getAllCities = Effect.fnUntraced(
            function* () {
                return Array.map(yield* readTable("CityMetaTable", "_meta"), (city) => ({
                    id: city.field<number>("city_id").value,
                    name: readString(city, "name"),
                    region: readString(city, "region"),
                    countryCode: readString(city, "cc"),
                    population: readSingle(city, "population"),
                    x: city.field<number>("x").value,
                    y: city.field<number>("y").value,
                    factoid: readString(city, "factoid"),
                }));
            },
            FridaIl2cppBridge.il2cppPerformEffect(),
            Effect.orDie
        );

        // Get all planes implementation
        const getAllPlanes = Effect.fnUntraced(
            function* () {
                // The engine stays a number: planeEngineType names the jets'
                // 1 Prop and has no name for the electric planes' 6
                return Array.map(yield* readTable("PlaneMetaTable", "_meta"), (plane) => ({
                    id: plane.field<number>("plane_id").value,
                    name: readString(plane, "name"),
                    level: plane.field<number>("level").value,
                    airportClass: plane.field<number>("airportClass").value,
                    engine: plane.field<Il2Cpp.ValueType>("engine").value.field<number>("value__").value,
                    speed: readSingle(plane, "speed"),
                    range: readSingle(plane, "range"),
                    weight: readSingle(plane, "weight"),
                    costMultiplier: readSingle(plane, "costMult"),
                    layout: readString(plane, "layout"),
                }));
            },
            FridaIl2cppBridge.il2cppPerformEffect(),
            Effect.orDie
        );

        // Get all skins implementation
        const getAllSkins = Effect.fnUntraced(
            function* () {
                return Array.map(yield* readTable("SkinTable", "skins"), (skin) => ({
                    id: readString(skin, "id"),
                    planeIds: Array.fromIterable(skin.field<Il2Cpp.Array<number>>("planeIds").value),
                    homeCityId: skin.field<number>("homeCityID").value,
                }));
            },
            FridaIl2cppBridge.il2cppPerformEffect(),
            Effect.orDie
        );

        // Get all city events implementation
        const getAllCityEvents = Effect.fnUntraced(
            function* () {
                const CityEventTypeClass = yield* tryClassCached(CSharpAssembly.image, "CityEventType");
                const types = readEnum(CityEventTypeClass);
                const typeNames = readEnumNames(CityEventTypeClass);

                const events = Array.map(yield* readTable("CityEventTable", "_events"), (event) => ({
                    id: event.field<number>("event_id").value,
                    name: readString(event, "name"),
                    type: readEnumField(event, "event_type", typeNames),
                    alert: event.field<boolean>("alert").value,
                    chance: event.field<number>("chance").value,
                    maxDuration: event.field<number>("max_duration").value,
                    closure: event.field<number>("closure").value,
                    reward: event.field<number>("reward").value,
                    zones: readString(event, "zones"),
                    passengersIn: readString(event, "pass_in"),
                    passengersOut: readString(event, "pass_out"),
                    cargoIn: readString(event, "cargo_in"),
                    cargoOut: readString(event, "cargo_out"),
                }));

                return { types, events };
            },
            FridaIl2cppBridge.il2cppPerformEffect(),
            Effect.orDie
        );

        // Get all cargo implementation
        const getAllCargo = Effect.fnUntraced(
            function* () {
                type StringArray = Il2Cpp.Array<Il2Cpp.String>;
                const CrateInfoClass = yield* tryClassCached(CSharpAssembly.image, "CrateInfo");
                const NumPackageNamesField = yield* tryFieldCached<number>(CrateInfoClass, "NUM_PACKAGE_NAMES");
                const NumVipPackagesField = yield* tryFieldCached<number>(CrateInfoClass, "NUM_VIP_PACKAGES");
                const PackageNamesField = yield* tryFieldCached<StringArray>(CrateInfoClass, "packageNames");
                const VipNamesField = yield* tryFieldCached<StringArray>(CrateInfoClass, "vipNames");

                const numPackageNames = NumPackageNamesField.value;
                const numVipPackages = NumVipPackagesField.value;
                const packageNames = readStringArray(PackageNamesField.value);
                const vipPackageNames = readStringArray(VipNamesField.value);

                if (packageNames.length !== numPackageNames || vipPackageNames.length !== numVipPackages) {
                    return yield* Effect.die(
                        `Expected to read ${numPackageNames} package names and ${numVipPackages} VIP package names, but read ${packageNames.length} and ${vipPackageNames.length} instead`
                    );
                }

                return { packageNames, vipPackageNames };
            },
            FridaIl2cppBridge.il2cppPerformEffect(),
            Effect.orDie
        );

        // Get all bitizen names implementation
        const getAllBitizenNames = Effect.fnUntraced(
            function* () {
                const BitizenClass = yield* tryClassCached(CSharpAssembly.image, "Bitizen");
                type StringArray = Il2Cpp.Array<Il2Cpp.String>;
                const MaleNamesField = yield* tryFieldCached<StringArray>(BitizenClass, "maleNames");
                const FemaleNamesField = yield* tryFieldCached<StringArray>(BitizenClass, "femaleNames");
                const LastNamesField = yield* tryFieldCached<StringArray>(BitizenClass, "lastNames");

                return {
                    maleNames: readStringArray(MaleNamesField.value),
                    femaleNames: readStringArray(FemaleNamesField.value),
                    lastNames: readStringArray(LastNamesField.value),
                };
            },
            FridaIl2cppBridge.il2cppPerformEffect(),
            Effect.orDie
        );

        return {
            GetAllCities: getAllCities,
            GetAllPlanes: getAllPlanes,
            GetAllSkins: getAllSkins,
            GetAllCityEvents: getAllCityEvents,
            GetAllCargo: getAllCargo,
            GetAllBitizenNames: getAllBitizenNames,
        };
    }).pipe(FridaIl2cppBridge.il2cppPerformEffect())
);

serve(RpcServer.layer(Rpcs).pipe(Layer.provide([RpcsLive, PocketPlanesRpcsLive])));
