import type { IUpgrade } from "./base-upgrade.js";

import Debug from "debug";
import { NeedsVersion } from "../decorators/needs-version.js";
import { GlobalGameStateHolder } from "../global-game-state.js";
import { EnterLog, ExitLog } from "../decorators/invocation-logs.js";

const debug: Debug.Debugger = Debug("doorman:upgrades:elevator-upgrade");

@NeedsVersion("3.14.6")
export class ElevatorUpgrade implements IUpgrade {
    public readonly logger: Debug.Debugger = debug;

    @ExitLog(debug, { withReturnValue: true })
    public canAfford(): boolean {
        const { upgradeElevatorCost, bux } = GlobalGameStateHolder.getInstance().useGlobalGameState();
        return bux >= upgradeElevatorCost;
    }

    @EnterLog(debug)
    @ExitLog(debug)
    public async doUpgrade(): Promise<void> {
        this.logger("hi mom");
    }
}
