import type { EncodingError } from "effect/encoding";

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
import { FetchHttpClient, type HttpClient, type HttpClientError } from "effect/http";
import { ChildProcess, ChildProcessSpawner } from "effect/process";
import { type RpcClient, RpcSerialization } from "effect/rpc";

import {
    FridaDevice,
    FridaDeviceAcquisitionError,
    FridaScript,
    FridaSession,
    type FridaSessionError,
} from "@efffrida/frida-tools";
import { AndroidDevice, GooglePlayApi, PlayAccount } from "@efffrida/gplayapi";
import { FridaRpcClient } from "@efffrida/rpc/node";
import { JsPlatform, Realm } from "frida";

const ProtocolLive = Layer.provide(FridaRpcClient.layerProtocolFrida(), RpcSerialization.layerNdjson);

/**
 * Starts the game and loads `agent` into it, with an RPC protocol to call the
 * agent over. The games ship only ARM libraries, which the x86_64 emulator
 * runs through Android's ARM translation, so the agent attaches in the
 * emulated realm, where that ARM code (libil2cpp.so among it) lives.
 *
 * @since 1.0.0
 * @category Agent
 */
export const layerAgent = (
    bundleIdentifier: string,
    agent: URL
): Layer.Layer<
    FridaScript.FridaScript | FridaSession.FridaSession | RpcClient.Protocol,
    FridaSessionError.FridaSessionError,
    FridaDevice.FridaDevice
> =>
    Layer.provideMerge(
        ProtocolLive,
        Layer.provideMerge(
            FridaScript.layer(agent, { platform: JsPlatform.Browser }),
            FridaSession.layer(bundleIdentifier, { realm: Realm.Emulated })
        )
    );

/**
 * Like {@link layerAgent}, but reloads `agent` and reruns `effect` each time
 * the agent's source changes.
 *
 * @since 1.0.0
 * @category Agent
 */
export const watchAgent = <A, E, R>(
    bundleIdentifier: string,
    agent: URL,
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
        agent,
        { platform: JsPlatform.Browser }
    ).pipe(Stream.provide(FridaSession.layer(bundleIdentifier, { realm: Realm.Emulated })), FridaScript.logWatchErrors);

/**
 * What {@link layerDevice} needs to download a game from Google Play: an
 * anonymous account from Aurora Store's dispenser, so no Google credentials
 * are needed. The hosted dispenser refuses datacenter ip ranges.
 *
 * @since 1.0.0
 * @category Frida
 */
export const layerPlay = Layer.mergeAll(AndroidDevice.layerEmbeddedPixel7a, PlayAccount.layerAuroraDispenser()).pipe(
    Layer.provideMerge(FetchHttpClient.layer)
);

const Emulator = FridaDevice.layerAndroidEmulatorDeviceConfig("Small_Phone", {
    fridaExecutable: "/data/local/tmp/frida-server",
    extraEmulatorArgs: ["-gpu", "swiftshader_indirect", "-no-metrics"],
    hidden: true,
});

/**
 * Boots the `Small_Phone` emulator and installs the given game on it, from
 * Google Play or from APK files already downloaded.
 *
 * @since 1.0.0
 * @category Frida
 */
export const layerDevice = (
    bundleIdentifier: string,
    options?: { readonly apks?: ReadonlyArray<string> | undefined }
): Layer.Layer<
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
> =>
    Layer.tap(
        // Booting right after another emulator shut down sometimes fails at
        // `adb root`, and a second boot then works, so it gets one retry
        Layer.catchTag(Emulator, "FridaDeviceAcquisitionError", () => Layer.fresh(Emulator)),
        Effect.fnUntraced(
            function* (deviceCtx: Context.Context<FridaDevice.FridaDevice>) {
                const path = yield* Path.Path;

                const device = Context.get(deviceCtx, FridaDevice.FridaDevice);
                const emulatorName = String.replace("android-emulator://", "")(device.host);
                const childProcessSpawner = yield* ChildProcessSpawner.ChildProcessSpawner;
                const apks =
                    options?.apks ?? (yield* GooglePlayApi.downloadToDisk(bundleIdentifier)).map((apk) => apk.file);

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
                    ...apks,
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
