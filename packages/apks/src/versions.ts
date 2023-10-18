import type { SemanticVersion, SemanticVersionsByRelativeVersions } from "./types.js";

import puppeteer from "puppeteer";

/**
 * Retrieves a map of semantic versions like "1.2.3" by relative versions like
 * "2 versions before latest" from an apkpure versions page.
 */
const getSemanticVersionsByRequestedVersions = async (
    versionsPage: string
): Promise<SemanticVersionsByRelativeVersions> => {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    await page.goto(versionsPage, { waitUntil: "load", timeout: 15_000 });

    const versions = await page.$$eval(
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

// Helpers to get semantic versions by requested versions for each game
export const getLegoTowerSemanticVersionsByRelativeVersions = (): Promise<SemanticVersionsByRelativeVersions> =>
    getSemanticVersionsByRequestedVersions("https://apkpure.com/lego%C2%AE-tower/com.nimblebit.legotower/versions");

export const getTinyTowerVegasSemanticVersionsByRelativeVersions = (): Promise<SemanticVersionsByRelativeVersions> =>
    getSemanticVersionsByRequestedVersions("https://apkpure.com/tiny-tower-vegas/com.nimblebit.vegas/versions");

export const getTinyTowerSemanticVersionsByRelativeVersions = (): Promise<SemanticVersionsByRelativeVersions> =>
    getSemanticVersionsByRequestedVersions(
        "https://apkpure.com/tiny-tower-8-bit-retro-tycoon/com.nimblebit.tinytower/versions"
    );

// TODO: Record some interesting events/versions
// Important TinyTower versions that are worth tracking
// eslint-disable-next-line @rushstack/typedef-var
export const trackedTinyTowerVersions = {} satisfies Record<string, SemanticVersion>;
export type TrackedTinyTowerVersions = keyof typeof trackedTinyTowerVersions;

// TODO: Record some interesting events/versions
// Important LegoTower versions that are worth tracking
// eslint-disable-next-line @rushstack/typedef-var
export const trackedLegoTowerVersions = {} satisfies Record<string, SemanticVersion>;
export type TrackedLegoTowerVersions = keyof typeof trackedLegoTowerVersions;

// TODO: Record some interesting events/versions
// Important TinyTowerVegas versions that are worth tracking
// eslint-disable-next-line @rushstack/typedef-var
export const trackedTinyTowerVegasVersions = {} satisfies Record<string, SemanticVersion>;
export type TrackedTinyTowerVegasVersions = keyof typeof trackedTinyTowerVegasVersions;
