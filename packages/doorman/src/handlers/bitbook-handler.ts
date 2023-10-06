import Debug from "debug";

import type { PromiseClient } from "@connectrpc/connect";
import type { Image } from "../image-operations/image.js";
import type { BaseAction } from "../actions/base-action.js";
import type { ILocationBasedTrigger } from "./base-handler.js";
import type { ITemplateMatchingOrientationOptions } from "../image-operations/template-matching.js";
import type { EmulatorController } from "@tinyburg/architect/protobuf/emulator_controller_connect.js";

import { BaseHandler } from "./base-handler.js";
import { calculateResourceScale } from "../utils/calculate-resource-scale.js";

import { OpenHud } from "../actions/hud/open.js";
import { CloseHud } from "../actions/hud/close.js";
import { OpenBitbook } from "../actions/hud/menus/bitbook/open.js";
import { CloseBitbook } from "../actions/hud/menus/bitbook/close.js";

import { ImageType } from "../image-operations/image.js";
import { dropChannel } from "../image-operations/drop-channel.js";
import { negateImage } from "../image-operations/negate-image.js";
import { upscaleImage } from "../image-operations/upscale-image.js";
import { matchTemplate } from "../image-operations/template-matching.js";
import { loadTemplateByName } from "../image-operations/load-template.js";
import { cropScreenshotToNotes } from "../image-operations/crop-image.js";

const debug: Debug.Debugger = Debug("doorman:handlers:bitbook");
const note_bb: Image = await loadTemplateByName("note_bb");

export class BitbookPostHandler extends BaseHandler<ILocationBasedTrigger> {
    private readonly _templateNoteMask: Image;
    private readonly _templateNoteImage: Image;

    public constructor() {
        super("Default Bitbook Note Handler");
        const dropChannelResult = dropChannel(note_bb, 4, ImageType.RGB);
        this._templateNoteImage = dropChannelResult.modifiedSourceImage;
        this._templateNoteMask = negateImage(dropChannelResult.droppedChannelImage);
        debug("Created new bitbook handler");
    }

    // Should detect if there is a bitbook note on screen
    public async detectTrigger(screenshot: Image): Promise<ILocationBasedTrigger | undefined> {
        // Upscale the note image and its mask
        const resourceScale = calculateResourceScale(screenshot.width, screenshot.height);
        const maskUpscaled = upscaleImage(this._templateNoteMask, resourceScale);
        const templateUpscaled = upscaleImage(this._templateNoteImage, resourceScale);

        // Crop the screenshot to the notes area and look for a match
        const screenshotCropped = cropScreenshotToNotes(screenshot);
        const orientationOptions: ITemplateMatchingOrientationOptions = { noOverlapHorizontally: true };
        const matches = matchTemplate(screenshotCropped, templateUpscaled, maskUpscaled, false, orientationOptions);

        // Find and the best match if there was one
        const bestMatch = matches
            .filter((match) => match.similarity > 0.98)
            .sort((a, b) => a.similarity - b.similarity)
            .shift();

        debug("Best match was %o", bestMatch);
        return bestMatch ? bestMatch.position : undefined;
    }

    // Should click the bitbook note and close the bitbook page
    public async generateActionsList(
        emulatorClient: PromiseClient<typeof EmulatorController>,
        _initialScreenshot: Image,
        _triggerData: ILocationBasedTrigger
    ): Promise<BaseAction[]> {
        return [
            new OpenHud(emulatorClient),
            new OpenBitbook(emulatorClient),
            new CloseBitbook(emulatorClient),
            new CloseHud(emulatorClient),
        ];
    }
}
