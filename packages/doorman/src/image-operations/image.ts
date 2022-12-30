export type Image = {
    width: number;
    height: number;
    channels: 1 | 2 | 3 | 4;
    pixels: Buffer;
    format: ImageType;
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
}

// Determines the image type from the number of channels. After reading PNG basics
// http://www.libpng.org/pub/png/book/chapter08.html#png.ch08.div.4
// I think that PNG's can not be in bgr format, so that eliminates the
// uncertainty for 3 and 4 channel images.
export const imageTypeFromChannelsForPng = (channels: 1 | 2 | 3 | 4): ImageType => {
    switch (channels) {
        case 1:
            return ImageType.GRAY;
        case 2:
            return ImageType.GRAY_A;
        case 3:
            return ImageType.RGB;
        case 4:
            return ImageType.RGB_A;
    }
};
