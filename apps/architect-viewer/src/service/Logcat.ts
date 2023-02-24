import EventEmitter from "events";

import { LogMessage } from "../generated/emulator_controller";
import type { IEmulatorControllerClient } from "../generated/emulator_controller.client";

class Logcat extends EventEmitter {
    private readonly timerId: NodeJS.Timer;
    private readonly emulator: IEmulatorControllerClient;

    private offset: bigint = BigInt(0);

    public constructor(emulator: IEmulatorControllerClient, pollIntervalMs: number = 1000) {
        super();
        this.emulator = emulator;
        this.timerId = setInterval(this.pollStream, pollIntervalMs);
    }

    private pollStream = async () => {
        const request = LogMessage.create();
        request.start = this.offset;
        try {
            const data2 = await this.emulator.getStatus({}).response;
            console.log(data2);

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
