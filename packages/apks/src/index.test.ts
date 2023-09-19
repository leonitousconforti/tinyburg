import fs from "node:fs";

import { loadApk } from "./index.js";

const checkFileExists = async (path: fs.PathLike): Promise<boolean> =>
    await fs.promises
        .access(path, fs.constants.F_OK)
        .then(() => true)
        .catch(() => false);

describe("Should have the latest apks downloaded", () => {
    it("Should be able to obtain the latest TinyTower apk from default supplier", async () => {
        const apk = await loadApk("TinyTower", "latest version");
        const doesExist = await checkFileExists(apk);
        expect(doesExist).toBeTruthy();
        expect(apk).toBeDefined();
    }, 90_000);

    it("Should be able to obtain the latest LegoTower apk from default supplier", async () => {
        const apk = await loadApk("LegoTower", "latest version");
        const doesExist = await checkFileExists(apk);
        expect(doesExist).toBeTruthy();
        expect(apk).toBeDefined();
    }, 90_000);

    // it("Should be able to obtain the latest TinyTowerVegas apks from default suppler", async () => {
    //     const apk = await loadApk("TinyTowerVegas", "latest version");
    //     const doesExist = await checkFileExists(apk);
    //     expect(doesExist).toBeTruthy();
    //     expect(apk).toBeDefined();
    // }, 90_000);
});
