import type { Image } from "../../../../image-operations/image.js";
import type { EmulatorControllerClient } from "@tinyburg/architect/protobuf/emulator_controller.client.js";

import { ClickActionTemplateMatching } from "../../../click-action.js";
import { GameScreen } from "../../../../global-game-state.js";
import { loadTemplateByName } from "../../../../image-operations/load-template.js";

const menu_bitbook: Image = await loadTemplateByName("menu_bitbook");

export class OpenBitbook extends ClickActionTemplateMatching {
    public constructor(emulatorClient: EmulatorControllerClient) {
        super(emulatorClient, menu_bitbook, GameScreen.Hud, GameScreen.Bitbook, true);
    }
}
