import type { Image } from "./image.js";
import type { Match } from "./template-matching.js";

import { ImageType } from "./image.js";
import { dropChannel } from "./drop-channel.js";
import { upscaleImage } from "./upscale-image.js";
import { matchTemplate } from "./template-matching.js";
import { loadCharTemplates } from "./load-template.js";

export type DetectionLibrary = Array<{ character: string; template: Image; mask?: Image }>;
export const numericalImagesDictionary = await loadCharTemplates("0", "1", "2", "3", "4", "5", "6", "7", "8", "9");
export const punctuationImagesDictionary = await loadCharTemplates("!", "?", ",", ".", '"', "'", ";", ":");
export const alphabeticalImagesDictionary = await loadCharTemplates(
    "A",
    "B",
    "C",
    "D",
    "E",
    "F",
    "G",
    "H",
    "I",
    "J",
    "K",
    "L",
    "M",
    "N",
    "O",
    "P",
    "Q",
    "R",
    "S",
    "T",
    "U",
    "V",
    "W",
    "X",
    "Y",
    "Z"
);

/** Preps an image dictionary to be used by the detect sequence method */
export const prepDictionaryToLibrary = (
    dictionary: Record<string, Image>,
    resourceScale = 1,
    transformer?: (sourceImage: Image) => Image
): DetectionLibrary =>
    Object.entries(dictionary)
        // Map each entry to an object with the character and the image
        .map(([character, image]) => ({ character, image }))

        // Map each image to the appropriate resource scale
        .map(({ image, ...rest }) => ({ upscaledImage: upscaleImage(image, resourceScale), ...rest }))

        // Map each image to the dropped channel equivalent
        .map(({ upscaledImage, ...rest }) => ({ ...dropChannel(upscaledImage, 4, ImageType.RGB), ...rest }))

        // Convert to final form
        .map(({ modifiedSourceImage, droppedChannelImage, ...rest }) => ({
            template: transformer ? transformer(modifiedSourceImage) : modifiedSourceImage,
            mask: droppedChannelImage,
            ...rest,
        }));

/**
 * Detects a sequence of characters from the supplied detection library in the
 * source image
 */
export const detectSequence = (sourceImage: Image, detectionLibrary: DetectionLibrary, templateMatchThreshold = 1) =>
    detectionLibrary
        // Map each entry in the detection library to an object with
        // its character and a list of matches found in the source image
        .map(({ character, template, mask }) => ({ character, matches: matchTemplate(sourceImage, template, mask) }))

        // Map each list of matches to a list of object with the match and the character,
        // the flat map operation will then compress them all down into one array at the end
        .flatMap(({ character, matches }) => matches.map((match) => ({ character, match })))

        // Filter out any match that does not meet the similarity threshold
        .filter((detection) => detection.match.similarity >= templateMatchThreshold)

        // Sort the matches left to right, first by vertical position then by horizontal position
        .sort((a, b) => {
            if (a.match.position.y === b.match.position.y) {
                return a.match.position.x - b.match.position.x;
            }
            return a.match.position.y - b.match.position.y;
        })

        // Convert each detection to the detected character, then join them all into one string
        // eslint-disable-next-line unicorn/no-array-reduce
        .reduce<{ sequence: string; matches: Match[] }>(
            (object, detection) => {
                object.matches.push(detection.match);
                object.sequence += detection.character;
                return object;
            },
            { sequence: "", matches: [] }
        );
