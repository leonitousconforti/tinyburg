import { Image, ImageType } from "../../src/image-operations/image.js";
import { sourceImageGuard } from "../../src/parameter-guards/source-image-guard.js";

const testSourceImageValid: Image = {
    width: 10,
    height: 10,
    channels: 1,
    format: ImageType.GRAY,
    pixels: Buffer.alloc(10 * 10 * 1),
};

const testSourceImageUnsafeWidth: Image = {
    ...testSourceImageValid,
    width: Number.POSITIVE_INFINITY,
};
const testSourceImageUnsafeHeight: Image = {
    ...testSourceImageValid,
    height: Number.POSITIVE_INFINITY,
};
const testSourceImageInvalidWidth: Image = {
    ...testSourceImageValid,
    width: -1,
};
const testSourceImageInvalidHeight: Image = {
    ...testSourceImageValid,
    height: -1,
};
const testSourceImageNoPixels: Image = {
    ...testSourceImageValid,
    pixels: Buffer.alloc(0),
};
const testSourceImageInvalidPixels: Image = {
    ...testSourceImageValid,
    pixels: Buffer.alloc(testSourceImageValid.width * testSourceImageValid.height - 1),
};

describe("Should check if a source image is valid", () => {
    it("Should not throw with a valid source image", () => {
        expect(() => sourceImageGuard(testSourceImageValid)).to.not.throw();
    });

    describe("Should throw when any of the dimensions are not safe integers", () => {
        it("Should throw if width field is unsafe", () => {
            expect(() => sourceImageGuard(testSourceImageUnsafeWidth)).to.throw(/Image's width must be a safe integer/);
        });

        it("Should throw if height field is unsafe", () => {
            expect(() => sourceImageGuard(testSourceImageUnsafeHeight)).to.throw(
                /Image's height must be a safe integer/
            );
        });
    });

    describe("Should throw if any of the dimensions are less than 0", () => {
        it("Should throw if width is less than 0", () => {
            expect(() => sourceImageGuard(testSourceImageInvalidWidth)).to.throw(
                /Image's width must be greater than 0/
            );
        });

        it("Should throw if height is less than 0", () => {
            expect(() => sourceImageGuard(testSourceImageInvalidHeight)).to.throw(
                /Image's height must be greater than 0/
            );
        });
    });

    describe("Should throw if pixel buffer is not correct", () => {
        it("Should throw if pixel buffer has no data", () => {
            expect(() => sourceImageGuard(testSourceImageNoPixels)).to.throw(/Image must contain some pixel data/);
        });

        it("Should throw if pixel buffer does not have correct size", () => {
            expect(() => sourceImageGuard(testSourceImageInvalidPixels)).to.throw(
                /Image's pixel buffer must be of correct size/
            );
        });
    });
});
