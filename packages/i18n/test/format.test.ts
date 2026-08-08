import { DateTime } from "effect";

import { describe, expect, it } from "vitest";

import { relativeTime } from "../src/format.ts";

const asOf = DateTime.makeUnsafe("2026-08-08T12:00:00Z");
const secondsAgo = (seconds: number): DateTime.Utc =>
    DateTime.makeUnsafe(DateTime.toEpochMillis(asOf) - seconds * 1000);

describe("relativeTime", () => {
    it("says now under ninety seconds", () => {
        expect(relativeTime("en", asOf, secondsAgo(89))).toBe("now");
        expect(relativeTime("de", asOf, secondsAgo(89))).toBe("jetzt");
    });

    it("uses minutes under an hour", () => {
        expect(relativeTime("en", asOf, secondsAgo(5 * 60))).toBe("5 minutes ago");
        expect(relativeTime("de", asOf, secondsAgo(5 * 60))).toBe("vor 5 Minuten");
    });

    it("uses hours under a day", () => {
        expect(relativeTime("en", asOf, secondsAgo(2 * 3600))).toBe("2 hours ago");
        expect(relativeTime("de", asOf, secondsAgo(2 * 3600))).toBe("vor 2 Stunden");
    });

    it("uses idiomatic day names under thirty days", () => {
        expect(relativeTime("en", asOf, secondsAgo(24 * 3600))).toBe("yesterday");
        expect(relativeTime("de", asOf, secondsAgo(24 * 3600))).toBe("gestern");
    });

    it("falls back to a long date at thirty days", () => {
        expect(relativeTime("en", asOf, secondsAgo(45 * 24 * 3600))).toBe("June 24, 2026");
        expect(relativeTime("de", asOf, secondsAgo(45 * 24 * 3600))).toBe("24. Juni 2026");
    });
});
