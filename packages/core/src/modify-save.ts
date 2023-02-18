import { DebugLogger, ILogger } from "./logger.js";
import { parseSaveToJson, concatJsonToBlock } from "./save-parser.js";
import { concatenationSubRoutine, parsingSubRoutine } from "./parsing-structs/parsing-subroutines.js";
import { blocks, GenericBlocks, GenericJsonSave, INimblebitJsonSave } from "./parsing-structs/blocks.js";

import type { DecompressedSave } from "./decompress-save.js";

// Debug logger
const loggingNamespace: string = "tinyburg:modify_save";
const debug: ILogger = new DebugLogger(loggingNamespace);

// Parses a block to typed data
export const parseDataToType = function <T extends GenericBlocks, U extends GenericJsonSave<T>>(
    data: string | DecompressedSave,
    parsingType: T,
    logger: ILogger = debug
): U {
    logger.debug("Parsing %s to type %s", data, parsingType);
    return parsingSubRoutine(data as DecompressedSave, parsingType, logger === debug ? undefined : logger);
};

// Converts typed data to a block
export const typedDataToBlock = function <T extends GenericBlocks, U extends GenericJsonSave<T>>(
    data: U,
    parsingBlocks: T,
    logger: ILogger = debug
): DecompressedSave {
    logger.debug("Converting typed data %o to blockStr", data);
    return concatenationSubRoutine(data, parsingBlocks, logger === debug ? undefined : logger);
};

// Extracts a given value from a downloaded save and returns it in string representation.
// Useful for the visit and upload save endpoints where we have to extract a certain part
// of the downloaded save to use as a param
export const extract = async function <
    T extends INimblebitJsonSave | DecompressedSave,
    U extends keyof INimblebitJsonSave,
    V extends T extends INimblebitJsonSave ? INimblebitJsonSave[U] : DecompressedSave
>(saveData: T, key: U, forceLoadStructs: boolean = false, logger: ILogger = debug): Promise<V> {
    const passLogger = logger === debug ? undefined : logger;
    logger.debug("Extracting key %s from data %o", key, saveData);

    // Check incoming types
    const incomingSaveDataAsStrings = typeof saveData === "string";

    // Parse the save data if needed
    let parsedSaveData: INimblebitJsonSave = saveData as INimblebitJsonSave;
    if (incomingSaveDataAsStrings) {
        parsedSaveData = await parseSaveToJson(saveData as DecompressedSave, forceLoadStructs, passLogger);
    }

    // Extract the data
    const data = { [key]: parsedSaveData[key] };

    // Convert it to a decompressed save if it came in as a decompressed save
    if (incomingSaveDataAsStrings) {
        return concatenationSubRoutine(data as never, blocks, passLogger) as V;
    }
    return data[key] as V;
};

// Modifies a save by changing the requested keys (utilizes quite a bit of generics features for the types)
// See: https://stackoverflow.com/questions/56342559/typescript-parameters-a-generic-array-of-objects-and-array-of-objects-keys-p
// and https://stackoverflow.com/questions/62206320/typescript-require-that-two-arrays-be-the-same-length
export const modifySave = async function <
    T extends INimblebitJsonSave | DecompressedSave,
    U extends keyof INimblebitJsonSave | (readonly [] | readonly (keyof INimblebitJsonSave)[]),
    V extends U extends keyof INimblebitJsonSave
        ? INimblebitJsonSave[U]
        : { [W in keyof U]: U[W] extends keyof INimblebitJsonSave ? INimblebitJsonSave[U[W]] : never }
>(saveDataToModify: T, keys: U, values: V, forceLoadStructs: boolean = false, logger: ILogger = debug): Promise<T> {
    const passLogger = logger === debug ? undefined : logger;

    // Check incoming types
    const incomingSaveDataAsStrings = typeof saveDataToModify === "string";
    const incomingKeyValuesAsStrings = !Array.isArray(keys);

    // Make the keys and values arrays
    let keysArray: (keyof INimblebitJsonSave)[] = keys as never;
    let valuesArray: unknown[] = values as never;

    // Transform the keys and values params into arrays if needed
    if (incomingKeyValuesAsStrings) {
        keysArray = [keys] as (keyof INimblebitJsonSave)[];
        valuesArray = [values];
    }

    // Log
    logger.debug("Modifying save data keys: %o to %o on save data: %s", keysArray, valuesArray, saveDataToModify);

    // Parse the save data if needed
    let parsedSaveData: INimblebitJsonSave = saveDataToModify as never;
    if (incomingSaveDataAsStrings) {
        parsedSaveData = (await parseSaveToJson(
            saveDataToModify as DecompressedSave,
            forceLoadStructs,
            passLogger
        )) as INimblebitJsonSave;
    }

    // Do the modification(s).
    for (const [index, key] of keysArray.entries()) {
        // We don't have to check to make sure there is a corresponding value
        // in the values array because the generic function requires the arrays
        // to be the same length
        const before = parsedSaveData[key];
        const value = valuesArray[index];

        // Yes we need the never cast here, because the 'value' variable has the type
        // unknown it can not be assigned to the parsed save data which is strictly typed
        parsedSaveData[key] = value as never;
        logger.debug("Updated %s from %s to %s", key, before, value);
    }

    // If the incoming data did not come in as json, do not return it as json
    if (incomingSaveDataAsStrings) {
        return (await concatJsonToBlock(parsedSaveData, forceLoadStructs, passLogger)) as T;
    }
    return parsedSaveData as T;
};

// Modifies a save using the replace function, is "safe" because it doesn't parse the save to json thus eliminating the possibility
export const safeModifySave = (
    save: DecompressedSave,
    searchValue: string | RegExp,
    replaceValue: string,
    logger: ILogger = debug
): DecompressedSave => {
    logger.debug("");
    return save.toString().replace(searchValue, replaceValue) as unknown as DecompressedSave;
};
