import type { PromiseClient } from "@connectrpc/connect";
import type { Image } from "../image-operations/image.js";
import type { ILocationBasedTrigger } from "./base-handler.js";
import type { BaseAction } from "../actions/base-action.js";
import type { EmulatorController } from "@tinyburg/architect/protobuf/emulator_controller_connect.js";

import { BaseHandler } from "./base-handler.js";
// import { loadTemplateByName } from "../image-operations/load-template.js";

// const note_stock: Image = await loadTemplateByName("note_stock");
// const button_rushall: Image = await loadTemplateByName("button_rushall");
// const button_stockall: Image = await loadTemplateByName("button_stockall");

export enum StockMode {
    INDIVIDUAL,
    STOCK_ALL,
    RUSH_ALL,
}

export class RestockHandler extends BaseHandler<ILocationBasedTrigger | undefined> {
    private _stockingMode: StockMode;

    public constructor(stockingMode: StockMode) {
        super("Default Restocking Handler");
        this._stockingMode = stockingMode;
    }

    public async detectTrigger(_screenshot: Image): Promise<ILocationBasedTrigger | undefined> {
        console.log(this._stockingMode);
        throw new Error("Method not implemented.");
    }

    public generateActionsList(
        _emulatorClient: PromiseClient<typeof EmulatorController>,
        _initialScreenshot: Image,
        _triggerData: ILocationBasedTrigger | undefined
    ): Promise<BaseAction[]> {
        throw new Error("Method not implemented.");
    }
}
