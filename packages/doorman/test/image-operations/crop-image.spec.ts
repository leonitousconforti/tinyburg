import { Image, ImageType } from "../../src/image-operations/image.js";
import { cropImage, ICropRegion } from "../../src/image-operations/crop-image.js";

const testImage: Image = {
    width: 3,
    height: 4,
    channels: 1,
    format: ImageType.RGB_A,

    // prettier-ignore
    pixels: Buffer.from([
        1,  2,  3,
        4,  5,  6,
        7,  8,  9,
        10, 11, 12
    ]),
};

// Should return a copy of the input image when cropping to this region
const testCropRegionNoChange: ICropRegion = {
    top: 0,
    left: 0,
    width: testImage.width,
    height: testImage.height,
};

// Should return a new image with this region
const testCropRegionWithChanges: ICropRegion = {
    top: 1,
    left: 1,
    width: testImage.width - 1,
    height: testImage.height - 1,
};

// Can't crop, too wide
const testCropRegionTooWide: ICropRegion = {
    top: 0,
    left: 0,
    width: testImage.width + 1,
    height: testImage.height,
};

// Can't crop, too tall
const testCropRegionTooTall: ICropRegion = {
    top: 0,
    left: 0,
    width: testImage.width,
    height: testImage.height + 1,
};

// Can't crop, too wide non zero starting point
const testCropRegionTooWideNonZeroLeft: ICropRegion = {
    left: Math.floor(testImage.width / 2),
    top: 0,
    width: testImage.width,
    height: testImage.height,
};

// Can't crop, too tall non zero starting point
const testCropRegionTooTallNonZeroTop: ICropRegion = {
    left: 0,
    top: Math.floor(testImage.height / 2),
    width: testImage.width,
    height: testImage.height,
};

describe("Should fail to crop image", () => {
    it("Should throw if crop region extends beyond the width of the image", () => {
        expect(() => cropImage(testImage, testCropRegionTooWide)).to.throw(
            /Crop region extends beyond the width of the image/
        );
        expect(() => cropImage(testImage, testCropRegionTooWideNonZeroLeft)).to.throw(
            /Crop region extends beyond the width of the image/
        );
    });

    it("Should throw if crop region extends beyond the height of the image", () => {
        expect(() => cropImage(testImage, testCropRegionTooTall)).to.throw(
            /Crop region extends beyond the height of the image/
        );
        expect(() => cropImage(testImage, testCropRegionTooTallNonZeroTop)).to.throw(
            /Crop region extends beyond the height of the image/
        );
    });
});

describe("Should crop an image and return a new image", () => {
    describe("Should return a copy of the same image when crop region has same dimensions as image", () => {
        const croppedImage = cropImage(testImage, testCropRegionNoChange);

        it("Should have correct dimensions", () => {
            expect(croppedImage.width).to.equal(testImage.width);
            expect(croppedImage.height).to.equal(testImage.height);
        });

        it("Should have correct number of channels and image type", () => {
            expect(croppedImage.format).to.equal(testImage.format);
            expect(croppedImage.channels).to.equal(testImage.channels);
        });

        it("Should have correct pixels from input image", () => {
            expect(croppedImage.pixels).to.deep.equal(testImage.pixels);
        });
    });

    describe("Should return a new image with the proper pixels", () => {
        const croppedImage = cropImage(testImage, testCropRegionWithChanges);

        it("Should have correct dimensions", () => {
            expect(croppedImage.width).to.equal(testImage.width - 1);
            expect(croppedImage.height).to.equal(testImage.height - 1);
        });

        it("Should have correct number of channels and image type", () => {
            expect(croppedImage.format).to.equal(testImage.format);
            expect(croppedImage.channels).to.equal(testImage.channels);
        });

        it("Should have correct pixels from input image", () => {
            // prettier-ignore
            expect(croppedImage.pixels).to.deep.equal(Buffer.from([
                5,  6,
                8,  9,
                11, 12
            ]));
        });
    });
});
