import { expect } from "chai";
import fs from "node:fs/promises";

import {
    loadPatchedApk,
    loadApkFromApkpure,
    loadApkFromApkmirror,
    PatchedVersions,
    ApkpureVersions,
    ApkmirrorVersions,
    TinyTowerApkSources,
} from "./index.js";

const checkFileExists = async (path: string): Promise<boolean> => {
    try {
        await fs.access(path, fs.constants.F_OK);
        return true;
    } catch {
        return false;
    }
};

describe("Should load all apks from apkmirror", async () => {
    for (const version of ApkmirrorVersions) {
        it(`Should load version ${version}`, async () => {
            const fileLocation = await loadApkFromApkmirror(version);
            const apkDoesExist = await checkFileExists(fileLocation);
            expect(apkDoesExist).to.be.equal(true, `Have apk for version ${version} from apkmirror`);
        });
    }
});

describe("Should load all apks from apkpure", async () => {
    for (const version of ApkpureVersions) {
        it(`Should load version ${version}`, async () => {
            const fileLocation = await loadApkFromApkpure(version);
            const apkDoesExist = await checkFileExists(fileLocation);
            expect(apkDoesExist).to.equal(true, `Have apk for version ${version} from apkpure`);
        });
    }
});

describe("Should load all the patched apks", async () => {
    for (const version of PatchedVersions) {
        it(`Should load version ${version}`, async () => {
            const fileLocation = await loadPatchedApk(version);
            const apkDoesExist = await checkFileExists(fileLocation);
            expect(apkDoesExist).to.equal(true, `Have patched apk for version ${version}`);
        });
    }
});

describe("Should load all apks from all sources at least once", async () => {
    const files = [...TinyTowerApkSources, "patched"].map((source) =>
        fs.readdir(new URL(`downloads/${source}`, import.meta.url))
    );

    const countPromises = await Promise.all(files);
    const count = countPromises.flat().length - [...TinyTowerApkSources, "patched"].length;

    it(`Should load all ${count} version`, async () => {
        expect(count).to.equal(ApkmirrorVersions.length + ApkpureVersions.length + PatchedVersions.length);
    });
});
