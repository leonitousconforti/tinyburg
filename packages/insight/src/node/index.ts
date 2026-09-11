import type { HttpClient, HttpClientError } from "effect/unstable/http";

import {
    type Cause,
    Config,
    Context,
    type Crypto,
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
import { ChildProcess, ChildProcessSpawner } from "effect/unstable/process";
import { type RpcClient, RpcSerialization } from "effect/unstable/rpc";

import {
    FridaDevice,
    FridaDeviceAcquisitionError,
    FridaScript,
    FridaSession,
    type FridaSessionError,
} from "@efffrida/frida-tools";
import { type AndroidDevice, GooglePlayApi, type PlayAccount } from "@efffrida/gplayapi";
import { FridaRpcClient } from "@efffrida/rpc/node";
import { JsPlatform } from "frida";

const NdJsonSerialization = RpcSerialization.layerNdjson;
const ProtocolLive = Layer.provide(FridaRpcClient.layerProtocolFrida(), NdJsonSerialization);

/**
 * @since 1.0.0
 * @category Frida
 */
export const SessionLive: Layer.Layer<
    FridaSession.FridaSession,
    FridaSessionError.FridaSessionError,
    FridaDevice.FridaDevice
> = FridaSession.layer("com.nimblebit.tinytower");

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
        // `Layer.fresh` is the point here: every watched script gets its own protocol instance
        // rather than sharing one composed at an outer entry point.
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
    | Crypto.Crypto
> = Layer.tap(
    FridaDevice.layerAndroidEmulatorDeviceConfig("Small_Phone", {
        fridaExecutable: "/data/local/tmp/frida-server-17.17.0-android-arm64",
        extraEmulatorArgs: ["-gpu", "swiftshader_indirect"],
    }),
    Effect.fnUntraced(
        // The early exits return never-typed values; the normal path runs to the end.
        // oxlint-disable-next-line typescript/consistent-return
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
            const androidSdk = yield* Config.string("ANDROID_SDK").pipe(
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
