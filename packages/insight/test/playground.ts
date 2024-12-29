import { NodeContext, NodeRuntime } from "@effect/platform-node";
import { architect, buildImage } from "@shocae/control";
import { Fount } from "@tinyburg/fount";
import { Agents, Frida, Insight } from "@tinyburg/insight";
import { Effect, Function, HashMap, Layer, Logger, LogLevel, Tuple } from "effect";
import { DockerEngine, MobyConnection, MobyConvey } from "the-moby-effect";

const localDocker = Function.pipe(
    MobyConnection.connectionOptionsFromPlatformSystemSocketDefault,
    Effect.map(DockerEngine.layerNodeJS),
    Layer.unwrapEffect
);

Effect.gen(function* () {
    const buildStream = buildImage();
    yield* MobyConvey.followProgressInConsole(buildStream);
    const emulator = yield* architect();

    // const fs = yield* FileSystem.FileSystem;
    const [apkDetails, apkStream] = yield* Fount.loadApk("com.nimblebit.tinytower");
    const apkTarball = MobyConvey.packBuildContextIntoTarballStream(
        HashMap.make(["com.nimblebit.tinytower.apk", Tuple.make(apkDetails.fileSizeBytes, apkStream)])
    );
    yield* emulator.installApk("com.nimblebit.tinytower.apk", apkTarball);

    const FridaDeviceLive = Frida.RemoteDeviceLayer(`host.docker.internal:${emulator.ports.frida}`);
    const agent = yield* Agents.TestingAgents.GoodAgent;
    const result = yield* Effect.provide(Insight.runAgent(agent)("Leo Conforti"), FridaDeviceLive);
    yield* Effect.logInfo(result);
})
    .pipe(Logger.withMinimumLogLevel(LogLevel.Debug))
    .pipe(Effect.scoped)
    .pipe(Effect.provide(NodeContext.layer))
    .pipe(Effect.provide(localDocker))
    .pipe(NodeRuntime.runMain);
