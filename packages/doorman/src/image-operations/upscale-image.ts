import type { Image } from "./image.js";

/**
 * Upscale an image by a given scale factor. The scale factor must be an integer
 * greater than or equal to 1.
 *
 * @param sourceImage The image to upscale
 * @param scale The scaling factor
 */
export const upscaleImage = (sourceImage: Image, scale: number): Image => {
    if (!Number.isInteger(scale) || scale < 1) {
        throw new Error("Invalid scale factor");
    }

    // Let's save ourselves some computation
    if (scale === 1) return sourceImage;

    const scaledImage: Image = {
        width: sourceImage.width * scale,
        height: sourceImage.height * scale,
        channels: sourceImage.channels,
        format: sourceImage.format,
        pixels: Buffer.alloc(sourceImage.width * sourceImage.height * scale * scale * sourceImage.channels),
    };

    // Loop over the scaled image height
    for (let y = 0; y < scaledImage.height; y++) {
        const sourceY = Math.floor(y / scale);

        // Loop over the scaled image width
        for (let x = 0; x < scaledImage.width; x++) {
            const sourceX = Math.floor(x / scale);

            // Calculate pixel indexes
            const scaledIndexStart = (y * scaledImage.width + x) * scaledImage.channels;
            const sourceIndexStart = (sourceY * sourceImage.width + sourceX) * sourceImage.channels;

            // Move all channels for pixel
            for (let c = 0; c < sourceImage.channels; c++)
                scaledImage.pixels[scaledIndexStart + c] = sourceImage.pixels[sourceIndexStart + c];
        }
    }

    return scaledImage;
};
