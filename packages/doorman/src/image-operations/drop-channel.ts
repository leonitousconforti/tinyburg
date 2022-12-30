import type { Image } from "./image.js";

import assert from "node:assert";
import { ImageType } from "./image.js";
import { sourceImageGuard } from "../parameter-guards/source-image-guard.js";

export const dropChannel = (
    sourceImage: Image,
    newFormat: ImageType,
    dropChannel: Image["channels"]
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
        format: newFormat,
        width: sourceImage.width,
        height: sourceImage.height,
        channels: (sourceImage.channels - 1) as Image["channels"],
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
