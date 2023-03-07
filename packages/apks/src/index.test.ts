import fs from "node:fs/promises";

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

const files = [...TinyTowerApkSources, "patched"].map((source) =>
    fs.readdir(new URL(`../downloads/${source}`, import.meta.url))
);
const countPromises = await Promise.all(files);
const count = countPromises.flat().length - [...TinyTowerApkSources, "patched"].length;
describe("Should load all apks from all sources at least once", () => {
    it(`Should load all ${count} versions`, async () => {
        expect(count).toEqual(ApkmirrorVersions.length + ApkpureVersions.length + PatchedVersions.length);
    });
});
