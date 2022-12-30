import fs from "node:fs";
import frida from "frida";
import path from "node:path";
import { homedir } from "node:os";
import { format } from "node:util";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { copyFile } from "node:fs/promises";

import { Emulator } from "./emulator.js";
import { loadCommand } from "../commands/load-command.js";

export class LocalEmulator extends Emulator {
    /**
     * Create an emulator on the local machine using the android sdk. First
     * installs our custom emulator device definition, then installs the
     * emulator system image to use, and finally creates an emulator using the
     * system image that was just installed and our custom device definition.
     *
     * @param forceCreate - Force create the emulator even if it already exists
     */
    public async create(forceCreate: boolean = false): Promise<void> {
        const forceCreateEmulator = forceCreate ? "--force" : "";

        // Where the users android device definitions are located
        const userAndroidDevicesFile = path.join(homedir(), ".android/devices.xml");

        // Where our custom android device definition file is
        const architectAndroidDeviceFile = new URL("../device.xml", import.meta.url);

        // There is no way (that I am aware of after doing extensive research)
        // to add a device definition from the command line. All device
        // definitions for the android emulator are defined in a single file
        // located in the users home directory. This checks if that file exists
        // and if the contents of the users android device definitions does not
        // match our device definition file. If it doesn't match, we will make a
        // backup of the users configuration before overwriting the file with
        // our own.
        if (
            fs.existsSync(userAndroidDevicesFile) &&
            !fs.readFileSync(userAndroidDevicesFile).equals(fs.readFileSync(architectAndroidDeviceFile))
        ) {
            fs.renameSync(userAndroidDevicesFile, userAndroidDevicesFile + ".backup");
        }

        await copyFile(architectAndroidDeviceFile, userAndroidDevicesFile);
        await this._runCommandLocally("installSystemImage");
        await this._runCommandLocally("createEmulator", this.name, forceCreateEmulator);
    }

    /**
     * Destroys the emulator on the local machine and erases all data associated
     * with it. Will need to need to be recreated with create to use again.
     */
    public async destroy(): Promise<void> {
        if (await this.isRunning()) {
            throw new Error("Can not destroy emulator that is running");
        }
        await this._runCommandLocally("deleteEmulator");
    }

    /**
     * Brings down an emulator on the local machine. Can be resumed by calling
     * up again. Does not destroy any data. The user is responsible for calling
     * stopGame before calling down.
     */
    public async down(): Promise<void> {
        await this._runCommandLocally("stopEmulator", `emulator-${5554}`);
    }

    /**
     * Brings up an emulator on the local machine and exposes functions to the
     * user to manage the emulator. All params are optional and have default
     * values that will work if you are only running one emulator per machine.
     *
     * @param param0 - Asdf
     * @returns
     */
    public async up({
        emulatorConsolePort = 5554,
        emulatorAdbPort = 5555,
        emulatorGrpcPort = 5556,
        fridaServerPort = 27_042,
        showEmulatorWindow = true,
    }: {
        emulatorConsolePort?: number;
        emulatorAdbPort?: number;
        emulatorGrpcPort?: number;
        fridaServerPort?: number;
        showEmulatorWindow?: boolean;
    }): Promise<{
        fridaServerAddress: string;
        emulatorGrpcControlAddress: string;
        emulatorAdbAddress: string;
        installApk: (apkLocation: string) => Promise<void>;
        launchGame: (targetFps?: number) => Promise<{ processPid: number; device: frida.Device }>;
        stopGame: () => Promise<void>;
    }> {
        if (await this.isRunning()) {
            throw new Error("Emulator is already started");
        }

        await this._runCommandLocally(
            "startEmulator",
            this.name,
            emulatorConsolePort,
            emulatorAdbPort,
            emulatorGrpcPort,
            showEmulatorWindow ? "" : "-no-window"
        );
        await this._runCommandLocally("startAdbServer");
        await this._runCommandLocally("connectToEmulator", `localhost:${emulatorAdbPort}`);
        await this._runCommandLocally("waitForEmulator");
        await this._runCommandLocally("rootEmulator");
        await this._runCommandLocally("pushFridaServer", fileURLToPath(Emulator.includedFridaServer));
        await this._runCommandLocally("configureFridaServer");
        await this._runCommandLocally("startFridaServer");
        await this._runCommandLocally("forwardPort", fridaServerPort);

        let device: frida.Device | undefined;
        const fridaServerAddress = `localhost:${fridaServerPort}`;
        const emulatorAdbAddress = `localhost:${emulatorAdbPort}`;
        const emulatorGrpcControlAddress = `localhost:${emulatorGrpcPort}`;

        const installApk = async (apkLocation: string): Promise<void> => {
            await this._runCommandLocally("connectToEmulator", `localhost:${emulatorAdbPort}`);
            await this._runCommandLocally("installApk", apkLocation);
        };
        const launchGame = async (): Promise<{ processPid: number; device: frida.Device }> => {
            const deviceManager = frida.getDeviceManager();
            device = await deviceManager.addRemoteDevice(`localhost:${emulatorAdbPort}`);
            const pid: number = await device.spawn("com.nimblebit.tinytower");
            await device.resume(pid);
            return { processPid: pid, device };
        };
        const stopGame = async (): Promise<void> => {
            if (device) {
                await device.kill("com.nimblebit.tinytower");
            }
        };

        return {
            fridaServerAddress,
            emulatorAdbAddress,
            emulatorGrpcControlAddress,
            installApk,
            launchGame,
            stopGame,
        };
    }

    public async isRunning(): Promise<boolean> {
        return false;
    }

    private async _runCommandLocally(
        command: Parameters<typeof loadCommand>[0],
        ...commandArguments: unknown[]
    ): Promise<void> {
        const logFile = `local-${this.name}-${command}.log`;
        const script = await loadCommand(command);
        const formatted = format(script, ...commandArguments);

        return new Promise((resolve, reject) => {
            const proc = spawn(formatted, {
                shell: true,
                stdio: [
                    "ignore",
                    fs.openSync(fileURLToPath(new URL(`../logs/${logFile}`, import.meta.url)), "a"),
                    fs.openSync(fileURLToPath(new URL(`../logs/${logFile}`, import.meta.url)), "a"),
                ],
            });

            proc.on("error", (error) => {
                return reject(error);
            });

            proc.on("close", () => {
                return resolve();
            });

            // This command is meant to run in the background
            if (formatted.endsWith("&")) {
                return resolve();
            }
        });
    }
}
