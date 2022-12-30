import { DebugLogger, ILogger } from "./logger.js";
import { loadFromVersion } from "./parsing-structs/load-from-version.js";
import { parsingSubRoutine, concatenationSubRoutine } from "./parsing-structs/parsing-subroutines.js";

import type { DecompressedSave } from "./decompress-save.js";
import type { INimblebitJsonSave } from "./parsing-structs/blocks.js";

// Debug logger
const loggingNamespace = "tinyburg:save_parser";
const debug = new DebugLogger(loggingNamespace);
const logTag = { loggingNamespace };

// Parses a decompressed save to JSON format for easier modification later
export const parseSaveToJson = async (
    NimblebitSave: DecompressedSave,
    forceLoadStructs = false,
    log: ILogger = debug
): Promise<INimblebitJsonSave> => {
    // Try to get the version of this save
    let saveVersion = getBlock(NimblebitSave, "Pver", log != debug ? log : undefined);
    if (!saveVersion) {
        saveVersion = "";
    }

    // Load the structs
    const structs = await loadFromVersion(saveVersion, forceLoadStructs, log != debug ? log : undefined);
    log.debug(logTag, "Starting parsing subroutine");

    // Get the result of the save data
    return parsingSubRoutine(NimblebitSave, structs.blocks, log != debug ? log : undefined);
};

// Concatenates a JSON save to a nimblebit decompressed save format
export const concatJsonToBlock = async (
    JsonSave: INimblebitJsonSave,
    forceLoadStructs = false,
    log: ILogger = debug
): Promise<DecompressedSave> => {
    // Try to get the version of this save and load the structs
    const saveVersion = JsonSave.ver;
    const structs = await loadFromVersion(saveVersion, forceLoadStructs, log != debug ? log : undefined);
    log.debug(logTag, "Starting concatenation subroutine...");

    // Get the result of the save data
    const result = concatenationSubRoutine(JsonSave, structs.blocks, log != debug ? log : undefined);
    return blockString("_save", result.toString(), log != debug ? log : undefined) as unknown as DecompressedSave;
};

// Appends data to a decompressed save so it has the proper type
export const appendToBlock = (...arguments_: (string | DecompressedSave)[]) => {
    return arguments_.join("") as unknown as DecompressedSave;
};

export const getBlock = (
    saveData: DecompressedSave,
    key: unknown,
    log: ILogger = debug
): string | null | undefined | false => {
    log.debug(logTag, "Attempting to fetch block %s", key);
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

    log.debug(logTag, "Created block with name: %s and value: %s", name, value);
    return `[${name}]${value.toString()}[${name}]`;
};
