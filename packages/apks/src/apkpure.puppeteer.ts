import type { IPuppeteerDetails } from "./details.puppeteer.js";

import puppeteer from "puppeteer";

export const getApkpureDetails = async (): Promise<IPuppeteerDetails> => {
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    await page.goto("https://m.apkpure.com/tiny-tower-8-bit-retro-tycoon/com.nimblebit.tinytower");

    const detailBanner = await page.$(".detail_banner");
    if (!detailBanner) {
        throw new Error("Something is wrong with the puppeteer configuration or apkpure has changed their website");
    }

    const updateDate: string = await detailBanner.$eval(".date", (n) => n.textContent);
    const name: string = await detailBanner.$eval(".title_link h1", (n) => n.textContent);
    const developer: string = await detailBanner.$eval(".details_sdk a", (n) => n.textContent);
    const latestVersionName: string = await detailBanner.$eval(".details_sdk span", (n) => n.textContent);
    const developerUrl: string = await detailBanner.$eval(".details_sdk a", (n) => n.getAttribute("href"));
    const shortDescription: string = await page.$eval(".description-short", (n) => n.textContent);
    const latestVersionCode: string = await page.$eval(
        ".download_apk_news[data-dt-version_code]",
        (n) => n.dataset.dtVersion_code
    );

    await browser.close();
    return {
        name,
        developer: {
            name: developer.replace("\\n", ""),
            url: developerUrl,
        },
        updateDate,
        shortDescription,
        latestVersionName,
        latestVersionCode: Number.parseInt(latestVersionCode, 10),
    };
};
