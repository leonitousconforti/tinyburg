import type { Image } from "../../../../image-operations/image.js";
import type { EmulatorControllerClient } from "@tinyburg/architect/protobuf/emulator_controller.client.js";

import { ClickAction } from "../../../click-action.js";
import { GameScreen } from "../../../../global-game-state.js";
import { loadTemplateByName } from "../../../../image-operations/load-template.js";

const menu_raffle: Image = await loadTemplateByName("menu_raffle");

export class OpenRaffle extends ClickAction {
    public constructor(emulatorController: EmulatorControllerClient) {
        super(emulatorController, menu_raffle, GameScreen.Hud, GameScreen.Raffle);
    }
}
