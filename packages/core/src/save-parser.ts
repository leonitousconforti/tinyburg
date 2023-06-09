import type { ILogger } from "./logger.js";
import type { DecompressedSave } from "./decompress-save.js";
import type { INimblebitJsonSave } from "./parsing-structs/blocks.js";

import { DebugLogger } from "./logger.js";
import { loadFromVersion } from "./parsing-structs/load-from-version.js";
import { parsingSubRoutine, concatenationSubRoutine } from "./parsing-structs/parsing-subroutines.js";

// Debug logger
const loggingNamespace: string = "tinyburg:save_parser";
const debug: ILogger = new DebugLogger(loggingNamespace);

// Parses a decompressed save to JSON format for easier modification later
export const parseSaveToJson = async (
    nimblebitSave: DecompressedSave,
    forceLoadStructs = false,
    log: ILogger = debug
): Promise<INimblebitJsonSave> => {
    // Try to get the version of this save
    let saveVersion = getBlock(nimblebitSave, "Pver", log === debug ? undefined : log);
    if (!saveVersion) {
        saveVersion = "";
    }

    // Load the structs
    const structs = await loadFromVersion(saveVersion, forceLoadStructs, log === debug ? undefined : log);
    log.debug("Starting parsing subroutine");

    // Get the result of the save data
    return parsingSubRoutine(nimblebitSave, structs.blocks, log === debug ? undefined : log);
};

// Concatenates a JSON save to a nimblebit decompressed save format
export const concatJsonToBlock = async (
    jsonSave: INimblebitJsonSave,
    forceLoadStructs = false,
    log: ILogger = debug
): Promise<DecompressedSave> => {
    // Try to get the version of this save and load the structs
    const saveVersion = jsonSave.ver;
    const structs = await loadFromVersion(saveVersion, forceLoadStructs, log === debug ? undefined : log);
    log.debug("Starting concatenation subroutine...");

    // Get the result of the save data
    const result = concatenationSubRoutine(jsonSave, structs.blocks, log === debug ? undefined : log);
    return blockString("_save", result.toString(), log === debug ? undefined : log) as unknown as DecompressedSave;
};

// Appends data to a decompressed save so it has the proper type
export const appendToBlock = (...parts: (string | DecompressedSave)[]): DecompressedSave => {
    return parts.join("") as unknown as DecompressedSave;
};

export const getBlock = (
    saveData: DecompressedSave,
    key: unknown,
    log: ILogger = debug
    // eslint-disable-next-line @rushstack/no-new-null
): string | null | undefined | false => {
    log.debug("Attempting to fetch block %s", key);
    const separator = "[" + key + "]";
    const array = saveData.toString().split(separator);

    if (array.length >= 3) {
        if (array[1] === "") {
            // eslint-disable-next-line unicorn/no-null
            return null;
        }

        return array[1];
    }

    return false;
};

export const hasBlock = (saveData: DecompressedSave, key: unknown): boolean => getBlock(saveData, key) !== false;

export const blockString = (name: string, value: string | number, log: ILogger = debug): string => {
    if (value === undefined) {
        return "";
    }

    if (value === null) {
        return `[${name}][${name}]`;
    }

    log.debug("Created block with name: %s and value: %s", name, value);
    return `[${name}]${value.toString()}[${name}]`;
};
