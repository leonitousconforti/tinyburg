import type { Image } from "./image.js";

import assert from "node:assert";
import { ImageType } from "./image.js";

/** A match is comprised of a position and similarity score [0, 1] for a match */
export type Match = {
    position: {
        x: number;
        y: number;
    };
    similarity: number;
};

/** Specify how the template image can land in the search image */
export interface ITemplateMatchingOrientationOptions {
    noOverlapVertically?: boolean;
    noOverlapHorizontally?: boolean;
}

// The largest search image and template image domains. Node.js can't
// handle much larger than this in a reasonable amount of time
export const MAX_SEARCH_DOMAIN: number = 250 * 250 * 3;
export const MAX_TEMPLATE_DOMAIN: number = 50 * 50 * 3;

/**
 * Matches a template against a search image using a SAD (sum of absolute
 * differences) measure.
 *
 * @param searchImage
 * @param templateImage
 * @param mask
 * @param wantExact
 * @param orientationOptions
 * @see https://en.wikipedia.org/wiki/Template_matching#Implementation
 * @see https://docs.opencv.org/4.5.5/de/da9/tutorial_template_matching.html
 * @see https://pyimagesearch.com/2021/03/22/opencv-template-matching-cv2-matchtemplate/
 */
export const matchTemplate = (
    searchImage: Image,
    templateImage: Image,
    mask?: Image,
    wantExact: boolean = true,
    orientationOptions?: ITemplateMatchingOrientationOptions
): Match[] => {
    // The search image and template image must have the same number of channels
    assert.strictEqual(
        searchImage.channels,
        templateImage.channels,
        "Search image and template must have same number of channels"
    );

    // The mask must have one channel, the same width as the
    // template image, and the same height as the template image
    if (mask) {
        assert.strictEqual(mask.channels, 1, "Mask must have only one channel");
        assert.strictEqual(mask.format, ImageType.GRAY, "Must must be in grayscale image format");
        assert.strictEqual(mask.width, templateImage.width, "Mask must be same width as template image");
        assert.strictEqual(mask.height, templateImage.height, "Mask must be same height as template image");
    }

    // If every pixel in the mask is less than 255, then every pixel in the
    // template image will be skipped thus there would be no matches
    if (mask?.pixels.every((pixel) => pixel < 255)) {
        console.warn("Mask image supplied was trivial, no matches would be detected");
        return [];
    }

    // Template matching doesn't ignore alpha channel, so it will add the difference
    // between the alpha channels to the total sum as well, which may not be desired.
    if (searchImage.channels >= 4) {
        console.warn("Using matchTemplate with an image that contains an alpha channel may produce undesired results!");
    }

    // Doesn't handle really big images in a reasonable time
    if (
        searchImage.width * searchImage.height * searchImage.channels > MAX_SEARCH_DOMAIN ||
        templateImage.width * templateImage.height * templateImage.channels > MAX_TEMPLATE_DOMAIN
    ) {
        console.warn("Using matchTemplate with large images will result in bad performance, consider cropping them.");
    }

    // Initialize variables
    let matches: Match[] = [];
    let minSAD = Number.MAX_SAFE_INTEGER;

    // The search advance can be changed based upon some known characteristics of the
    // orientation of the template image in the search image. If the template image can't
    // overlap with itself horizontally, then the search region advances by the template
    // image's width. Likewise for if the template image can't overlap itself vertically.
    const searchAdvanceX = orientationOptions?.noOverlapHorizontally ? templateImage.width : 1;
    const searchAdvanceY = orientationOptions?.noOverlapVertically ? templateImage.height : 1;

    // Loop through the search image
    for (let s_y = 0; s_y <= searchImage.height - templateImage.height; s_y += searchAdvanceY) {
        for (let s_x = 0; s_x <= searchImage.width - templateImage.width; s_x += searchAdvanceX) {
            // Sum of absolute differences
            let SAD = 0;
            let similaritySum = 0;

            // Keep track of any differences in the image at all
            let exact = true;

            // Loop over the template image
            for (let t_y = 0; t_y < templateImage.height; t_y++) {
                for (let t_x = 0; t_x < templateImage.width; t_x++) {
                    // Check the mask if this pixel should be included
                    if (mask && mask.pixels[t_y * mask.width + t_x] < 255) {
                        continue;
                    }

                    // Calculate the pixel indexes
                    const templatePixelIndex = (t_y * templateImage.width + t_x) * templateImage.channels;
                    const searchPixelIndex = ((s_y + t_y) * searchImage.width + (s_x + t_x)) * searchImage.channels;

                    // Create an array from 0 to channels-1
                    const channels = Array.from({ length: searchImage.channels }).map((__value, index) => index);

                    // Store the search image and template image channel values in arrays
                    const channelValues = channels.map((channel) => [
                        searchImage.pixels[searchPixelIndex + channel],
                        templateImage.pixels[templatePixelIndex + channel],
                    ]);

                    // Calculate the difference between each channel
                    const diffs = channelValues.map((channelValue) => Math.abs(channelValue[0] - channelValue[1]));

                    // For the similarity sum, scale the difference between each channel by the
                    // maximum difference of 255. Then add them all together. For the SAD metric just add
                    similaritySum += diffs.map((diff) => diff / 255).reduce((partialSum, diff) => partialSum + diff, 0);
                    SAD += diffs.reduce((partialSum, diff) => partialSum + diff, 0);

                    if (SAD > 0 && wantExact) {
                        exact = false;
                        break;
                    }
                }

                if (wantExact && !exact) {
                    break;
                }
            }

            // If this match is a new best score, clear the matches list
            if (SAD < minSAD && (!wantExact || (wantExact && exact))) {
                matches = [];
            }

            // Save the best found positions
            if (SAD <= minSAD && (!wantExact || (wantExact && exact))) {
                // Reset the min sum of absolute differences
                minSAD = SAD;
                matches.push({
                    position: {
                        x: s_x,
                        y: s_y,
                    },
                    similarity:
                        1 - similaritySum / (templateImage.width * templateImage.height * templateImage.channels),
                });
            }
        }
    }

    return matches;
};
