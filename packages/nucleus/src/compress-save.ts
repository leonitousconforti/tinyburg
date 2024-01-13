import type { ILogger } from "./logger.js";
import type { DecompressedSave } from "./decompress-save.js";

import { deflateSync } from "node:zlib";
import { DebugLogger } from "./logger.js";

// Debug logger
const loggingNamespace: string = "tinyburg:compress_save";
const debug: ILogger = new DebugLogger(loggingNamespace);

export const compressSave = (input: DecompressedSave, log: ILogger = debug): string => {
    // Deflate the input, then convert it to base64
    const compressedData = deflateSync(input.toString());
    const compressedDataString = Buffer.from(compressedData).toString("base64");

    // Calculate the size of the data before and after compression
    const decompressedSizeBytes = Buffer.byteLength(input.toString());
    const compressedSizeBytes = Buffer.byteLength(compressedDataString);
    log.debug("Compressed save data from %d bytes to %d bytes", decompressedSizeBytes, compressedSizeBytes);

    return compressedDataString;
};
