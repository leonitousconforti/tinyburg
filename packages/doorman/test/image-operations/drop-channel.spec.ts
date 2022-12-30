import { Image, ImageType } from "../../src/image-operations/image.js";
import { dropChannel } from "../../src/image-operations/drop-channel.js";

const testImage: Image = {
    width: 3,
    height: 4,
    channels: 2,
    format: ImageType.GRAY_A,

    // prettier-ignore
    pixels: Buffer.from([
        1,  1,  2,  2,  3,  3,
        4,  4,  5,  5,  6,  6,
        7,  7,  8,  8,  9,  9,
        10, 10, 11, 11, 12, 12
    ]),
};

// Can't drop channel from Image with only one channel
const testImageNotEnoughChannels: Image = {
    width: 3,
    height: 4,
    channels: 1,
    format: ImageType.GRAY,
    pixels: Buffer.alloc(3 * 4),
};

describe("Should fail to drop channel(s) from image", () => {
    it("Should throw if not enough channels in source image", () => {
        expect(() => dropChannel(testImageNotEnoughChannels, ImageType.GRAY, 1)).to.throw(
            /Cannot drop a channel from an image with only one channel/
        );
    });

    it("Should throw if input image does not contain the channel to drop", () => {
        expect(() => dropChannel(testImage, ImageType.GRAY, 4)).to.throw(
            /Drop channel must be within the sourceImage channels/
        );
    });
});

describe("Should drop channel(s) from image", () => {
    const { modifiedSourceImage, droppedChannelImage } = dropChannel(testImage, ImageType.GRAY, 2);

    it("Dropped channel should have correct dimensions", () => {
        expect(droppedChannelImage.width).to.equal(testImage.width);
        expect(droppedChannelImage.height).to.equal(testImage.height);
    });

    it("Dropped channel should be GRAY format and have only 1 channel", () => {
        expect(droppedChannelImage.channels).to.equal(1);
        expect(droppedChannelImage.format).to.equal(ImageType.GRAY);
    });

    it("Dropped channel should have correct pixels", () => {
        // prettier-ignore
        expect(droppedChannelImage.pixels).to.deep.equal(Buffer.from([
            1,  2,  3,
            4,  5,  6,
            7,  8,  9,
            10, 11, 12
        ]));
    });

    it("Modified source image should have correct dimensions", () => {
        expect(modifiedSourceImage.width).to.equal(testImage.width);
        expect(modifiedSourceImage.height).to.equal(testImage.height);
    });

    it("Modified source image should have correct new format and have correct channels", () => {
        expect(droppedChannelImage.channels).to.equal(1);
        expect(droppedChannelImage.format).to.equal(ImageType.GRAY);
    });

    it("Modified source image should have correct pixels", () => {
        // prettier-ignore
        expect(droppedChannelImage.pixels).to.deep.equal(Buffer.from([
            1,  2,  3,
            4,  5,  6,
            7,  8,  9,
            10, 11, 12
        ]));
    });
});
