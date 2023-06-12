import type { Image } from "../../image-operations/image.js";
import type { EmulatorControllerClient } from "@tinyburg/architect/protobuf/emulator_controller.client.js";

import { ClickAction } from "../click-action.js";
import { GameScreen } from "../../global-game-state.js";
import { loadTemplateByName } from "../../image-operations/load-template.js";

const hud_menu: Image = await loadTemplateByName("hud_menu");

export class OpenHud extends ClickAction {
    public constructor(emulatorClient: EmulatorControllerClient) {
        super(emulatorClient, hud_menu, GameScreen.Tower, GameScreen.Hud);
    }
}
