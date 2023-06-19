import type { IPuppeteerDetails } from "./shared.puppeteer.js";

import Debug from "debug";
import puppeteer from "puppeteer";

const logger: Debug.Debugger = Debug.debug("tinyburg:apks:puppeteer:apkpure");

export const getApkmirrorDetails = async (): Promise<IPuppeteerDetails> => {
    const errorMessage = "Something is wrong with the puppeteer configuration or apkmirror has changed their website";

    // Start a browser in headless mode and navigate to the apkmirror page
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    await page.goto("https://www.apkmirror.com/apk/nimblebit-llc/tiny-tower/");

    // Grab the detail banner for the top/first entry
    const detailBanner = await page.$("#primary > div.listWidget.p-relative > div:nth-child(2) > div.appRow > div");
    if (!detailBanner) {
        throw new Error(errorMessage);
    }

    // Parse desired information
    const name: string | undefined = await detailBanner.$eval(
        "div:nth-child(2) > div > h5 > a",
        (node) => node.textContent
    );
    const updatedDate: string | undefined = await detailBanner.$eval(
        "div.table-cell.hidden-xs > span > span",
        (node) => node.textContent
    );
    const latestVersion: string | undefined = await detailBanner.$eval(
        "div:nth-child(2) > div > h5 > a",
        (node) => (node.textContent as string).match(/\d+.\d+.\d+/gm)?.[0]
    );

    // Make sure to close the browser here in case we throw an error
    await browser.close();
    logger("Extracted %o from apkmirror website", { name, updatedDate, latestVersion });

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
