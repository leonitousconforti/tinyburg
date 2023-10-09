import type { IUpgrade } from "./base-upgrade.js";
import type { Roof } from "@tinyburg/core/data/roofs";
import type { Image } from "../image-operations/image.js";
import type { PromiseClient } from "@connectrpc/connect";
import type { EmulatorController } from "@tinyburg/architect/protobuf/emulator_controller_connect";

import Debug from "debug";
import { roofs } from "@tinyburg/core/data/roofs";
import { getScreenshot } from "../grpc/get-screenshots.js";
import { cropImage } from "../image-operations/crop-image.js";
import { NeedsVersion } from "../decorators/needs-version.js";
import { negateImage } from "../image-operations/negate-image.js";
import { upscaleImage } from "../image-operations/upscale-image.js";
import { EnterLog, ExitLog } from "../decorators/invocation-logs.js";
import { matchTemplate } from "../image-operations/template-matching.js";
import { loadTemplateByName } from "../image-operations/load-template.js";
import { calculateResourceScale } from "../utils/calculate-resource-scale.js";
import { alphabeticalImagesDictionary, prepDictionaryToLibrary, detectSequence } from "../image-operations/ocr.js";

const mv_right: Image = await loadTemplateByName("mv_right");
const debug: Debug.Debugger = Debug("doorman:upgrades:unlock-roof");

@NeedsVersion("3.14.6")
export class UnlockRoof implements IUpgrade {
    private readonly _roofToBuy: Roof["name"];
    public readonly logger: Debug.Debugger = debug;

    public constructor(roofToBuy: Roof["name"]) {
        this._roofToBuy = roofToBuy;
    }

    @EnterLog(debug)
    @ExitLog(debug, { withReturnValue: true })
    public canAfford(): boolean {
        return roofs.find(({ name }) => name === this._roofToBuy)!.buxcost < 10;
    }

    @EnterLog(debug)
    @ExitLog(debug)
    public async doUpgrade(client: PromiseClient<typeof EmulatorController>): Promise<void> {
        // Open the hud and navigate to the roofs upgrades menu
        // await openHud(client);
        // await openUpgradesMenu(client);
        // await changeToRoofsMenu(client);

        // Grab an initial screenshot to calculate the resource scale and find the buttons
        const initialScreenshot = await getScreenshot(client);
        const resourceScale = calculateResourceScale(initialScreenshot.width, initialScreenshot.height);

        // Prep the detection library for ocr
        const alphabeticalDetectionLibrary = prepDictionaryToLibrary(
            alphabeticalImagesDictionary,
            resourceScale,
            (image: Image) => negateImage(image)
        );

        // Find the move right button
        const mv_rightUpscaled = upscaleImage(mv_right, resourceScale);
        const screenshotCroppedForMoveButton = cropImage(initialScreenshot, { top: 0, left: 0, width: 0, height: 0 });
        const moveRightButton = matchTemplate(screenshotCroppedForMoveButton, mv_rightUpscaled)[0];
        if (!moveRightButton) throw new Error("Could not find the move right button");

        // Now cycle until we find the roof we want to unlock
        // eslint-disable-next-line no-constant-condition
        while (true) {
            // Go to next roof, grab a screenshot of it, crop it, and then find its name
            // await click(client, { x: moveRightButton.position.x, y: moveRightButton.position.y, timeout: 1000 });
            const roofScreenshot = await getScreenshot(client);
            const roofScreenshotCroppedForName = cropImage(roofScreenshot, { top: 0, left: 0, width: 0, height: 0 });
            const roofSequence = detectSequence(roofScreenshotCroppedForName, alphabeticalDetectionLibrary);

            // If we went through every roof and ended back at the beginning then leave
            if (roofSequence.sequence === "Lobby") {
                break;
            }

            // If this is the roof we want to buy
            if (roofSequence.sequence === this._roofToBuy.toUpperCase()) {
                break;
            }
        }

        // Close the roofs upgrades menu and then then hud
        // await closeRoofsMenu(client);
        // await closeUpgradesMenu(client);
        // await closeHud(client);
    }
}
