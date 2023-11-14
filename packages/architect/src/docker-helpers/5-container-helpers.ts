import tar from "tar-fs";
import path from "node:path";
import Stream from "node:stream";
import Dockerode from "dockerode";
import { Effect, Schedule } from "effect";
import { DockerError } from "../docker.js";

/** Runs a command in a container and returns immediately after it starts. */
export const runCommandNonBlocking = ({
    container,
    command,
}: {
    container: Dockerode.Container;
    command: string[];
}): Effect.Effect<never, DockerError, void> =>
    Effect.tryPromise({
        try: async () => {
            const exec: Dockerode.Exec = await container.exec({ Cmd: command });
            await exec.start({ Detach: true });
        },
        catch: (error) => new DockerError({ message: `${error}` }),
    });

/** Runs a command in a container and returns the stdout. */
export const runCommandBlocking = ({
    container,
    command,
}: {
    container: Dockerode.Container;
    command: string[];
}): Effect.Effect<never, DockerError, string> =>
    Effect.tryPromise({
        try: async () => {
            const exec: Dockerode.Exec = await container.exec({
                AttachStderr: true,
                AttachStdout: true,
                AttachStdin: false,
                Cmd: command,
            });
            const execStream: Stream.Duplex = await exec.start({ Detach: false });
            return new Promise<string>((resolve, reject) => {
                const data: string[] = [];
                execStream.on("error", (error) => reject(error));
                execStream.on("data", (chunk) => data.push(chunk));
                execStream.on("end", () => resolve(data.join("")));
                execStream.on("close", () => resolve(data.join("")));
            });
        },
        catch: (error) => new DockerError({ message: `${error}` }),
    });

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
    container,
}: {
    apk: string;
    container: Dockerode.Container;
}): Effect.Effect<never, DockerError, void> =>
    Effect.gen(function* (_: Effect.Adapter) {
        const tarball: tar.Pack = tar.pack(path.dirname(apk), { entries: [path.basename(apk)] });
        yield* _(
            Effect.tryPromise({
                try: () => container.putArchive(tarball, { path: "/android/apks/" }),
                catch: (error) => new DockerError({ message: `${error}` }),
            })
        );
        const command: string[] = installApkCommand(`/android/apks/${path.basename(apk)}`);
        const output: string = yield* _(runCommandBlocking({ container, command }));
        if (!output.includes("Success")) yield* _(new DockerError({ message: "Failed to install APK" }));
    });

export const inspectContainer = (
    container: Dockerode.Container
): Effect.Effect<never, DockerError, Dockerode.ContainerInspectInfo> =>
    Effect.tryPromise({
        try: () => container.inspect(),
        catch: (error) => new DockerError({ message: `${error}` }),
    });

/** Determines if a container is healthy or not by polling its status. */
export const isContainerHealthy = (container: Dockerode.Container): Effect.Effect<never, DockerError, boolean> =>
    Effect.tryPromise({
        try: async () => {
            const containerInspect: Dockerode.ContainerInspectInfo = await container.inspect();
            if (!containerInspect.State.Running) throw new Error("Container died prematurely");
            if (containerInspect.State.Health?.Status === "unhealthy")
                throw new Error("Timed out while waiting for container to become healthy");
            return containerInspect.State.Health?.Status === "healthy";
        },
        catch: (error) => new DockerError({ message: `${error}` }),
    });

// Wait for the container to become healthy
export const waitForContainerToBeHealthy = (container: Dockerode.Container): Effect.Effect<never, DockerError, void> =>
    Effect.retry(
        isContainerHealthy(container).pipe(
            Effect.map((isHealthy) => (isHealthy ? Effect.succeed(true) : Effect.fail("")))
        ),
        Schedule.addDelay(Schedule.recurs(45), () => 2000)
    );
