import type { ICropRegion } from "../../src/image-operations/crop-image.js";
import { cropRegionGuard } from "../../src/parameter-guards/crop-region-guard.js";

const testCropRegionValid: ICropRegion = {
    top: 0,
    left: 0,
    width: 1,
    height: 1,
};

const testCropRegionUnsafeTop: ICropRegion = {
    ...testCropRegionValid,
    top: Number.POSITIVE_INFINITY,
};
const testCropRegionUnsafeLeft: ICropRegion = {
    ...testCropRegionValid,
    left: Number.POSITIVE_INFINITY,
};
const testCropRegionUnsafeWidth: ICropRegion = {
    ...testCropRegionValid,
    width: Number.POSITIVE_INFINITY,
};
const testCropRegionUnsafeHeight: ICropRegion = {
    ...testCropRegionValid,
    height: Number.POSITIVE_INFINITY,
};

const testCropRegionInvalidTop: ICropRegion = {
    ...testCropRegionValid,
    top: -1,
};
const testCropRegionInvalidLeft: ICropRegion = {
    ...testCropRegionValid,
    left: -1,
};
const testCropRegionInvalidWidth: ICropRegion = {
    ...testCropRegionValid,
    width: 0,
};
const testCropRegionInvalidHeight: ICropRegion = {
    ...testCropRegionValid,
    height: 0,
};

describe("Should check if a crop region is valid", () => {
    it("Should not throw with valid crop region", () => {
        expect(() => cropRegionGuard(testCropRegionValid)).to.not.throw();
    });

    describe("Should throw when any of the fields are unsafe integers", () => {
        it("Should throw when top field is unsafe integer", () => {
            expect(() => cropRegionGuard(testCropRegionUnsafeTop)).to.throw(
                /Crop region's top field is not a safe integer/
            );
        });

        it("Should throw when left field is unsafe integer", () => {
            expect(() => cropRegionGuard(testCropRegionUnsafeLeft)).to.throw(
                /Crop region's left field is not a safe integer/
            );
        });

        it("Should throw when width field is unsafe integer", () => {
            expect(() => cropRegionGuard(testCropRegionUnsafeWidth)).to.throw(
                /Crop region's width field is not a safe integer/
            );
        });

        it("Should throw when height field is unsafe integer", () => {
            expect(() => cropRegionGuard(testCropRegionUnsafeHeight)).to.throw(
                /Crop region's height field is not a safe integer/
            );
        });
    });

    describe("Should throw when any of the fields are invalid (i.e less than 0)", () => {
        it("Should throw when top field is less than 0", () => {
            expect(() => cropRegionGuard(testCropRegionInvalidTop)).to.throw(
                /Crop region's top position must be at least 0/
            );
        });

        it("Should throw when left field is less than 0", () => {
            expect(() => cropRegionGuard(testCropRegionInvalidLeft)).to.throw(
                /Crop region's left position must be at least 0/
            );
        });

        it("Should throw when width field is less than or equal to 0", () => {
            expect(() => cropRegionGuard(testCropRegionInvalidWidth)).to.throw(
                /Crop region's width must be greater than 0/
            );
        });

        it("Should throw when height field is less than or equal to 0", () => {
            expect(() => cropRegionGuard(testCropRegionInvalidHeight)).to.throw(
                /Crop region's height must be greater than 0/
            );
        });
    });
});
