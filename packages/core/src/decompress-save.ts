import type { ILogger } from "./logger.js";

import { inflateSync } from "node:zlib";
import { DebugLogger } from "./logger.js";

// Debug logger
const loggingNamespace = "tinyburg:decompress_save";
const debug = new DebugLogger(loggingNamespace);

// Got this from: https://github.com/Microsoft/TypeScript/issues/202#issuecomment-811246768 because
// I want stricter type checking for the decompressedSave type which was just a string.
// export type DecompressedSave = string;
declare class OpaqueString<T extends string> extends String {
    /** This helps typescript distinguish different opaque string types. */
    protected readonly __opaqueString: T;
    /** This object is already a string, but calling this makes method
     * makes typescript recognize it as such. */
    toString(): string;
}

// Decompressed save type, (its just a string) but now we can do better type checking for other functions
export type DecompressedSave = OpaqueString<"DecompressedSave">;

export const decompressSave = (input: string, log: ILogger = debug): DecompressedSave => {
    // Convert from base64 to binary then inflate to string
    const buff = Buffer.from(input, "base64");
    const decompressedData = inflateSync(buff).toString();

    // Calculate the size of the data before and after decompression
    const compressedSizeBytes = Buffer.byteLength(input);
    const decompressedSizeBytes = Buffer.byteLength(decompressedData);
    log.debug("Decompressed save data from %d bytes to %d bytes", compressedSizeBytes, decompressedSizeBytes);

    return decompressedData as unknown as DecompressedSave;
};
