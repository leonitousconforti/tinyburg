import type { Image } from "../../../../image-operations/image.js";
import type { EmulatorControllerClient } from "@tinyburg/architect/protobuf/emulator_controller.client.js";

import { ClickActionTemplateMatching } from "../../../click-action.js";
import { GameScreen } from "../../../../global-game-state.js";
import { loadTemplateByName } from "../../../../image-operations/load-template.js";

const menu_settings: Image = await loadTemplateByName("menu_settings");

export class OpenSettings extends ClickActionTemplateMatching {
    public constructor(emulatorClient: EmulatorControllerClient) {
        super(emulatorClient, menu_settings, GameScreen.Hud, GameScreen.Settings, true);
    }
}
