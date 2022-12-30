import { CloseHud } from "../hud/close.js";
import { BaseAction } from "../base-action.js";
import { GameScreen } from "../../global-game-state.js";

export class CloseMission extends BaseAction {
    public override async do(): Promise<boolean> {
        return new CloseHud(this.emulatorClient, GameScreen.Mission, GameScreen.Tower).do();
    }
}
