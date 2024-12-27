import type { Image } from "../image-operations/image.js";

import assert from "node:assert";

export const sourceImageGuard = (sourceImage: Image): void => {
    assert(Number.isSafeInteger(sourceImage.width), "Image's width must be a safe integer");
    assert(Number.isSafeInteger(sourceImage.height), "Image's height must be a safe integer");

    assert(sourceImage.width > 0, "Image's width must be greater than 0");
    assert(sourceImage.height > 0, "Image's height must be greater than 0");
    assert(sourceImage.pixels.length > 0, "Image must contain some pixel data");

    assert(
        sourceImage.width * sourceImage.height * sourceImage.channels === sourceImage.pixels.length,
        "Image's pixel buffer must be of correct size"
    );
};
