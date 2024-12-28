import * as fs from "node:fs";

import * as NodeContext from "@effect/platform-node/NodeContext";
import * as Effect from "effect/Effect";
import * as HashMap from "effect/HashMap";
import * as Option from "effect/Option";

import { Game, loadApk, patchApk } from "./index.js";
import type { AnyGame } from "./schemas.js";
import { getSemanticVersionsByRelativeVersions } from "./versions.js";

const TINYBURG_APKS_TEST_TIMEOUT = 5 * 60 * 1000;

describe("Apks tests", () => {
    const latestSemanticVersion = (game: AnyGame) =>
        getSemanticVersionsByRelativeVersions(game)
            .pipe(Effect.map(HashMap.get("latest version")))
            .pipe(Effect.map(Option.getOrThrow));

    // Tests for loadApk can run all at once
    it.each(Object.values(Game.literals))(
        "loadApk and patchApk tests for %s",
        async (game) =>
            Effect.gen(function* () {
                // Download the latest version of this game
                const { semanticVersion } = yield* latestSemanticVersion(game);
                const apk1 = yield* loadApk(game, semanticVersion);
                expect(fs.existsSync(apk1)).toBeTruthy();

                // Patch the latest version of this game
                const apk2 = yield* patchApk(game, semanticVersion);
                expect(fs.existsSync(apk2)).toBeTruthy();
            })
                .pipe(Effect.provide(NodeContext.layer))
                .pipe(Effect.runPromise),
        TINYBURG_APKS_TEST_TIMEOUT
    );
});
