/**
 * Pocket Trains' agent, which `Generate.ts` loads into the game: insight's
 * own RPCs, plus readers for the game's data tables.
 */

import "@efffrida/polyfills";
import "frida-il2cpp-bridge";

import {
    Array,
    Cause,
    Effect,
    Layer,
    Option,
    Record,
    Schedule,
    Schema,
    SchemaTransformation,
    Tuple,
    pipe,
} from "effect";
import { RpcServer } from "effect/rpc";

import { Assembly, Class, Extensions, FridaIl2cppBridge } from "@efffrida/il2cpp-bridge";
import { RpcsLive, readString, serve, waitForInstance } from "@tinyburg/insight/frida/Agent";

import { City, EventInfo, PocketTrainsRpcs, Rpcs, Track } from "./Rpcs.ts";

/**
 * Splits one of the game's comma separated tables, header line first, into a
 * record per line keyed by the header's column names. The game pads its cells
 * with tabs and spaces, which are trimmed.
 */
const readTable = (lines: ReadonlyArray<string>): Array<Record<string, string>> => {
    const [header = [], ...rows] = pipe(
        lines,
        Array.filter((line) => line.trim() !== ""),
        Array.map((line) => Array.map(line.split(","), (cell) => cell.trim()))
    );
    return Array.map(rows, (cells) => Record.fromEntries(Array.zip(header, cells)));
};

/** A cell that is one of two strings, as a boolean. */
const Flag = (yes: string, no: string) =>
    Schema.Literals([yes, no]).pipe(
        Schema.decodeTo(
            Schema.Boolean,
            SchemaTransformation.transform({
                decode: (flag) => flag === yes,
                encode: (boolean) => (boolean ? yes : no),
            })
        )
    );

/**
 * A string's content, dying on a null string: reading the content of a null
 * string dereferences NULL inside the game.
 */
const contentOf = (string: Il2Cpp.String, what: string): string => {
    if (string.isNull()) throw new Error(`${what} is null`);
    return string.content!;
};

/** A string field's content, dying on a null string. */
const stringField = (object: Il2Cpp.Object, name: string): string =>
    contentOf(object.field<Il2Cpp.String>(name).value, `${object.class.name}.${name}`);

/** A line of `Resources/Text/cars`. */
const CarRow = Schema.Struct({
    id: Schema.FiniteFromString,
    name: Schema.String,
    type: Schema.String,
    value: Schema.FiniteFromString,
    active: Flag("y", "n"),
}).pipe(Schema.encodeKeys({ id: "Car ID", name: "Car Name", type: "Type", value: "Value(1-4)" }));

/** A line of `Resources/Text/engines`, which `TREngineInfo.cachedEngines` keeps. */
const EngineRow = Schema.Struct({
    id: Schema.FiniteFromString,
    name: Schema.String,
    level: Schema.FiniteFromString,
    maxCars: Schema.FiniteFromString,
    speed: Schema.FiniteFromString,
    fuel: Schema.FiniteFromString,
    maxEngines: Schema.FiniteFromString,
    maxTenders: Schema.FiniteFromString,
    special: Flag("1", "0"),
}).pipe(
    Schema.encodeKeys({
        id: "ID",
        name: "Name",
        level: "Level",
        maxCars: "MaxCars",
        speed: "Speed",
        fuel: "Fuel",
        maxEngines: "MaxEngines",
        maxTenders: "MaxTenders",
        special: "Special",
    })
);

/**
 * The shortest decimal that is the same 32 bit float as `value`, as C#
 * prints a float: 41.31371 rather than 41.3137092590332.
 */
const fromFloat32 = (value: number): number =>
    pipe(
        Array.range(1, 17),
        Array.map((digits) => Number(value.toPrecision(digits))),
        Array.findFirst((decimal) => Math.fround(decimal) === value),
        Option.getOrElse(() => value)
    );

