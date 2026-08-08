import { describe, expect, it } from "vitest";

import { fromAcceptLanguage, fromCandidates, fromDiscordLocale, fromNavigator } from "../src/negotiate.ts";

describe("fromCandidates", () => {
    it("returns the first supported candidate", () => {
        expect(fromCandidates(["fr", "de"])).toBe("fr");
    });

    it("matches on the primary subtag", () => {
        expect(fromCandidates(["de-AT"])).toBe("de");
        expect(fromCandidates(["es-419"])).toBe("es");
    });

    it("skips unsupported candidates", () => {
        expect(fromCandidates(["ja", "zh-Hans", "de"])).toBe("de");
    });

    it("falls back to English when nothing matches", () => {
        expect(fromCandidates(["ja", "zh-Hans"])).toBe("en");
        expect(fromCandidates([])).toBe("en");
    });

    it("is case-insensitive and tolerant of whitespace", () => {
        expect(fromCandidates([" DE-at "])).toBe("de");
    });
});

describe("fromNavigator", () => {
    it("is the candidate matcher, in navigator preference order", () => {
        expect(fromNavigator(["es-MX", "en-US"])).toBe("es");
        expect(fromNavigator([])).toBe("en");
    });
});

describe("fromAcceptLanguage", () => {
    it("orders candidates by descending q-value", () => {
        expect(fromAcceptLanguage("en;q=0.5, de;q=0.9")).toBe("de");
        expect(fromAcceptLanguage("fr;q=0.8,es;q=0.9,en;q=0.7")).toBe("es");
    });

    it("defaults omitted q-values to 1", () => {
        expect(fromAcceptLanguage("de;q=0.9, fr")).toBe("fr");
    });

    it("preserves header order for equal q-values", () => {
        expect(fromAcceptLanguage("de-DE,de;q=0.9,en;q=0.8")).toBe("de");
    });

    it("ignores wildcards", () => {
        expect(fromAcceptLanguage("*")).toBe("en");
        expect(fromAcceptLanguage("*;q=1, de;q=0.5")).toBe("de");
    });

    it("drops ranges rejected with q=0", () => {
        expect(fromAcceptLanguage("de;q=0, es;q=0.5")).toBe("es");
        expect(fromAcceptLanguage("de;q=0")).toBe("en");
    });

    it("falls back to English for empty or missing headers", () => {
        expect(fromAcceptLanguage(undefined)).toBe("en");
        expect(fromAcceptLanguage("")).toBe("en");
    });

    it("falls back to English when only unsupported languages are offered", () => {
        expect(fromAcceptLanguage("ja,zh-Hans;q=0.9")).toBe("en");
    });
});

describe("fromDiscordLocale", () => {
    it("matches Discord locales on the primary subtag", () => {
        expect(fromDiscordLocale("en-GB")).toBe("en");
        expect(fromDiscordLocale("es-419")).toBe("es");
        expect(fromDiscordLocale("de")).toBe("de");
    });

    it("falls back to English for unsupported or missing locales", () => {
        expect(fromDiscordLocale("ja")).toBe("en");
        expect(fromDiscordLocale(undefined)).toBe("en");
    });
});
