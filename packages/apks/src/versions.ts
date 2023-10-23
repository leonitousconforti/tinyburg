import {
    isRelativeVersion,
    isSemanticVersion,
    type RelativeVersion,
    type RequestedGame,
    type SemanticVersion,
    type SemanticVersionsByRelativeVersions,
} from "./types.js";

import puppeteer from "puppeteer";

// TODO: Record some interesting events/versions
// Important TinyTower versions that are worth tracking
// eslint-disable-next-line @typescript-eslint/typedef
export const trackedTinyTowerVersions = {} satisfies Record<string, SemanticVersion>;
export type TrackedTinyTowerVersions = keyof typeof trackedTinyTowerVersions;

// TODO: Record some interesting events/versions
// Important LegoTower versions that are worth tracking
// eslint-disable-next-line @typescript-eslint/typedef
export const trackedLegoTowerVersions = {} satisfies Record<string, SemanticVersion>;
export type TrackedLegoTowerVersions = keyof typeof trackedLegoTowerVersions;

// TODO: Record some interesting events/versions
// Important TinyTowerVegas versions that are worth tracking
// eslint-disable-next-line @typescript-eslint/typedef
export const trackedTinyTowerVegasVersions = {} satisfies Record<string, SemanticVersion>;
export type TrackedTinyTowerVegasVersions = keyof typeof trackedTinyTowerVegasVersions;

// Where to find the versions of the games on apkpure
const versionsPages: { [k in RequestedGame]: string } = {
    LegoTower: "https://apkpure.com/lego%C2%AE-tower/com.nimblebit.legotower/versions",
    TinyTowerVegas: "https://apkpure.com/tiny-tower-vegas/com.nimblebit.vegas/versions",
    TinyTower: "https://apkpure.com/tiny-tower-8-bit-retro-tycoon/com.nimblebit.tinytower/versions",
};

/**
 * Retrieves a map of semantic versions like "1.2.3" by relative versions like
 * "2 versions before latest" from an apkpure versions page.
 *
 * @param game - The game you are requesting the versions for
 * @returns - A map of relative versions to semantic versions
 */
export const getSemanticVersionsByRequestedVersions = async (
    game: RequestedGame
): Promise<SemanticVersionsByRelativeVersions> => {
    const browser: puppeteer.Browser = await puppeteer.launch({ headless: false });
    const page: puppeteer.Page = await browser.newPage();
    await page.goto(versionsPages[game], { waitUntil: "load", timeout: 15_000 });

    const versions: (readonly [`${number} versions before latest`, `${number}.${number}.${number}`])[] =
        await page.$$eval(
            "body > div.versions-main.page-q > div.details-left > div.ver_content_box > ul > li > a > div.ver-item > div.ver-item-n",
            (nodes) =>
                nodes
                    .map((node) => node.textContent as string)
                    .map((version) => version.match(/\d+\.\d+\.\d+/)?.[0] as SemanticVersion)
                    .map((version, index) => [`${index} versions before latest`, version] as const)
                    .filter(([version]) => version !== undefined)
        );

    await browser.close();
    return new Map(versions);
};

/**
 * Converts a requested version, which is either a semantic version or a
 * relative version or an event version, into a semantic version.
 *
 * @param game - The game you are requesting the version for
 * @param version - The requested version
 * @returns - The semantic version
 */
export const toSemanticVersion = async (game: RequestedGame, version: string): Promise<SemanticVersion> => {
    // If we were given a semantic version, nothing needs to be done to it
    if (isSemanticVersion(version)) {
        return version;
    }

    // If we were given a relative version, we need to convert it to a semantic
    // version by going to apkpure's website and parsing all the versions in
    // order into a map of relative version to semantic version.
    else if (isRelativeVersion(version)) {
        const gameSemanticVersionsByRelativeVersions: SemanticVersionsByRelativeVersions =
            await getSemanticVersionsByRequestedVersions(game);

        const sanitizedRelativeVersion: RelativeVersion =
            version === "latest version" ? "0 versions before latest" : version;

        const maybeSemanticVersion: SemanticVersion | undefined =
            gameSemanticVersionsByRelativeVersions.get(sanitizedRelativeVersion);

        if (maybeSemanticVersion) {
            return maybeSemanticVersion;
        } else {
            throw new Error(`Could not find semantic version for game "${game}" relative version "${version}"`);
        }
    }

    // Check to see if we were given a TinyTower event version
    else if (game === "TinyTower" && trackedTinyTowerVersions[version as TrackedTinyTowerVersions]) {
        return trackedTinyTowerVersions[version as TrackedTinyTowerVersions];
    }

    // Check to see if we were given a LegoTower event version
    else if (game === "LegoTower" && trackedLegoTowerVersions[version as TrackedLegoTowerVersions]) {
        return trackedLegoTowerVersions[version as TrackedLegoTowerVersions];
    }

    // Check to see if we were given a TinyTowerVegas event version
    else if (game === "TinyTowerVegas" && trackedTinyTowerVegasVersions[version as TrackedTinyTowerVegasVersions]) {
        return trackedTinyTowerVegasVersions[version as TrackedTinyTowerVegasVersions];
    }

    // Edge case if you pass something in from javascript that isn't type checked correctly
    else {
        throw new Error(`Invalid version "${version}" for game "${game}"`);
    }
};
