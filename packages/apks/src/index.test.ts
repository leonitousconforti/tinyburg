import os from "node:os";
import fs from "node:fs";
import path from "node:path";
import { HashMap, Option } from "effect";

import { loadApk, patchApk, Games } from "./index.js";
import { getSemanticVersionsByRelativeVersions } from "./versions.js";

const TINYBURG_APKS_TEST_TIMEOUT = 5 * 60 * 1000;
const TINYBURG_APKS_TEST_CACHE_HIT_THRESHOLD_MS = 1000;
const TINYBURG_APKS_TEST_CACHE_DIRECTORY = fs.mkdtempSync(path.join(os.tmpdir(), "tinyburg-apks-"));

describe("Apks tests", () => {
    afterAll(() => fs.rmSync(TINYBURG_APKS_TEST_CACHE_DIRECTORY, { recursive: true }));
    beforeAll(() => fs.mkdirSync(TINYBURG_APKS_TEST_CACHE_DIRECTORY, { recursive: true }));

    it.concurrent.each(Object.values(Games))(
        "Apk tests for %s",
        async (game) => {
            // Helpers to get different ways to specify the latest version
            const smvbrv = await getSemanticVersionsByRelativeVersions(game);
            const randomLatestVersion = ():
                | "latest version"
                | "0 versions before latest"
                | `${number}.${number}.${number}` =>
                (
                    [
                        "latest version",
                        "0 versions before latest",
                        HashMap.get(smvbrv, "latest version").pipe(Option.getOrThrow).semanticVersion,
                    ] as const
                )[Math.floor(Math.random() * 3)]!;

            // Helper function that asserts that an apk was loaded from the cache directory
            const ensureCacheHit = async (function_: typeof patchApk | typeof loadApk): Promise<string> => {
                const start = performance.now();
                const apk = await function_(game, randomLatestVersion(), TINYBURG_APKS_TEST_CACHE_DIRECTORY);
                const end = performance.now();
                expect(end - start).toBeLessThanOrEqual(TINYBURG_APKS_TEST_CACHE_HIT_THRESHOLD_MS);
                return apk;
            };

            // Download the latest version of this game
            const apk1 = await loadApk(game, randomLatestVersion(), TINYBURG_APKS_TEST_CACHE_DIRECTORY);
            expect(fs.existsSync(apk1)).toBeTruthy();

            // Cache hit for the latest version of this game
            const apk2 = await ensureCacheHit(loadApk);
            expect(fs.existsSync(apk2)).toBeTruthy();

            // Patch the latest version of this game
            const apk3 = await patchApk(game, randomLatestVersion(), TINYBURG_APKS_TEST_CACHE_DIRECTORY);
            expect(fs.existsSync(apk3)).toBeTruthy();

            // Cache hit for the latest patched version of this game
            const apk4 = await ensureCacheHit(patchApk);
            expect(fs.existsSync(apk4)).toBeTruthy();
        },
        TINYBURG_APKS_TEST_TIMEOUT
    );

    it(`Should have ${Object.values(Games).length * 2} apks in the cache directory`, async () => {
        const items = await fs.promises.readdir(TINYBURG_APKS_TEST_CACHE_DIRECTORY);
        expect(items.length).toBe(Object.values(Games).length * 2);
    });
});
