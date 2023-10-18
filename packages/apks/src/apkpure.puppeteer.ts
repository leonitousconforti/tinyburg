import type { IPuppeteerDetails, RequestedGame, RequestedArchitecture, SemanticVersion } from "./types.js";

import Debug from "debug";
import puppeteer from "puppeteer";

const logger: Debug.Debugger = Debug.debug("tinyburg:apks:puppeteer:apkpure");

/** These are the pages where we will start trying to download from for each game */
const downloadPages: { [k in RequestedGame]: (version: SemanticVersion) => string } = {
    TinyTowerVegas: (version: SemanticVersion) =>
        `https://apkpure.com/tiny-tower-vegas/com.nimblebit.vegas/download/${version}`,
    LegoTower: (version: SemanticVersion): string =>
        `https://apkpure.com/lego%C2%AE-tower/com.nimblebit.legotower/download/${version}`,
    TinyTower: (version: SemanticVersion) =>
        `https://apkpure.com/tiny-tower-8-bit-retro-tycoon/com.nimblebit.tinytower/download/${version}`,
};

export const getApkpureDetails = async (
    game: RequestedGame,
    semanticVersion: SemanticVersion,
    architecture: RequestedArchitecture
): Promise<[downloadUrl: string, details: IPuppeteerDetails]> => {
    // Start a browser and navigate to the apkpure product page
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    logger("Navigating to download page %s", downloadPages[game]);
    await page.goto(downloadPages[game](semanticVersion), { waitUntil: "load", timeout: 15_000 });

    // Try to find the download button on the page
    const downloadButton = await page.$(
        "body > div.main-body > main > div.download-box.download-button-box.d-normal > a.btn.download-start-btn"
    );
    if (!downloadButton) {
        throw new Error("Could not find download button on apkpure website");
    }

    // Grab the download url from the download button
    const downloadButtonHref = await downloadButton.getProperty("href");
    const downloadUrl: string = await downloadButtonHref.jsonValue();

    // https://github.com/adewaleng/node-apkpure-crawler/blob/5a13fd7dd17d33c1642796c5bf75365a54edd56f/src/download-apk.js#L40C1-L68C2
    const getWinudfUrl = async (downloadUrl: string): Promise<string> => {
        await page.setRequestInterception(true);

        return new Promise((resolve, reject) => {
            page.on("request", async (event) => {
                const u = event.url();
                if (event.isInterceptResolutionHandled()) return;
                if (!/^https:\/\/d-[\da-z]*\.winudf\.com/.test(u)) return await event.continue();
                await event.respond({ status: 200, body: "" });
                resolve(u);
            });

            page.goto(downloadUrl).catch((error) => {
                // When the error is reported, it means success.
                if (error.message === "Navigating frame was detached") return;
                throw error;
            });

            setTimeout(() => reject(new Error("timeout get download url")), 5000);
        });
    };

    const realDownloadUrl = await getWinudfUrl(downloadUrl);
    await page.close();
    await browser.close();

    // TODO: Figure out how to get the updated date
    return [
        realDownloadUrl,
        {
            name: game,
            architecture,
            semVer: semanticVersion,
            supplier: "apkpure",
            updatedDate: "unknown",
        },
    ];
};
