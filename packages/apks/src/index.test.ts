import fs from "node:fs/promises";
import puppeteer from "puppeteer";

import { PatchedVersions } from "./patched.type.js";
import { ApkpureVersions } from "./apkpure.type.js";
import { ApkmirrorVersions } from "./apkmirror.type.js";
import { loadPatchedApk, loadApkFromApkpure, loadApkFromApkmirror, TinyTowerApkSources } from "./index.js";

const checkFileExists = async (path: string): Promise<boolean> => {
    try {
        await fs.access(path, fs.constants.F_OK);
        return true;
    } catch {
        return false;
    }
};

const checkForApkWithVersionInFolder = async (folder: URL, version: string): Promise<boolean> => {
    try {
        const files = await fs.readdir(folder);
        return files.map((apkFileName) => apkFileName.match(/\d+.\d+.\d+/gm)?.[0]).includes(version);
    } catch {
        return false;
    }
};

describe("Should load all apks from apkmirror", () => {
    for (const version of ApkmirrorVersions) {
        it(`Should load version ${version}`, async () => {
            const fileLocation = await loadApkFromApkmirror(version);
            const apkDoesExist = await checkFileExists(fileLocation);
            expect(apkDoesExist).toBeTruthy();
        });
    }
});

describe("Should load all apks from apkpure", () => {
    for (const version of ApkpureVersions) {
        it(`Should load version ${version}`, async () => {
            const fileLocation = await loadApkFromApkpure(version);
            const apkDoesExist = await checkFileExists(fileLocation);
            expect(apkDoesExist).toBeTruthy();
        });
    }
});

describe("Should load all the patched apks", () => {
    for (const version of PatchedVersions) {
        it(`Should load version ${version}`, async () => {
            const fileLocation = await loadPatchedApk(version);
            const apkDoesExist = await checkFileExists(fileLocation);
            expect(apkDoesExist).toBeTruthy();
        });
    }
});

const browser = await puppeteer.launch({ headless: "new", executablePath: "/usr/bin/chromium" });
const page = await browser.newPage();
await page.goto("https://m.apkpure.com/tiny-tower-8-bit-retro-tycoon/com.nimblebit.tinytower");
const detailBanner = await page.$(".detail_banner");
const updateDate = await detailBanner?.$eval(".date", (n) => n.textContent);
const latestVersion = await detailBanner?.$eval(".details_sdk span", (n) => n.textContent);
await browser.close();
describe("Should have the latest apk downloaded", () => {
    it(`Apkpure downloads folder should contain version=${latestVersion}, published on ${updateDate}`, async () => {
        const apkpureDownloads = new URL("../downloads/apkpure", import.meta.url);
        const versionDoesExist = await checkForApkWithVersionInFolder(apkpureDownloads, latestVersion);
        expect(versionDoesExist).toBeTruthy();
    });
    it(`Apkmirror downloads folder should contain version=${latestVersion}, published on ${updateDate}`, async () => {
        const apkmirrorDownloads = new URL("../downloads/apkmirror", import.meta.url);
        const versionDoesExist = await checkForApkWithVersionInFolder(apkmirrorDownloads, latestVersion);
        expect(versionDoesExist).toBeTruthy();
    });
});

const filePromises = [...TinyTowerApkSources, "patched"].map((source) =>
    fs.readdir(new URL(`../downloads/${source}`, import.meta.url))
);
const countPromises = await Promise.all(filePromises);
const count = countPromises.flat().length - [...TinyTowerApkSources, "patched"].length;
describe("Should load all apks from all sources at least once", () => {
    it(`Should load all ${count} versions`, async () => {
        expect(count).toEqual(ApkmirrorVersions.length + ApkpureVersions.length + PatchedVersions.length);
    });
});
