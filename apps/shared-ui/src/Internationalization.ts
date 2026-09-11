/**
 * The languages tinyburg speaks, how a running app decides which one to use,
 * and the locale-aware formatting that follows from the choice.
 *
 * Deliberately not re-exported from the package index: servers and the
 * Discord bot import `@tinyburg/shared-ui/Internationalization` directly, and the
 * index pulls in the foldkit components they have no use for.
 *
 * @since 1.0.0
 */

import { DateTime, Schema as S } from "effect";

/**
 * A language tinyburg has translations for.
 *
 * @since 1.0.0
 * @category Models
 */
export const Language = S.Literals(["en", "de", "es", "fr"]);

/**
 * @since 1.0.0
 * @category Models
 */
export type Language = typeof Language.Type;

/**
 * The language used when negotiation finds nothing better.
 *
 * @since 1.0.0
 * @category Models
 */
export const defaultLanguage: Language = "en";

const languages: ReadonlyArray<Language> = ["en", "de", "es", "fr"];

/**
 * Walks candidate tags in order and returns the first whose primary subtag
 * names a supported language (`de-AT` matches `de`, `es-419` matches `es`).
 */
const fromCandidates = (candidates: ReadonlyArray<string>): Language => {
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
 *
 * @since 1.0.0
 * @category Negotiation
 */
export const fromNavigator: (candidates: ReadonlyArray<string>) => Language = fromCandidates;

/**
 * Negotiation for an `Accept-Language` header: parses q-values, drops
 * wildcards and rejected (`q=0`) ranges, and sorts by descending quality.
 *
 * @since 1.0.0
 * @category Negotiation
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
 *
 * @since 1.0.0
 * @category Negotiation
 */
export const fromDiscordLocale = (locale: string | undefined): Language =>
    fromCandidates(locale === undefined ? [] : [locale]);

const intlLocales: Record<Language, string> = {
    en: "en-US",
    de: "de-DE",
    es: "es-ES",
    fr: "fr-FR",
};

/**
 * The full Intl locale tag used for formatting in a given language.
 *
 * @since 1.0.0
 * @category Formatting
 */
export const intlLocale = (language: Language): string => intlLocales[language];

/**
 * A long date, e.g. "January 5, 2026" / "5. Januar 2026".
 *
 * @since 1.0.0
 * @category Formatting
 */
export const longDate = (language: Language, when: DateTime.Utc): string =>
    DateTime.format(when, { locale: intlLocale(language), month: "long", day: "numeric", year: "numeric" });

/**
 * A relative phrase for how long ago `when` was as of `asOf`: "now" under 90
 * seconds, then minutes under an hour, hours under a day, days under thirty,
 * and a {@link longDate} beyond that. `Intl.RelativeTimeFormat` with
 * `numeric: "auto"` supplies the idiomatic forms ("yesterday", "gestern")
 * and plural rules per language.
 *
 * @since 1.0.0
 * @category Formatting
 */
export const relativeTime = (language: Language, asOf: DateTime.Utc, when: DateTime.Utc): string => {
    const formatter = new Intl.RelativeTimeFormat(intlLocale(language), { numeric: "auto" });

    const seconds = Math.round((DateTime.toEpochMillis(asOf) - DateTime.toEpochMillis(when)) / 1000);
    if (seconds < 90) return formatter.format(0, "second");

    const minutes = Math.round(seconds / 60);
    if (minutes < 60) return formatter.format(-minutes, "minute");

    const hours = Math.round(minutes / 60);
    if (hours < 24) return formatter.format(-hours, "hour");

    const days = Math.round(hours / 24);
    if (days < 30) return formatter.format(-days, "day");

    return longDate(language, when);
};
