import type { Image } from "../image-operations/image.js";
import type { FloorType } from "@tinyburg/core/data/floors";
import type { EmulatorControllerClient } from "../../proto/generated/android/emulation/control/EmulatorController.js";

import Debug from "debug";
import { BaseHandler } from "../handlers/base-handler.js";
import { GlobalGameStateHolder } from "../global-game-state.js";
import { loadTemplateByName } from "../image-operations/load-template.js";

const debug: Debug.Debugger = Debug("doorman:handlers:build-floor");

const empty_floor: Image = await loadTemplateByName("floor58");
const build_new_floor: Image = await loadTemplateByName("floor-1");
const under_construction: Image = await loadTemplateByName("construction");

const category_food: Image = await loadTemplateByName("category_food");
const category_retail: Image = await loadTemplateByName("category_retail");
const category_service: Image = await loadTemplateByName("category_service");
const category_choose_floor: Image = await loadTemplateByName("choose_floor");
const category_creative: Image = await loadTemplateByName("category_creative");
const category_recreation: Image = await loadTemplateByName("category_recreation");
const category_residential: Image = await loadTemplateByName("category_residential");

const hud_pop: Image = await loadTemplateByName("hud_pop");
const hud_stories: Image = await loadTemplateByName("hud_stories");
const hud_pop_wide: Image = await loadTemplateByName("hud_pop_wide");
const hud_stories_wide: Image = await loadTemplateByName("hud_stories_wide");

export enum WhenBuildNewFloor {
    ASAP = "As soon as possible",
    DOUBLE_COINS = "When you have double the required coins",
}

export class BuildFloorHandler extends BaseHandler<boolean> {
    private _floorsUnderConstruction: number;
    private readonly _whenBuildNewFloor: () => boolean;
    private readonly _whichFloorTypeToBuild: () => FloorType;
    private readonly _consecutiveFloorsToBuild: number;

    public constructor(
        whenBuildNewFloor: WhenBuildNewFloor,
        consecutiveFloorsToBuild: number,
        whichFloorTypeToBuild: () => FloorType
    ) {
        super();
        this._floorsUnderConstruction = -1;
        this._whenBuildNewFloor = whenBuildNewFloor;
        this._whichFloorTypeToBuild = whichFloorTypeToBuild;
        this._consecutiveFloorsToBuild = consecutiveFloorsToBuild;
        debug("Created new build floor handler");
    }

    protected async detectTrigger(): Promise<boolean | undefined> {
        // Check if the floors under construction variable has been initialized
        if (this._floorsUnderConstruction < 0) {
            await this.updateFloorsUnderConstruction();
        }

        // Check that the current number of floors under construction has not exceeded
        // the maximum consecutive floors that the player wants to build at once
        if (this._floorsUnderConstruction >= this._consecutiveFloorsToBuild) {
            return;
        }

        // Use the global game state the determine if we should build a new floor
        const { coins, nextFloorCost } = GlobalGameStateHolder.getInstance().useGlobalGameState();
        switch (this._whenBuildNewFloor) {
            case WhenBuildNewFloor.ASAP:
                return coins > nextFloorCost;
            case WhenBuildNewFloor.DOUBLE_COINS:
                return coins > 2 * nextFloorCost;
        }
    }

    protected async performTask(client: EmulatorControllerClient, initialScreenshot: Image): Promise<void> {
        return;
    }

    public async updateFloorsUnderConstruction() {
        this._floorsUnderConstruction = 0;
    }
}
