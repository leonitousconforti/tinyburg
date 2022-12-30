import type { Image } from "../image-operations/image.js";
import type { ITriggerLocation } from "./base-handler.js";
import type { EmulatorControllerClient } from "../../proto/generated//android/emulation/control/EmulatorController.js";

import { BaseHandler } from "./base-handler.js";
import { ImageType } from "../image-operations/image.js";
import { cropImage } from "../image-operations/crop-image.js";
import { dropChannel } from "../image-operations/drop-channel.js";
import { matchTemplate } from "../image-operations/template-matching.js";
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
        super();
        this._stockingMode = stockingMode;

        const dropChannelResult = dropChannel(note_stock, ImageType.RGB, 4);
    }

    public async detectTrigger(screenshot: Image): Promise<ITriggerLocation | undefined> {
        // // Scale the template image to the proper size based on the source image
        // const resourceScale = this.getResourceScale(screenshot.width, screenshot.height);

        // const notesCropRegion = CropRegions.Notes(screenshot);
        // const screenshotCropped = cropImage(screenshot, notesCropRegion);

        // // Template matching
        // const templateMatchOptions = { noOverlapHorizontally: true };
        // const matches = matchTemplate(screenshotCropped, note_stock, undefined, undefined, templateMatchOptions);

        // // Find the best match
        // const bestMatch = matches.sort((a, b) => a.similarity - b.similarity)[0];
        // return bestMatch ? bestMatch.position : undefined;
        return undefined;
    }

    public performTask(
        client: EmulatorControllerClient,
        initialScreenshot: Image,
        triggerData: ITriggerLocation | undefined
    ): Promise<void> {
        throw new Error("Method not implemented.");
    }
}
