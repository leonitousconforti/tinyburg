import type { Image } from "../../image-operations/image.js";
import type { EmulatorControllerClient } from "@tinyburg/architect/protobuf/emulator_controller.client.js";

import { ClickActionTemplateMatching } from "../click-action.js";
import { GameScreen } from "../../global-game-state.js";
import { loadTemplateByName } from "../../image-operations/load-template.js";

const hud_close: Image = await loadTemplateByName("hud_close");

export class CloseHud extends ClickActionTemplateMatching {
    public constructor(
        emulatorClient: EmulatorControllerClient,
        fromScreen: GameScreen = GameScreen.Hud,
        toScreen: GameScreen = GameScreen.Tower
    ) {
        super(emulatorClient, hud_close, fromScreen, toScreen, true);
    }
}
