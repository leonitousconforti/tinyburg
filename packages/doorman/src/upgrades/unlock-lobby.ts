import type { IUpgrade } from "./base-upgrade.js";
import type { Floor } from "@tinyburg/nucleus/data/floors";

import Debug from "debug";
// import { floors } from "@tinyburg/core/data/floors";
import { NeedsVersion } from "../decorators/needs-version.js";

const debug: Debug.Debugger = Debug("doorman:upgrades:unlock-lobby");

@NeedsVersion("3.14.6")
export class UnlockLobby implements IUpgrade {
    private readonly _lobbyToBuy: Floor["name"];
    public readonly logger: Debug.Debugger = debug;

    public constructor(lobbyToBuy: Floor["name"]) {
        this._lobbyToBuy = lobbyToBuy;
    }

    public canAfford(): boolean {
        // return (floors.find(({ name }) => name === this._lobbyToBuy) as Floor).buxcost < 10;
        console.log(this._lobbyToBuy);
        return false;
    }

    public doUpgrade(): Promise<void> {
        throw new Error("Method not implemented.");
    }
}
