import url from "node:url";
import path from "node:path";
import { execa } from "execa";

import * as FS from "@effect/platform/FileSystem";
import * as Http from "@effect/platform/HttpClient";
import * as PlatformErrors from "@effect/platform/Error";
import * as NodeContext from "@effect/platform-node/NodeContext";
import { Effect, ReadonlyArray, HashMap, Match, Option, Scope, Stream, pipe } from "effect";

import { trackedVersions, getSemanticVersionsByRelativeVersionsEffect } from "./versions.js";
import { getApksupportDetails, ApksupportScrapingError, IPuppeteerDetails } from "./puppeteer.js";

import {
    Games,
    isSemanticVersion,
    isRelativeVersion,
    type AnyVersion,
    type TrackedVersion,
    type SemanticVersion,
    type RelativeVersion,
    type AllTrackedVersions,
    type SemanticVersionAndAppVersionCode,
    type SemanticVersionsByRelativeVersions,
} from "./types.js";

export const defaultCacheDirectory: string = url.fileURLToPath(new URL(`../downloads`, import.meta.url));

/** @internal */
const loadApkEffect = <T extends Games, U extends Extract<TrackedVersion<T>, AnyVersion>>(
    game: T,
    version: SemanticVersion | RelativeVersion | U = "latest version",
    cacheDirectory: string = defaultCacheDirectory
): Effect.Effect<
    Scope.Scope | FS.FileSystem,
    PlatformErrors.BadArgument | PlatformErrors.SystemError | Http.error.HttpClientError | ApksupportScrapingError,
    string
> =>
    Effect.gen(function* (_: Effect.Adapter) {
        // Obtain resources and ensure the cache directory exists
        const effectFs: FS.FileSystem = yield* _(FS.FileSystem);
        yield* _(effectFs.makeDirectory(cacheDirectory, { recursive: true }));

        // Convert from whatever version was given to a semantic version
        const svbrv: SemanticVersionsByRelativeVersions = yield* _(getSemanticVersionsByRelativeVersionsEffect(game));
        const versionInfo: SemanticVersionAndAppVersionCode = pipe(
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

        // Check to see if the apk already exists in the cache directory
        const fileNames: readonly string[] = yield* _(effectFs.readDirectory(cacheDirectory));
        const desiredApkFilename: string = `${game}_${versionInfo.semanticVersion}.apk`;
        const maybeCachedApk: string | undefined = fileNames.find((fileName) => fileName.includes(desiredApkFilename));
        if (maybeCachedApk) {
            return path.join(cacheDirectory, maybeCachedApk);
        }

        // Stream the download directly to the downloads folder
        const results: readonly [string, IPuppeteerDetails] = yield* _(getApksupportDetails(game, versionInfo));
        const request: Http.response.ClientResponse = yield* _(Http.request.get(results[0]).pipe(Http.client.fetch()));
        yield* _(request.stream.pipe(Stream.run(effectFs.sink(`${cacheDirectory}/${desiredApkFilename}`))));
        return `${cacheDirectory}/${desiredApkFilename}`;
    });

/** @internal */
const patchApkEffect = (
    apkPath: string
): Effect.Effect<FS.FileSystem, PlatformErrors.BadArgument | PlatformErrors.SystemError, string> =>
    Effect.gen(function* (_: Effect.Adapter) {
        const effectFs: FS.FileSystem = yield* _(FS.FileSystem);

        const parsedPath: path.ParsedPath = path.parse(apkPath);
        const patchedApkFilename: string = path.join(parsedPath.dir, `${parsedPath.name}-patched${parsedPath.ext}`);
        const maybeCachedApk: boolean = yield* _(effectFs.exists(patchedApkFilename));
        if (maybeCachedApk) {
            return patchedApkFilename;
        }

        yield* _(Effect.promise(() => execa("apk-mitm", [apkPath])));
        return patchedApkFilename;
    });

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
export const loadApk = async <T extends Games, U extends Extract<TrackedVersion<T>, AnyVersion>>(
    game: T,
    version?: SemanticVersion | RelativeVersion | U | undefined,
    cacheDirectory?: string | undefined
): Promise<string> =>
    loadApkEffect(game, version, cacheDirectory)
        .pipe(Effect.scoped)
        .pipe(Effect.provide(NodeContext.layer))
        .pipe(Effect.orDie)
        .pipe(Effect.runPromise);

/**
 * Loads the specific version of the desired game. If the apk is not already
 * downloaded, it will download the apk and cache it in the downloads folder.
 * Patches the apk to trust user certificates to assist with https traffic
 * inspection, adds a Network Security Configuration, and attempts to disable
 * certificate pinning.
 */
export const patchApk = async <T extends Games, U extends Extract<TrackedVersion<T>, AnyVersion>>(
    game: T,
    version?: SemanticVersion | RelativeVersion | U | undefined,
    cacheDirectory?: string | undefined
): Promise<string> =>
    loadApkEffect(game, version, cacheDirectory)
        .pipe(Effect.flatMap((apkPath) => patchApkEffect(apkPath)))
        .pipe(Effect.scoped)
        .pipe(Effect.provide(NodeContext.layer))
        .pipe(Effect.orDie)
        .pipe(Effect.runPromise);

export { Games } from "./types.js";
export default { loadApk, patchApk, Games, defaultCacheDirectory };