const PocketTrainsRpcsLive = PocketTrainsRpcs.toLayer(
    Effect.gen(function* () {
        // Caches
        const assemblyCached = yield* Assembly.assemblyCached;
        const tryClassCached = yield* Class.tryClassCached;
        const tryFieldCached = yield* Class.tryFieldCached;

        // Global assemblies
        const CSharpAssembly = yield* assemblyCached("Assembly-CSharp");
        const CoreModuleAssembly = yield* assemblyCached("UnityEngine.CoreModule");

        // The game reads its tables while it starts, some time after il2cpp
        // is ready
        const policy = Schedule.addDelay(Schedule.recurs(30), () => Effect.succeed("2 seconds"));

        // Reads a list that a class's static instance holds
        const readInstanceList = Effect.fnUntraced(function* (className: string, listFieldName: string) {
            yield* waitForInstance(className, "instance", policy);
            const InstanceClass = yield* tryClassCached(CSharpAssembly.image, className);
            const InstanceField = yield* tryFieldCached<Il2Cpp.Object>(InstanceClass, "instance");
            return pipe(
                InstanceField.value.field<Il2Cpp.Object>(listFieldName).value,
                (object) => Extensions.List.lift<Il2Cpp.Object>(object),
                Array.fromIterable
            );
        });

        // Get all cars implementation. No table of cars stays in memory: the
        // game reads a car from Resources/Text/cars each time it makes one,
        // and Unity loads resources only on its main thread.
        const getAllCars = Effect.fnUntraced(
            function* () {
                // Resources.Load(string), not its generic overload
                const ResourcesClass = yield* tryClassCached(CoreModuleAssembly.image, "UnityEngine.Resources");
                const LoadMethod = yield* pipe(
                    ResourcesClass.methods,
                    Array.findFirst(
                        (method) => method.name === "Load" && method.parameterCount === 1 && !method.isGeneric
                    ),
                    Effect.fromOption
                );

                const carsAsset = LoadMethod.invoke(Il2Cpp.string("Text/cars"));
                if (!(carsAsset instanceof Il2Cpp.Object) || carsAsset.isNull()) {
                    return yield* Effect.die("Resources/Text/cars is missing");
                }
                const carsText = contentOf(
                    carsAsset.method<Il2Cpp.String>("get_text").invoke(),
                    "the cars TextAsset's text"
                );
                const cars = yield* Schema.decodeUnknownEffect(Schema.Array(CarRow))(readTable(carsText.split("\n")));

                // The table lists car 112 twice, and the game takes the later
                // line for it, as Record.fromEntries does
                return pipe(
                    cars,
                    Array.map((car) => Tuple.make(`${car.id}`, car)),
                    Record.fromEntries,
                    Record.values
                );
            },
            FridaIl2cppBridge.il2cppPerformEffect("main"),
            Effect.orDie
        );

        // Get all cities implementation
        const getAllCities = Effect.fnUntraced(
            function* () {
                const cityObjects = yield* readInstanceList("TRCities", "_cities");
                const cities = yield* Schema.decodeUnknownEffect(Schema.Array(City))(
                    Array.map(cityObjects, (city) => ({
                        id: city.field<number>("cityID").value,
                        name: stringField(city, "name"),
                        region: stringField(city, "region"),
                    }))
                );

                const regions = Array.dedupe(Array.map(cities, (city) => city.region));
                return { regions, cities };
            },
            FridaIl2cppBridge.il2cppPerformEffect(),
            Effect.orDie
        );

        // Get all engines implementation
        const getAllEngines = Effect.fnUntraced(
            function* () {
                const TREngineInfoClass = yield* tryClassCached(CSharpAssembly.image, "TREngineInfo");
                const CachedEnginesField = yield* tryFieldCached<Il2Cpp.Array<Il2Cpp.String>>(
                    TREngineInfoClass,
                    "cachedEngines"
                );

                const engineLines = yield* Effect.suspend(() =>
                    CachedEnginesField.value.isNull()
                        ? Effect.fail(new Cause.NoSuchElementError("TREngineInfo.cachedEngines is null"))
                        : Effect.succeed(CachedEnginesField.value)
                ).pipe(Effect.retry(policy));

                return yield* pipe(
                    Array.fromIterable<Il2Cpp.Field.Type>(engineLines),
                    Array.filterMap(readString),
                    readTable,
                    Schema.decodeUnknownEffect(Schema.Array(EngineRow))
                );
            },
            FridaIl2cppBridge.il2cppPerformEffect(),
            Effect.orDie
        );

        // Get all events implementation
        const getAllEvents = Effect.fnUntraced(
            function* () {
                yield* waitForInstance("TREvents", "events", policy);
                const TREventsClass = yield* tryClassCached(CSharpAssembly.image, "TREvents");
                const EventsField = yield* tryFieldCached<Il2Cpp.Object>(TREventsClass, "events");

                const eventObjects = pipe(
                    EventsField.value,
                    (object) => Extensions.List.lift<Il2Cpp.Object>(object),
                    Array.fromIterable
                );

                return yield* Schema.decodeUnknownEffect(Schema.Array(EventInfo))(
                    Array.map(eventObjects, (event) => {
                        const costume = event.field<Il2Cpp.String>("costume").value;
                        return {
                            story: stringField(event, "story"),
                            carId: event.field<number>("jobcar").value,
                            inbound: event.field<boolean>("jobsIn").value,
                            costume: costume.isNull() ? null : costume.content,
                        };
                    })
                );
            },
            FridaIl2cppBridge.il2cppPerformEffect(),
            Effect.orDie
        );

        // Get all tracks implementation
        const getAllTracks = Effect.fnUntraced(
            function* () {
                const trackObjects = yield* readInstanceList("TRTracks", "_tracks");
                return yield* Schema.decodeUnknownEffect(Schema.Array(Track))(
                    Array.map(trackObjects, (track) => ({
                        id: track.field<number>("trackID").value,
                        name: stringField(track, "name"),
                        cityAId: track.field<number>("cityAID").value,
                        cityBId: track.field<number>("cityBID").value,
                        distance: fromFloat32(track.field<number>("distance").value),
                    }))
                );
            },
            FridaIl2cppBridge.il2cppPerformEffect(),
            Effect.orDie
        );

        return {
            GetAllCars: getAllCars,
            GetAllCities: getAllCities,
            GetAllEngines: getAllEngines,
            GetAllEvents: getAllEvents,
            GetAllTracks: getAllTracks,
        };
    }).pipe(FridaIl2cppBridge.il2cppPerformEffect())
);

serve(RpcServer.layer(Rpcs).pipe(Layer.provide([RpcsLive, PocketTrainsRpcsLive])));
