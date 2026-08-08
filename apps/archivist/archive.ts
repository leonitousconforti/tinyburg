import { Effect, Match, Option } from "effect";

import type { BundleIdentifier } from "./games.ts";

import { S3 } from "@effect-aws/client-s3";
import { NodeStream } from "@effect/platform-node";
import { GooglePlayApi } from "@efffrida/gplayapi";

export const archiveToS3 = Effect.fnUntraced(
    // The early exits return never-typed values; the normal path runs to the end.
    // oxlint-disable-next-line typescript/consistent-return
    function* (options: { bundleIdentifier: BundleIdentifier; offerType: number; versionCode: number | bigint }) {
        const streams = yield* GooglePlayApi.downloadToStreams(options.bundleIdentifier, options).pipe(
            Effect.catchNoSuchElement
        );

        if (Option.isNone(streams)) {
            return yield* Effect.logInfo(
                `No delivery data available for ${options.bundleIdentifier} version ${options.versionCode}`
            );
        }

        for (const { stream, integrity, size, name } of streams.value) {
            const checksumAlgorithm = Match.value(integrity).pipe(
                Match.when({ "SHA-1": Match.string }, () => "SHA1" as const),
                Match.when({ "SHA-256": Match.string }, () => "SHA256" as const),
                Match.when({ "SHA-512": Match.string }, () => "SHA512" as const),
                Match.orElse(() => undefined)
            );

            const integrityBase64 = Match.value(integrity).pipe(
                Match.when({ "SHA-1": Match.string }, ({ "SHA-1": sha1Hash }) =>
                    Buffer.from(sha1Hash, "hex").toString("base64")
                ),
                Match.when({ "SHA-256": Match.string }, ({ "SHA-256": sha256Hash }) =>
                    Buffer.from(sha256Hash, "hex").toString("base64")
                ),
                Match.when({ "SHA-512": Match.string }, ({ "SHA-512": sha512Hash }) =>
                    Buffer.from(sha512Hash, "hex").toString("base64")
                ),
                Match.orElse(() => undefined)
            );

            if ("SHA-384" in integrity) {
                return yield* Effect.die("SHA-384 is not supported and thus could not be checked by S3");
            }

            const maybeExistingUpload = yield* Effect.flatMap(S3, (s3) =>
                s3.getObject({
                    Bucket: "tinyburg-cold",
                    Key: `archivist/${options.bundleIdentifier}/${options.versionCode}/${name}`,
                })
            ).pipe(
                Effect.flatMap(Effect.succeedSome),
                Effect.catchTag("NoSuchKey", () => Effect.succeedNone)
            );

            // If the upload already exists, let's just check its integrity
            if (Option.isSome(maybeExistingUpload)) {
                const existingUploadIntegrity = Match.value(integrity).pipe(
                    Match.when({ "SHA-1": Match.string }, () => maybeExistingUpload.value.ChecksumSHA1),
                    Match.when({ "SHA-256": Match.string }, () => maybeExistingUpload.value.ChecksumSHA256),
                    Match.when({ "SHA-512": Match.string }, () => maybeExistingUpload.value.ChecksumSHA512),
                    Match.orElse(() => undefined)
                );

                if (existingUploadIntegrity !== integrityBase64) {
                    yield* Effect.logDebug(
                        `Integrity check for existing upload ${options.bundleIdentifier}/${name} version ${options.versionCode} failed`
                    );
                } else {
                    yield* Effect.logDebug(
                        `Integrity check for existing upload ${options.bundleIdentifier}/${name} version ${options.versionCode} passed`
                    );
                    continue;
                }
            }

            yield* S3.use((s3) =>
                s3.putObject({
                    ACL: "private",
                    Bucket: "tinyburg-cold",
                    ContentLength: Number(size),
                    Body: NodeStream.toReadableNever(stream),
                    ChecksumAlgorithm: checksumAlgorithm,
                    Key: `archivist/${options.bundleIdentifier}/${options.versionCode}/${name}`,
                    ...("SHA-1" in integrity ? { ChecksumSHA1: integrityBase64 } : {}),
                    ...("SHA-256" in integrity ? { ChecksumSHA256: integrityBase64 } : {}),
                    ...("SHA-512" in integrity ? { ChecksumSHA512: integrityBase64 } : {}),
                })
            );

            yield* Effect.logDebug(
                `Successfully uploaded ${options.bundleIdentifier}/${name} version ${options.versionCode} to S3`
            );
        }
    }
);
