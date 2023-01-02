import { expect } from "chai";
import fs from "node:fs/promises";

import { TinyTowerApkVersions, loadFromApkpure, loadFromApkmirror } from "./index.js";

const checkFileExists = async (path: string): Promise<boolean> => {
    try {
        await fs.access(path, fs.constants.F_OK);
        return true;
    } catch {
        return false;
    }
};

describe("Should load all apks from apkmirror", async () => {
    for (const version of TinyTowerApkVersions) {
        it(`Should load version ${version}`, async () => {
            const apkDoesExist = await checkFileExists(loadFromApkmirror(version));
            expect(apkDoesExist).to.be.equal(true, `Have apk for version ${version} from apkmirror`);
        });
    }
});

describe("Should load all apks from apkpure", async () => {
    for (const version of TinyTowerApkVersions) {
        it(`Should load version ${version}`, async () => {
            const apkDoesExist = await checkFileExists(loadFromApkpure(version));
            expect(apkDoesExist).to.equal(true, `Have apk for version ${version} from apkpure`);
        });
    }
});
