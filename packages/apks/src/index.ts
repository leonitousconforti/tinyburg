import url from "node:url";
import path from "node:path";

import * as FS from "@effect/platform/FileSystem";
import * as Http from "@effect/platform/HttpClient";
import * as PlatformErrors from "@effect/platform/Error";
import * as NodeContext from "@effect/platform-node/NodeContext";
import { Effect, HashMap, Match, Option, Scope, Stream, pipe } from "effect";

import { getApkpureDetails } from "./apkpure.puppeteer.js";
import { getApkmirrorDetails } from "./apkmirror.puppeteer.js";

import {
    trackedBitCityVersions,
    trackedTinyTowerVersions,
    trackedLegoTowerVersions,
    trackedPocketFrogsVersions,
    trackedPocketPlanesVersions,
    trackedPocketTrainsVersions,
    trackedTinyTowerVegasVersions,
    getSemanticVersionsByRequestedVersions,
    type TrackedBitCityVersions,
    type TrackedTinyTowerVersions,
    type TrackedLegoTowerVersions,
    type TrackedPocketFrogsVersions,
    type TrackedPocketPlanesVersions,
    type TrackedPocketTrainsVersions,
    type TrackedTinyTowerVegasVersions,
} from "./versions.js";

import {
    defaultVersion,
    defaultSupplier,
    defaultArchitecture,
    isSemanticVersion,
    isRelativeVersion,
    isTrackedBitCityVersion,
    isTrackedTinyTowerVersion,
    isTrackedLegoTowerVersion,
    isTrackedPocketFrogsVersion,
    isTrackedPocketTrainsVersion,
    isTrackedPocketPlanesVersion,
    isTrackedTinyTowerVegasVersion,
    type AnyVersion,
    type RequestedGame,
    type SemanticVersion,
    type RelativeVersion,
    type PuppeteerFetcher,
    type IPuppeteerDetails,
    type RequestedSupplier,
    type ApkpureScrapingError,
    type RequestedArchitecture,
    type ApkmirrorScrapingError,
    type SemanticVersionsByRelativeVersions,
} from "./types.js";

/**
 * Loads a the specific version of the desired game for a specific architecture
 * from the specified supplier. If the apk is not already downloaded, it will
 * download the apk and cache it in the downloads folder. Following requests for
 * the same apk (same game, version, supplier, and architecture) will return the
 * cached apk immediately. The version does not have to match the cached version
 * exactly, as long as they resolve to the same version it will be a cache hit.
 * For example, if 4.20.0 is the most recent version of TinyTower and you make
 * two invocations one for "latest version" and one for "4.24.0", only the first
 * invocation will make a network request. The second invocation will resolve
 * immediately with the cached apk
 *
 * @example
 *     const tinytower1 = await loadApk("TinyTower");
 *
 * @param game - Either "TinyTower" or "LegoTower" or "TinyTowerVegas" or
 *   "BitCity" or "PocketFrogs" or "PocketPlanes" or "PocketTrains"
 * @param version - The version of the game to load
 * @param supplier - Where to load the game from
 * @param architecture - What architecture to load the game for
 * @param downloadsDirectory - Where to cache the downloaded apks
 * @returns The path to the apk on the filesystem
 */
export const loadApk = async <
    T extends RequestedGame,
    U extends T extends "TinyTower"
        ? TrackedTinyTowerVersions
        : T extends "LegoTower"
        ? TrackedLegoTowerVersions
        : T extends "TinyTowerVegas"
        ? TrackedTinyTowerVegasVersions
        : T extends "BitCity"
        ? TrackedBitCityVersions
        : T extends "PocketFrogs"
        ? TrackedPocketFrogsVersions
        : T extends "PocketPlanes"
        ? TrackedPocketPlanesVersions
        : T extends "PocketTrains"
        ? TrackedPocketTrainsVersions
        : never,
