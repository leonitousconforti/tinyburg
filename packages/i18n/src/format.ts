/**
 * Locale-aware formatting: full Intl locale tags for the supported
 * languages, long dates, and the relative-time phrasing the account pages
 * use for sessions and keys.
 */

import { DateTime } from "effect";

import type { Language } from "./index.ts";

const intlLocales: Record<Language, string> = {
    en: "en-US",
    de: "de-DE",
    es: "es-ES",
    fr: "fr-FR",
};

/** The full Intl locale tag used for formatting in a given language. */
export const intlLocale = (language: Language): string => intlLocales[language];

/** A long date, e.g. "January 5, 2026" / "5. Januar 2026". */
export const longDate = (language: Language, when: DateTime.Utc): string =>
    DateTime.format(when, { locale: intlLocale(language), month: "long", day: "numeric", year: "numeric" });

/**
 * A relative phrase for how long ago `when` was as of `asOf`: "now" under 90
 * seconds, then minutes under an hour, hours under a day, days under thirty,
 * and a {@link longDate} beyond that. `Intl.RelativeTimeFormat` with
 * `numeric: "auto"` supplies the idiomatic forms ("yesterday", "gestern")
 * and plural rules per language.
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
