import { expect } from "chai";
import fs from "node:fs/promises";

import {
    loadApkFromApkpure,
    loadApkFromApkmirror,
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

it("Should load all apks from all sources at least once", async () => {
    const files = TinyTowerApkSources.map((source) => fs.readdir(new URL(`downloads/${source}`, import.meta.url)));
    const count = (await Promise.all(files)).flat().length - TinyTowerApkSources.length;
    expect(count).to.equal(ApkmirrorVersions.length + ApkpureVersions.length, `Should load all ${count} version`);
});
