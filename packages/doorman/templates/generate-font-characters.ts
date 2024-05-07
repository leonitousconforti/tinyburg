import type { ICropRegion } from "../src/image-operations/crop-image.js";
import type { Image } from "../src/image-operations/image.js";

import fs from "node:fs";
import path from "node:url";
import sharp from "sharp";
import { addChannel } from "../src/image-operations/add-channels.js";
import { dropChannel } from "../src/image-operations/drop-channel.js";
import { grayscaleImage } from "../src/image-operations/grayscale-image.js";
import { ImageType, imageTypeFromChannelsForPng } from "../src/image-operations/image.js";
import { maskImage } from "../src/image-operations/mask-image.js";
import { thresholdImage } from "../src/image-operations/threshold-image.js";

// Load the silkscreen image and metadata. These need to be extracted from the game's
// resource files, there are lots of free open source tools out there that do this.
import silkscreen from "./silkscreen.json";
const silkscreenImage = sharp(path.fileURLToPath(new URL("silkscreen.png", import.meta.url)));
const silkscreenMetadata = await silkscreenImage.metadata();

// Ensure that all output folders have been created
for (const folder of ["./png", "./raw", "./metadata"]) {
    const folderPath = path.fileURLToPath(new URL(folder, import.meta.url));
    if (!fs.existsSync(folderPath)) fs.mkdirSync(folderPath, { recursive: true });
}

// For every character on the silkscreen
for (const silkscreenData of silkscreen) {
    const characterInSilkscreenRegion: ICropRegion = {
        top: silkscreenData.y,
        left: silkscreenData.x,
        width: Math.min(silkscreenMetadata.width! - silkscreenData.x, silkscreenData.width!),
        height: Math.min(silkscreenMetadata.height! - silkscreenData.y, silkscreenData.height!),
    };

    // The space character actually has a width and height of zero
    // which will cause problems later, we just ignore it here
    if (characterInSilkscreenRegion.width <= 0 || characterInSilkscreenRegion.height <= 0) continue;

    // Setup output file paths
    const characterPngPath = new URL(`png/char_${silkscreenData.char_id}.png`, import.meta.url);
    const characterRawPath = new URL(`raw/char_${silkscreenData.char_id}.bin`, import.meta.url);
    const characterMetadataPath = new URL(`metadata/char_${silkscreenData.char_id}.json`, import.meta.url);

    // Prep the character image
    const characterMessySharp = silkscreenImage.clone().extract(characterInSilkscreenRegion);
    const characterMessySharpMetadata = await characterMessySharp.metadata();
    const characterMessyRawBuffer = await characterMessySharp.raw().toBuffer();
    const characterMessyImage: Image = {
        pixels: characterMessyRawBuffer,
        width: characterInSilkscreenRegion.width,
        height: characterInSilkscreenRegion.height,
        channels: characterMessySharpMetadata.channels!,
        format: imageTypeFromChannelsForPng(characterMessySharpMetadata.channels!),
    };

    // Clean the character image by converting it to masking it with the alpha image and then add the alpha back
    const { droppedChannelImage, modifiedSourceImage } = dropChannel(characterMessyImage, 4, ImageType.RGB);
    const characterMasked = maskImage(modifiedSourceImage, droppedChannelImage, 100, true);
    const characterAlphaGrayscaled = grayscaleImage(characterMasked);
    const characterAlphaThresholded = thresholdImage(characterAlphaGrayscaled, 1);
    const characterClean = addChannel(characterMasked, characterAlphaThresholded, ImageType.RGB_A);

    // Save data to files
    const char = sharp(characterClean.pixels, { raw: characterClean as sharp.CreateRaw });
    const charMetadata = await char.png().toFile(path.fileURLToPath(characterPngPath));
    fs.writeFileSync(path.fileURLToPath(characterRawPath), await char.raw().toBuffer());
    fs.writeFileSync(path.fileURLToPath(characterMetadataPath), JSON.stringify(charMetadata));
}
