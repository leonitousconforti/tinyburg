import type { PromiseClient } from "@connectrpc/connect";
import type { Image } from "../../../../image-operations/image.js";
import type { EmulatorController } from "@tinyburg/architect/protobuf/emulator_controller_connect.js";

import { ClickActionTemplateMatching } from "../../../click-action.js";
import { GameScreen } from "../../../../global-game-state.js";
import { loadTemplateByName } from "../../../../image-operations/load-template.js";

const menu_bitizen: Image = await loadTemplateByName("menu_bitbuilder");

export class OpenBitizens extends ClickActionTemplateMatching {
    public constructor(emulatorClient: PromiseClient<typeof EmulatorController>) {
        super(emulatorClient, menu_bitizen, GameScreen.Hud, GameScreen.Bitizens, true);
    }
}
