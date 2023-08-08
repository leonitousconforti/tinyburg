/** Stores an image in memory */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type Image = {
    /** The width of the image */
    width: number;

    /** The height of the image */
    height: number;

    /** The number of channels in the image */
    channels: number;

    /** The image format */
    format: ImageType;

    /** The pixel buffer with the image data */
    pixels: Buffer | Uint8Array;
};

export enum ImageType {
    // One channel image formats
    GRAY = "Grayscale",

    // Two channel image formats
    GRAY_A = "Grayscale with alpha",

    // Three channels image formats
    RGB = "RGB",
    BGR = "BGR",

    // Four channel image formats
    RGB_A = "RGB with alpha",
    BGR_A = "BGR with alpha",

    // Anything else
    Other = "Other",
}

// Determines the image type from the number of channels. After reading PNG basics
// http://www.libpng.org/pub/png/book/chapter08.html#png.ch08.div.4
// I think that PNG's can not be in bgr format, so that eliminates the
// uncertainty for 3 and 4 channel images.
export const imageTypeFromChannelsForPng = (channels: number): ImageType => {
    switch (channels) {
        case 1: {
            return ImageType.GRAY;
        }
        case 2: {
            return ImageType.GRAY_A;
        }
        case 3: {
            return ImageType.RGB;
        }
        case 4: {
            return ImageType.RGB_A;
        }
        default: {
            return ImageType.Other;
        }
    }
};
