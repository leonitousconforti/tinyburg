import { Image, ImageType } from "../../src/image-operations/image.js";
import { addChannel } from "../../src/image-operations/add-channels.js";

const testImage: Image = {
    width: 3,
    height: 4,
    channels: 2,
    format: ImageType.GRAY,

    // prettier-ignore
    pixels: Buffer.from([
        ...[1, 12], ...[2, 11], ...[3, 10],
        ...[4, 9],  ...[5, 8],  ...[6, 7],
        ...[7, 6],  ...[8, 5],  ...[9, 4],
        ...[10, 3], ...[11, 2], ...[12, 1]
    ]),
};

const goodChannelToAdd: Image = {
    width: 3,
    height: 4,
    channels: 1,
    format: ImageType.GRAY,

    // prettier-ignore
    pixels: Buffer.from([
        1, 2, 3,
        4, 5, 6,
        7, 8, 9,
        10, 11, 12
    ]),
};

const badChannelToAddTooManyChannels: Image = {
    width: 3,
    height: 4,
    channels: 4,
    format: ImageType.GRAY,
    pixels: Buffer.alloc(48),
};

const badChannelToAddWidthMismatch: Image = { ...goodChannelToAdd, width: 10, pixels: Buffer.alloc(40) };
const badChannelToAddHeightMismatch: Image = { ...goodChannelToAdd, height: 10, pixels: Buffer.alloc(30) };

describe("Should fail to add channel(s) to an image", () => {
    it("Should throw when there are too many channels", () => {
        expect(() => addChannel(testImage, badChannelToAddTooManyChannels, ImageType.GRAY)).to.throw(
            /Too many channels, can not add another channel/
        );
    });

    it("Should throw when width is not the same", () => {
        expect(() => addChannel(testImage, badChannelToAddWidthMismatch, ImageType.GRAY)).to.throw(
            /Source and new channel images must be the same width/
        );
    });

    it("Should throw when height is not the same", () => {
        expect(() => addChannel(testImage, badChannelToAddHeightMismatch, ImageType.GRAY)).to.throw(
            /Source and new channel images must be the same height/
        );
    });
});

describe("Should add channel(s) to an image", () => {
    const resultImage = addChannel(testImage, goodChannelToAdd, ImageType.RGB);

    it("Should have correct dimensions", () => {
        expect(resultImage.width).to.equal(3, "Expect width to be 3");
        expect(resultImage.height).to.equal(4, "Expect height to be 4");
    });

    it("Should have correct pixel buffer and channels", () => {
        expect(resultImage.channels).to.equal(3, "Expect three channels");
        expect(resultImage.format).to.equal(ImageType.RGB, "Expect image format to be RGB");

        // prettier-ignore
        expect(resultImage.pixels).to.deep.equal(
            Buffer.from([
                ...[1, 12, 1],  ...[2, 11, 2],  ...[3, 10, 3],
                ...[4, 9, 4],   ...[5, 8, 5],   ...[6, 7, 6],
                ...[7, 6, 7],   ...[8, 5, 8],   ...[9, 4, 9],
                ...[10, 3, 10], ...[11, 2, 11], ...[12, 1, 12]
            ]),
            "Expect correct pixel buffer"
        );
    });
});
