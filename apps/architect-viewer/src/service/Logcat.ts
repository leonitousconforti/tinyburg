import type { ServerStreamingCall } from "@protobuf-ts/runtime-rpc";
import type { IEmulatorControllerClient } from "../generated/emulator_controller.client";

import { LogMessage } from "../generated/emulator_controller";

export class Logcat {
    private readonly emulatorClient: IEmulatorControllerClient;
    private readonly onLogcatMessages: (logcatMessages: string[]) => void;

    private offset: bigint = BigInt(0);
    private stream: ServerStreamingCall<LogMessage, LogMessage> | undefined;

    public constructor(
        emulatorClient: IEmulatorControllerClient,
        onLogcatMessages: (logcatMessages: string[]) => void
    ) {
        this.emulatorClient = emulatorClient;
        this.onLogcatMessages = onLogcatMessages;
    }

    public startStream = async () => {
        const request = LogMessage.create({ start: this.offset });
        this.stream = this.emulatorClient.streamLogcat(request);
        for await (const logMessages of this.stream.responses) {
            this.offset = logMessages.next;
            this.onLogcatMessages(logMessages.contents.split("\n"));
        }
    };

    public stopStream = async () => {
        await this.stream?.trailers;
    };
}

export default Logcat;
