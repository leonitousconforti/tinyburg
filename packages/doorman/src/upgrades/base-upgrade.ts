import type { Debugger } from "debug";
import type { PromiseClient } from "@connectrpc/connect";
import type { EmulatorController } from "@tinyburg/architect/protobuf/emulator_controller_connect";

export interface IUpgrade {
    readonly logger: Debugger;
    canAfford(): boolean;
    doUpgrade(client: PromiseClient<typeof EmulatorController>): Promise<void>;
}
