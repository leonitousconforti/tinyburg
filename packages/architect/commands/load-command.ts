import { readFile } from "node:fs/promises";

type Command =
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
    | "waitForEmulator";

export const loadCommand = (command: Command): Promise<string> =>
    readFile(new URL(`${command}`, import.meta.url), { encoding: "utf8" });

export default loadCommand;
