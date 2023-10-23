import got from "got";
import fs from "node:fs";
import url from "node:url";
import path from "node:path";
import stream from "node:stream/promises";

import { getApkpureDetails } from "./apkpure.puppeteer.js";
import { getApkmirrorDetails } from "./apkmirror.puppeteer.js";

import {
    defaultVersion,
    defaultSupplier,
    defaultArchitecture,
    type RequestedGame,
    type SemanticVersion,
    type RelativeVersion,
    type PuppeteerFetcher,
    type RequestedSupplier,
    type RequestedArchitecture,
} from "./types.js";

import {
    toSemanticVersion,
    type TrackedTinyTowerVersions,
    type TrackedLegoTowerVersions,
    type TrackedTinyTowerVegasVersions,
} from "./versions.js";

import Debug from "debug";
const logger: Debug.Debugger = Debug.debug("tinyburg:apks");

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
 * @param game - Either "TinyTower" or "LegoTower" or "TinyTowerVegas"
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
        : never,
>(
    game: T,
    version: SemanticVersion | RelativeVersion | U = defaultVersion,
    supplier: RequestedSupplier = defaultSupplier,
    architecture: RequestedArchitecture = defaultArchitecture,
    downloadsDirectory: string = url.fileURLToPath(new URL(`../downloads`, import.meta.url))
): Promise<string> => {
    if (!fs.existsSync(downloadsDirectory)) await fs.promises.mkdir(downloadsDirectory);
    logger("Loading '%s' '%s' for architecture '%s' from supplier %s", game, version, architecture, supplier);

    // Check to see if the apk already exists in the downloads cache
    const semanticVersion: SemanticVersion = await toSemanticVersion(game, version);
    const fileNames: string[] = await fs.promises.readdir(downloadsDirectory);
    const desiredApkFilename: string = `${supplier}_${game}_${semanticVersion}_${architecture}.apk`;
    const maybeCachedApk: string | undefined = fileNames.find((fileName) => fileName.includes(desiredApkFilename));
    if (maybeCachedApk) {
        logger("Apk was found in downloads cache: %s", maybeCachedApk);
        return path.join(downloadsDirectory, maybeCachedApk);
    }

    // If we could not find the apk in the downloads cache, and the supplier is
    // patched, then we can't do anything else because we don't know what the
    // base apk is that would be patched so we can't run the patch script anyways
    if (supplier === "patched") {
        throw new Error("No patched apk found in downloads folder");
    }

    // If the apk doesn't exist in the downloads cache, we need to fetch it
    // and stream the download directly to the downloads folder
    const fetcher: PuppeteerFetcher = supplier === "apkmirror" ? getApkmirrorDetails : getApkpureDetails;
    const [downloadUrl] = await fetcher(game, semanticVersion, architecture);
    await stream.pipeline(got.stream(downloadUrl), fs.createWriteStream(`${downloadsDirectory}/${desiredApkFilename}`));
    return `${downloadsDirectory}/${desiredApkFilename}`;
};

export default loadApk;
export { getSemanticVersionsByRequestedVersions } from "./versions.js";
