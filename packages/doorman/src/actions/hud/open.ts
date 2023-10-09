import type { Image } from "../../image-operations/image.js";
import type { PromiseClient } from "@connectrpc/connect";
import type { EmulatorController } from "@tinyburg/architect/protobuf/emulator_controller_connect";

import { ClickActionTemplateMatching } from "../click-action.js";
import { GameScreen } from "../../global-game-state.js";
import { loadTemplateByName } from "../../image-operations/load-template.js";

const hud_menu: Image = await loadTemplateByName("hud_menu");

export class OpenHud extends ClickActionTemplateMatching {
    public constructor(emulatorClient: PromiseClient<typeof EmulatorController>) {
        super(emulatorClient, hud_menu, GameScreen.Tower, GameScreen.Hud, true);
    }
}
