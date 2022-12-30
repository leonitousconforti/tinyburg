import type { EmulatorControllerClient } from "../../proto/generated/android/emulation/control/EmulatorController.js";

import { GameScreen, GlobalGameStateHolder } from "../global-game-state.js";

export abstract class BaseAction {
    protected readonly toScreen?: GameScreen;
    protected readonly fromScreen?: GameScreen;
    protected readonly emulatorClient: EmulatorControllerClient;

    public constructor(emulatorClient: EmulatorControllerClient, fromScreen?: GameScreen, toScreen?: GameScreen) {
        this.toScreen = toScreen;
        this.fromScreen = fromScreen;
        this.emulatorClient = emulatorClient;
    }

    public async do(): Promise<boolean> {
        const globalGameStateHolder = GlobalGameStateHolder.getInstance();
        const { gameScreen } = globalGameStateHolder.useGlobalGameState();

        if (this.fromScreen && gameScreen !== this.fromScreen) {
            throw new Error(
                `Can not execute ${this.constructor.name} because the game is not on screen ${this.fromScreen}`
            );
        }
        if (this.toScreen) {
            globalGameStateHolder.setScreen(this.toScreen);
        }

        return false;
    }
}
