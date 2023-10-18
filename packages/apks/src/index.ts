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
    isRelativeVersion,
    isSemanticVersion,
    type RequestedGame,
    type SemanticVersion,
    type RelativeVersion,
    type RequestedSupplier,
    type RequestedArchitecture,
    type SemanticVersionsByRelativeVersions,
} from "./types.js";

import {
    trackedTinyTowerVersions,
    trackedLegoTowerVersions,
    trackedTinyTowerVegasVersions,
    getTinyTowerSemanticVersionsByRelativeVersions,
    getLegoTowerSemanticVersionsByRelativeVersions,
    getTinyTowerVegasSemanticVersionsByRelativeVersions,
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
 *     const tinytower1 = loadApk("TinyTower");
 *
 * @param game - Either "TinyTower" or "LegoTower" or "TinyTowerVegas"
 * @param version - The version of the game to load
 * @param supplier - Where to load the game from
 * @param architecture - What architecture to load the game for
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
    architecture: RequestedArchitecture = defaultArchitecture
): Promise<string> => {
    logger("Loading '%s' '%s' for architecture '%s' from supplier %s", game, version, architecture, supplier);
    let semanticVersion: SemanticVersion;

    // TODO: maybe make this configurable?
    const downloadsDirectory: string = url.fileURLToPath(new URL(`../downloads`, import.meta.url));
    if (!fs.existsSync(downloadsDirectory)) await fs.promises.mkdir(downloadsDirectory);

    // If we were given a semantic version, nothing needs to be done to it
    if (isSemanticVersion(version)) {
        semanticVersion = version;
    }

    // If we were given a relative version, we need to convert it to a semantic
    // version by going to apkpure's website and parsing all the versions in
    // order into a map of relative version to semantic version.
    else if (isRelativeVersion(version)) {
        const supplierSemanticVersionsByRelativeVersions: SemanticVersionsByRelativeVersions =
            game === "TinyTower"
                ? await getTinyTowerSemanticVersionsByRelativeVersions()
                : game === "LegoTower"
                ? await getLegoTowerSemanticVersionsByRelativeVersions()
                : game === "TinyTowerVegas"
                ? await getTinyTowerVegasSemanticVersionsByRelativeVersions()
                : new Map();

        const sanitizedRelativeVersion = version === "latest version" ? "0 versions before latest" : version;
        const maybeSemanticVersion = supplierSemanticVersionsByRelativeVersions.get(sanitizedRelativeVersion);
        if (maybeSemanticVersion) {
            semanticVersion = maybeSemanticVersion;
        } else {
            throw new Error(`Could not find semantic version for game "${game}" relative version "${version}"`);
        }
    }

    // Check to see if we were given a TinyTower event version
    else if (game === "TinyTower" && trackedTinyTowerVersions[version as TrackedTinyTowerVersions]) {
        semanticVersion = trackedTinyTowerVersions[version as TrackedTinyTowerVersions];
    }

    // Check to see if we were given a LegoTower event version
    else if (game === "LegoTower" && trackedLegoTowerVersions[version as TrackedLegoTowerVersions]) {
        semanticVersion = trackedLegoTowerVersions[version as TrackedLegoTowerVersions];
    }

    // Check to see if we were given a TinyTowerVegas event version
    else if (game === "TinyTowerVegas" && trackedTinyTowerVegasVersions[version as TrackedTinyTowerVegasVersions]) {
        semanticVersion = trackedTinyTowerVegasVersions[version as TrackedTinyTowerVegasVersions];
    }

    // Edge case if you pass something in from javascript that isn't type checked correctly
    else {
        throw new Error(`Invalid version "${version}" for game "${game}"`);
    }

    // Check to see if the apk already exists in the downloads cache
    const fileNames = await fs.promises.readdir(downloadsDirectory);
    const desiredApkFilename = `${supplier}_${game}_${semanticVersion}_${architecture}.apk`;
    const maybeCachedApk = fileNames.find((fileName) => fileName.includes(desiredApkFilename));
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
    const fetcher = supplier === "apkmirror" ? getApkmirrorDetails : getApkpureDetails;
    const [downloadUrl] = await fetcher(game, semanticVersion, architecture);
    await stream.pipeline(got.stream(downloadUrl), fs.createWriteStream(`${downloadsDirectory}/${desiredApkFilename}`));
    return `${downloadsDirectory}/${desiredApkFilename}`;
};

export default loadApk;
