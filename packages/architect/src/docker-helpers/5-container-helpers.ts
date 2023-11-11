import tar from "tar-fs";
import path from "node:path";
import Stream from "node:stream";
import Dockerode from "dockerode";

/** Runs a command in a container and returns immediately after it starts. */
export const runCommandNonBlocking = async ({
    container,
    command,
}: {
    container: Dockerode.Container;
    command: string[];
}): Promise<void> => {
    const exec: Dockerode.Exec = await container.exec({ Cmd: command });
    await exec.start({ Detach: true });
};

/** Runs a command in a container and returns the stdout. */
export const runCommandBlocking = async ({
    container,
    command,
}: {
    container: Dockerode.Container;
    command: string[];
}): Promise<string> => {
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
};

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
export const installApk = async ({
    apk,
    container,
}: {
    apk: string;
    container: Dockerode.Container;
}): Promise<void> => {
    const tarball: tar.Pack = tar.pack(path.dirname(apk), { entries: [path.basename(apk)] });
    await container.putArchive(tarball, { path: "/android/apks/" });
    const command: string[] = installApkCommand(`/android/apks/${path.basename(apk)}`);
    const output: string = await runCommandBlocking({ container, command });
    if (!output.includes("Success")) throw new Error("Failed to install APK");
};

/** Determines if a container is healthy or not by polling its status. */
export const isContainerHealthy = async ({ container }: { container: Dockerode.Container }): Promise<boolean> => {
    const containerInspect: Dockerode.ContainerInspectInfo = await container.inspect();
    // logger("Waiting for container to report it is healthy, status=%s", containerInspect.State.Health?.Status);
    if (!containerInspect.State.Running) throw new Error("Container died prematurely");
    if (containerInspect.State.Health?.Status === "unhealthy")
        throw new Error("Timed out while waiting for container to become healthy");
    return containerInspect.State.Health?.Status === "healthy";
};

export default { isContainerHealthy, installApk };
