import type { ICropRegion } from "../image-operations/crop-image.js";

import assert from "node:assert";

export const cropRegionGuard = (cropRegion: ICropRegion): void => {
    assert(Number.isSafeInteger(cropRegion.top), "Crop region's top field is not a safe integer");
    assert(Number.isSafeInteger(cropRegion.left), "Crop region's left field is not a safe integer");
    assert(Number.isSafeInteger(cropRegion.width), "Crop region's width field is not a safe integer");
    assert(Number.isSafeInteger(cropRegion.height), "Crop region's height field is not a safe integer");

    assert(cropRegion.top >= 0, "Crop region's top position must be at least 0");
    assert(cropRegion.left >= 0, "Crop region's left position must be at least 0");

    assert(cropRegion.width > 0, "Crop region's width must be greater than 0");
    assert(cropRegion.height > 0, "Crop region's height must be greater than 0");
};
