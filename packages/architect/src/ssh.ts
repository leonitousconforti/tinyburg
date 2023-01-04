import type frida from "frida";

import util from "node:util";
import ssh2, { Client } from "ssh2";
import { Emulator } from "./emulator.js";
import { loadCommand } from "../commands/load-command.js";

export class SshEmulator extends Emulator {
    private readonly _connection: ssh2.Client;
    private readonly _connectionOptions: ssh2.ConnectConfig;

    public constructor(name: string, connectionOptions: ssh2.ConnectConfig) {
        super(name);
        this._connection = new Client();
        this._connectionOptions = connectionOptions;
    }

    public getConnectionOptions(): ssh2.ConnectConfig {
        return this._connectionOptions;
    }

    protected async connect(): Promise<void> {
        return new Promise((resolve) => {
            this._connection.connect(this._connectionOptions);
            this._connection.on("ready", () => resolve());
        });
    }

    protected async sendCommand(
        command: Parameters<typeof loadCommand>[0],
        ...commandArguments: unknown[]
    ): Promise<void> {
        const script = await loadCommand(command);
        const formatted = util.format(script, ...commandArguments);

        return new Promise((resolve, reject) => {
            this._connection.exec(formatted, () => {
                resolve();
            });
        });
    }

    public async create(): Promise<void> {
        await this.connect();
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
