import type { Image } from "../../../../image-operations/image.js";
import type { EmulatorControllerClient } from "@tinyburg/architect/protobuf/emulator_controller.client.js";

import { ClickActionTemplateMatching } from "../../../click-action.js";
import { GameScreen } from "../../../../global-game-state.js";
import { loadTemplateByName } from "../../../../image-operations/load-template.js";

const menu_rebuild: Image = await loadTemplateByName("menu_rebuild");

export class OpenRebuild extends ClickActionTemplateMatching {
    public constructor(emulatorClient: EmulatorControllerClient) {
        super(emulatorClient, menu_rebuild, GameScreen.Hud, GameScreen.Rebuild, true);
    }
}
