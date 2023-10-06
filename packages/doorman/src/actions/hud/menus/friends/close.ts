import type { PromiseClient } from "@connectrpc/connect";
import type { EmulatorController } from "@tinyburg/architect/protobuf/emulator_controller_connect.js";

import { CloseHud } from "../../close.js";
import { GameScreen } from "../../../../global-game-state.js";

export class CloseFriends extends CloseHud {
    public constructor(emulatorClient: PromiseClient<typeof EmulatorController>) {
        super(emulatorClient, GameScreen.Friends, GameScreen.Hud);
    }
}
