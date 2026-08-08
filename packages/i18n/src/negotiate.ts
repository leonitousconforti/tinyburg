/**
 * Language negotiation. Every entry point reduces to the same move: an
 * ordered list of candidate tags, matched on primary subtag against the
 * supported languages, falling back to English.
 */

import { defaultLanguage, type Language, languages } from "./index.ts";

/**
 * The core matcher: walks the candidates in order and returns the first one
 * whose primary subtag names a supported language (`de-AT` matches `de`,
 * `es-419` matches `es`), or the default language when nothing matches.
 */
export const fromCandidates = (candidates: ReadonlyArray<string>): Language => {
    for (const candidate of candidates) {
        const primary = candidate.trim().toLowerCase().split("-")[0];
        const match = languages.find((language) => language === primary);
        if (match !== undefined) return match;
    }
    return defaultLanguage;
};

/**
 * Negotiation for the browser. Call with
 * `navigator.languages ?? [navigator.language]`; the list is already in
 * preference order.
 */
export const fromNavigator: (candidates: ReadonlyArray<string>) => Language = fromCandidates;

/**
 * Negotiation for an `Accept-Language` header: parses q-values, drops
 * wildcards and rejected (`q=0`) ranges, sorts by descending quality, and
 * hands the ordered tags to {@link fromCandidates}.
 */
export const fromAcceptLanguage = (header: string | undefined): Language => {
    if (header === undefined) return defaultLanguage;

    const candidates = header
        .split(",")
        .flatMap((part) => {
            const [tag = "", ...parameters] = part.split(";").map((piece) => piece.trim());

            let quality = 1;
            for (const parameter of parameters) {
                if (parameter.toLowerCase().startsWith("q=")) {
                    const parsed = Number(parameter.slice(2));
                    if (!Number.isNaN(parsed)) quality = parsed;
                }
            }

            return tag === "" || tag === "*" || quality <= 0 ? [] : [{ tag, quality }];
        })
        .sort((left, right) => right.quality - left.quality)
        .map(({ tag }) => tag);

    return fromCandidates(candidates);
};

/**
 * Negotiation for a Discord interaction locale (`interaction.locale`), a
 * single tag like `en-GB` or `es-419`.
 */
export const fromDiscordLocale = (locale: string | undefined): Language =>
    fromCandidates(locale === undefined ? [] : [locale]);
