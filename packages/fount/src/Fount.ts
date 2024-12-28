/**
 * Downloads, stores, and patches any version of nimblebit android apks that are
 * available on the Google PlayStore, ready to be consumed by other tools such
 * as @tinyburg/insight.
 *
 * @since 1.0.0
 */

import * as Command from "@effect/platform/Command";
import * as CommandExecutor from "@effect/platform/CommandExecutor";
import * as PlatformError from "@effect/platform/Error";
import * as FetchHttpClient from "@effect/platform/FetchHttpClient";
import * as FileSystem from "@effect/platform/FileSystem";
import * as HttpClient from "@effect/platform/HttpClient";
import * as HttpClientError from "@effect/platform/HttpClientError";
import * as ReadonlyArray from "effect/Array";
import * as Effect from "effect/Effect";
import * as Function from "effect/Function";
import * as HashMap from "effect/HashMap";
import * as Match from "effect/Match";
import * as Option from "effect/Option";
import * as ParseResult from "effect/ParseResult";
import * as Schema from "effect/Schema";
import * as Scope from "effect/Scope";
import * as Stream from "effect/Stream";
import * as Tuple from "effect/Tuple";

import * as path from "path";
import { ApksupportScrapingError, getApksupportDetails, IPuppeteerDetails } from "./internal/puppeteer.js";
import { AnyGame, RelativeVersion, SemanticVersion, SemanticVersionAndAppVersionCode } from "./internal/schemas.js";
import {
    AllTrackedVersions,
    getSemanticVersionsByRelativeVersions,
    TrackedVersion,
    trackedVersions,
} from "./internal/versions.js";

/**
 * @since 1.0.0
 * @category Fount
 */
export const loadApk = <T extends AnyGame>(
    game: T,
    version:
        | typeof SemanticVersion.Type
        | typeof RelativeVersion.Type
        | Extract<TrackedVersion<T>, AllTrackedVersions> = "latest version"
): Effect.Effect<
    readonly [
        scrapingDetails: typeof IPuppeteerDetails.Type,
        apk: Stream.Stream<Uint8Array, HttpClientError.ResponseError, never>,
    ],
    ParseResult.ParseError | HttpClientError.HttpClientError | ApksupportScrapingError,
    Scope.Scope
> =>
    Effect.gen(function* () {
        // Convert from whatever version was given to a semantic version
        const svbrv = yield* getSemanticVersionsByRelativeVersions(game);
        const versionInfo = Function.pipe(
            Match.value<typeof SemanticVersion.Type | typeof RelativeVersion.Type | AllTrackedVersions>(version),
            Match.when(
                (v): v is AllTrackedVersions => Object.keys(trackedVersions[game]).includes(v),
                (v) => trackedVersions[game][v as TrackedVersion<T>] as typeof SemanticVersionAndAppVersionCode.Type
            ),
            Match.when(Schema.is(SemanticVersion), (v) =>
                svbrv.pipe(
                    HashMap.filter(({ semanticVersion }) => semanticVersion === v),
                    HashMap.values,
                    ReadonlyArray.fromIterable,
                    ReadonlyArray.head,
                    Option.getOrThrow
                )
            ),
            Match.when(Schema.is(RelativeVersion), (v) => svbrv.pipe(HashMap.get(v), Option.getOrThrow)),
            Match.exhaustive
        );

        yield* Effect.logDebug(`App version code for ${version} is ${versionInfo.appVersionCode}`);
        yield* Effect.logDebug(`Semantic version for ${version} is ${versionInfo.semanticVersion}`);

        // Start the download
        const [downloadUrl, details] = yield* getApksupportDetails(game, versionInfo);
        yield* Effect.logDebug(`Puppeteer scraping details: ${JSON.stringify(details)}, download url: ${downloadUrl}`);
        if (!downloadUrl.startsWith("https://play.googleapis.com/download/")) {
            return yield* new ApksupportScrapingError({ message: `${downloadUrl} is not a googleapis download url` });
        }

        // Stream the download directly to the downloads folder
        const response = yield* HttpClient.get(downloadUrl);
        return Tuple.make(details, response.stream);
    }).pipe(Effect.provide(FetchHttpClient.layer));

/**
 * @since 1.0.0
 * @category Fount
 */
export const patchApk = <T extends AnyGame>(
    game: T,
    version:
        | typeof SemanticVersion.Type
        | typeof RelativeVersion.Type
        | Extract<TrackedVersion<T>, AllTrackedVersions> = "latest version"
): Effect.Effect<
    string,
    | ParseResult.ParseError
    | PlatformError.BadArgument
    | PlatformError.SystemError
    | HttpClientError.HttpClientError
    | ApksupportScrapingError,
    FileSystem.FileSystem | CommandExecutor.CommandExecutor
> =>
    Effect.gen(function* () {
        const fs: FileSystem.FileSystem = yield* FileSystem.FileSystem;
        const commandExecutor: CommandExecutor.CommandExecutor = yield* CommandExecutor.CommandExecutor;

        const apkPath = yield* fs.makeTempFileScoped();
        const [_, apkStream] = yield* loadApk(game, version);
        yield* Stream.run(apkStream, fs.sink(apkPath));

        const parsedPath = path.parse(apkPath);
        const patchedApkFilename = path.join(parsedPath.dir, `${parsedPath.name}-patched${parsedPath.ext}`);

        const command = Command.make("apk-mitm", apkPath);
        const exitCode = yield* commandExecutor.exitCode(command);
        if (exitCode !== 0) {
            yield* Effect.fail(
                PlatformError.SystemError({
                    method: "",
                    reason: "Unknown",
                    module: "Command",
                    pathOrDescriptor: "apk-mitm",
                    message: `Failed to patch apk: ${apkPath}`,
                })
            );
        }

        return patchedApkFilename;
    }).pipe(Effect.scoped);
