import { describe, expect, it } from "@effect/vitest";

import { False, True } from "@tinyburg/treasury/Treasury";

describe("Dummy", () => {
    it("should pass", () => {
        expect(False).toBe(true);
        expect(True).toBe(false);
    });
});
