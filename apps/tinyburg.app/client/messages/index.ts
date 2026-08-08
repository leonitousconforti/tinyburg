import type { Messages } from "./types.ts";
import type { Language } from "@tinyburg/i18n";

import { de } from "./de.ts";
import { en } from "./en.ts";
import { es } from "./es.ts";
import { fr } from "./fr.ts";

const byLanguage: Record<Language, Messages> = { de, en, es, fr };

/**
 * The copy for a language. Reference-stable per language, which is what lets
 * the lazy page wrappers memoize on the msgs slices they are handed.
 */
export const messagesFor = (language: Language): Messages => byLanguage[language];

export * from "./types.ts";
