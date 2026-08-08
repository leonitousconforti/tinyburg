import type { Language } from "@tinyburg/i18n";
import type { Messages } from "./types.ts";

import { de } from "./de.ts";
import { en } from "./en.ts";
import { es } from "./es.ts";
import { fr } from "./fr.ts";

const byLanguage: Record<Language, Messages> = { de, en, es, fr };

/** The full message catalog for a language; reference-stable per language. */
export const messagesFor = (language: Language): Messages => byLanguage[language];
