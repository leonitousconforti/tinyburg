import type { Image } from "../image-operations/image.js";
import type { ITriggerLocation } from "./base-handler.js";
import type { BaseAction } from "../actions/base-action.js";
import type { EmulatorControllerClient } from "@tinyburg/architect/protobuf/emulator_controller.client.js";

import { BaseHandler } from "./base-handler.js";
import { loadTemplateByName } from "../image-operations/load-template.js";

const note_stock: Image = await loadTemplateByName("note_stock");
const button_rushall: Image = await loadTemplateByName("button_rushall");
const button_stockall: Image = await loadTemplateByName("button_stockall");

export enum StockMode {
    INDIVIDUAL,
    STOCK_ALL,
    RUSH_ALL,
}

export class RestockHandler extends BaseHandler<ITriggerLocation | undefined> {
    private _stockingMode: StockMode;

    public constructor(stockingMode: StockMode) {
        super("Default Restocking Handler");
        this._stockingMode = stockingMode;
    }

    public async detectTrigger(_screenshot: Image): Promise<ITriggerLocation | undefined> {
        throw new Error("Method not implemented.");
    }

    public generateActionsList(
        _client: EmulatorControllerClient,
        _initialScreenshot: Image,
        _triggerData: ITriggerLocation | undefined
    ): Promise<BaseAction[]> {
        throw new Error("Method not implemented.");
    }
}
