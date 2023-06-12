import type { Touch } from "../grpc/send-touch.js";
import type { Image } from "../image-operations/image.js";
import type { ITriggerLocation } from "./base-handler.js";
import type { ICropRegion } from "../image-operations/crop-image.js";
import { EmulatorControllerClient } from "@tinyburg/architect/protobuf/emulator_controller.client.js";

import { BaseHandler } from "./base-handler.js";
import { sendTouches } from "../grpc/send-touch.js";
import { ImageType } from "../image-operations/image.js";
import { getScreenshot } from "../grpc/get-screenshots.js";
import { cropImage } from "../image-operations/crop-image.js";
import { negateImage } from "../image-operations/negate-image.js";
import { dropChannel } from "../image-operations/drop-channel.js";
import { upscaleImage } from "../image-operations/upscale-image.js";
import { matchTemplate } from "../image-operations/template-matching.js";
import { calculateResourceScale } from "../utils/calculate-resource-scale.js";
import { loadTemplateByName, loadCharTemplates } from "../image-operations/load-template.js";
import { detectSequence, numericalImagesDictionary, prepDictionaryToLibrary } from "../image-operations/ocr.js";

// 'Notes' are the boxes that appear in the bottom left of the screen.
// In this case, the red elevator note is called note_ride1
const note_ride1: Image = await loadTemplateByName("note_ride1");
const continueTemplates = await loadCharTemplates("C", "O", "N", "T", "I", "N", "U", "E", "?");

export class ElevatorHandler extends BaseHandler<ITriggerLocation> {
    private _templateTriggerMask: Image;
    private _templateTriggerImage: Image;

    public constructor() {
        super("Default Elevator Ride Handler");
        const dropChannelResult = dropChannel(note_ride1, ImageType.RGB, 4);
        this._templateTriggerImage = dropChannelResult.modifiedSourceImage;
        this._templateTriggerMask = negateImage(dropChannelResult.droppedChannelImage);
    }

    public async detectTrigger(screenshot: Image): Promise<ITriggerLocation | undefined> {
        // Scale the template image to the proper size based on the source image
        const resourceScale = calculateResourceScale(screenshot.width, screenshot.height);
        const templateTriggerUpscaled = upscaleImage(this._templateTriggerImage, resourceScale);
        const templateMaskUpscaled = upscaleImage(this._templateTriggerMask, resourceScale);

        // Defines the general area of where to look for the template trigger image
        const sourceTriggerRegion: ICropRegion = {
            left: 0,
            width: screenshot.width,
            height: Math.round(screenshot.height / 8),
            top: screenshot.height - Math.round(screenshot.height / 8),
        };
        const screenshotCropped = cropImage(screenshot, sourceTriggerRegion);

        // Attempt to match the template to the cropped screenshot
        const matches = matchTemplate(screenshotCropped, templateTriggerUpscaled, templateMaskUpscaled);
        const bestMatch = matches
            .filter(({ similarity }) => similarity > 0.97)
            .sort((a, b) => a.similarity - b.similarity)[0];

        if (bestMatch) return bestMatch.position;
        return undefined;
    }

    public async generateActionsList(
        emulatorClient: EmulatorControllerClient,
        initialScreenshot: Image,
        triggerData: ITriggerLocation
    ) {
        const resourceScale = calculateResourceScale(initialScreenshot.width, initialScreenshot.height);

        // Press the elevator note
        const baseElevatorNoteTouch = {
            x: triggerData.x + (this._templateTriggerImage.width * resourceScale) / 2,
            y:
                triggerData.y +
                initialScreenshot.height -
                Math.round(initialScreenshot.height / 8) -
                (this._templateTriggerImage.height * resourceScale) / 2,
            expiration: "EVENT_EXPIRATION_UNSPECIFIED",
            timeout: 600,
        } as const;
        const pressElevatorNote: Touch = { ...baseElevatorNoteTouch, pressure: 1 };
        const releaseElevatorNote: Touch = { ...baseElevatorNoteTouch, pressure: 0 };
        await sendTouches(emulatorClient, [pressElevatorNote, releaseElevatorNote]);

        // Get the numbers library ready for optical character recognition.
        const numbersLibrary = prepDictionaryToLibrary(numericalImagesDictionary, resourceScale, negateImage);

        // Get a second screenshot with the floor number in it, crop it, and ocr the floor number
        const secondScreenshot = await getScreenshot(emulatorClient);
        const desiredFloorCropRegion: ICropRegion = { left: 130, width: 40, top: 1240, height: 50 };
        const secondScreenshotCropped1 = cropImage(secondScreenshot, desiredFloorCropRegion);
        const floor = Number(detectSequence(secondScreenshotCropped1, numbersLibrary).sequence);

        // Send approximate elevator controls
        const baseElevatorUpTouch = {
            x: secondScreenshot.width / 4,
            y: secondScreenshot.height / 2,
            expiration: "EVENT_EXPIRATION_UNSPECIFIED",
        } as const;
        const pressElevatorUp: Touch = { ...baseElevatorUpTouch, pressure: 1, timeout: (floor - 1) * 1000 };
        const releaseElevatorUp: Touch = { ...baseElevatorUpTouch, pressure: 0, timeout: 1 };
        await sendTouches(emulatorClient, [pressElevatorUp, releaseElevatorUp]);

        // See if we got a costume or pet from this bitizen
        const thirdScreenshot = await getScreenshot(emulatorClient);
        const continueLibrary = prepDictionaryToLibrary(continueTemplates, resourceScale);
        const message = detectSequence(thirdScreenshot, continueLibrary);
        if (message.sequence === "continue") {
            const continueButton = message.matches[Math.floor(message.matches.length / 2)].position;
            const baseContinueButtonTouch = {
                x: continueButton.x,
                y: continueButton.y,
                expiration: "EVENT_EXPIRATION_UNSPECIFIED",
                timeout: 600,
            } as const;
            const pressContinueButton: Touch = { ...baseContinueButtonTouch, pressure: 1 };
            const releaseContinueButton: Touch = { ...baseContinueButtonTouch, pressure: 0 };
            await sendTouches(emulatorClient, [pressContinueButton, releaseContinueButton]);
        }
    }
}
