// For when you just need to rawdog an adb command

import type Dockerode from "dockerode";

/**
 * Given the path to an apk, will install it on the android emulator. Will
 * replace the existing application (if present), will downgrade the version (if
 * supplied a lower version of the application), allows tests packages and will
 * grant all runtime permissions by default.
 */
export const installApkCommand = (apkLocation: string) =>
    [
        "/android/sdk/platform-tools/adb",
        "install",
        "-r", // Replace existing application (if present)
        "-t", // Allow test packages
        "-g", // Grant all runtime permissions
        "-d", // Allow downgrade
        apkLocation,
    ] as const;

/**
 * Will launch the Launcher intent of the com.nimblebit.tinytower application.
 *
 * @see https://stackoverflow.com/questions/4567904/how-to-start-an-application-using-android-adb-tools
 */
export const launchTinyTowerCommand = () =>
    [
        "/android/sdk/platform-tools/adb",
        "shell",
        "monkey",
        "-p",
        "com.nimblebit.tinytower",
        "-c",
        "android.intent.category.LAUNCHER",
        "1",
    ] as const;

/** Runs a command in a container and returns immediately after it starts. */
export const runCommandNonBlocking = async ({
    container,
    command,
}: {
    container: Dockerode.Container;
    command: string[];
}): Promise<void> => {
    const exec = await container.exec({ Cmd: command });
    await exec.start({ Detach: true });
};

/** Runs a command in a container and waits for the specified output. */
export const runCommandBlocking = async ({
    container,
    command,
}: {
    container: Dockerode.Container;
    command: string[];
}): Promise<string> => {
    const exec = await container.exec({
        AttachStderr: true,
        AttachStdout: true,
        AttachStdin: false,
        Cmd: command,
    });
    const execStream = await exec.start({ Detach: false });
    return new Promise<string>((resolve, reject) => {
        const data: string[] = [];
        execStream.on("error", (error) => reject(error));
        execStream.on("data", (chunk) => data.push(chunk));
        execStream.on("end", () => resolve(data.join("")));
        execStream.on("close", () => resolve(data.join("")));
    });
};
