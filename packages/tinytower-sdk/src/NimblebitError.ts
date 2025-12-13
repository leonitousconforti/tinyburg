import * as internal from "./internal/nimblebitError.ts";

/**
 * @since 1.0.0
 * @category Errors
 */
export const NimblebitErrorTypeId: unique symbol = internal.NimblebitErrorTypeId;

/**
 * @since 1.0.0
 * @category Errors
 */
export type NimblebitErrorTypeId = typeof NimblebitErrorTypeId;

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
