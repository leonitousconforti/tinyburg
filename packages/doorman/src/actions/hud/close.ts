import type { Image } from "../../image-operations/image.js";
import type { PromiseClient } from "@connectrpc/connect";
import type { EmulatorController } from "@tinyburg/architect/protobuf/emulator_controller_connect";

import { ClickActionTemplateMatching } from "../click-action.js";
import { GameScreen } from "../../global-game-state.js";
import { loadTemplateByName } from "../../image-operations/load-template.js";

const hud_close: Image = await loadTemplateByName("hud_close");

export class CloseHud extends ClickActionTemplateMatching {
    public constructor(
        emulatorClient: PromiseClient<typeof EmulatorController>,
        fromScreen: GameScreen = GameScreen.Hud,
        toScreen: GameScreen = GameScreen.Tower
    ) {
        super(emulatorClient, hud_close, fromScreen, toScreen, true);
    }
}