>(
    game: T,
    version: SemanticVersion | RelativeVersion | U = defaultVersion,
    supplier: RequestedSupplier = defaultSupplier,
    architecture: RequestedArchitecture = defaultArchitecture,
    downloadsDirectory: string = url.fileURLToPath(new URL(`../downloads`, import.meta.url))
): Promise<string> => {
    const loadApkEffect: Effect.Effect<
        Scope.Scope | FS.FileSystem | Http.client.Client.Default,
        | PlatformErrors.BadArgument
        | PlatformErrors.SystemError
        | Http.error.HttpClientError
        | ApkmirrorScrapingError
        | ApkpureScrapingError
        | Error,
        string
    > = Effect.gen(function* (_: Effect.Adapter) {
        // Obtain resources
        const effectFs: FS.FileSystem = yield* _(FS.FileSystem);
        const effectHttpClient: Http.client.Client.Default = yield* _(Http.client.Client);

        // Ensure the downloads directory exists
        yield* _(effectFs.makeDirectory(downloadsDirectory, { recursive: true }));
        yield* _(Effect.log(`Loading ${game} ${version} for architecture ${architecture} from ${supplier}`));

        // Try to convert to a semantic version
        const svbrv: SemanticVersionsByRelativeVersions = yield* _(getSemanticVersionsByRequestedVersions(game));
        const semanticVersion: Option.Option<SemanticVersion> = pipe(
            Match.value<AnyVersion>(version),
            Match.when(isSemanticVersion, (v) => Option.some(v)),
            Match.when(isRelativeVersion, (v) => HashMap.get(svbrv, v)),
            Match.when(isTrackedBitCityVersion, (v) => Option.some(trackedBitCityVersions[v])),
            Match.when(isTrackedTinyTowerVersion, (v) => Option.some(trackedTinyTowerVersions[v])),
            Match.when(isTrackedLegoTowerVersion, (v) => Option.some(trackedLegoTowerVersions[v])),
            Match.when(isTrackedPocketFrogsVersion, (v) => Option.some(trackedPocketFrogsVersions[v])),
            Match.when(isTrackedPocketPlanesVersion, (v) => Option.some(trackedPocketPlanesVersions[v])),
            Match.when(isTrackedPocketTrainsVersion, (v) => Option.some(trackedPocketTrainsVersions[v])),
            Match.when(isTrackedTinyTowerVegasVersion, (v) => Option.some(trackedTinyTowerVegasVersions[v])),
            Match.exhaustive
        );

        if (Option.isNone(semanticVersion)) {
            return yield* _(Effect.fail(new Error(`Could not convert ${version} to a semantic version`)));
        }

        // Check to see if the apk already exists in the downloads cache
        const fileNames: readonly string[] = yield* _(effectFs.readDirectory(downloadsDirectory));
        const desiredApkFilename: string = `${supplier}_${game}_${semanticVersion.value}_${architecture}.apk`;
        const maybeCachedApk: string | undefined = fileNames.find((fileName) => fileName.includes(desiredApkFilename));
        if (maybeCachedApk) {
            yield* _(Effect.log(`Apk was found in downloads cache: ${maybeCachedApk}`));
            return path.join(downloadsDirectory, maybeCachedApk);
        }

        // If we could not find the apk in the downloads cache, and the supplier is
        // patched, then we can't do anything else because we don't know what the
        // base apk is that would be patched so we can't run the patch script anyways
        if (supplier === "patched") {
            return yield* _(Effect.fail(new Error("No patched apk found in downloads folder")));
        }

        // If the apk doesn't exist in the downloads cache, we need to fetch it
        // and stream the download directly to the downloads folder
        const fetcher: PuppeteerFetcher = supplier === "apkmirror" ? getApkmirrorDetails : getApkpureDetails;
        const results: readonly [string, IPuppeteerDetails] = yield* _(
            fetcher(game, semanticVersion.value, architecture)
        );
        const client: Http.client.Client.WithResponse<never, Http.error.HttpClientError> = effectHttpClient.pipe(
            Http.client.filterStatusOk
        );
        const request: Http.response.ClientResponse = yield* _(client(Http.request.get(results[0])));
        yield* _(request.stream.pipe(Stream.run(effectFs.sink(`${downloadsDirectory}/${desiredApkFilename}`))));
        return `${downloadsDirectory}/${desiredApkFilename}`;
    });

    // Run the effect and just throw any defects as errors
    return Effect.scoped(loadApkEffect)
        .pipe(Effect.provide(NodeContext.layer))
        .pipe(Effect.provide(Http.client.layer))
        .pipe(Effect.orDieWith((error) => error))
        .pipe(Effect.runPromise);
};

export default loadApk;
