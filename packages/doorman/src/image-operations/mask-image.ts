import type { Image } from "./image.js";

import assert from "node:assert";
import { cropImage } from "./crop-image.js";
import { grayscaleImage } from "./grayscale-image.js";
import { sourceImageGuard } from "../parameter-guards/source-image-guard.js";
import { uint8safeIntegerGuard } from "../parameter-guards/uint8-safe-integer.js";

/**
 * Applies a mask image onto a source image. The mask image must be a grayscale
 * image with exactly one channel and be the same dimensions as the source
 * image. Anywhere in the mask image that has a value above the specified
 * threshold will be kept in the source image, whereas anything below the
 * specified threshold will be removed. Additionally, the newly masked image can
 * be automatically cropped to its bounding box.
 *
 * @param sourceImage - The image to apply the mask to
 * @param mask - The mask to apply to the source image
 * @param threshold - The threshold to apply the mask at
 * @param crop - Should the newly masked image be cropped to its bounding box
 */
export const maskImage = (sourceImage: Image, mask: Image, threshold: number, crop = false): Image => {
    sourceImageGuard(mask);
    sourceImageGuard(sourceImage);
    uint8safeIntegerGuard(threshold);
    assert(mask.channels === 1, "Mask image must have exactly one channel");
    assert(sourceImage.width === mask.width, "Source and mask images must be the same width");
    assert(sourceImage.height === mask.height, "Source and mask images must be the same height");

    // Destructure the source image
    const { width, height, channels, pixels, format } = sourceImage;

    // Create the masked image object
    const maskedImage: Image = {
        width,
        height,
        channels,
        format,
        pixels: Buffer.alloc(width * height * channels),
    };

    // Apply the mask to the source image
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const maskIndex = y * width + x;

            if (mask.pixels[maskIndex] >= threshold) {
                for (let c = 0; c < channels; c++) {
                    const pixelIndex = channels * maskIndex + c;
                    maskedImage.pixels[pixelIndex] = pixels[pixelIndex];
                }
            }
        }
    }

    if (crop) {
        const grayscaledImage = grayscaleImage(maskedImage);
        const values = [...grayscaledImage.pixels]
            .map((pixel, index) => ({
                pixel,
                x: index % width,
                y: Math.floor(index / width),
            }))
            .filter(({ pixel }) => pixel > 0);

        const xs = values.map(({ x }) => x);
        const ys = values.map(({ y }) => y);

        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);
        const diffX = maxX - minX;
        const diffY = maxY - minY;

        return cropImage(maskedImage, {
            top: minY,
            left: minX,
            width: diffX + 1,
            height: diffY + 1,
        });
    }

    return maskedImage;
};
