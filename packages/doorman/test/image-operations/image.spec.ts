import { ImageType, imageTypeFromChannelsForPng } from "../../src/image-operations/image.js";

describe("Image type from channels for PNG", () => {
    it("Should compute correct image type from number of channels", () => {
        expect(imageTypeFromChannelsForPng(1)).to.equal(ImageType.GRAY, "One channel is grayscale");
        expect(imageTypeFromChannelsForPng(2)).to.equal(ImageType.GRAY_A, "two channel is grayscale with alpha");
        expect(imageTypeFromChannelsForPng(3)).to.equal(ImageType.RGB, "Three channels is RGB");
        expect(imageTypeFromChannelsForPng(4)).to.equal(ImageType.RGB_A, "Four channels is RGB with alpha");
    });
});
