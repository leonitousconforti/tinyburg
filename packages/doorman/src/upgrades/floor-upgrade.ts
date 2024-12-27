import type { IUpgrade } from "./base-upgrade.js";

import Debug from "debug";
import { NeedsVersion } from "../decorators/needs-version.js";
import { GlobalGameStateHolder } from "../global-game-state.js";

const debug: Debug.Debugger = Debug("doorman:upgrades:floor-upgrade");

@NeedsVersion("3.14.6")
export class FloorUpgrade implements IUpgrade {
    private readonly _floorNumber: number;
    public readonly logger: Debug.Debugger = debug;

    public constructor(floorNumber: number) {
        this._floorNumber = floorNumber;
    }

    public canAfford(): boolean {
        const { floors, coins } = GlobalGameStateHolder.getInstance().useGlobalGameState();
        if (this._floorNumber > floors) {
            return false;
        }
        return coins > 10_000;
    }

    public async doUpgrade(): Promise<void> {
        this.logger("hi mom %s", this._floorNumber);
    }
}
