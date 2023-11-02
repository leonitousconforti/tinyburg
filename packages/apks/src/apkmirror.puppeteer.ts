import {
    type RequestedGame,
    type SemanticVersion,
    type PuppeteerFetcher,
    type IPuppeteerDetails,
    type RequestedArchitecture,
} from "./types.js";

import { ApkmirrorScrapingError } from "./types.js";
import { headlessBrowserResource } from "./resources.js";

import puppeteer from "puppeteer";
import { Effect, Scope } from "effect";

/**
 * Apkmirror only has the base game and lego tower uploaded, it does not have
 * tiny tower vegas uploaded. These are the pages where we will start trying to
 * download each game from.
 */
const productPages: { [k in RequestedGame]: string } = {
    TinyTower: "https://www.apkmirror.com/apk/nimblebit-llc/tiny-tower",
    LegoTower: "",
    TinyTowerVegas: "",
    BitCity: "",
    PocketFrogs: "",
    PocketPlanes: "",
    PocketTrains: "",
};

/**
 * For a given version, these are the pages for all the releases under that
 * version for each game. Each version can have multiple releases for different
 * architectures/revisions etc.
 */
// const _releasePages: { [k in keyof typeof productPages]: (version: string) => string } = {
//     TinyTower: (version: string) => `${productPages.TinyTower}/tiny-tower-${version}-release/`,
//     LegoTower: (version: string) => `${productPages.LegoTower}/lego-tower-${version}-release/`,
//     TinyTowerVegas: () => ``,
// };

export const getApkmirrorDetails: PuppeteerFetcher = (
    game: RequestedGame,
    _semanticVersion: SemanticVersion,
    architecture: RequestedArchitecture
): Effect.Effect<
    Scope.Scope,
    ApkmirrorScrapingError,
    readonly [downloadUrl: string, details: Readonly<IPuppeteerDetails>]
