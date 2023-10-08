import {
    defaultVersion,
    defaultSupplier,
    defaultArchitecture,
    type RequestedGame,
    type RequestedVersion,
    type RequestedSupplier,
    type RequestedArchitecture,
} from "./types.js";

import { getApkpureDetails } from "./apkpure.puppeteer.js";
import { getApkmirrorDetails } from "./apkmirror.puppeteer.js";
import { getTinyTowerVersions, getLegoTowerVersions, getTinyTowerVegasVersions } from "./versions.js";

import got from "got";
import url from "node:url";
import fs from "node:fs/promises";

import Debug from "debug";
const logger: Debug.Debugger = Debug.debug("tinyburg:apks");

export const loadApk = async (
    game: RequestedGame,
    version: RequestedVersion = defaultVersion,
    supplier: RequestedSupplier = defaultSupplier,
    architecture: RequestedArchitecture = defaultArchitecture
): Promise<string> => {
    logger("Loading %s %s for architecture %s from supplier %s", game, version, architecture, supplier);

    const versionsBeforeLatest = version === "latest version" ? 0 : Number.parseInt(version.split(" ")[0]!);
    if (versionsBeforeLatest < 0 || Number.isNaN(versionsBeforeLatest)) {
        throw new Error("Invalid version requested");
    }

    const supplierVersions =
        game === "TinyTower"
            ? await getTinyTowerVersions()
            : game === "LegoTower"
            ? await getLegoTowerVersions()
            : game === "TinyTowerVegas"
            ? await getTinyTowerVegasVersions()
            : {};

    const sanitizedRequestedVersion = version === "latest version" ? "0 versions before latest" : version;
    const semanticVersion = supplierVersions[sanitizedRequestedVersion];
    if (!semanticVersion) {
        throw new Error("Invalid version requested");
    }

    const fileNames = await fs.readdir(new URL(`../downloads/`, import.meta.url));
    const maybeCachedApk = fileNames.find((fileName) =>
        fileName.includes(`${supplier}_${game}_${semanticVersion}_${architecture}.apk`)
    );

    if (maybeCachedApk) {
        logger("Apk was found in downloads cache: %s", maybeCachedApk);
        return url.fileURLToPath(new URL(`../downloads/${maybeCachedApk}`, import.meta.url));
    } else if (supplier === "patched") {
        throw new Error("No patched apk found in downloads folder");
    }

    const [downloadUrl, scrapeResults] =
        supplier === "apkmirror"
            ? await getApkmirrorDetails(game, versionsBeforeLatest, architecture)
            : await getApkpureDetails(game, versionsBeforeLatest, architecture);

    const downloadsFolder = url.fileURLToPath(new URL(`../downloads/`, import.meta.url));
    const filename = `${scrapeResults.supplier}_${scrapeResults.name}_${scrapeResults.semVer}_${scrapeResults.architecture}.apk`;

    const downloadStream = await got(downloadUrl).buffer();
    await fs.writeFile(`${downloadsFolder}/${filename}`, downloadStream);
    return `${downloadsFolder}/${filename}`;
};

export default loadApk;
export { getTinyTowerVersions, getTinyTowerVegasVersions, getLegoTowerVersions } from "./versions.js";
