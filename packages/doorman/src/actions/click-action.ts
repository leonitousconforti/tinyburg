import type { Image } from "../image-operations/image.js";
import type { PromiseClient } from "@connectrpc/connect";
import type { EmulatorController } from "@tinyburg/architect/protobuf/emulator_controller_connect.js";

import crypto from "node:crypto";
import { click } from "../grpc/send-touch.js";
import { BaseAction } from "./base-action.js";
import { ImageType } from "../image-operations/image.js";
import { getScreenshot } from "../grpc/get-screenshots.js";
import { dropChannel } from "../image-operations/drop-channel.js";
import { upscaleImage } from "../image-operations/upscale-image.js";
import { matchTemplate } from "../image-operations/template-matching.js";
import { GameScreen, GlobalGameStateHolder } from "../global-game-state.js";
import { calculateResourceScale } from "../utils/calculate-resource-scale.js";

export class ClickAction extends BaseAction {
    private readonly _pos: { x: number; y: number; timeout?: number };

    public constructor(
        emulatorClient: PromiseClient<typeof EmulatorController>,
        pos: { x: number; y: number; timeout?: number },
        fromScreen?: GameScreen,
        toScreen?: GameScreen
    ) {
        super(emulatorClient, fromScreen, toScreen);
        this._pos = pos;
    }

    public override async do(): Promise<boolean> {
        await super.do();
        await click(this.emulatorClient, this._pos);
        return true;
    }
}

export abstract class ClickActionTemplateMatching extends BaseAction {
    private readonly _template: Image;
    private readonly _canCache: boolean;

    private static readonly _templateCache: Map<string, { x: number; y: number }> = new Map();

    public constructor(
        emulatorClient: PromiseClient<typeof EmulatorController>,
        template: Image,
        fromScreen?: GameScreen,
        toScreen?: GameScreen,
        canCache: boolean = false
    ) {
        super(emulatorClient, fromScreen, toScreen);
        this._template = template;
        this._canCache = canCache;
    }

    public override async do(): Promise<boolean> {
        await super.do();

        const cache_key = crypto.createHash("sha1").update(this._template.pixels).digest("hex");
        if (this._canCache && ClickActionTemplateMatching._templateCache.has(cache_key)) {
            await click(this.emulatorClient, ClickActionTemplateMatching._templateCache.get(cache_key)!);
            return true;
        }

        const dropChannelResult = dropChannel(this._template, 4, ImageType.RGB);
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

        if (this._canCache) {
            ClickActionTemplateMatching._templateCache.set(cache_key, matches[0].position);
        }

        await click(this.emulatorClient, matches[0].position);
        return true;
    }
}
