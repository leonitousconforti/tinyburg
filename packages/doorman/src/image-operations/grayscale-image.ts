import type { Image } from "./image.js";

import assert from "node:assert";
import { ImageType } from "./image.js";
import { sourceImageGuard } from "../parameter-guards/source-image-guard.js";

/**
 * Converts a BGR or RGB image to grayscale based on luminosity. The new image
 * will have the same width and height as the source image, but will have only
 * one channel. The new image format will be grayscale.
 *
 * @param sourceImage - Image to convert
 */
export const grayscaleImage = (sourceImage: Image): Image => {
    sourceImageGuard(sourceImage);
    assert(sourceImage.channels === 3, "Source image must have three channels");
    assert(
        sourceImage.format === ImageType.RGB || sourceImage.format === ImageType.BGR,
        "Source image must be either rgb or bgr format"
    );

    // Destructure source image
    const { pixels, channels, format, width, height } = sourceImage;

    // Create the grayscale image object
    const grayscaleImage: Image = {
        width,
        height,
        channels: 1,
        format: ImageType.GRAY,
        pixels: Buffer.alloc(width * height),
    };

    for (let y = 0; y < height; y++) {
        // Use a clamped array to automatically handle clamping the values just in case
        const row = new Uint8ClampedArray(width);

        for (let x = 0; x < width; x++) {
            const pixelStartIndex = (y * width + x) * channels;
            let r = pixels[pixelStartIndex];
            let g = pixels[pixelStartIndex + 1];
            let b = pixels[pixelStartIndex + 2];

            // eslint-disable-next-line no-self-assign
            if (format.includes("BGR")) [b, g, r] = [r, g, b];
            row[x * grayscaleImage.channels] = 0.299 * r + 0.587 * g + 0.114 * b;
        }

        grayscaleImage.pixels.set(row, y * grayscaleImage.width * grayscaleImage.channels);
    }

    return grayscaleImage;
};
