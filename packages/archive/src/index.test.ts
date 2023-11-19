import os from "node:os";
import fs from "node:fs";
import path from "node:path";
import { HashMap, Option } from "effect";

import { loadApk, patchApk, Games } from "./index.js";
import { RelativeVersion, SemanticVersion } from "./types.js";
import { getSemanticVersionsByRelativeVersions } from "./versions.js";

// Timeout tests after 5 minutes, for a loadApk or patchApk
// call to be considered a cache hit it needs to resolve
// within 3 seconds, and we will generate a new random temp
// directory to use as the cache directory every time.
const TINYBURG_APKS_TEST_TIMEOUT = 5 * 60 * 1000;
const TINYBURG_APKS_TEST_CACHE_HIT_THRESHOLD_MS = 3000;
const TINYBURG_APKS_TEST_CACHE_DIRECTORY = fs.mkdtempSync(path.join(os.tmpdir(), "tinyburg-apks-"));

describe("Apks tests", () => {
    afterAll(() => fs.rmSync(TINYBURG_APKS_TEST_CACHE_DIRECTORY, { recursive: true }));
    beforeAll(() => fs.mkdirSync(TINYBURG_APKS_TEST_CACHE_DIRECTORY, { recursive: true }));

    // Helper function that returns a random latest version
    // eslint-disable-next-line unicorn/consistent-function-scoping
    const randomLatestVersion = (): RelativeVersion =>
        Math.random() > 0.5 ? "latest version" : "0 versions before latest";

    // Helper function that returns the latest semantic version for a game
    // eslint-disable-next-line unicorn/consistent-function-scoping
    const latestSemanticVersion = async (game: Games): Promise<SemanticVersion> => {
        const smvbrv = await getSemanticVersionsByRelativeVersions(game);
        return HashMap.get(smvbrv, "latest version").pipe(Option.getOrThrow).semanticVersion;
    };

    // Helper function that asserts that an apk was loaded from
    // the cache directory and did not need to make a network request
    const ensureCacheHit = async (function_: typeof patchApk | typeof loadApk, game: Games): Promise<string> => {
        const start = performance.now();
        const apk = await function_(game, randomLatestVersion(), TINYBURG_APKS_TEST_CACHE_DIRECTORY);
        const end = performance.now();
        expect(end - start).toBeLessThanOrEqual(TINYBURG_APKS_TEST_CACHE_HIT_THRESHOLD_MS);
        return apk;
    };

    // Tests for loadApk can run all at once
    it.concurrent.each(Object.values(Games))(
        "loadApk and patchApk tests for %s",
        async (game) => {
            // Download the latest version of this game
            const latestVersion = await latestSemanticVersion(game);
            const apk1 = await loadApk(game, latestVersion, TINYBURG_APKS_TEST_CACHE_DIRECTORY);
            expect(fs.existsSync(apk1)).toBeTruthy();

            // Cache hit for the latest version of this game
            const apk2 = await ensureCacheHit(loadApk, game);
            expect(apk2).toBe(apk1);

            // Patch the latest version of this game
            const apk3 = await patchApk(game, latestVersion, TINYBURG_APKS_TEST_CACHE_DIRECTORY);
            expect(fs.existsSync(apk3)).toBeTruthy();

            // Cache hit for the latest patched version of this game
            const apk4 = await ensureCacheHit(patchApk, game);
            expect(apk4).toBe(apk3);
        },
        TINYBURG_APKS_TEST_TIMEOUT
    );

    // At the end, we should have two apks for each game,
    // one directly from the google play store and one patched
    it(`Should have ${Object.values(Games).length * 2} apks in the cache directory`, async () => {
        const items = await fs.promises.readdir(TINYBURG_APKS_TEST_CACHE_DIRECTORY);
        expect(items.length).toBe(Object.values(Games).length * 2);
    });
});
