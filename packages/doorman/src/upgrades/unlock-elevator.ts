import type { IUpgrade } from "./base-upgrade.js";
import type { Elevator } from "@tinyburg/nucleus/data/elevators";

import Debug from "debug";
// import { elevators } from "@tinyburg/nucleus/data/elevators";
import { EnterLog } from "../decorators/invocation-logs.js";
import { NeedsVersion } from "../decorators/needs-version.js";

const debug: Debug.Debugger = Debug("doorman:upgrades:unlock-elevator");

@NeedsVersion("3.14.6")
export class UnlockElevator implements IUpgrade {
    // private readonly _elevatorToBuy: Elevator["name"];
    public readonly logger: Debug.Debugger = debug;

    public constructor(_elevatorToBuy: Elevator["name"]) {
        // this._elevatorToBuy = elevatorToBuy;
    }

    @EnterLog(debug)
    public canAfford(): boolean {
        // return elevators.find(({ name }) => name === this._elevatorToBuy)!.buxcost < 10;
        return false;
    }

    public doUpgrade(): Promise<void> {
        throw new Error("Method not implemented.");
    }
}
