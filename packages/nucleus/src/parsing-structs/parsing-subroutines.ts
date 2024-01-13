import type { ILogger } from "../logger.js";
import type { DecompressedSave } from "../decompress-save.js";
import type { GenericBlocks, GenericJsonSave } from "./blocks.js";

import { DebugLogger } from "../logger.js";
import { blockString, getBlock, hasBlock } from "../save-parser.js";

// Debug logger
const loggingNamespace = "tinyburg:parsing_subroutines";
const debug = new DebugLogger(loggingNamespace);

// Sub-routine for recursive parsing of layered blocks (this is a recursive function)
export const parsingSubRoutine = function <T extends GenericBlocks, U extends GenericJsonSave<T>>(
    nimblebitSave: DecompressedSave,
    blocksToUse: T,
    log: ILogger = debug
): U {
    const nimblebitJsonSave: U = {} as U;

    // For all the keys in the blocks to use
    for (const [blockKey, blockValue] of Object.entries(blocksToUse)) {
        // Skip block meta data
        if (blockKey.slice(0, 2) === "__" || typeof blockValue === "function") continue;

        // Determine if the decompressed save even has this block to parse
        const saveHasBlock = hasBlock(nimblebitSave, blockKey);
        if (!saveHasBlock) {
            // If the block is not in this save
            log.debug("Save does not have block %s", blockKey);

            if (typeof blockValue === "string") nimblebitJsonSave[blockValue as keyof U] = undefined as never;
            else if (Array.isArray(blockValue)) nimblebitJsonSave[blockValue[0] as keyof U] = undefined as never;
            continue;
        }

        // Otherwise, the save has the block
        log.debug("Save has block %s", blockValue);
        // eslint-disable-next-line unicorn/no-null
        const dataFromBlock = getBlock(nimblebitSave, blockKey) || null;

        // If the block is not complicated, i.e coins or just one thing
        if (typeof blockValue === "string") {
            nimblebitJsonSave[blockValue as keyof U] = dataFromBlock as never;
            continue;
        }

        // Check for null
        if (dataFromBlock === null) {
            log.debug("Save data for key %s is null", blockKey);
            // eslint-disable-next-line unicorn/no-null
            nimblebitJsonSave[blockValue[0] as keyof U] = null as never;
            continue;
        }

        // If the block is more complicated, i.e a bitizen or a floor, and requires addition parsing
        const nameOfBlock = blockValue[0] as keyof U;
        const nextBlocksToUse = blockValue[1];
        const separator = blockValue[2];
        const blockOutputFormat = blockValue[3];
        const pieces = separator ? dataFromBlock.split(separator) : [dataFromBlock];

        // Set the type from the block
        nimblebitJsonSave[nameOfBlock] = blockOutputFormat === "array" ? ([] as never) : ({} as never);

        // Parse the block to an array
        if (blockOutputFormat === "array") {
            for (const piece of pieces) {
                if (Array.isArray(nextBlocksToUse)) {
                    (nimblebitJsonSave[nameOfBlock] as unknown as unknown[]).push(piece);
                } else {
                    const more = parsingSubRoutine(
                        piece as unknown as DecompressedSave,
                        nextBlocksToUse as GenericBlocks
                    );
                    (nimblebitJsonSave[nameOfBlock] as unknown as unknown[]).push(more);
                }
            }
        }

        // Parse the block to an object
        else if (blockOutputFormat === "object") {
            for (const [index, piece] of pieces.entries()) {
                if (Array.isArray(nextBlocksToUse)) {
                    (nimblebitJsonSave[nameOfBlock] as unknown as Record<string, unknown>)[nextBlocksToUse[index]] =
                        piece;
                } else {
                    const more = parsingSubRoutine(
                        piece as unknown as DecompressedSave,
                        nextBlocksToUse as GenericBlocks
                    );
                    (nimblebitJsonSave[nameOfBlock] as unknown as Record<string, unknown>) = more as Record<
                        string,
                        unknown
                    >;
                }
            }
        }
    }

    return nimblebitJsonSave;
};

// Sub-routine for recursive concatenation of layered blocks
export const concatenationSubRoutine = function <T extends GenericBlocks, U extends GenericJsonSave<T>>(
    jsonSave: U,
    blocksToUse: T,
    log: ILogger = debug
): DecompressedSave {
    let nimblebitSave = "";

    // For all the keys in the blocks array
    for (const [blockKey, blockValue] of Object.entries(blocksToUse)) {
        // Skip block meta data
        if (blockKey.slice(0, 2) === "__" || typeof blockValue === "function") continue;

        // If it is a simple block, i.e the value in the blocks array is not a
        if (typeof blockValue === "string") {
            nimblebitSave += blockString(blockKey, jsonSave[blockValue as keyof U] as unknown as string | number);
            continue;
        }

        // For an array block, parse the elements
        const nameOfBlock = blockValue[0] as keyof U;
        const nextBlocksToUse = blockValue[1];
        const separator = blockValue[2];
        const blockOutputFormat = blockValue[3];
        let layeredBlockData = "";

        // If the value does not exist in the json, continue
        if (jsonSave[nameOfBlock] === undefined) {
            log.debug("Save does not have key %s", blockKey);
            continue;
        }

        // If the output format was an object and the next blocks are an array
        // then join the properties of the object by the separator
        else if (blockOutputFormat === "object" && Array.isArray(nextBlocksToUse)) {
            layeredBlockData = Object.values(jsonSave[nameOfBlock]!).join(separator);
        }

        // If the output format was an object and the next blocks are not an array
        // then recurse the json again.
        else if (blockOutputFormat === "object" && !Array.isArray(nextBlocksToUse)) {
            log.debug("%s", JSON.stringify(jsonSave[nameOfBlock]));
            layeredBlockData = concatenationSubRoutine(
                jsonSave[nameOfBlock],
                nextBlocksToUse as GenericBlocks
            ).toString();
        }

        // If the output format was an array and the next blocks are an array then
        // join the values in the array by the separator. The ts-ignore here is because
        // there technically could be types IBitizen or IMission as they are not processed
        // by the simple blockString above, however, their blockOutputFormat is both
        // object so these types will never make it into this if statement
        else if (blockOutputFormat === "array" && Array.isArray(nextBlocksToUse)) {
            layeredBlockData = (jsonSave[nameOfBlock] as unknown as unknown[]).join(separator);
        }

        // If the output format was an array and the next blocks are not an array
        // then do recursive parsing for all objects in the array. The ts-ignore
        // is because the array type is unknown when passing it to the
        // concatenation subroutine function
        else if (blockOutputFormat === "array" && !Array.isArray(nextBlocksToUse)) {
            const array = jsonSave[nameOfBlock] as unknown as unknown[];

            for (const item of array) {
                const nb: GenericBlocks = nextBlocksToUse as GenericBlocks;
                layeredBlockData += concatenationSubRoutine(item as GenericJsonSave<typeof nb>, nb) + (separator || "");
            }

            if (separator) layeredBlockData = layeredBlockData.slice(0, -1);
        }

        // Block string the layered block data and append it to the final data
        nimblebitSave += blockString(blockKey, layeredBlockData);
    }

    return nimblebitSave as unknown as DecompressedSave;
};
