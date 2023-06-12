import type { Image } from "../image-operations/image.js";
import type { EmulatorControllerClient } from "@tinyburg/architect/protobuf/emulator_controller.client.js";

import { click } from "../grpc/send-touch.js";
import { BaseAction } from "./base-action.js";
import { ImageType } from "../image-operations/image.js";
import { getScreenshot } from "../grpc/get-screenshots.js";
import { dropChannel } from "../image-operations/drop-channel.js";
import { upscaleImage } from "../image-operations/upscale-image.js";
import { matchTemplate } from "../image-operations/template-matching.js";
import { GameScreen, GlobalGameStateHolder } from "../global-game-state.js";
import { calculateResourceScale } from "../utils/calculate-resource-scale.js";

export abstract class ClickAction extends BaseAction {
    private readonly _template: Image;

    public constructor(
        emulatorClient: EmulatorControllerClient,
        template: Image,
        fromScreen?: GameScreen,
        toScreen?: GameScreen
    ) {
        super(emulatorClient, fromScreen, toScreen);
        this._template = template;
    }

    public override async do(): Promise<boolean> {
        await super.do();

        const dropChannelResult = dropChannel(this._template, ImageType.RGB, 4);
        const templateMask = dropChannelResult.droppedChannelImage;
        const templateImage = dropChannelResult.modifiedSourceImage;

        const currentScreenshot = await getScreenshot(this.emulatorClient);
        const resourceScale = calculateResourceScale(currentScreenshot.width, currentScreenshot.height);

        const maskUpscaled = upscaleImage(templateMask, resourceScale);
        const templateUpscaled = upscaleImage(templateImage, resourceScale);
        const matches = matchTemplate(currentScreenshot, templateUpscaled, maskUpscaled, true);

        if (matches.length <= 0) {
            if (this.fromScreen) {
                GlobalGameStateHolder.getInstance().setScreen(this.fromScreen);
            }
            return false;
        }

        await click(this.emulatorClient, matches[0].position);
        return true;
    }
}
