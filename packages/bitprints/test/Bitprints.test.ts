import { describe, expect, it } from "@effect/vitest";

import { False, True } from "@tinyburg/bitprints/Bitprints";

describe("Dummy", () => {
    it("should pass", () => {
        expect(False).toBe(true);
        expect(True).toBe(false);
    });
});
