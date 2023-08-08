import type { IUpgrade } from "../upgrades/base-upgrade.js";

import semverLessThan from "semver/functions/lt.js";
import { GlobalGameStateHolder } from "../global-game-state.js";

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const NeedsVersion = (versionRequired: string) => {
    const { version: gameVersion } = GlobalGameStateHolder.getInstance().useGlobalGameState();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return function <T extends { new (...arguments_: any[]): IUpgrade }>(constructor: T) {
        if (semverLessThan(gameVersion, versionRequired)) {
            return class extends constructor {
                public override async doUpgrade(): Promise<void> {
                    this.logger("Can not perform upgrade because the app does not meet the minimum version");
                }
            };
        }

        return constructor;
    };
};
