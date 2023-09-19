import type { SemanticVersion, SemanticVersionsByRequestedVersions } from "./types.js";

import puppeteer from "puppeteer";

const getSemanticVersionsByRequestedVersions = async (
    versionsPage: string
): Promise<SemanticVersionsByRequestedVersions> => {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    await page.goto(versionsPage, { waitUntil: "load", timeout: 15_000 });

    const versions = await page.$$eval(
        "body > div.versions-main.page-q > div.details-left > div.ver_content_box > ul > li > a > div.ver-item > div.ver-item-n",
        (nodes) =>
            nodes
                .map((node) => node.textContent)
                .map((version) => version.match(/\d+.\d+.\d+/)?.[0] as SemanticVersion)
                .map((version, index) => [`${index} versions before latest`, version] as const)
                .filter(([version]) => version !== undefined)
    );

    await browser.close();
    return Object.fromEntries(versions);
};

const TinyTowerVersionsPage: string =
    "https://apkpure.com/tiny-tower-8-bit-retro-tycoon/com.nimblebit.tinytower/versions";
const LegoTowerVersionsPage: string = "https://apkpure.com/lego%C2%AE-tower/com.nimblebit.legotower/versions";
const TinyTowerVegasVersionsPage: string = "https://apkpure.com/tiny-tower-vegas/com.nimblebit.vegas/versions";

export const getTinyTowerVersions = async (): Promise<SemanticVersionsByRequestedVersions> =>
    getSemanticVersionsByRequestedVersions(TinyTowerVersionsPage);
export const getLegoTowerVersions = async (): Promise<SemanticVersionsByRequestedVersions> =>
    getSemanticVersionsByRequestedVersions(LegoTowerVersionsPage);
export const getTinyTowerVegasVersions = async (): Promise<SemanticVersionsByRequestedVersions> =>
    getSemanticVersionsByRequestedVersions(TinyTowerVegasVersionsPage);
