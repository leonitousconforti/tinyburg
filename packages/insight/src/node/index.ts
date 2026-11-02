import type { EncodingError } from "effect/encoding";
import type { HttpClient, HttpClientError } from "effect/http";

import {
    type Cause,
    Config,
    Context,
    Duration,
    Effect,
    type Exit,
    type FileSystem,
    Layer,
    Path,
    type PlatformError,
    type Schema,
    Stream,
    String,
    Tuple,
} from "effect";
import { ChildProcess, ChildProcessSpawner } from "effect/process";
import { type RpcClient, RpcSerialization } from "effect/rpc";

import {
    FridaDevice,
    FridaDeviceAcquisitionError,
    FridaScript,
    FridaSession,
    type FridaSessionError,
} from "@efffrida/frida-tools";
import { type AndroidDevice, GooglePlayApi, type PlayAccount } from "@efffrida/gplayapi";
import { FridaRpcClient } from "@efffrida/rpc/node";
import { JsPlatform, Realm } from "frida";

const NdJsonSerialization = RpcSerialization.layerNdjson;
const ProtocolLive = Layer.provide(FridaRpcClient.layerProtocolFrida(), NdJsonSerialization);

/**
 * TinyTower ships only ARM libraries, which the x86_64 emulator runs through
 * Android's ARM translation. The agent attaches in the emulated realm, where
 * that ARM code (libil2cpp.so among it) lives.
 *
 * @since 1.0.0
 * @category Frida
 */
export const SessionLive: Layer.Layer<
    FridaSession.FridaSession,
    FridaSessionError.FridaSessionError,
    FridaDevice.FridaDevice
> = FridaSession.layer("com.nimblebit.tinytower", { realm: Realm.Emulated });

/**
 * @since 1.0.0
 * @category Frida
 */
export const ScriptLive: Layer.Layer<
    FridaScript.FridaScript | FridaSession.FridaSession,
    FridaSessionError.FridaSessionError,
    FridaDevice.FridaDevice
> = Layer.provideMerge(
    FridaScript.layer(new URL("../frida/Agent.ts", import.meta.url), {
        platform: JsPlatform.Browser,
    }),
    SessionLive
);

/**
 * @since 1.0.0
 * @category Agent
 */
export const AgentLive: Layer.Layer<
    FridaScript.FridaScript | FridaSession.FridaSession | RpcClient.Protocol,
    FridaSessionError.FridaSessionError,
    FridaDevice.FridaDevice
> = Layer.provideMerge(ProtocolLive, ScriptLive);

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
        // `Layer.fresh` is the point here: every watched script gets its own
        // protocol instance rather than sharing one composed at an outer entry
        // point.
        //
        // oxlint-disable-next-line effecttsgo/strict-effect-provide
        Effect.provide(effect, Layer.fresh(ProtocolLive)),
        new URL("../frida/Agent.ts", import.meta.url),
        { platform: JsPlatform.Browser }
    ).pipe(Stream.provide(SessionLive), FridaScript.logWatchErrors);

/**
 * @since 1.0.0
 * @category Frida
 */
export const DeviceLive: Layer.Layer<
    FridaDevice.FridaDevice,
    | Config.ConfigError
    | EncodingError.EncodingError
    | FridaDeviceAcquisitionError.FridaDeviceAcquisitionError
    | HttpClientError.HttpClientError
    | Schema.SchemaError
    | PlatformError.PlatformError
    | Cause.NoSuchElementError
    | PlayAccount.PlayAccountError,
    | FileSystem.FileSystem
    | ChildProcessSpawner.ChildProcessSpawner
    | Path.Path
    | HttpClient.HttpClient
    | AndroidDevice.AndroidDeviceService
    | PlayAccount.PlayAccount
> = Layer.tap(
    FridaDevice.layerAndroidEmulatorDeviceConfig("Small_Phone", {
        fridaExecutable: "/data/local/tmp/frida-server",
        extraEmulatorArgs: ["-gpu", "swiftshader_indirect", "-no-metrics"],
        hidden: true,
    }),
    Effect.fnUntraced(
        function* (deviceCtx: Context.Context<FridaDevice.FridaDevice>) {
            const path = yield* Path.Path;

            const device = Context.get(deviceCtx, FridaDevice.FridaDevice);
            const emulatorName = String.replace("android-emulator://", "")(device.host);
            const childProcessSpawner = yield* ChildProcessSpawner.ChildProcessSpawner;
            const apks = yield* GooglePlayApi.downloadToDisk("com.nimblebit.tinytower");

            yield* Effect.annotateCurrentSpan({
                "apk.path": apks,
                "emulator.name": emulatorName,
            });

            // Take straight from @efffrida/frida-tools for how it resolves adb
            const androidSdk = yield* Config.String("ANDROID_HOME").pipe(
                Config.map((androidSdk) => ({
                    adbExecutable: path.join(androidSdk, "platform-tools", "adb"),
                    emulatorExecutable: path.join(androidSdk, "emulator", "emulator"),
                })),
                Config.withDefault({
                    adbExecutable: "adb",
                    emulatorExecutable: "emulator",
                })
            );

            const installCommand = ChildProcess.make(androidSdk.adbExecutable, [
                "-s",
                emulatorName,
                "install-multiple",
                "-r", // Replace existing application (if present)
                "-t", // Allow test packages
                "-g", // Grant all runtime permissions
                "-d", // Allow downgrade
                ...apks.map((apk) => apk.file),
            ]);

            const exitCode = yield* childProcessSpawner.exitCode(installCommand);
            if (exitCode !== 0) {
                return yield* new FridaDeviceAcquisitionError.FridaDeviceAcquisitionError({
                    cause: `Failed to install APK. Exit code: ${exitCode}`,
                    acquisitionMethod: "android-emulator",
                    attempts: 1,
                });
            }
        },
        Effect.scoped,
        Effect.timed,
        Effect.map(Tuple.get(0)),
        Effect.map(Duration.toSeconds),
        Effect.flatMap((time) => Effect.logDebug(`APK downloading and installing took ${time} seconds`)),
        Effect.asVoid
    )
);
