/**
 * What a game's agent is built from: the handlers for insight's own RPCs
 * (`Version` and `SetFps`), helpers for reading a Nimblebit game's il2cpp
 * data, and `serve`, which serves an agent's RPCs to the script that loaded
 * it. Each SDK's `frida/Agent.ts` imports this and adds its game's RPCs.
 *
 * @since 1.0.0
 */

import "@efffrida/polyfills";
import "frida-il2cpp-bridge";

import { Array, Cause, Effect, Layer, Record, Result, Schedule, Tuple, pipe } from "effect";
import { type Rpc, type RpcGroup, RpcSerialization, type RpcServer } from "effect/rpc";

import { Assembly, Class, Extensions, FridaIl2cppBridge } from "@efffrida/il2cpp-bridge";
import { FridaRuntime } from "@efffrida/platform";
import { FridaRpcServer } from "@efffrida/rpc/frida";

import { Rpcs } from "../shared/Rpcs.ts";

/**
 * Nimblebit keeps much of its game data in `Dictionary<string, object>`s.
 *
 * @since 1.0.0
 * @category Helpers
 */
export const liftNimblebitDSO = (object: Il2Cpp.Object): Extensions.Dictionary<Il2Cpp.String, Il2Cpp.Object> => {
    const dictionary = Extensions.Dictionary.lift<Il2Cpp.String, Il2Cpp.Object>(object);
    dictionary.class.generics[0] = Il2Cpp.corlib.class("System.String");
    dictionary.class.generics[1] = Il2Cpp.corlib.class("System.Object");
    return dictionary;
};

/**
 * Reads a field's value as a string, failing on a null string.
 *
 * @since 1.0.0
 * @category Helpers
 */
export const readString = (object: Il2Cpp.Field.Type): Result.Result<string, void> => {
    if (object instanceof Il2Cpp.String) {
        if (object.isNull()) return Result.failVoid;
        else return Result.succeed(object.content!);
    } else return Result.succeed(object.toString());
};

/**
 * Reads every instance field of an object that is not private by name (not
 * starting with `_`) and not a null string, as strings.
 *
 * @since 1.0.0
 * @category Helpers
 */
export const objectReadAllFields = (object: Il2Cpp.Object): Record<string, string> =>
    pipe(
        object.class.fields,
        Array.filter((field) => !field.isStatic),
        Array.filter((field) => !field.name.startsWith("_")),
        Array.filterMap((classField) => {
            const objectField = object.field(classField.name);
            const maybeString = readString(objectField.value);
            return Result.map(maybeString, (string) => Tuple.make(objectField.name, string));
        }),
        Record.fromEntries
    );

/**
 * Reads an enum's members, by name.
 *
 * @since 1.0.0
 * @category Helpers
 */
export const readEnum = (enumClass: Il2Cpp.Class): Record<string, string> =>
    pipe(
        enumClass.fields,
        Array.filter((field) => field.type.class === enumClass),
        Array.map((field) => Tuple.make(field.name, field.value.toString())),
        Record.fromEntries
    );

/**
 * Waits for a static field of a class in `Assembly-CSharp` to hold an object,
 * an array or a string, and returns it, retrying 3 times 2 seconds apart by
 * default. A game fills these some time after il2cpp is ready.
 *
 * It also waits for il2cpp to initialize the class that declares the field:
 * il2cpp allocates a class's static fields only then, and reading one before
 * would dereference NULL inside the game.
 *
 * @since 1.0.0
 * @category Helpers
 */
