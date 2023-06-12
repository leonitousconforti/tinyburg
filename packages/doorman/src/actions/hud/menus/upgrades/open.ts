import type { Image } from "../../../../image-operations/image.js";
import type { EmulatorControllerClient } from "@tinyburg/architect/protobuf/emulator_controller.client.js";

import { ClickAction } from "../../../click-action.js";
import { GameScreen } from "../../../../global-game-state.js";
import { loadTemplateByName } from "../../../../image-operations/load-template.js";

const menu_upgrades: Image = await loadTemplateByName("menu_elevator1");

export class OpenUpgrades extends ClickAction {
    public constructor(emulatorClient: EmulatorControllerClient) {
        super(emulatorClient, menu_upgrades, GameScreen.Hud, GameScreen.Upgrades);
    }
}
