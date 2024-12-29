import { describe, expect, it } from "@effect/vitest";
import { Duration, Effect } from "effect";

import { loadApk } from "@tinyburg/fount/Fount";
import { Game } from "@tinyburg/fount/Games";

describe("loadApk tests", () => {
    it.live.each(Object.values(Game.literals))(
        "Should load the latest version of %s",
        (game) =>
            Effect.gen(function* () {
                const [details] = yield* loadApk(game, "latest version");
                expect(details.appVersionCode).toBeGreaterThan(0);
                expect(details.fileSizeBytes).toBeDefined();
                expect(details.name).toBe(game);
                expect(details.semanticVersion).toBeDefined();
                expect(details.updatedDate).toBeDefined();
            }).pipe(Effect.scoped),
        {
            concurrent: false,
            sequential: true,
            timeout: Duration.seconds(10).pipe(Duration.toMillis),
        }
    );
});
