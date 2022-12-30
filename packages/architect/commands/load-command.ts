import { readFile } from "node:fs/promises";

export const loadCommand = (
    command:
        | "configureFridaServer"
        | "connectToEmulator"
        | "createEmulator"
        | "deleteEmulator"
        | "forwardPort"
        | "installApk"
        | "installSystemImage"
        | "pushFridaServer"
        | "rootEmulator"
        | "runningEmulators"
        | "startAdbServer"
        | "startEmulator"
        | "startFridaServer"
        | "stopEmulator"
        | "uninstallApk"
        | "waitForEmulator"
): Promise<string> => readFile(new URL(`${command}`, import.meta.url), { encoding: "utf8" });
