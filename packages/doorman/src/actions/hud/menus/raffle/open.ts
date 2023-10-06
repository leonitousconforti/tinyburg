import type { PromiseClient } from "@connectrpc/connect";
import type { Image } from "../../../../image-operations/image.js";
import type { EmulatorController } from "@tinyburg/architect/protobuf/emulator_controller_connect.js";

import { ClickActionTemplateMatching } from "../../../click-action.js";
import { GameScreen } from "../../../../global-game-state.js";
import { loadTemplateByName } from "../../../../image-operations/load-template.js";

const menu_raffle: Image = await loadTemplateByName("menu_raffle");

export class OpenRaffle extends ClickActionTemplateMatching {
    public constructor(emulatorController: PromiseClient<typeof EmulatorController>) {
        super(emulatorController, menu_raffle, GameScreen.Hud, GameScreen.Raffle, true);
    }
}
