import { Image, ImageType } from "../../src/image-operations/image.js";
import { upscaleImage } from "../../src/image-operations/upscale-image.js";

const testImage: Image = {
    width: 3,
    height: 4,
    channels: 1,
    format: ImageType.GRAY,

    // prettier-ignore
    pixels: Buffer.from([
        1,  2,  3,
        4,  5,  6,
        7,  8,  9,
        10, 11, 12
    ]),
};

describe("Should fail to upscale image", () => {
    it("Should throw when scaling factor is negative", () => {
        expect(() => upscaleImage(testImage, -1)).to.throw(/Invalid scale factor/);
    });

    it("Should throw when scaling factor is not a whole number", () => {
        expect(() => upscaleImage(testImage, 1.5)).to.throw(/Invalid scale factor/);
    });
});

describe("Should upscale an image 3x", () => {
    const resultImage = upscaleImage(testImage, 3);

    it("Should have correct dimensions", () => {
        expect(resultImage.width).to.equal(9, "expect width to be 9");
        expect(resultImage.height).to.equal(12, "expect height to be 12");
    });

    it("Should have correct pixel buffer and channels", () => {
        expect(resultImage.channels).to.equal(1, "expect one channel");
        expect(resultImage.pixels).to.deep.equal(
            Buffer.from([
                1, 1, 1, 2, 2, 2, 3, 3, 3, 1, 1, 1, 2, 2, 2, 3, 3, 3, 1, 1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 4, 5, 5, 5, 6, 6,
                6, 4, 4, 4, 5, 5, 5, 6, 6, 6, 4, 4, 4, 5, 5, 5, 6, 6, 6, 7, 7, 7, 8, 8, 8, 9, 9, 9, 7, 7, 7, 8, 8, 8, 9,
                9, 9, 7, 7, 7, 8, 8, 8, 9, 9, 9, 10, 10, 10, 11, 11, 11, 12, 12, 12, 10, 10, 10, 11, 11, 11, 12, 12, 12,
                10, 10, 10, 11, 11, 11, 12, 12, 12,
            ]),
            "expect correct pixel buffer"
        );
    });
});
