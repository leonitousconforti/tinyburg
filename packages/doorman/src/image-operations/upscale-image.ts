import type { Image } from "./image.js";

export const upscaleImage = (sourceImage: Image, scale: number): Image => {
    if (!Number.isInteger(scale) || scale < 1) {
        throw new Error("Invalid scale factor");
    }

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
