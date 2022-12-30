import "ssh2";

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
        processPid: number;
        fridaServerAddress: string;
        emulatorGrpcControlAddress: string;
        emulatorAdbAddress: string;
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
