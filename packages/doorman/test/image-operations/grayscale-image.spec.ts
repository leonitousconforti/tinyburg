// import { Image, ImageType } from "../../src/image-operations/image.js";

// const testImage: Image = {
//     width: 3,
//     height: 4,
//     channels: 3,
//     format: ImageType.RGB,

//     // prettier-ignore
//     pixels: Buffer.from([
//         ...[50, 50, 50],    ...[150, 150, 150], ...[250, 250, 250],
//         ...[50, 150, 250],  ...[150, 50, 250],  ...[250, 50, 150],
//         ...[0, 0, 0],       ...[10, 10, 10],    ...[255, 255, 255],
//         ...[175, 175, 175], ...[6, 7, 8],       ...[40, 0, 80]
//     ]),
// };

// // Can't convert to grayscale, unsupported format
// const testImageUnsupportedFormatGray: Image = {
//     width: 3,
//     height: 4,
//     channels: 1,
//     format: ImageType.GRAY,
//     pixels: Buffer.alloc(12),
// };
// const testImageUnsupportedFormatGrayAlpha: Image = {
//     width: 3,
//     height: 4,
//     channels: 2,
//     format: ImageType.GRAY_A,
//     pixels: Buffer.alloc(12),
// };

describe("Should fail to convert image to grayscale", () => {
    it("Should throw if image format is already grayscale", () => {});

    it("Should throw if image format is already grayscale with alpha", () => {});
});

describe("Should convert an image to grayscale", () => {
    describe("Should convert image with rgb format to grayscale", () => {});

    describe("Should convert image with bgr format to grayscale", () => {});

    describe("Should convert image with rgb with alpha format to grayscale", () => {});

    describe("Should convert image with bgr with alpha format to grayscale", () => {});
});