export const waitForInstance = <A extends Il2Cpp.Object | Il2Cpp.Array | Il2Cpp.String = Il2Cpp.Object, R = never>(
    className: string,
    instanceFieldName: string | undefined = "instance",
    policy: Schedule.Schedule<unknown, unknown, Cause.NoSuchElementError, R> | undefined = Schedule.addDelay(
        Schedule.recurs(3),
        () => Effect.succeed("2 seconds")
    )
): Effect.Effect<A, Cause.NoSuchElementError, R> =>
    pipe(
        Assembly.assembly("Assembly-CSharp"),
        Effect.map((assembly) => assembly.image),
        Effect.flatMap(Class.tryClass(className)),
        Effect.flatMap(Class.tryField(instanceFieldName)<A>),
        // The field's value lives in the class that declares it, which may be a
        // base class. The bridge caches a class's staticFieldsData the first
        // time it is read, so this asks il2cpp on every attempt
        Effect.filterOrFail(
            (field) => !Il2Cpp.exports.classGetStaticFieldData(field.class).isNull(),
            (field) => new Cause.NoSuchElementError(`${field.class.name} is not initialized yet`)
        ),
        Effect.map((field) => field.value),
        Effect.filterOrFail(
            (value) => !value.isNull(),
            () => new Cause.NoSuchElementError(`${className}.${instanceFieldName} is null`)
        ),
        // An array or a string keeps its object behind `object`
        Effect.tap((value) =>
            Effect.try({
                try: () => (value instanceof Il2Cpp.Object ? value : value.object).class.name,
                catch: () => new Cause.NoSuchElementError(`${className}.${instanceFieldName} is not yet available`),
            })
        ),
        Effect.retry(policy)
    );

/**
 * The handlers for insight's own RPCs, which read only Unity's
 * `Application`, so they work in any game.
 *
 * @since 1.0.0
 * @category Rpcs
 */
export const RpcsLive: Layer.Layer<Rpc.ToHandler<RpcGroup.Rpcs<typeof Rpcs>>> = Rpcs.toLayer(
    Effect.gen(function* () {
        const assemblyCached = yield* Assembly.assemblyCached;
        const tryClassCached = yield* Class.tryClassCached;
        const tryMethodCached = yield* Class.tryMethodCached;
        const CoreEngineAssembly = yield* assemblyCached("UnityEngine.CoreModule");

        const version = Effect.fnUntraced(
            function* () {
                const ApplicationClass = yield* tryClassCached(CoreEngineAssembly.image, "UnityEngine.Application");
                const getVersionMethod = yield* tryMethodCached<Il2Cpp.String>(ApplicationClass, "get_version");
                const version = getVersionMethod.invoke().content;
                if (version === null) return yield* Effect.die("UnityEngine.Application.version is null");
                return version;
            },
            FridaIl2cppBridge.il2cppPerformEffect(),
            Effect.orDie
        );

        const setFps = Effect.fnUntraced(
            function* (fps: number) {
                const ApplicationClass = yield* tryClassCached(CoreEngineAssembly.image, "UnityEngine.Application");
                const setTargetFpsMethod = yield* tryMethodCached<void>(ApplicationClass, "set_targetFrameRate", 1);
                return setTargetFpsMethod.invoke(fps);
            },
            FridaIl2cppBridge.il2cppPerformEffect(),
            Effect.orDie
        );

        return { Version: version, SetFps: setFps };
    }).pipe(FridaIl2cppBridge.il2cppPerformEffect())
);

const FridaProtocol = Layer.provide(FridaRpcServer.layerProtocolFrida(), RpcSerialization.layerNdjson);

/**
 * Serves an agent's RPC server, `RpcServer.layer(group)` with a handler for
 * every RPC in `group`, to the script that loaded the agent, until the agent
 * is unloaded. A game's agent calls this once, at its top level:
 *
 * ```ts
 * serve(RpcServer.layer(Rpcs).pipe(Layer.provide([RpcsLive, GameRpcsLive])));
 * ```
 *
 * @since 1.0.0
 * @category Agent
 */
export const serve = <E>(server: Layer.Layer<never, E, RpcServer.Protocol>): void =>
    server.pipe(Layer.provide(FridaProtocol), Layer.launch, FridaRuntime.runMain);
