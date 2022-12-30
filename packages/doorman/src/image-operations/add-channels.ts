import type { Image, ImageType } from "./image.js";

import assert from "node:assert";
import { sourceImageGuard } from "../parameter-guards/source-image-guard.js";

export const addChannel = (sourceImage: Image, channelImage: Image, newFormat: ImageType) => {
    sourceImageGuard(sourceImage);
    sourceImageGuard(channelImage);
    assert(sourceImage.width === channelImage.width, "Source and new channel images must be the same width");
    assert(sourceImage.height === channelImage.height, "Source and new channel images must be the same height");
    assert(sourceImage.channels + channelImage.channels <= 4, "Too many channels, can not add another channel");

    // Create the combined image
    const combinedImage: Image = {
        format: newFormat,
        width: sourceImage.width,
        height: sourceImage.height,
        channels: (sourceImage.channels + channelImage.channels) as 2 | 3 | 4,
        pixels: Buffer.alloc(sourceImage.width * sourceImage.height * (sourceImage.channels + channelImage.channels)),
    };

    // Fill the combined image pixel buffer
    for (let y = 0; y < combinedImage.height; y++) {
        for (let x = 0; x < combinedImage.width; x++) {
            // Calculate pixel indexes
            const sourcePixelIndex = (y * combinedImage.width + x) * sourceImage.channels;
            const channelPixelIndex = (y * combinedImage.width + x) * channelImage.channels;
            const combinedPixelIndex = (y * combinedImage.width + x) * combinedImage.channels;

            // Copy pixels from the source image first
            for (let c1 = 0; c1 < sourceImage.channels; c1++) {
                combinedImage.pixels[combinedPixelIndex + c1] = sourceImage.pixels[sourcePixelIndex + c1];
            }
            // Then copy pixels from the channel to add image
            for (let c2 = 0; c2 < channelImage.channels; c2++) {
                combinedImage.pixels[combinedPixelIndex + sourceImage.channels + c2] =
                    channelImage.pixels[channelPixelIndex + c2];
            }
        }
    }

    return combinedImage;
};
