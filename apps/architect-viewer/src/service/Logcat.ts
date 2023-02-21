import { EventEmitter } from "events";
import { GrpcWebFetchTransport } from "@protobuf-ts/grpcweb-transport";

import type { TokenAuthService } from "./Auth";
import { LogMessage } from "../generated/emulator_controller";
import { EmulatorControllerClient, IEmulatorControllerClient } from "../generated/emulator_controller.client";

class Logcat extends EventEmitter {
    private readonly timerId: NodeJS.Timer;
    private readonly emulator: IEmulatorControllerClient;

    private offset: bigint = BigInt(0);

    public constructor(uri: string, auth: TokenAuthService, pollIntervalMs: number = 1000) {
        super();
        const transport = new GrpcWebFetchTransport({
            baseUrl: uri,
            meta: auth.authHeader() as Record<string, string>,
        });
        this.emulator = new EmulatorControllerClient(transport);
        this.timerId = setInterval(this.pollStream, pollIntervalMs);
    }

    private pollStream = async () => {
        const request = LogMessage.create();
        request.start = this.offset;
        try {
            const data = await this.emulator.getLogcat(request).response;
            if (data.next > this.offset) {
                this.offset = data.next;
                this.emit("data", data.contents);
            }
        } catch (error) {
            this.stop(error);
        }
    };

    private stop = (reason: unknown) => {
        this.emit("end", reason);
        clearInterval(this.timerId);
    };
}

export default Logcat;
