import type { PromiseClient } from "@connectrpc/connect";
import type { EmulatorController } from "@tinyburg/architect/protobuf/emulator_controller_connect.js";

import { LogMessage } from "@tinyburg/architect/protobuf/emulator_controller_pb.js";

export class Logcat {
    private readonly _emulatorClient: PromiseClient<typeof EmulatorController>;
    private readonly _onLogcatMessages: (logcatMessages: string[]) => void;

    private _messages: string[] = [];
    private _maxHistory: number = 100;
    private _offset: bigint = BigInt(0);
    private _abortSignal: AbortController | undefined;
    private _stream: AsyncIterable<LogMessage> | undefined;

    public constructor(
        emulatorClient: PromiseClient<typeof EmulatorController>,
        onLogcatMessages: (logcatMessages: string[]) => void
    ) {
        this._emulatorClient = emulatorClient;
        this._onLogcatMessages = onLogcatMessages;
    }

    public startStream = async (): Promise<void> => {
        this._abortSignal = new AbortController();
        const request = new LogMessage({ start: this._offset });
        this._stream = this._emulatorClient.streamLogcat(request, { signal: this._abortSignal.signal });
        for await (const logMessages of this._stream) {
            this._offset = logMessages.next;
            this._messages = [...logMessages.contents.split("\n"), ...this._messages]
                .filter((message) => message !== "")
                .slice(0, this._maxHistory);
            this._onLogcatMessages(this._messages);
        }
    };

    public stopStream = async (): Promise<void> => this._abortSignal?.abort();
}

export default Logcat;
