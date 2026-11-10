/**
 * Bit City's agent, which `Generate.ts` loads into the game: insight's own
 * RPCs, plus readers for the game's data tables.
 */

import "@efffrida/polyfills";
import "frida-il2cpp-bridge";

import { Array, Effect, Layer, Record, Schema } from "effect";
import { RpcServer } from "effect/rpc";

import { Assembly, Class, Extensions, FridaIl2cppBridge } from "@efffrida/il2cpp-bridge";
import { RpcsLive, liftNimblebitDSO, readEnum, serve, waitForInstance } from "@tinyburg/insight/frida/Agent";

import { BitCityRpcs, Building, Car, Mission, Rpcs, Upgrade, VehicleVariant } from "./Rpcs.ts";

/** A value of one of the game's data records. */
type Value = string | number | boolean;

/** Each enum's member names, by value, by the enum's name. */
type EnumNames = ReadonlyMap<string, ReadonlyMap<number, string>>;

/** An enum's member names, by value. */
const enumNames = (enumClass: Il2Cpp.Class): ReadonlyMap<number, string> =>
    new Map(
        Array.map(
            Array.filter(enumClass.fields, (field) => field.isStatic),
            (field) => [enumClass.field<Il2Cpp.ValueType>(field.name).value.field<number>("value__").value, field.name]
        )
    );

/**
 * Reads a boxed value of a record: a string, a number, a boolean, or an
 * enum's member name. Reads the value's memory instead of calling its
 * `ToString`.
 */
const readValue = Effect.fnUntraced(function* (object: Il2Cpp.Object, enums: EnumNames) {
    if (object.isNull()) return yield* Effect.die("Unexpected null value");
    const valueClass = object.class;
    if (valueClass.isEnum) {
        const value = object.unbox().field<number>("value__").value;
        const name = enums.get(valueClass.name)?.get(value);
        if (name === undefined) return yield* Effect.die(`Unexpected ${valueClass.name} value ${value}`);
        return name;
    }

    switch (valueClass.type.name) {
        case "System.String": {
            const content = new Il2Cpp.String(object.handle).content;
            if (content === null) return yield* Effect.die("Unexpected null string");
            return content;
        }
        case "System.Boolean":
        case "System.Int32":
        case "System.Single":
        case "System.Double":
            return object.unbox().field<number | boolean>("m_value").value;
        default:
            return yield* Effect.die(`Unexpected ${valueClass.type.name} value`);
    }
});

/** Reads one of Nimblebit's `Dictionary<string, object>` records. */
const readRecord = Effect.fnUntraced(function* (object: Il2Cpp.Object, enums: EnumNames) {
    const entries = yield* Effect.forEach(
        liftNimblebitDSO(object).entries,
        Effect.fnUntraced(function* ([key, value]) {
            if (key.isNull()) return yield* Effect.die("Unexpected null key");
            return [key.content!, yield* readValue(value, enums)] as const;
        })
    );
    return Record.fromEntries(entries);
});

/** Reads a `List<DSO>` of records. */
const readRecords = (object: Il2Cpp.Object, enums: EnumNames) =>
    Effect.forEach(Array.fromIterable(Extensions.List.lift<Il2Cpp.Object>(object)), (record) =>
        readRecord(record, enums)
    );

/** Renames a record's fields, failing on a field it has no name for. */
const rename = Effect.fnUntraced(function* (
    record: Record<string, Value>,
    names: Record<string, string>,
    what: string
) {
    const unknown = Array.filter(Record.keys(record), (key) => !Record.has(names, key));
    if (Array.isReadonlyArrayNonEmpty(unknown)) {
        return yield* Effect.die(`Unexpected ${what} fields: ${unknown.join(", ")}`);
    }
    return Record.mapKeys(record, (key) => names[key]);
});

/**
 * Splits a record whose fields come in three variants, such as `name0`,
 * `name1` and `name2`, into its other fields and one record per variant.
 */
const splitVariants = (record: Record<string, Value>) => {
    const shared: Record<string, Value> = {};
    const variants: Array<Record<string, Value>> = [];
    for (const [key, value] of Record.toEntries(record)) {
        const match = /^(.+)(\d)$/.exec(key);
        if (match === null) shared[key] = value;
        else (variants[Number(match[2])] ??= {})[match[1]] = value;
    }
    return { shared, variants };
};

const decode = <S extends Schema.Top>(schema: S) =>
    Schema.decodeUnknownEffect(Schema.Array(schema), { onExcessProperty: "error" });

