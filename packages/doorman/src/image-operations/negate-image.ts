import type { Image } from "./image.js";

import assert from "node:assert";
import { sourceImageGuard } from "../parameter-guards/source-image-guard.js";

/**
 * Applies a binary negation to an image. The new image will have the same width
 * and height as the source image.
 *
 * @param sourceImage The image to negate
 */
export const negateImage = (sourceImage: Image): Image => {
    sourceImageGuard(sourceImage);
    assert(!sourceImage.format.includes("alpha"), "Can not negate image with alpha channel");

    const { pixels, ...restSourceImageParameters } = sourceImage;
    const negatedImage: Image = {
        ...restSourceImageParameters,
        pixels: Buffer.alloc(sourceImage.width * sourceImage.height * sourceImage.channels),
    };

    for (let y = 0; y < sourceImage.height; y++) {
        for (let x = 0; x < sourceImage.width; x++) {
            for (let c = 0; c < sourceImage.channels; c++) {
                const pixelIndex = (y * sourceImage.width + x) * sourceImage.channels + c;
                negatedImage.pixels[pixelIndex] = 255 - pixels[pixelIndex];
            }
        }
    }

    return negatedImage;
};
