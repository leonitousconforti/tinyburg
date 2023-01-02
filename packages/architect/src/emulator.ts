import type frida from "frida";

import { fileURLToPath } from "node:url";

export interface IEmulatorOptions {
    emulatorAdbPort: number;
    emulatorGrpcPort: number;
    emulatorConsolePort: number;
    fridaServerPort: number;
    fridaServerBinary: string;
}

/* eslint-disable @rushstack/typedef-var */
export const defaultEmulatorAdbPort = 5555 as const;
export const defaultEmulatorGrpcPort = 8554 as const;
export const defaultFridaServerPort = 27_042 as const;
export const defaultEmulatorConsolePort = 5554 as const;
export const defaultFridaServerBinary = fileURLToPath(
    new URL("../vendor/frida-server-16.0.2-android-arm64", import.meta.url)
);
/* eslint-enable @rushstack/typedef-var */

export abstract class Emulator {
    protected readonly name: string;

    protected readonly adbPort: number;
    protected readonly grpcPort: number;
    protected readonly consolePort: number;
    protected readonly fridaServerPort: number;
    protected readonly fridaServerBinary: string;

    public constructor(name: string, options: Partial<IEmulatorOptions> = {}) {
        this.name = name;
        this.adbPort = options?.emulatorAdbPort || defaultEmulatorAdbPort;
        this.grpcPort = options?.emulatorGrpcPort || defaultEmulatorGrpcPort;
        this.consolePort = options?.emulatorConsolePort || defaultEmulatorConsolePort;
        this.fridaServerPort = options?.fridaServerPort || defaultFridaServerPort;
        this.fridaServerBinary = options?.fridaServerBinary || defaultFridaServerBinary;
    }

    public getName(): string {
        return this.name;
    }

    public getOptions = (): IEmulatorOptions => ({
        emulatorAdbPort: this.adbPort,
        emulatorGrpcPort: this.grpcPort,
        emulatorConsolePort: this.consolePort,
        fridaServerPort: this.fridaServerPort,
        fridaServerBinary: this.fridaServerBinary,
    });

    // Abstract methods for controlling the emulator
    public abstract create(): Promise<void>;
    public abstract up(): Promise<{
        fridaServerAddress: string;
        emulatorAdbAddress: string;
        emulatorGrpcControlAddress: string;
        installApk: (apkLocation: string) => Promise<void>;
        launchGame: () => Promise<{ processPid: number; device: frida.Device }>;
        stopGame: () => Promise<void>;
    }>;
    public abstract down(): Promise<void>;
    public abstract destroy(): Promise<void>;
    public abstract isRunning(): Promise<boolean>;
}

export default Emulator;
