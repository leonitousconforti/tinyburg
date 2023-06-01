import type { ServerStreamingCall, RpcMetadata } from "@protobuf-ts/runtime-rpc";
import type { IEmulatorControllerClient } from "../generated/emulator_controller.client.js";

import { LogMessage } from "../generated/emulator_controller.js";

export class Logcat {
    private readonly _emulatorClient: IEmulatorControllerClient;
    private readonly _onLogcatMessages: (logcatMessages: string[]) => void;

    private _offset: bigint = BigInt(0);
    private _stream: ServerStreamingCall<LogMessage, LogMessage> | undefined;

    public constructor(
        emulatorClient: IEmulatorControllerClient,
        onLogcatMessages: (logcatMessages: string[]) => void
    ) {
        this._emulatorClient = emulatorClient;
        this._onLogcatMessages = onLogcatMessages;
    }

    public startStream = async (): Promise<void> => {
        const request = LogMessage.create({ start: this._offset });
        this._stream = this._emulatorClient.streamLogcat(request);
        for await (const logMessages of this._stream.responses) {
            this._offset = logMessages.next;
            this._onLogcatMessages(logMessages.contents.split("\n"));
        }
    };

    public stopStream = async (): Promise<RpcMetadata | undefined> => this._stream?.trailers;
}

export default Logcat;
