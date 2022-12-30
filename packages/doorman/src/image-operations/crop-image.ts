import type { Image } from "./image.js";

import assert from "node:assert";
import { cropRegionGuard } from "../parameter-guards/crop-region-guard.js";
import { sourceImageGuard } from "../parameter-guards/source-image-guard.js";

// Defines a region to crop
export interface ICropRegion {
    top: number;
    left: number;
    width: number;
    height: number;
}

// Crops an image to the area defined by the given region
export const cropImage = (sourceImage: Image, region: ICropRegion): Image => {
    cropRegionGuard(region);
    sourceImageGuard(sourceImage);
    assert(region.left + region.width <= sourceImage.width, "Crop region extends beyond the width of the image");
    assert(region.top + region.height <= sourceImage.height, "Crop region extends beyond the height of the image");

    // Create a new image with the same number of channels and format, the region's
    // width, the region's height, and the correct pixel buffer size.
    const croppedImage: Image = {
        channels: sourceImage.channels,
        width: region.width,
        height: region.height,
        format: sourceImage.format,
        pixels: Buffer.alloc(region.width * region.height * sourceImage.channels),
    };

    // Shortcut if the region to crop is the same width as the source image
    // https://github.com/oliver-moran/jimp/blob/master/packages/plugin-crop/src/index.js
    if (region.left === 0 && region.width === sourceImage.width) {
        const start = (region.width * region.top + region.left) * sourceImage.channels;
        const end = start + region.height * region.width * sourceImage.channels;
        croppedImage.pixels.set(sourceImage.pixels.subarray(start, end));
    }

    // Fallback 'basic' cropping method
    else {
        for (let y = 0; y < region.height; y++) {
            // Calculate the start index and end index of this row
            const rowStart = ((region.top + y) * sourceImage.width + region.left) * sourceImage.channels;
            const rowEnd = rowStart + region.width * sourceImage.channels;

            // Slice the pixels for this row and add them to the cropped image pixel buffer
            const rowPixels = sourceImage.pixels.slice(rowStart, rowEnd);
            croppedImage.pixels.set(rowPixels, y * region.width * sourceImage.channels);
        }
    }

    return croppedImage;
};
