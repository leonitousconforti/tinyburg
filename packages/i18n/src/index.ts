/**
 * The languages tinyburg speaks, and how a running app decides which one to
 * use. Language negotiation lives in `negotiate.ts`, locale-aware formatting
 * in `format.ts`; this module owns the `Language` type itself.
 */

import { Schema as S } from "effect";

/** A language tinyburg has translations for. */
export const Language = S.Literals(["en", "de", "es", "fr"]);
export type Language = typeof Language.Type;

/** Every supported language, in no particular order of preference. */
export const languages: ReadonlyArray<Language> = ["en", "de", "es", "fr"];

/** The language used when negotiation finds nothing better. */
export const defaultLanguage: Language = "en";

export * from "./format.ts";
export * from "./negotiate.ts";
