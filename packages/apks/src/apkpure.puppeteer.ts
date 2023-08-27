import type { IPuppeteerDetails } from "./shared.puppeteer.js";

import got from "got";
import fs from "node:fs";
import Debug from "debug";
import url from "node:url";
import puppeteer from "puppeteer";
import stream from "node:stream/promises";

const logger: Debug.Debugger = Debug.debug("tinyburg:apks:puppeteer:apkpure");
const baseUrl: string = "https://m.apkpure.com/tiny-tower-8-bit-retro-tycoon/com.nimblebit.tinytower";
const errorMessage: string = "Something is wrong with the puppeteer configuration or apkpure has changed their website";

export const getApkpureLatestDetails = async (): Promise<IPuppeteerDetails> => {
    // Start a browser and navigate to the apkmirror page
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    await page.goto(baseUrl, { waitUntil: "load", timeout: 0 });

    // Grab the detail banner
    const detailBanner = await page.$(".detail_banner");
    if (!detailBanner) {
        await browser.close();
        throw new Error(errorMessage);
    }

    // Parse desired information
    const updatedDate: string | undefined = await detailBanner.$eval(".date", (n) => n.textContent);
    const name: string | undefined = await detailBanner.$eval(".title_link h1", (n) => n.textContent);
    const latestVersion: string | undefined = await detailBanner.$eval(".details_sdk span", (n) => n.textContent);

    // Make sure to close the browser here in case we throw an error
    await browser.close();
    logger("Extracted %o from apkpure website", { name, updatedDate, latestVersion });

    // Check that everything was retrieved correctly
    if (!name || !updatedDate || !latestVersion) {
        throw new Error(errorMessage);
    }

    return {
        name,
        updatedDate,
        latestVersion,
        latestDownloadUrl: "https://d.apkpure.com/b/APK/com.nimblebit.tinytower?version=latest",
    };
};

export const downloadLatestApkpureApk = async (
    suppliedDetails?: IPuppeteerDetails,
    downloadsFolder: string = url.fileURLToPath(new URL("../downloads/apkpure/", import.meta.url))
): Promise<IPuppeteerDetails> => {
    // Get the details from apkpure for the latest version url
    const details = suppliedDetails ?? (await getApkpureLatestDetails());
    const browser = await puppeteer.launch({ headless: false });

    // https://github.com/adewaleng/node-apkpure-crawler/blob/5a13fd7dd17d33c1642796c5bf75365a54edd56f/src/download-apk.js#L40C1-L68C2
    const getWinudfUrl = async (downloadUrl: string): Promise<string> => {
        const page = await browser.newPage();
        await page.setRequestInterception(true);

        const winudfUrl = await new Promise((resolve, reject) => {
            page.on("request", async (event) => {
                const u = event.url();
                if (event.isInterceptResolutionHandled()) return;
                if (!/^https:\/\/d-[\da-z]*\.winudf\.com/.test(u)) return await event.continue();
                await event.respond({ status: 200, body: "" });
                resolve(u);
            });

            page.goto(downloadUrl, { waitUntil: "load", timeout: 0 }).catch((error) => {
                // When the error is reported, it means success.
                if (error.message === "Navigation failed because browser has disconnected!") return;
                throw error;
            });

            setTimeout(() => reject(new Error("timeout get download url")), 5000);
        });

        await page.close();
        await browser.close();
        return winudfUrl as string;
    };

    // Get the real download url and stream the apk
    const realDownloadUrl = await getWinudfUrl(details.latestDownloadUrl);
    const outputFile = `${downloadsFolder}/${details.name}-${details.latestVersion}.apk`;
    await stream.pipeline(got.stream(realDownloadUrl), fs.createWriteStream(outputFile));
    return details;
};
