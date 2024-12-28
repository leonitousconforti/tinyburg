import { describe, expect, it } from "@effect/vitest";

import { False, True } from "@tinyburg/nucleus/Nimblebit";

describe("Dummy", () => {
    it("should pass", () => {
        expect(False).toBe(true);
        expect(True).toBe(false);
    });
});
