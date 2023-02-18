import type { ILogger } from "./logger.js";
import type { DecompressedSave } from "./decompress-save.js";
import type { INimblebitJsonSave } from "./parsing-structs/blocks.js";

import { DebugLogger } from "./logger.js";
import { concatJsonToBlock, parseSaveToJson } from "./save-parser.js";

// Debug logger, will default to this if no other logger is supplied
const loggingNamespace: string = "tinyburg:compare_saves";
const debug: ILogger = new DebugLogger(loggingNamespace);

// Checks which save is better between save1 and save2
export const whichSaveIsBetter = async function <T extends INimblebitJsonSave | DecompressedSave>(
    save1: T,
    save2: T,
    forceLoadStructs: boolean = false,
    logger: ILogger = debug
): Promise<1 | 2> {
    const passLogger = logger === debug ? undefined : logger;

    // Check if the incoming type is INimblebitJsonSave or DecompressedSave
    const incomingAsStrings = typeof save1 === "string";

    // Parsed save variables
    let parsedSave1: INimblebitJsonSave = save1 as never;
    let parsedSave2: INimblebitJsonSave = save2 as never;

    // Parse the saves if needed
    if (incomingAsStrings) {
        logger.debug("Checking which save is better between save1: %s and save2: %s", save1, save2);
        parsedSave1 = await parseSaveToJson(save1 as DecompressedSave, forceLoadStructs, passLogger);
        parsedSave2 = await parseSaveToJson(save2 as DecompressedSave, forceLoadStructs, passLogger);
    } else {
        logger.debug("Checking which save is better between save1: %s and save2: %s", save1, save2);
    }

    // Initialize required variables
    const parsedSave1_stories = parsedSave1.stories ?? [];
    const parsedSave2_stories = parsedSave2.stories ?? [];
    const parsedSave1_totalPoints = parsedSave1.totalPoints ?? 0;
    const parsedSave2_totalPoints = parsedSave2.totalPoints ?? 0;

    // Check total points special case
    if (parsedSave1_totalPoints === 0 && parsedSave2_totalPoints < 100) {
        if (parsedSave1_stories.length > parsedSave2_stories.length) {
            return 1;
        }

        return 2;
    }

    // Compare total points
    if (parsedSave1_totalPoints !== parsedSave2_totalPoints) {
        return parsedSave1_totalPoints > parsedSave2_totalPoints ? 1 : 2;
    }

    // Compare stories
    if (parsedSave1_stories.length > parsedSave2_stories.length) {
        return 1;
    }
    if (parsedSave2_stories.length > parsedSave1_stories.length) {
        return 2;
    }

    // Default to save2
    return 2;
};

// Makes a particular save valued more over another - nimblebit's servers do some similar checks
// when pushing saves to make sure that the save being uploaded is better than the previous one
export const makeSaveBetterThan = async function <T extends INimblebitJsonSave | DecompressedSave>(
    save1: T,
    save2: T,
    forceLoadStructs: boolean = false,
    logger: ILogger = debug
): Promise<T> {
    const passLogger = logger === debug ? undefined : logger;

    // Check if the incoming type is INimblebitJsonSave or DecompressedSave
    const incomingAsStrings = typeof save1 === "string";

    // Parsed save variables
    let parsedSave1: INimblebitJsonSave = save1 as never;
    let parsedSave2: INimblebitJsonSave = save2 as never;

    // Parse the saves if needed
    if (incomingAsStrings) {
        logger.debug("Starting make save better than with save1: %s, save2: %s", save1, save2);
        parsedSave1 = await parseSaveToJson(save1 as DecompressedSave, forceLoadStructs, passLogger);
        parsedSave2 = await parseSaveToJson(save2 as DecompressedSave, forceLoadStructs, passLogger);
    } else {
        logger.debug("Starting make save better than with save1: %o, save2: %o", save1, save2);
    }

    // Initialize total points if necessary
    if (!parsedSave1.totalPoints) {
        parsedSave1.totalPoints = 0;
    }

    // Make the save better by increasing the total points
    do {
        parsedSave1.totalPoints += 1;
    } while ((await whichSaveIsBetter(parsedSave1, parsedSave2, forceLoadStructs, passLogger)) === 2);

    // If the incoming data did not come in as json, do not return it as json
    if (incomingAsStrings) {
        return concatJsonToBlock(parsedSave1, forceLoadStructs, passLogger) as unknown as T;
    }

    // Otherwise return it as it came in, JSON
    return parsedSave1 as unknown as T;
};
