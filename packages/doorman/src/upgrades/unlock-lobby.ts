import type { IUpgrade } from "./base-upgrade.js";
import type { Lobby } from "@tinyburg/core/data/floors";

import Debug from "debug";
import { floors } from "@tinyburg/core/data/floors";
import { NeedsVersion } from "../decorators/needs-version.js";

const debug: Debug.Debugger = Debug("doorman:upgrades:unlock-lobby");

@NeedsVersion("3.14.6")
export class UnlockLobby implements IUpgrade {
    private readonly _lobbyToBuy: Lobby["name"];
    public readonly logger: Debug.Debugger = debug;

    public constructor(lobbyToBuy: Lobby["name"]) {
        this._lobbyToBuy = lobbyToBuy;
    }

    public canAfford(): boolean {
        return (floors.find(({ name }) => name === this._lobbyToBuy) as Lobby).buxcost < 10;
    }

    public doUpgrade(): Promise<void> {
        throw new Error("Method not implemented.");
    }
}
