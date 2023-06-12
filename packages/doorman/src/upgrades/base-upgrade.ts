import type { Debugger } from "debug";

import { EmulatorControllerClient } from "@tinyburg/architect/protobuf/emulator_controller.client.js";

export interface IUpgrade {
    readonly logger: Debugger;
    canAfford(): boolean;
    doUpgrade(client: EmulatorControllerClient): Promise<void>;
}
