import type { Image } from "./image.js";

import assert from "node:assert";
import { sourceImageGuard } from "../parameter-guards/source-image-guard.js";
import { uint8safeIntegerGuard } from "../parameter-guards/uint8-safe-integer.js";

export const thresholdImage = (sourceImage: Image, threshold: number) => {
    sourceImageGuard(sourceImage);
    uint8safeIntegerGuard(threshold);
    assert(sourceImage.channels === 1);

    const { width, height, channels, format, pixels } = sourceImage;
    const thresholdImage: Image = {
        width,
        height,
        format,
        channels,
        pixels: Buffer.alloc(width * height * channels),
    };

    for (let pixelIndex = 0; pixelIndex < width * height * channels; pixelIndex++) {
        thresholdImage.pixels[pixelIndex] = pixels[pixelIndex] >= threshold ? 255 : 0;
    }
    return thresholdImage;
};
