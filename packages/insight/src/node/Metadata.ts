/**
 * Reads the string literals compiled into a Unity il2cpp game straight from
 * its APK: `global-metadata.dat` is stored unencrypted in Nimblebit's games,
 * and its literal table lists every URL path segment the game can request,
 * including the ones a probe run never exercises.
 *
 * @since 1.0.0
 */

import type { PlatformError } from "effect";

import { Data, Effect, FileSystem, Option } from "effect";

import * as zlib from "node:zlib";

const METADATA_ENTRY = "assets/bin/Data/Managed/Metadata/global-metadata.dat";

/**
 * Reads one entry of a zip archive (an APK), if it is there. Handles stored
 * and deflated entries, which is all an APK uses.
 *
 * @since 1.0.0
 * @category Zip
 */
export const readZipEntry = (archive: Uint8Array, name: string): Option.Option<Uint8Array> => {
    const view = new DataView(archive.buffer, archive.byteOffset, archive.byteLength);
    // The end of central directory record is the last thing in the file,
    // followed by a comment of at most 64 KiB
    let end = -1;
    for (let i = archive.length - 22; i >= Math.max(0, archive.length - 22 - 65_535); i--) {
        if (view.getUint32(i, true) === 0x06054b50) {
            end = i;
            break;
        }
    }
    if (end < 0) return Option.none();
    const entries = view.getUint16(end + 10, true);
    let cursor = view.getUint32(end + 16, true);
    const decoder = new TextDecoder();
    for (let i = 0; i < entries && view.getUint32(cursor, true) === 0x02014b50; i++) {
        const method = view.getUint16(cursor + 10, true);
        const compressedSize = view.getUint32(cursor + 20, true);
        const nameLength = view.getUint16(cursor + 28, true);
        const extraLength = view.getUint16(cursor + 30, true);
        const commentLength = view.getUint16(cursor + 32, true);
        const localHeader = view.getUint32(cursor + 42, true);
        const entryName = decoder.decode(archive.subarray(cursor + 46, cursor + 46 + nameLength));
        if (entryName === name) {
            const dataStart =
                localHeader + 30 + view.getUint16(localHeader + 26, true) + view.getUint16(localHeader + 28, true);
            const data = archive.subarray(dataStart, dataStart + compressedSize);
            if (method === 0) return Option.some(data);
            if (method === 8) return Option.some(new Uint8Array(zlib.inflateRawSync(data)));
            return Option.none();
        }
        cursor += 46 + nameLength + extraLength + commentLength;
    }
    return Option.none();
};

/**
 * Every string literal in an il2cpp `global-metadata.dat`, in table order
 * (which roughly follows the code that uses them). Metadata versions 38 and
 * later keep only offsets, each literal running to the next; earlier ones keep
 * a length with each offset.
 *
 * @since 1.0.0
 * @category Metadata
 */
export const stringLiterals = (metadata: Uint8Array): ReadonlyArray<string> => {
    const view = new DataView(metadata.buffer, metadata.byteOffset, metadata.byteLength);
    const version = view.getInt32(4, true);
    const decoder = new TextDecoder();
    const out: Array<string> = [];
    if (version >= 38) {
        const tableOffset = view.getInt32(8, true);
        const count = view.getInt32(16, true);
        const dataOffset = view.getInt32(20, true);
        for (let i = 0; i + 1 < count; i++) {
            const start = view.getInt32(tableOffset + i * 4, true);
            const end = view.getInt32(tableOffset + (i + 1) * 4, true);
            out.push(decoder.decode(metadata.subarray(dataOffset + start, dataOffset + end)));
        }
    } else {
        const tableOffset = view.getInt32(8, true);
        const tableSize = view.getInt32(12, true);
        const dataOffset = view.getInt32(16, true);
        for (let i = 0; i < tableSize / 8; i++) {
            const length = view.getUint32(tableOffset + i * 8, true);
            const index = view.getInt32(tableOffset + i * 8 + 4, true);
            out.push(decoder.decode(metadata.subarray(dataOffset + index, dataOffset + index + length)));
        }
    }
    return out;
};

const FILE_SYSTEM_PATH = /^\/(usr|etc|lib|proc|system|data|Resources|Screenshots)\b/;

/**
 * The literals that look like NBSync URL path segments (`/sync/pull/`,
 * `/get_items/`, ...), without duplicates.
 *
 * @since 1.0.0
 * @category Metadata
 */
export const urlPaths = (literals: ReadonlyArray<string>): ReadonlyArray<string> => [
    ...new Set(
        literals.filter((literal) => /^\/[a-z_]+(\/[a-z_]+)*\/$/.test(literal) && !FILE_SYSTEM_PATH.test(literal))
    ),
];

/**
 * None of the files was an APK with il2cpp metadata in it.
 *
 * @since 1.0.0
 * @category Errors
 */
export class MetadataNotFoundError extends Data.TaggedError("MetadataNotFoundError")<{
    readonly files: ReadonlyArray<string>;
}> {}

/**
 * The NBSync URL path segments compiled into a game, read from its APK files
 * (the base APK holds the metadata in a split install).
 *
 * @since 1.0.0
 * @category Metadata
 */
export const urlPathsFromApks = Effect.fnUntraced(function* (
    files: ReadonlyArray<string>
): Effect.fn.Return<ReadonlyArray<string>, PlatformError.PlatformError | MetadataNotFoundError, FileSystem.FileSystem> {
    const fileSystem = yield* FileSystem.FileSystem;
    for (const file of files) {
        const metadata = readZipEntry(yield* fileSystem.readFile(file), METADATA_ENTRY);
        if (Option.isSome(metadata)) return urlPaths(stringLiterals(metadata.value));
    }
    return yield* new MetadataNotFoundError({ files });
});
