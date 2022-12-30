import type { EmulatorControllerClient } from "../../../../../proto/generated/android/emulation/control/EmulatorController.js";

import { CloseHud } from "../../close.js";
import { GameScreen } from "../../../../global-game-state.js";

export class CLoseRebuild extends CloseHud {
    public constructor(emulatorClient: EmulatorControllerClient) {
        super(emulatorClient, GameScreen.Rebuild, GameScreen.Hud);
    }
}
