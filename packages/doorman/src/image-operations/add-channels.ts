import { imageTypeFromChannelsForPng, type Image, type ImageType } from "./image.js";

import assert from "node:assert";
import { sourceImageGuard } from "../parameter-guards/source-image-guard.js";

/**
 * Adds an image with potentially multiple channels to another image. For every
 * pixel, it will copy the channels from the source image first, then copy the
 * channels from the channelImage to add. The new image will have the same width
 * and height as the source image, but will have the combined number of
 * channels. A new image format can be specified, otherwise the format will be
 * generated based on the combined number of channels.
 *
 * @param sourceImage The image to add the channel image to
 * @param channelImage The image with the channels to add
 * @param newFormat
 */
export const addChannel = (sourceImage: Image, channelImage: Image, newFormat?: ImageType) => {
    sourceImageGuard(sourceImage);
    sourceImageGuard(channelImage);
    assert(sourceImage.width === channelImage.width, "Source and new channel images must be the same width");
    assert(sourceImage.height === channelImage.height, "Source and new channel images must be the same height");

    // Create the combined image
    const combinedImage: Image = {
        width: sourceImage.width,
        height: sourceImage.height,
        channels: sourceImage.channels + channelImage.channels,
        format: newFormat || imageTypeFromChannelsForPng(sourceImage.channels + channelImage.channels),
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
