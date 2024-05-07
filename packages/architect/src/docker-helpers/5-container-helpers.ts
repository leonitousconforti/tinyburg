import * as path from "node:path";
import * as tar from "tar-fs";

import * as Socket from "@effect/platform/Socket";
import * as Chunk from "effect/Chunk";
import * as Effect from "effect/Effect";
import * as Sink from "effect/Sink";
import * as Stream from "effect/Stream";
import * as Containers from "the-moby-effect/Containers";
import * as Demux from "the-moby-effect/Demux";
import * as Execs from "the-moby-effect/Execs";
import * as MobySchemas from "the-moby-effect/Schemas";

/** Runs a command in a container and returns immediately after. */
export const execNonBlocking = ({
    containerId,
    command,
}: {
    containerId: string;
    command: string[];
}): Effect.Effect<void, Execs.ExecsError, Execs.Execs> =>
    Effect.gen(function* () {
        const execs: Execs.Execs = yield* Execs.Execs;
        const execId: Readonly<MobySchemas.IdResponse> = yield* execs.container({
            id: containerId,
            execConfig: {
                AttachStderr: true,
                AttachStdout: true,
                AttachStdin: false,
                Cmd: command,
            },
        });
        yield* execs.start({ id: execId.Id, execStartConfig: { Detach: true } });
    });

/** Runs a command in a container and returns the stdout. */
export const execBlocking = ({
    containerId,
    command,
}: {
    containerId: string;
    command: string[];
}): Effect.Effect<string, Execs.ExecsError | Socket.SocketError, Execs.Execs> =>
    Effect.gen(function* () {
        const execs: Execs.Execs = yield* Execs.Execs;
        const execId: Readonly<MobySchemas.IdResponse> = yield* execs.container({
            id: containerId,
            execConfig: {
                AttachStderr: true,
                AttachStdout: true,
                AttachStdin: false,
                Cmd: command,
            },
        });
        const stream: Demux.MultiplexedStreamSocket | Demux.RawStreamSocket = yield* execs.start({
            id: execId.Id,
            execStartConfig: { Detach: false },
        });
        if (stream["content-type"] === "application/vnd.docker.raw-stream") {
            const chunks: Chunk.Chunk<string> = yield* Demux.demuxSocket(stream, Stream.never, Sink.collectAll());
            return Chunk.join("")(chunks);
        } else {
            const [stdout, stderr] = yield* Demux.demuxSocket(
                stream,
                Stream.never,
                Sink.collectAll(),
                Sink.collectAll()
            );
            return Chunk.appendAll(stdout, stderr).pipe(Chunk.join(""));
        }
    }).pipe(Effect.scoped);

/**
 * Given the path to an apk, will install it on the android emulator. Will
 * replace the existing application (if present), will downgrade the version (if
 * supplied a lower version of the application), allows tests packages and will
 * grant all runtime permissions by default.
 */
export const installApkCommand = (apkLocation: string): string[] => [
    "/android/sdk/platform-tools/adb",
    "install",
    "-r", // Replace existing application (if present)
    "-t", // Allow test packages
    "-g", // Grant all runtime permissions
    "-d", // Allow downgrade
    apkLocation,
];

/**
 * Installs an apk into an architect container by packing the apk in a tarball
 * and asking docker to place the tarball inside the container. Docker will
 * unpack the tarball for us when we place it. Then we run the install apk
 * command inside the container blocking until it is done. We check the output
 * of the command to make sure that is completed successfully.
 */
export const installApk = ({
    apk,
    containerId,
}: {
    apk: string;
    containerId: string;
}): Effect.Effect<
    void,
    Socket.SocketError | Execs.ExecsError | Containers.ContainersError,
    Execs.Execs | Containers.Containers
> =>
    Effect.gen(function* () {
        const containers: Containers.Containers = yield* Containers.Containers;
        yield* Effect.log(`Installing apk ${apk}`);
        yield* containers.putArchive({
            id: containerId,
            path: "/android/apks/",
            stream: Stream.fromAsyncIterable(
                tar.pack(path.dirname(apk), { entries: [path.basename(apk)] }),
                () =>
                    new Containers.ContainersError({
                        method: "putArchiveStream",
                        message: "error packing the put archive",
                    })
            ),
        });
        const command: string[] = installApkCommand(`/android/apks/${path.basename(apk)}`);
        const output: string = yield* execBlocking({ containerId, command });
        if (!output.includes("Success"))
            yield* new Execs.ExecsError({ message: `Failed to install apk: ${output}`, method: "installApk" });
        yield* Effect.log("Done installing apk");
    }).pipe(Effect.withLogSpan("installAPk"));
