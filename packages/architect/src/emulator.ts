import type frida from "frida";

export abstract class Emulator {
    public static includedFridaServer: URL = new URL("../vendor/frida-server-16.0.2-android-arm64", import.meta.url);

    protected readonly name: string;
    protected adbPort: number | undefined;

    public constructor(name: string) {
        this.name = name;
    }

    public getName(): string {
        return this.name;
    }

    // Abstract methods for controlling the emulator
    public abstract create(): Promise<void>;
    public abstract up({
        emulatorConsolePort = 5554,
        emulatorAdbPort = 5555,
        emulatorGrpcPort = 5556,
        fridaServerPort = 27_042,
    }: {
        emulatorConsolePort?: number;
        emulatorAdbPort?: number;
        emulatorGrpcPort?: number;
        fridaServerPort?: number;
    }): Promise<{
        fridaServerAddress: string;
        emulatorAdbAddress: string;
        emulatorGrpcControlAddress: string;
        installApk: (apkLocation: string) => Promise<void>;
        launchGame: (targetFps?: number) => Promise<{ processPid: number; device: frida.Device }>;
        stopGame: () => Promise<void>;
    }>;
    public abstract down(): Promise<void>;
    public abstract destroy(): Promise<void>;
    public abstract isRunning(): Promise<boolean>;
}
