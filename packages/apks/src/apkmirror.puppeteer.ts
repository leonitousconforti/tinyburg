import type { IPuppeteerDetails, RequestedGame, RequestedArchitecture, SemanticVersion } from "./types.js";

import Debug from "debug";
import puppeteer from "puppeteer";

const logger: Debug.Debugger = Debug.debug("tinyburg:apks:puppeteer:apkmirror");

/**
 * Apkmirror only has the base game and lego tower uploaded, it does not have
 * tiny tower vegas uploaded. These are the pages where we will start trying to
 * download each game from.
 */
const productPages: { [k in Exclude<RequestedGame, "TinyTowerVegas">]: string } = {
    TinyTower: "https://www.apkmirror.com/apk/nimblebit-llc/tiny-tower",
    LegoTower: "https://www.apkmirror.com/apk/nimblebit-llc/lego-tower",
};

/**
 * For a given version, these are the pages for all the releases under that
 * version for each game. Each version can have multiple releases for different
 * architectures/revisions etc.
 */
const releasePages: { [k in keyof typeof productPages]: (version: string) => string } = {
    TinyTower: (version: string) => `${productPages.TinyTower}/tiny-tower-${version}-release/`,
    LegoTower: (version: string) => `${productPages.LegoTower}/lego-tower-${version}-release/`,
};

export const getApkmirrorDetails = async (
    game: RequestedGame,
    semanticVersion: SemanticVersion,
    architecture: RequestedArchitecture
): Promise<[downloadUrl: string, details: IPuppeteerDetails]> => {
    if (game === "TinyTowerVegas") {
        throw new Error("TinyTowerVegas is not available on apkmirror, use apkpure as the supplier instead");
    }

    // Start a browser and navigate to the apkmirror product page
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    logger("Navigating to product page %s", productPages[game]);
    await page.goto(productPages[game], { waitUntil: "load", timeout: 15_000 });

    // Grab all the detail banners from the page and map then to their semantic versions
    const detailBanners = await page.$$(`#primary > div.listWidget.p-relative > div > div.appRow > div`);
    const detailBannersBySemanticVersion = await Promise.all(
        detailBanners.map(async (tableEntry) => {
            const version = await tableEntry.$eval(
                "div:nth-child(2) > div > h5 > a",
                (node) => (node.textContent as string).match(/\d+.\d+.\d+/gm)?.[0] as SemanticVersion | undefined
            );
            return [version, tableEntry] as const;
        })
    );

    // Find the detailed banner for the version we want to download
    const detailBanner = detailBannersBySemanticVersion.find(([version]) => version === semanticVersion);
    if (!detailBanner?.[1]) {
        await browser.close();
        throw new Error("Could not find detail banner on apkmirror website");
    }

    // Parse updatedDate, and version information
    const updatedDate: string | undefined = await detailBanner[1].$eval(
        "div.table-cell.hidden-xs > span > span",
        (node) => node.textContent
    );
    const version: SemanticVersion | undefined = detailBanner[0];

    // Check that everything above was retrieved correctly
    logger("Extracted %o from apkmirror website", { updatedDate, version });
    if (!updatedDate) {
        await browser.close();
        throw new Error("Could not extract updated date from apkmirror website");
    }
    if (!version) {
        await browser.close();
        throw new Error("Could not extract latest version from apkmirror website");
    }

    // Navigate to the releases page for this version
    const releasePage: string = releasePages[game](version.replaceAll(".", "-") || "unknown");
    logger("Navigating to release page %s", releasePage);
    await page.goto(releasePage, { waitUntil: "load", timeout: 15_000 });

    // Grab the downloads table and find the row for the desired architecture
    const downloadsTable = await page.$$("#downloads > div > div > div");
    const availableDownloadsByArchitecture = await Promise.all(
        downloadsTable.map(async (tableEntry) => {
            const architectureChild = await tableEntry.$("div:nth-child(2)");
            const architectureText = await architectureChild?.getProperty("innerText");
            const architectureTextString: string = await architectureText?.jsonValue();
            return [architectureTextString, tableEntry] as const;
        })
    );
    const downloadRowForArchitecture = availableDownloadsByArchitecture.find(([entry]) => entry.includes(architecture));
    if (!downloadRowForArchitecture) {
        await browser.close();
        throw new Error("Could not find download row for architecture on apkmirror website");
    }

    // Grab the download button for the desired architecture
    const downloadButton = await downloadRowForArchitecture[1]?.$("div:nth-child(5) > a");
    if (!downloadButton) {
        await browser.close();
        throw new Error("Could not find download button on apkmirror website");
    }

    // Get the download link for the page that automatically starts downloading the apk
    const downloadButtonHref = await downloadButton.getProperty("href");
    const downloadsPage: string = await downloadButtonHref.jsonValue();

    // Get the real/override download link
    logger("Navigating to download page %s", downloadsPage);
    await page.goto(downloadsPage, { waitUntil: "load", timeout: 15_000 });
    const overrideDownloadButton = await page.$("#file > div.row.d-flex.f-a-start > div.center.f-sm-50 > div > a");
    if (!overrideDownloadButton) {
        await browser.close();
        throw new Error("Could not find download link on apkmirror website");
    }

    // Get the download link for the page that automatically starts downloading the apk
    const overrideDownloadButtonHref = await overrideDownloadButton.getProperty("href");
    const overrideDownloadUrl: string = await overrideDownloadButtonHref.jsonValue();

    logger("Navigating to auto download page %s", overrideDownloadUrl);
    await page.goto(overrideDownloadUrl, { waitUntil: "load", timeout: 15_000 });
    const downloadButton2 = await page.$(
        "div.card-with-tabs > div > div > div:nth-child(1) > p:nth-child(3) > span > a"
    );
    if (!downloadButton2) {
        await browser.close();
        throw new Error("Could not find downloadButton2 on apkmirror website");
    }

    // Get the download link for the page that automatically starts downloading the apk
    const downloadButton2Href = await downloadButton2.getProperty("href");
    const downloadUrl: string = await downloadButton2Href.jsonValue();
    logger("Found download url %s", downloadUrl);
    await browser.close();

    return [
        downloadUrl,
        {
            name: game,
            updatedDate,
            architecture,
            semVer: version,
            supplier: "apkmirror",
        },
    ];
};
