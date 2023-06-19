import type { IPuppeteerDetails } from "./shared.puppeteer.js";

import Debug from "debug";
import puppeteer from "puppeteer";

const logger: Debug.Debugger = Debug.debug("tinyburg:apks:puppeteer:apkpure");

export const getApkpureDetails = async (): Promise<IPuppeteerDetails> => {
    const errorMessage = "Something is wrong with the puppeteer configuration or apkpure has changed their website";

    // Start a browser in headless mode and navigate to the apkmirror page
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    await page.goto("https://m.apkpure.com/tiny-tower-8-bit-retro-tycoon/com.nimblebit.tinytower");

    // Grab the detail banner
    const detailBanner = await page.$(".detail_banner");
    if (!detailBanner) {
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
    };
};
