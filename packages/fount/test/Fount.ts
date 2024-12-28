import { describe, expect, it } from "@effect/vitest";

import { False, True } from "@tinyburg/fount/Fount";

describe("Dummy", () => {
    it("should pass", () => {
        expect(False).toBe(true);
        expect(True).toBe(false);
    });
});
