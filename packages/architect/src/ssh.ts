import "ssh2";
import type frida from "frida";

import { Emulator } from "./emulator.js";

export class SshEmulator extends Emulator {
    private readonly _address: string;

    public constructor(name: string, address: string) {
        super(name);
        this._address = address;
    }

    public getAddress(): string {
        return this._address;
    }

    public create(): Promise<void> {
        throw new Error("Method not implemented.");
    }

    public up(): Promise<{
        fridaServerAddress: string;
        emulatorGrpcControlAddress: string;
        emulatorAdbAddress: string;
        installApk: (apkLocation: string) => Promise<void>;
        launchGame: () => Promise<{ processPid: number; device: frida.Device }>;
        stopGame: () => Promise<void>;
    }> {
        throw new Error("Method not implemented.");
    }

    public down(): Promise<void> {
        throw new Error("Method not implemented.");
    }

    public destroy(): Promise<void> {
        throw new Error("Method not implemented.");
    }

    public isRunning(): Promise<boolean> {
        throw new Error("Method not implemented.");
    }
}
