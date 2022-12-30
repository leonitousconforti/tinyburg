import type { Image } from "../../../../image-operations/image.js";
import type { EmulatorControllerClient } from "../../../../../proto/generated/android/emulation/control/EmulatorController.js";

import { ClickAction } from "../../../click-action.js";
import { GameScreen } from "../../../../global-game-state.js";
import { loadTemplateByName } from "../../../../image-operations/load-template.js";

const menu_bitizen: Image = await loadTemplateByName("menu_bitbuilder");

export class OpenBitizens extends ClickAction {
    public constructor(emulatorClient: EmulatorControllerClient) {
        super(emulatorClient, menu_bitizen, GameScreen.Hud, GameScreen.Bitizens);
    }
}