> =>
    // Start a browser and navigate to the apkmirror product page
    Effect.gen(function* (_: Effect.Adapter) {
        const browser: puppeteer.Browser = yield* _(headlessBrowserResource);
        const page: puppeteer.Page = yield* _(Effect.promise(browser.newPage));
        yield* _(Effect.log(`Navigating to product page ${productPages[game]}`));
        yield* _(Effect.promise(() => page.goto(productPages[game], { waitUntil: "load", timeout: 15_000 })));

        // // Grab all the detail banners from the page and map then to their semantic versions
        // const detailBanners: puppeteer.ElementHandle[] = await page.$$(
        //     `#primary > div.listWidget.p-relative > div > div.appRow > div`
        // );
        // const detailBannersBySemanticVersion: (readonly [
        //     `${number}.${number}.${number}` | undefined,
        //     puppeteer.ElementHandle,
        // ])[] = await Promise.all(
        //     detailBanners.map(async (tableEntry) => {
        //         const version: `${number}.${number}.${number}` | undefined = await tableEntry.$eval(
        //             "div:nth-child(2) > div > h5 > a",
        //             (node) => (node.textContent as string).match(/\d+.\d+.\d+/gm)?.[0] as SemanticVersion | undefined
        //         );
        //         return [version, tableEntry] as const;
        //     })
        // );

        // // Find the detailed banner for the version we want to download
        // const detailBanner:
        //     | readonly [`${number}.${number}.${number}` | undefined, puppeteer.ElementHandle]
        //     | undefined = detailBannersBySemanticVersion.find(([version]) => version === semanticVersion);
        // if (!detailBanner?.[1]) {
        //     await browser.close();
        //     throw new Error("Could not find detail banner on apkmirror website");
        // }

        // // Parse updatedDate, and version information
        // const updatedDate: string | undefined = await detailBanner[1].$eval(
        //     "div.table-cell.hidden-xs > span > span",
        //     (node) => node.textContent
        // );
        // const version: SemanticVersion | undefined = detailBanner[0];

        // // Check that everything above was retrieved correctly
        // logger("Extracted %o from apkmirror website", { updatedDate, version });
        // if (!updatedDate) {
        //     await browser.close();
        //     throw new Error("Could not extract updated date from apkmirror website");
        // }
        // if (!version) {
        //     await browser.close();
        //     throw new Error("Could not extract latest version from apkmirror website");
        // }

        // // Navigate to the releases page for this version
        // const releasePage: string = releasePages[game](version.replaceAll(".", "-") || "unknown");
        // logger("Navigating to release page %s", releasePage);
        // await page.goto(releasePage, { waitUntil: "load", timeout: 15_000 });

        // // Grab the downloads table and find the row for the desired architecture
        // const downloadsTable: puppeteer.ElementHandle[] = await page.$$("#downloads > div > div > div");
        // const availableDownloadsByArchitecture: (readonly [string, puppeteer.ElementHandle])[] = await Promise.all(
        //     downloadsTable.map(async (tableEntry) => {
        //         const child: puppeteer.ElementHandle | null = await tableEntry.$("div:nth-child(2)");
        //         const text: puppeteer.ElementHandle | undefined = await child?.getProperty("innerText");
        //         const architectureTextString: string = await text?.jsonValue();
        //         return [architectureTextString, tableEntry] as const;
        //     })
        // );
        // const downloadRowForArchitecture: readonly [string, puppeteer.ElementHandle] | undefined =
        //     availableDownloadsByArchitecture.find(([entry]) => entry.includes(architecture));
        // if (!downloadRowForArchitecture) {
        //     await browser.close();
        //     throw new Error("Could not find download row for architecture on apkmirror website");
        // }

        // // Grab the download button for the desired architecture
        // const downloadButton: puppeteer.ElementHandle | null =
        //     await downloadRowForArchitecture[1]?.$("div:nth-child(5) > a");
        // if (!downloadButton) {
        //     await browser.close();
        //     throw new Error("Could not find download button on apkmirror website");
        // }

        // // Get the download link for the page that automatically starts downloading the apk
        // const downloadButtonHref: puppeteer.ElementHandle = await downloadButton.getProperty("href");
        // const downloadsPage: string = await downloadButtonHref.jsonValue();

        // // Get the real/override download link
        // logger("Navigating to download page %s", downloadsPage);
        // await page.goto(downloadsPage, { waitUntil: "load", timeout: 15_000 });
        // const overrideDownloadButton: puppeteer.ElementHandle | null = await page.$(
        //     "#file > div.row.d-flex.f-a-start > div.center.f-sm-50 > div > a"
        // );
        // if (!overrideDownloadButton) {
        //     await browser.close();
        //     throw new Error("Could not find download link on apkmirror website");
        // }

        // // Get the download link for the page that automatically starts downloading the apk
        // const overrideDownloadButtonHref: puppeteer.ElementHandle | null =
        //     await overrideDownloadButton.getProperty("href");
        // const overrideDownloadUrl: string = await overrideDownloadButtonHref.jsonValue();

        // logger("Navigating to auto download page %s", overrideDownloadUrl);
        // await page.goto(overrideDownloadUrl, { waitUntil: "load", timeout: 15_000 });
        // const downloadButton2: puppeteer.ElementHandle | null = await page.$(
        //     "div.card-with-tabs > div > div > div:nth-child(1) > p:nth-child(3) > span > a"
        // );
        // if (!downloadButton2) {
        //     await browser.close();
        //     throw new Error("Could not find downloadButton2 on apkmirror website");
        // }

        // // Get the download link for the page that automatically starts downloading the apk
        // const downloadButton2Href: puppeteer.ElementHandle | null = await downloadButton2.getProperty("href");
        // const downloadUrl: string = await downloadButton2Href.jsonValue();
        // logger("Found download url %s", downloadUrl);
        // await browser.close();

        return [
            "downloadUrl",
            {
                name: game,
                updatedDate: "",
                architecture,
                semVer: "0.0.0",
                supplier: "apkmirror",
            },
        ];
    });
