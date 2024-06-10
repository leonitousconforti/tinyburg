import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import * as NodeContext from "@effect/platform-node/NodeContext";
import * as Effect from "effect/Effect";
import * as HashMap from "effect/HashMap";
import * as Option from "effect/Option";

import { Games, loadApk, patchApk } from "./index.js";
import { RelativeVersion } from "./schemas.js";
import { getSemanticVersionsByRelativeVersions } from "./versions.js";

// Timeout tests after 5 minutes, for a loadApk or patchApk call to be considered
// a cache hit it needs to resolve within 3 seconds, and we will generate a new
// random temp directory to use as the cache directory every time.
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
    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
    const latestSemanticVersion = (game: Games) =>
        getSemanticVersionsByRelativeVersions(game)
            .pipe(Effect.map(HashMap.get("latest version")))
            .pipe(Effect.map(Option.getOrThrow));

    // Helper function that asserts that an apk was loaded from
    // the cache directory and did not need to make a network request
    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
    const ensureCacheHit = (function_: typeof patchApk | typeof loadApk, game: Games) =>
        Effect.gen(function* () {
            const start = performance.now();
            const apk: string = yield* function_(game, randomLatestVersion(), TINYBURG_APKS_TEST_CACHE_DIRECTORY);
            const end = performance.now();
            expect(end - start).toBeLessThanOrEqual(TINYBURG_APKS_TEST_CACHE_HIT_THRESHOLD_MS);
            return apk;
        });

    // Tests for loadApk can run all at once
    it.each(Object.values(Games))(
        "loadApk and patchApk tests for %s",
        async (game) =>
            Effect.gen(function* () {
                // Download the latest version of this game
                const { semanticVersion } = yield* latestSemanticVersion(game);
                const apk1: string = yield* loadApk(game, semanticVersion, TINYBURG_APKS_TEST_CACHE_DIRECTORY);
                expect(fs.existsSync(apk1)).toBeTruthy();

                // Cache hit for the latest version of this game
                const apk2 = yield* ensureCacheHit(loadApk, game);
                expect(apk2).toBe(apk1);

                // Patch the latest version of this game
                const apk3: string = yield* patchApk(game, semanticVersion, TINYBURG_APKS_TEST_CACHE_DIRECTORY);
                expect(fs.existsSync(apk3)).toBeTruthy();

                // Cache hit for the latest patched version of this game
                const apk4 = yield* ensureCacheHit(patchApk, game);
                expect(apk4).toBe(apk3);
            })
                .pipe(Effect.provide(NodeContext.layer))
                .pipe(Effect.runPromise),
        TINYBURG_APKS_TEST_TIMEOUT
    );

    // At the end, we should have two apks for each game,
    // one directly from the google play store and one patched
    it(`Should have ${Object.values(Games).length * 2} apks in the cache directory`, async () => {
        const items = await fs.promises.readdir(TINYBURG_APKS_TEST_CACHE_DIRECTORY);
        expect(items.length).toBe(Object.values(Games).length * 2);
    });
});
