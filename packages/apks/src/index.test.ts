import fs from "node:fs";

import { PatchedVersions } from "./patched.type.js";
import { ApkpureVersions } from "./apkpure.type.js";
import { ApkmirrorVersions } from "./apkmirror.type.js";
import { getApkpureLatestDetails } from "./apkpure.puppeteer.js";
import { getApkmirrorLatestDetails } from "./apkmirror.puppeteer.js";
import { loadPatchedApk, loadApkFromApkpure, loadApkFromApkmirror, TinyTowerApkSources } from "./index.js";

const checkFileExists = async (path: fs.PathLike): Promise<boolean> =>
    await fs.promises
        .access(path, fs.constants.F_OK)
        .then(() => true)
        .catch(() => false);

const checkForApkWithVersionInFolder = async (folder: fs.PathLike, version: string): Promise<boolean> =>
    await fs.promises
        .readdir(folder)
        .then((files) => files.map((apkFileName) => apkFileName.match(/\d+.\d+.\d+/gm)?.[0]))
        .then((versions) => versions.includes(version))
        .catch(() => false);

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

const { latestVersion: latestApkpureVersion, updatedDate: apkpureUpdatedDate } = await getApkpureLatestDetails();
const { latestVersion: latestApkmirrorVersion, updatedDate: apkmirrorUpdatedDate } = await getApkmirrorLatestDetails();
describe("Should have the latest apk downloaded", () => {
    it(`Apkpure downloads folder should contain version=${latestApkpureVersion}, published on ${apkpureUpdatedDate}`, async () => {
        const apkpureDownloads = new URL("../downloads/apkpure", import.meta.url);
        const versionDoesExist = await checkForApkWithVersionInFolder(apkpureDownloads, latestApkpureVersion);
        expect(versionDoesExist).toBeTruthy();
    });
    it(`Apkmirror downloads folder should contain version=${latestApkmirrorVersion}, published on ${apkmirrorUpdatedDate}`, async () => {
        const apkmirrorDownloads = new URL("../downloads/apkmirror", import.meta.url);
        const versionDoesExist = await checkForApkWithVersionInFolder(apkmirrorDownloads, latestApkmirrorVersion);
        expect(versionDoesExist).toBeTruthy();
    });
});

const allSource = [...TinyTowerApkSources, "patched"];
const filePromises = await Promise.all(
    allSource.map((source) => fs.promises.readdir(new URL(`../downloads/${source}`, import.meta.url)))
);
const count = filePromises.flat().length - allSource.length;
describe("Should load all apks from all sources at least once", () => {
    it(`Should load all ${count} versions`, async () => {
        expect(count).toEqual(ApkmirrorVersions.length + ApkpureVersions.length + PatchedVersions.length);
    });
});
