import fs from "node:fs";
import { loadApk } from "./index.js";

const TINYBURG_APKS_TEST_TIMEOUT = 90_000;

const checkFileExists = async (path: Readonly<fs.PathLike>): Promise<boolean> =>
    await fs.promises
        .access(path, fs.constants.F_OK)
        .then(() => true)
        .catch(() => false);

describe("Should have the latest apks downloaded", () => {
    it(
        "Should be able to obtain the latest TinyTower apk from default supplier",
        async () => {
            const apk = await loadApk("TinyTower", "latest version");
            const doesExist = await checkFileExists(apk);
            expect(doesExist).toBeTruthy();
            expect(apk).toBeDefined();
        },
        TINYBURG_APKS_TEST_TIMEOUT
    );

    it(
        "Should be able to obtain the latest TinyTowerVegas apk from apkpure",
        async () => {
            const apk = await loadApk("TinyTowerVegas", "latest version");
            const doesExist = await checkFileExists(apk);
            expect(doesExist).toBeTruthy();
            expect(apk).toBeDefined();
        },
        TINYBURG_APKS_TEST_TIMEOUT
    );

    it(
        "Should be able to obtain the latest BitCity apk from apkpure",
        async () => {
            const apk = await loadApk("BitCity", "latest version");
            const doesExist = await checkFileExists(apk);
            expect(doesExist).toBeTruthy();
            expect(apk).toBeDefined();
        },
        TINYBURG_APKS_TEST_TIMEOUT
    );

    it(
        "Should be able to obtain the latest PocketPlanes apk from apkpure",
        async () => {
            const apk = await loadApk("PocketPlanes", "latest version");
            const doesExist = await checkFileExists(apk);
            expect(doesExist).toBeTruthy();
            expect(apk).toBeDefined();
        },
        TINYBURG_APKS_TEST_TIMEOUT
    );

    it(
        "Should be able to obtain the latest PocketTrains apk from apkpure",
        async () => {
            const apk = await loadApk("PocketTrains", "latest version");
            const doesExist = await checkFileExists(apk);
            expect(doesExist).toBeTruthy();
            expect(apk).toBeDefined();
        },
        TINYBURG_APKS_TEST_TIMEOUT
    );

    it(
        "Should be able to obtain the latest PocketFrogs apk from apkpure",
        async () => {
            const apk = await loadApk("PocketFrogs", "latest version");
            const doesExist = await checkFileExists(apk);
            expect(doesExist).toBeTruthy();
            expect(apk).toBeDefined();
        },
        TINYBURG_APKS_TEST_TIMEOUT
    );
});
