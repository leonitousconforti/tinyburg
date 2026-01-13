import { type FileSystem } from "@effect/platform";
import { RpcSerialization, type RpcClient } from "@effect/rpc";
import { FridaScript, FridaSession, type FridaDevice, type FridaSessionError } from "@efffrida/frida-tools";
import { FridaRpcClient } from "@efffrida/rpc/node";
import { Effect, Layer, Stream, type Exit } from "effect";
import { JsPlatform } from "frida";

const NdJsonSerialization = RpcSerialization.layerNdjson;
const ProtocolLive = Layer.provide(FridaRpcClient.layerProtocolFrida(), NdJsonSerialization);

/**
 * @since 1.0.0
 * @category Frida
 */
export const SessionLive = FridaSession.layer("com.nimblebit.tinytower");

/**
 * @since 1.0.0
 * @category Frida
 */
export const ScriptLive = Layer.provideMerge(
    FridaScript.layer(new URL("../frida/Agent.ts", import.meta.url), {
        platform: JsPlatform.Browser,
    }),
    SessionLive
);

/**
 * @since 1.0.0
 * @category Agent
 */
export const AgentLive = Layer.provideMerge(ProtocolLive, ScriptLive);

/**
 * @since 1.0.0
 * @category Agent
 */
export const AgentWatched = <A, E, R>(
    effect: Effect.Effect<A, E, R>
): Stream.Stream<
    Exit.Exit<A, E | FridaSessionError.FridaSessionError>,
    FridaSessionError.FridaSessionError,
    | FridaDevice.FridaDevice
    | FileSystem.FileSystem
    | Exclude<Exclude<Exclude<R, RpcClient.Protocol>, FridaScript.FridaScript>, FridaSession.FridaSession>
> =>
    FridaScript.watch(
        Effect.provide(effect, Layer.fresh(ProtocolLive)),
        new URL("../frida/Agent.ts", import.meta.url),
        { platform: JsPlatform.Browser }
    ).pipe(Stream.provideSomeLayer(SessionLive), FridaScript.logWatchErrors);
