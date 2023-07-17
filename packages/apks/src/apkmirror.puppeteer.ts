import type { IPuppeteerDetails } from "./shared.puppeteer.js";

import got from "got";
import fs from "node:fs";
import Debug from "debug";
import url from "node:url";
import puppeteer from "puppeteer";
import stream from "node:stream/promises";

const logger: Debug.Debugger = Debug.debug("tinyburg:apks:puppeteer:apkpure");
const baseUrl: string = "https://www.apkmirror.com/apk/nimblebit-llc/tiny-tower";
const errorMessage: string =
    "Something is wrong with the puppeteer configuration or apkmirror has changed their website";

export const getApkmirrorLatestDetails = async (): Promise<IPuppeteerDetails> => {
    // Start a browser in headless mode and navigate to the apkmirror page
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    await page.goto(baseUrl);

    // Grab the detail banner for the top/first entry
    const detailBanner = await page.$("#primary > div.listWidget.p-relative > div:nth-child(2) > div.appRow > div");
    if (!detailBanner) {
        await browser.close();
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

    const versionToUrlVersion = latestVersion.replaceAll(".", "-");

    return {
        name,
        updatedDate,
        latestVersion,
        latestDownloadUrl:
            baseUrl +
            `/tiny-tower-${versionToUrlVersion}-release` +
            `/tiny-tower-8-bit-retro-tycoon-${versionToUrlVersion}-android-apk-download/`,
    };
};

export const downloadLatestApkmirrorApk = async (
    suppliedDetails?: IPuppeteerDetails,
    downloadsFolder: string = url.fileURLToPath(new URL("../downloads/apkmirror/", import.meta.url))
): Promise<IPuppeteerDetails> => {
    // Get the details from apkmirror for the latest version url
    const details = suppliedDetails ?? (await getApkmirrorLatestDetails());

    // Navigate to the page with the latest version
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    await page.goto(details.latestDownloadUrl);

    // Grab the download apk button
    const downloadButton = await page.$("#file > div.row.d-flex.f-a-start > div.center.f-sm-50 > div > a");
    if (!downloadButton) {
        await browser.close();
        throw new Error(errorMessage);
    }

    // Get the download link for the page that automatically starts downloading the apk
    const pageWithAutomaticDownloadButtonHref = await downloadButton.getProperty("href");
    const pageWithAutomaticDownload: string = await pageWithAutomaticDownloadButtonHref.jsonValue();

    // Get the real/override download link
    await page.goto(pageWithAutomaticDownload);
    const overrideDownloadButton = await page.$(
        "div.card-with-tabs > div > div > div:nth-child(1) > p:nth-child(3) > span > a"
    );
    if (!overrideDownloadButton) {
        await browser.close();
        throw new Error(errorMessage);
    }

    // Get the override download link for the page that automatically starts downloading the apk
    const overrideDownloadButtonHref = await overrideDownloadButton.getProperty("href");
    const overrideDownloadUrl: string = await overrideDownloadButtonHref.jsonValue();
    await browser.close();

    // Stream the response to a file
    await stream.pipeline(
        got.stream(overrideDownloadUrl),
        fs.createWriteStream(`${downloadsFolder}/${details.name}.apk`)
    );
    return details;
};
