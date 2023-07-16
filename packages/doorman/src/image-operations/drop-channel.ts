import type { Image } from "./image.js";

import assert from "node:assert";
import { ImageType, imageTypeFromChannelsForPng } from "./image.js";
import { sourceImageGuard } from "../parameter-guards/source-image-guard.js";

/**
 * Drops a singular channel from an image. The new image will have the same
 * width and height as the source image, but will have one less channel. A new
 * image format can be specified, otherwise the format will be generated based
 * on the new number of channels. If the source image only has one channel, an
 * error will be thrown.
 *
 * @param sourceImage The image to drop the channel from
 * @param dropChannel The index of the channel to drop, starting at 0
 * @param newFormat
 */
export const dropChannel = (
    sourceImage: Image,
    dropChannel: number,
    newFormat?: ImageType
): { modifiedSourceImage: Image; droppedChannelImage: Image } => {
    sourceImageGuard(sourceImage);
    assert(sourceImage.channels >= 2, "Cannot drop a channel from an image with only one channel");
    assert(dropChannel <= sourceImage.channels, "Drop channel must be within the sourceImage channels");

    // Stores the extracted channel in case you want to use it later for something like a mask
    const droppedChannelImage: Image = {
        channels: 1,
        format: ImageType.GRAY,
        width: sourceImage.width,
        height: sourceImage.height,
        pixels: Buffer.alloc(sourceImage.width * sourceImage.height),
    };

    // Stores the modified source image
    const modifiedSourceImage: Image = {
        width: sourceImage.width,
        height: sourceImage.height,
        channels: (sourceImage.channels - 1) as Image["channels"],
        format: newFormat || imageTypeFromChannelsForPng(sourceImage.channels - 1),
        pixels: Buffer.alloc(sourceImage.width * sourceImage.height * (sourceImage.channels - 1)),
    };

    // Remove all pixels from the source image on the particular channel
    for (let y = 0; y < sourceImage.height; y++) {
        for (let x = 0; x < sourceImage.width; x++) {
            const pixelIndex = (y * sourceImage.width + x) * sourceImage.channels;

            // Get and set the drop channels value
            const dropChannelValue = sourceImage.pixels[pixelIndex + dropChannel - 1];
            droppedChannelImage.pixels.set([dropChannelValue], y * sourceImage.width + x);

            // Get all other channel values
            const otherChannelValues = Array.from({ length: sourceImage.channels })
                .map((__value, index) => index)
                .filter((channel) => channel + 1 !== dropChannel)
                .map((channel) => sourceImage.pixels[pixelIndex + channel]);

            // Set all other values in the modified source image
            modifiedSourceImage.pixels.set(
                otherChannelValues,
                (y * sourceImage.width + x) * modifiedSourceImage.channels
            );
        }
    }

    return { modifiedSourceImage, droppedChannelImage };
};
