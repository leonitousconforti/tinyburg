import type { Debugger } from "debug";
import type { EmulatorControllerClient } from "../../proto/generated//android/emulation/control/EmulatorController.js";

export interface IUpgrade {
    readonly logger: Debugger;
    canAfford(): boolean;
    doUpgrade(client: EmulatorControllerClient): Promise<void>;
}
