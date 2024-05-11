import * as path from "node:path";
import * as url from "node:url";

import * as Command from "@effect/platform/Command";
import * as CommandExecutor from "@effect/platform/CommandExecutor";
import * as PlatformError from "@effect/platform/Error";
import * as FileSystem from "@effect/platform/FileSystem";
import * as HttpClient from "@effect/platform/HttpClient";
import * as ReadonlyArray from "effect/Array";
import * as Effect from "effect/Effect";
import * as Function from "effect/Function";
import * as HashMap from "effect/HashMap";
import * as Match from "effect/Match";
import * as Option from "effect/Option";
import * as Stream from "effect/Stream";

import { ApksupportScrapingError, IPuppeteerDetails, getApksupportDetails } from "./puppeteer.js";
import { getSemanticVersionsByRelativeVersions, trackedVersions } from "./versions.js";

import {
    Games,
    isRelativeVersion,
    isSemanticVersion,
    type AllTrackedVersions,
    type AnyVersion,
    type RelativeVersion,
    type SemanticVersion,
    type SemanticVersionAndAppVersionCode,
    type SemanticVersionsByRelativeVersions,
    type TrackedVersion,
} from "./types.js";

/** @internal */
export const defaultCacheDirectory: string = url.fileURLToPath(new URL(`../downloads`, import.meta.url));

/**
 * Loads the specific version of the desired game. If the apk is not already
 * downloaded, it will download the apk and cache it in the downloads folder.
 * Following requests for the same apk will return the cached apk immediately.
 * The version does not have to match the cached version exactly, as long as
 * they resolve to the same version it will be a cache hit. For example, if
 * 4.20.0 is the most recent version of TinyTower and you make two invocations
 * one for "latest version" and one for "4.24.0", only the first invocation will
 * make a network request. The second invocation will resolve immediately with
 * the cached apk.
 */
export const loadApk = <T extends Games, U extends Extract<TrackedVersion<T>, AnyVersion>>(
    game: T,
    version: SemanticVersion | RelativeVersion | U = "latest version",
    cacheDirectory: string = defaultCacheDirectory
): Effect.Effect<
    string,
    PlatformError.BadArgument | PlatformError.SystemError | HttpClient.error.HttpClientError | ApksupportScrapingError,
    FileSystem.FileSystem
> =>
    Effect.gen(function* () {
        // Obtain resources and ensure the cache directory exists
        const fs: FileSystem.FileSystem = yield* FileSystem.FileSystem;
        yield* fs.makeDirectory(cacheDirectory, { recursive: true });
        yield* Effect.logInfo(`Using cache directory ${cacheDirectory}`);

        // Quick short circuit to avoid needing to open puppeteer
        const fileNames: readonly string[] = yield* fs.readDirectory(cacheDirectory);
        if (isSemanticVersion(version)) {
            const desiredApkFilename: string = `${game}_${version}.apk`;
            const maybeCachedApk: string | undefined = fileNames.find((fileName) =>
                fileName.includes(desiredApkFilename)
            );
            if (maybeCachedApk) {
                yield* Effect.logInfo(`Found ${maybeCachedApk} in cache directory via quick short circuit`);
                return path.join(cacheDirectory, maybeCachedApk);
            }
        }

        // Convert from whatever version was given to a semantic version
        const svbrv: SemanticVersionsByRelativeVersions = yield* getSemanticVersionsByRelativeVersions(game);
        const versionInfo: SemanticVersionAndAppVersionCode = Function.pipe(
            Match.value<SemanticVersion | RelativeVersion | AllTrackedVersions>(version),
            Match.when(
                (v): v is AllTrackedVersions => Object.keys(trackedVersions[game]).includes(v),
                (v) => trackedVersions[game][v as U] as SemanticVersionAndAppVersionCode
            ),
            Match.when(isSemanticVersion, (v) =>
                svbrv.pipe(
                    HashMap.filter(({ semanticVersion }) => semanticVersion === v),
                    HashMap.values,
                    ReadonlyArray.fromIterable,
                    ReadonlyArray.head,
                    Option.getOrThrow
                )
            ),
            Match.when(isRelativeVersion, (v) => svbrv.pipe(HashMap.get(v), Option.getOrThrow)),
            Match.exhaustive
        );
        yield* Effect.logInfo(`App version code for ${version} = ${versionInfo.appVersionCode}`);
        yield* Effect.logInfo(`Semantic version for ${version} = ${versionInfo.semanticVersion}`);

        // Check to see if the apk already exists in the cache directory
        const desiredApkFilename: string = `${game}_${versionInfo.semanticVersion}.apk`;
        const maybeCachedApk: string | undefined = fileNames.find((fileName) => fileName.includes(desiredApkFilename));
        if (maybeCachedApk) {
            yield* Effect.logInfo(`Found ${maybeCachedApk} in cache directory`);
            return path.join(cacheDirectory, maybeCachedApk);
        }

        // Not found in cache directory, need to download it
        const results: readonly [string, IPuppeteerDetails] = yield* getApksupportDetails(game, versionInfo);
        yield* Effect.logInfo(`Puppeteer scraping results: ${results[0]}`);
        if (!results[0].startsWith("https://play.googleapis.com/download/")) {
            return yield* new ApksupportScrapingError({ message: `${results[0]} is not a googleapis download url` });
        }

        // Stream the download directly to the downloads folder
        const downloadedFile: string = `${cacheDirectory}/${desiredApkFilename}`;
        const request: HttpClient.response.ClientResponse = yield* HttpClient.request
            .get(results[0])
            .pipe(HttpClient.client.fetchOk);
        yield* request.stream.pipe(Stream.run(fs.sink(downloadedFile)));
        yield* Effect.logInfo(`Successfully downloaded ${game} ${version} to ${downloadedFile}`);
        return `${cacheDirectory}/${desiredApkFilename}`;
    }).pipe(Effect.scoped);

/**
 * Loads the specific version of the desired game. If the apk is not already
 * downloaded, it will download the apk and cache it in the downloads folder.
 * Patches the apk to trust user certificates to assist with https traffic
 * inspection, adds a Network Security Configuration, and attempts to disable
 * certificate pinning.
 */
export const patchApk = <T extends Games, U extends Extract<TrackedVersion<T>, AnyVersion>>(
    game: T,
    version: SemanticVersion | RelativeVersion | U = "latest version",
    cacheDirectory: string = defaultCacheDirectory
): Effect.Effect<
    string,
    PlatformError.BadArgument | PlatformError.SystemError | HttpClient.error.HttpClientError | ApksupportScrapingError,
    FileSystem.FileSystem | CommandExecutor.CommandExecutor
> =>
    loadApk(game, version, cacheDirectory).pipe(
        Effect.andThen((apkPath) =>
            Effect.gen(function* () {
                const fs: FileSystem.FileSystem = yield* FileSystem.FileSystem;
                const commandExecutor: CommandExecutor.CommandExecutor = yield* CommandExecutor.CommandExecutor;

                const parsedPath: path.ParsedPath = path.parse(apkPath);
                const patchedApkFilename: string = path.join(
                    parsedPath.dir,
                    `${parsedPath.name}-patched${parsedPath.ext}`
                );
                const maybeCachedApk: boolean = yield* fs.exists(patchedApkFilename);
                if (maybeCachedApk) {
                    return patchedApkFilename;
                }

                const command: Command.Command = Command.make("apk-mitm", apkPath);
                const exitCode: CommandExecutor.ExitCode = yield* commandExecutor.exitCode(command);
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
            })
        )
    );

export { Games } from "./types.js";
export default { loadApk, patchApk, Games, defaultCacheDirectory };
