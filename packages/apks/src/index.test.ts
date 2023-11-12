import os from "node:os";
import fs from "node:fs";
import path from "node:path";
import { HashMap, Option } from "effect";

import { loadApk, patchApk, Games } from "./index.js";
import { getSemanticVersionsByRelativeVersions } from "./versions.js";
import { RelativeVersion, SemanticVersion } from "./types.js";

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

    // Helper function that asserts that an apk was loaded from
    // the cache directory and did not need to make a network request
    const ensureCacheHit = async (
        function_: typeof patchApk | typeof loadApk,
        game: Games,
        version: RelativeVersion | SemanticVersion
    ): Promise<string> => {
        const start = performance.now();
        const apk = await function_(game, version, TINYBURG_APKS_TEST_CACHE_DIRECTORY);
        const end = performance.now();
        expect(end - start).toBeLessThanOrEqual(TINYBURG_APKS_TEST_CACHE_HIT_THRESHOLD_MS);
        return apk;
    };

    // Tests for loadApk can run all at once for performance
    it.concurrent.each(Object.values(Games))(
        "loadApk tests for %s",
        async (game) => {
            const smvbrv = await getSemanticVersionsByRelativeVersions(game);
            const latestVersion = HashMap.get(smvbrv, "latest version").pipe(Option.getOrThrow).semanticVersion;

            // Download the latest version of this game
            const apk1 = await loadApk(game, latestVersion, TINYBURG_APKS_TEST_CACHE_DIRECTORY);
            expect(fs.existsSync(apk1)).toBeTruthy();

            // Cache hit for the latest version of this game
            const apk2 = await ensureCacheHit(loadApk, game, latestVersion);
            expect(apk2).toBe(apk1);
        },
        TINYBURG_APKS_TEST_TIMEOUT
    );

    // Tests for patchApk should not run concurrently
    // because they consume so many resources
    it.each(Object.values(Games))(
        `patchApk tests for %s`,
        async (game) => {
            // eslint-disable-next-line unicorn/consistent-function-scoping
            const randomLatestVersion = (): RelativeVersion =>
                Math.random() > 0.5 ? "latest version" : "0 versions before latest";

            // Cache hit for the latest version of this game.
            // No point trying to patch the apk if we weren't
            // able to download it.
            const apk3 = await ensureCacheHit(loadApk, game, randomLatestVersion());
            expect(fs.existsSync(apk3)).toBeTruthy();

            // Patch the latest version of this game
            const apk4 = await patchApk(game, randomLatestVersion(), TINYBURG_APKS_TEST_CACHE_DIRECTORY);
            expect(fs.existsSync(apk4)).toBeTruthy();

            // Cache hit for the latest patched version of this game
            const apk5 = await ensureCacheHit(patchApk, game, randomLatestVersion());
            expect(apk5).toBe(apk4);
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
