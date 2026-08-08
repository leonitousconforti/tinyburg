import type { Messages } from "./types.ts";

import { type Language, fromNavigator } from "@tinyburg/ui/Internationalization";

import { de } from "./de.ts";
import { en } from "./en.ts";
import { es } from "./es.ts";
import { fr } from "./fr.ts";

const byLanguage: Record<Language, Messages> = { de, en, es, fr };

/** The full message table for a language. Reference-stable per language. */
export const messagesFor = (language: Language): Messages => byLanguage[language];

/**
 * The language this visit runs in, decided once at module load from the
 * browser's preferences. There is no switcher and no persistence, so nothing
 * ever changes it; commands that produce user-facing text read it directly.
 * The `typeof navigator` guard keeps node-side imports (tests) working.
 */
export const initialLanguage: Language = fromNavigator(
    typeof navigator === "undefined" ? [] : (navigator.languages ?? [navigator.language])
);
