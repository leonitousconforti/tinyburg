import type { PromiseClient } from "@connectrpc/connect";
import type { Image } from "../../../../image-operations/image.js";
import type { EmulatorController } from "@tinyburg/architect/protobuf/emulator_controller_connect";

import { ClickActionTemplateMatching } from "../../../click-action.js";
import { GameScreen } from "../../../../global-game-state.js";
import { loadTemplateByName } from "../../../../image-operations/load-template.js";

const menu_upgrades: Image = await loadTemplateByName("menu_elevator1");

export class OpenUpgrades extends ClickActionTemplateMatching {
    public constructor(emulatorClient: PromiseClient<typeof EmulatorController>) {
        super(emulatorClient, menu_upgrades, GameScreen.Hud, GameScreen.Upgrades, true);
    }
}
