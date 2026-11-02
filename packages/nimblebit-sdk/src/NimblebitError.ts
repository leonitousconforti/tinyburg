/**
 * Nimblebit error schemas.
 *
 * @since 1.0.0
 * @category Errors
 */

import * as internal from "./internal/Error.ts";

/**
 * @since 1.0.0
 * @category Type ids
 */
export const TypeId: TypeId = internal.TypeId;

/**
 * @since 1.0.0
 * @category Type ids
 */
export type TypeId = "~@tinyburg/nimblebit-sdk/NimblebitError";

/**
 * @since 1.0.0
 * @category Errors
 */
export const isNimblebitError: (u: unknown) => u is NimblebitError = internal.isNimblebitError;

/**
 * @since 1.0.0
 * @category Errors
 */
export type NimblebitError = internal.NimblebitError;

/**
 * @since 1.0.0
 * @category Errors
 */
export const NimblebitError: typeof internal.NimblebitError = internal.NimblebitError;
