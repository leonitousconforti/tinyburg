import type { Image } from "../image-operations/image.js";
import type { ITriggerLocation } from "./base-handler.js";
import type { BaseAction } from "../actions/base-action.js";
import type { ITemplateMatchingOrientationOptions } from "../image-operations/template-matching.js";
import type { EmulatorControllerClient } from "../../proto/generated//android/emulation/control/EmulatorController.js";

import Debug from "debug";
import { BaseHandler } from "./base-handler.js";
import { OpenHud } from "../actions/hud/open.js";
import { CloseHud } from "../actions/hud/close.js";
import { ImageType } from "../image-operations/image.js";
import { dropChannel } from "../image-operations/drop-channel.js";
import { negateImage } from "../image-operations/negate-image.js";
import { OpenBitbook } from "../actions/hud/menus/bitbook/open.js";
import { upscaleImage } from "../image-operations/upscale-image.js";
import { CloseBitbook } from "../actions/hud/menus/bitbook/close.js";
import { matchTemplate } from "../image-operations/template-matching.js";
import { loadTemplateByName } from "../image-operations/load-template.js";
import { cropScreenshotToNotes } from "../image-operations/crop-image.js";

const debug: Debug.Debugger = Debug("doorman:handlers:bitbook");
const note_bb: Image = await loadTemplateByName("note_bb");

export class BitbookPostHandler extends BaseHandler<ITriggerLocation> {
    private readonly _templateNoteMask: Image;
    private readonly _templateNoteImage: Image;

    public constructor() {
        super();
        const dropChannelResult = dropChannel(note_bb, ImageType.RGB, 4);
        this._templateNoteImage = dropChannelResult.modifiedSourceImage;
        this._templateNoteMask = negateImage(dropChannelResult.droppedChannelImage);
        debug("Created new bitbook handler");
    }

    // Should detect if there is a bitbook note on screen
    protected async detectTrigger(screenshot: Image): Promise<ITriggerLocation | undefined> {
        // Upscale the note image and its mask
        const resourceScale = this.getResourceScale(screenshot.width, screenshot.height);
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
    protected async performTask(
        emulatorClient: EmulatorControllerClient,
        initialScreenshot: Image,
        _triggerData: ITriggerLocation
    ): Promise<BaseAction[]> {
        const resourceScale = this.getResourceScale(initialScreenshot.width, initialScreenshot.height);
        return [
            new OpenHud(emulatorClient, resourceScale),
            new OpenBitbook(emulatorClient, resourceScale),
            new CloseBitbook(emulatorClient, resourceScale),
            new CloseHud(emulatorClient, resourceScale),
        ];
    }
}
