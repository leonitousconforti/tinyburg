import os from "node:os";
import path from "node:path";
import util from "node:util";
import fs from "node:fs/promises";
import cp from "node:child_process";

import Debug from "debug";
import frida from "frida";

import { loadCommand } from "../commands/load-command.js";
import { Emulator, defaultFridaServerBinary } from "./emulator.js";

const logger: Debug.Debugger = Debug.debug("tinyburg:architect:local");

export class LocalEmulator extends Emulator {
    /**
     * Create an emulator on the local machine using the android command line
     * tools. First installs our custom emulator device definition, then
     * installs the emulator system image to use, and finally creates an
     * emulator using the system image that was just installed and our custom
     * device definition.
     *
     * @param forceCreate - Force create the emulator even if it already exists
     */
    public async create(forceCreate: boolean = false): Promise<void> {
        logger("Creating emulator %s using android sdk", this.name);
        const forceCreateEmulator = forceCreate ? "--force" : "";

        // Where the users android device definitions are located
        const userAndroidDevicesFile = path.join(os.homedir(), ".android/devices.xml");

        // Where our custom android device definition file is
        const architectAndroidDeviceFile = new URL("../device.xml", import.meta.url);

        /**
         * There is no way (that I am aware of after doing some research) to add
         * a device definition from the command line. All device definitions for
         * the android emulator are defined in a single file located in the
         * users home directory. This checks if that file exists and if the
         * contents of the users android device definitions does not match our
         * device definition file. If it doesn't match, we will make a backup of
         * the users configuration before overwriting the file with our own.
         */
        try {
            // Check if user has defined custom android emulator device definitions
            logger("Checking if there is already a custom android emulator device definition file");
            await fs.access(userAndroidDevicesFile, fs.constants.W_OK || fs.constants.R_OK);

            // They have (because promise didn't reject), so compare if it is just ours
            logger("There is, checking if the contents is just our device definition or if there is more");
            const usersAndroidEmulatorDefinitions = await fs.readFile(userAndroidDevicesFile);
            const ourAndroidEmulatorDefinitions = await fs.readFile(architectAndroidDeviceFile);

            // If the users definitions are not just our definition, make a backup for them
            if (usersAndroidEmulatorDefinitions.equals(ourAndroidEmulatorDefinitions)) {
                logger("User has defined custom android emulator device definitions, making a backup for them");
                await fs.rename(userAndroidDevicesFile, userAndroidDevicesFile + ".backup");
            } else {
                logger("User has not defined custom android emulator device definitions, it was just our definition");
            }

            // User has not defined any custom android emulator device definitions
        } catch {
            logger("User has not created any custom android emulator device definitions");
        }

        await fs.copyFile(architectAndroidDeviceFile, userAndroidDevicesFile);
        await this._runCommandLocally("installSystemImage");
        await this._runCommandLocally("createEmulator", this.name, forceCreateEmulator);
    }

    /**
     * Destroys the emulator on the local machine and erases all data associated
     * with it. Will need to need to be recreated with create to use again.
     */
    public async destroy(): Promise<void> {
        logger("Destroying emulator %s", this.name);
        if (await this.isRunning()) {
            throw new Error("Can not destroy emulator that is running");
        }
        await this._runCommandLocally("deleteEmulator");
    }

    /**
     * Brings down an emulator on the local machine. Can be resumed by calling
     * up again. Does not destroy any data, just stops the emulator process. The
     * user is responsible for calling stopGame before calling down.
     */
    public async down(): Promise<void> {
        logger("Bringing down emulator %s", this.name);

        if ((await this.isRunning()) === false) {
            throw new Error("Can not bring down emulator that is not running");
        }
        await this._runCommandLocally("stopEmulator", `emulator-${5554}`);
    }

    /**
     * Brings up an emulator on the local machine and exposes functions to the
     * user to manage the emulator. Does not create emulator, just starts the
     * emulator process.
     */
    public async up(): Promise<{
        fridaServerAddress: string;
        emulatorGrpcControlAddress: string;
        emulatorAdbAddress: string;
        installApk: (apkLocation: string) => Promise<void>;
        launchGame: () => Promise<{ processPid: number; device: frida.Device }>;
        stopGame: () => Promise<void>;
    }> {
        if (await this.isRunning()) {
            throw new Error("Emulator is already started");
        }

        await this._runCommandLocally("startEmulator", this.name, this.consolePort, this.adbPort, this.grpcPort, "");
        await this._runCommandLocally("startAdbServer");
        await this._runCommandLocally("connectToEmulator", `localhost:${this.adbPort}`);
        await this._runCommandLocally("waitForEmulator");
        await this._runCommandLocally("rootEmulator");
        await this._runCommandLocally("pushFridaServer", defaultFridaServerBinary);
        await this._runCommandLocally("configureFridaServer");
        await this._runCommandLocally("startFridaServer");
        await this._runCommandLocally("forwardPort", this.fridaServerPort);

        let device: frida.Device | undefined;
        const emulatorAdbAddress = `localhost:${this.adbPort}`;
        const fridaServerAddress = `localhost:${this.fridaServerPort}`;
        const emulatorGrpcControlAddress = `localhost:${this.grpcPort}`;

        const installApk = async (apkLocation: string): Promise<void> => {
            await this._runCommandLocally("connectToEmulator", emulatorAdbAddress);
            await this._runCommandLocally("installApk", apkLocation);
        };

        const launchGame = async (): Promise<{ processPid: number; device: frida.Device }> => {
            const deviceManager = frida.getDeviceManager();
            device = await deviceManager.addRemoteDevice(fridaServerAddress);
            const pid: number = await device.spawn("com.nimblebit.tinytower");
            await device.resume(pid);
            return { processPid: pid, device };
        };

        const stopGame = async (): Promise<void> => await device?.kill("com.nimblebit.tinytower");

        return {
            fridaServerAddress,
            emulatorAdbAddress,
            emulatorGrpcControlAddress,
            installApk,
            launchGame,
            stopGame,
        };
    }

    /**
     * Checks if this emulator is currently running/launched. Does not guarantee
     * that any apk's are installed or that TinyTower is launched.
     */
    public async isRunning(): Promise<boolean> {
        return false;
    }

    private async _runCommandLocally(
        command: Parameters<typeof loadCommand>[0],
        ...commandArguments: unknown[]
    ): Promise<cp.ChildProcess> {
        const script = await loadCommand(command);
        const formatted = util.format(script, ...commandArguments);

        return new Promise((resolve, reject) => {
            const proc = cp.spawn(formatted, { shell: true });

            proc.stdout.on("data", (data) => {
                console.log(data);
            });

            proc.stderr.on("data", (data) => {
                console.log(data);
            });

            proc.on("error", (error) => {
                return reject(error);
            });

            proc.on("close", () => {
                return resolve(proc);
            });

            // This command is meant to run in the background
            if (formatted.endsWith("&")) {
                return resolve(proc);
            }
        });
    }
}

export default LocalEmulator;
