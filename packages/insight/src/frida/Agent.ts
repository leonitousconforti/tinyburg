import "@efffrida/polyfills";
import "frida-il2cpp-bridge";

import { RpcSerialization, RpcServer } from "@effect/rpc";
import { Assembly, Class, FridaIl2cppBridge } from "@efffrida/il2cpp-bridge";
import { FridaRuntime } from "@efffrida/platform";
import { FridaRpcServer } from "@efffrida/rpc/frida";
import { Array, Effect, Layer, Option, Schedule, Schema, pipe } from "effect";

import { Rpcs, TowerCredentials } from "../shared/Rpcs.ts";

const RpcsLive = Rpcs.toLayer(
    Effect.gen(function* () {
        // Caches
        const assemblyCached = yield* Assembly.assemblyCached;
        const tryClassCached = yield* Class.tryClassCached;
        const _tryFieldCached = yield* Class.tryFieldCached;
        const tryMethodCached = yield* Class.tryMethodCached;

        // Wait for loading to be done
        yield* pipe(
            assemblyCached("Assembly-CSharp"),
            Effect.map((assembly) => assembly.image),
            Effect.flatMap(Class.tryClass("NBSync")),
            Effect.retry(Schedule.recurs(3))
        );

        // Global assemblies
        const CSharpAssembly = yield* assemblyCached("Assembly-CSharp");

        return {
            Version: Effect.fnUntraced(function* () {
                const VersionUtilsClass = yield* tryClassCached(CSharpAssembly.image, "VersionUtils");
                const VersionStringMethod = yield* tryMethodCached<Il2Cpp.Array<number>>(
                    VersionUtilsClass,
                    "get_parsedVersion"
                );

                const decode = Schema.decodeUnknown(Schema.Tuple(Schema.Int, Schema.Int, Schema.Int));
                const versionParts = Array.fromIterable(VersionStringMethod.invoke());
                return yield* Effect.map(decode(versionParts), ([major, minor, patch]) => `${major}.${minor}.${patch}`);
            }, Effect.orDie),

            GetTowerCredentials: Effect.fnUntraced(function* () {
                const NBSyncClass = yield* tryClassCached(CSharpAssembly.image, "NBSync");
                const PlayerIdField = yield* tryMethodCached<Il2Cpp.String>(NBSyncClass, "get_playerID");
                const PlayerRegistered = yield* tryMethodCached<boolean>(NBSyncClass, "get_playerRegistered");
                const PlayerEmailField = yield* tryMethodCached<Il2Cpp.String>(NBSyncClass, "get_playerEmail");
                const PlayerAuthKeyField = yield* tryMethodCached<Il2Cpp.String>(NBSyncClass, "get_playerSalt");

                return yield* Schema.decodeUnknown(TowerCredentials)({
                    playerId: PlayerIdField.invoke().content,
                    playerSalt: PlayerAuthKeyField.invoke().content,
                    playerEmail: PlayerRegistered.invoke()
                        ? Option.some(PlayerEmailField.invoke().content)
                        : Option.none(),
                });
            }, Effect.orDie),

            SetTowerCredentials: Effect.fnUntraced(function* (payload: TowerCredentials) {
                const NBSyncClass = yield* tryClassCached(CSharpAssembly.image, "NBSync");
                const PlayerIdField = yield* tryMethodCached<Il2Cpp.String>(NBSyncClass, "get_playerID");
                const PlayerRegistered = yield* tryMethodCached<boolean>(NBSyncClass, "get_playerRegistered");
                const PlayerEmailField = yield* tryMethodCached<Il2Cpp.String>(NBSyncClass, "get_playerEmail");
                const PlayerAuthKeyField = yield* tryMethodCached<Il2Cpp.String>(NBSyncClass, "get_playerSalt");
                const SwitchRegisteredPlaterMethod = yield* tryMethodCached<void>(
                    NBSyncClass,
                    "switchRegisteredPlater",
                    4
                );

                SwitchRegisteredPlaterMethod.invoke(
                    Il2Cpp.string(payload.playerId),
                    Il2Cpp.string(payload.playerSalt),
                    Il2Cpp.string(Option.getOrNull(payload.playerEmail)),
                    Option.isSome(payload.playerEmail)
                );

                return yield* Schema.decodeUnknown(TowerCredentials)({
                    playerId: PlayerIdField.invoke().content,
                    playerSalt: PlayerAuthKeyField.invoke().content,
                    playerEmail: PlayerRegistered.invoke()
                        ? Option.some(PlayerEmailField.invoke().content)
                        : Option.none(),
                });
            }, Effect.orDie),
        } as const;
    }).pipe(FridaIl2cppBridge.il2cppPerformEffect)
);

const NdJsonSerialization = RpcSerialization.layerNdjson;
const FridaProtocol = Layer.provide(FridaRpcServer.layerProtocolFrida(), NdJsonSerialization);
const RpcLayer = RpcServer.layer(Rpcs).pipe(Layer.provide(RpcsLive));

const Main = RpcLayer.pipe(Layer.provide(FridaProtocol));
Layer.launch(Main).pipe(FridaRuntime.runMain);