const BitCityRpcsLive = BitCityRpcs.toLayer(
    Effect.gen(function* () {
        // Caches
        const assemblyCached = yield* Assembly.assemblyCached;
        const tryClassCached = yield* Class.tryClassCached;
        const tryFieldCached = yield* Class.tryFieldCached;

        // Loading necessary classes
        yield* waitForInstance("City");

        // Global assemblies
        const CSharpAssembly = yield* assemblyCached("Assembly-CSharp");

        // The data table of one of the game's *Defs classes. Its static
        // constructor builds it, and in a new game BoatDefs, CarDefs and
        // PlaneDefs are not built yet. Initializing the class runs its static
        // constructor if the game has not yet.
        const readDefs = Effect.fnUntraced(function* (className: string, fieldName: string, enums: EnumNames) {
            const DefsClass = yield* tryClassCached(CSharpAssembly.image, className);
            DefsClass.initialize();
            const DefsField = yield* tryFieldCached<Il2Cpp.Object>(DefsClass, fieldName);
            if (DefsField.value.isNull()) return yield* Effect.die(`${className}.${fieldName} is null`);
            return yield* readRecords(DefsField.value, enums);
        });

        // GetAllBuildings implementation
        const getAllBuildings = Effect.fnUntraced(
            function* () {
                const ZoneTypeClass = yield* tryClassCached(CSharpAssembly.image, "ZoneType");
                const enums = new Map([["ZoneType", enumNames(ZoneTypeClass)]]);
                const records = yield* readDefs("BuildingDefs", "infos", enums);
                const buildings = yield* Effect.forEach(records, (record) =>
                    rename(
                        record,
                        {
                            name: "name",
                            fab: "prefab",
                            type: "type",
                            size: "size",
                            lvl: "levels",
                            dp: "dp",
                            boost: "boost",
                        },
                        "building"
                    )
                );

                return {
                    zoneTypes: readEnum(ZoneTypeClass),
                    buildings: yield* decode(Building)(buildings),
                };
            },
            FridaIl2cppBridge.il2cppPerformEffect(),
            Effect.orDie
        );

        // GetAllCities implementation
        const getAllCities = Effect.fnUntraced(
            function* () {
                const CityClass = yield* tryClassCached(CSharpAssembly.image, "City");
                const CityNamesField = yield* tryFieldCached<Il2Cpp.Array<Il2Cpp.String>>(CityClass, "cityNames");
                const cities = Array.map(Array.fromIterable(CityNamesField.value), (name) =>
                    name.isNull() ? null : name.content
                );
                return yield* Schema.decodeUnknownEffect(Schema.Array(Schema.String))(cities);
            },
            FridaIl2cppBridge.il2cppPerformEffect(),
            Effect.orDie
        );

        // GetAllMissions implementation
        const getAllMissions = Effect.fnUntraced(
            function* () {
                const MissionTypeClass = yield* tryClassCached(CSharpAssembly.image, "MissionType");
                const enums = new Map([["MissionType", enumNames(MissionTypeClass)]]);
                const records = yield* readDefs("MissionDefs", "items", enums);
                const missions = yield* Effect.forEach(records, (record) =>
                    rename(
                        record,
                        { id: "id", type: "type", need: "need", title: "title", desc: "description", fab: "prefab" },
                        "mission"
                    )
                );

                return {
                    types: readEnum(MissionTypeClass),
                    missions: yield* decode(Mission)(missions),
                };
            },
            FridaIl2cppBridge.il2cppPerformEffect(),
            Effect.orDie
        );

        // GetAllUpgrades implementation
        const getAllUpgrades = Effect.fnUntraced(
            function* () {
                const UpgradeVarClass = yield* tryClassCached(CSharpAssembly.image, "UpgradeVar");
                const enums = new Map([["UpgradeVar", enumNames(UpgradeVarClass)]]);
                const records = yield* readDefs("UpgradeDefs", "items", enums);
                // The list has an empty record between each tier's upgrades
                const upgrades = yield* Effect.forEach(
                    Array.filter(records, (record) => !Record.isEmptyRecord(record)),
                    Effect.fnUntraced(function* (record) {
                        const { shared, variants } = splitVariants(record);
                        const fields = yield* rename(
                            shared,
                            {
                                id: "id",
                                var: "var",
                                t: "tier",
                                max: "max",
                                dispDelta: "displayDelta",
                                varDelta: "varDelta",
                                bcp: "bcp",
                                eD: "eD",
                                btn: "button",
                            },
                            "upgrade"
                        );
                        const texts = yield* Effect.forEach(variants, (variant) =>
                            rename(variant, { title: "title", desc: "description", icon: "icon" }, "upgrade")
                        );
                        return {
                            ...fields,
                            titles: Array.map(texts, (text) => text.title),
                            descriptions: Array.map(texts, (text) => text.description),
                            icons: Array.map(texts, (text) => text.icon),
                        };
                    })
                );

                return {
                    vars: readEnum(UpgradeVarClass),
                    upgrades: yield* decode(Upgrade)(upgrades),
                };
            },
            FridaIl2cppBridge.il2cppPerformEffect(),
            Effect.orDie
        );

        // GetAllVehicles implementation
        const getAllVehicles = Effect.fnUntraced(
            function* () {
                const enums = new Map<string, ReadonlyMap<number, string>>();
                const carRecords = yield* readDefs("CarDefs", "infos", enums);
                const cars = yield* Effect.forEach(carRecords, (record) =>
                    rename(record, { name: "name", fab: "prefab", icon: "icon", desc: "description" }, "car")
                );

                const readVariants = Effect.fnUntraced(function* (className: string, what: string) {
                    const records = yield* readDefs(className, "infos", enums);
                    return yield* Effect.forEach(
                        records,
                        Effect.fnUntraced(function* (record) {
                            const { shared, variants } = splitVariants(record);
                            yield* rename(shared, {}, what);
                            const read = yield* Effect.forEach(variants, (variant) =>
                                rename(
                                    variant,
                                    { name: "name", fab: "prefab", icon: "icon", speed: "speed", desc: "description" },
                                    what
                                )
                            );
                            return yield* decode(VehicleVariant)(read);
                        })
                    );
                });

                return {
                    cars: yield* decode(Car)(cars),
                    boats: yield* readVariants("BoatDefs", "boat"),
                    planes: yield* readVariants("PlaneDefs", "plane"),
                };
            },
            FridaIl2cppBridge.il2cppPerformEffect(),
            Effect.orDie
        );

        return {
            GetAllBuildings: getAllBuildings,
            GetAllCities: getAllCities,
            GetAllMissions: getAllMissions,
            GetAllUpgrades: getAllUpgrades,
            GetAllVehicles: getAllVehicles,
        };
    }).pipe(FridaIl2cppBridge.il2cppPerformEffect())
);

serve(RpcServer.layer(Rpcs).pipe(Layer.provide([RpcsLive, BitCityRpcsLive])));
