/**
 * Nimblebit error schemas.
 *
 * @since 1.0.0
 * @category Errors
 */

import * as Data from "effect/Data";
import * as Predicate from "effect/Predicate";

/**
 * @since 1.0.0
 * @category Type ids
 */
export const TypeId: TypeId = "~@tinyburg/nimblebit-sdk/NimblebitError";

/**
 * @since 1.0.0
 * @category Type ids
 */
export type TypeId = "~@tinyburg/nimblebit-sdk/NimblebitError";

/**
 * @since 1.0.0
 * @category Errors
 */
export const isNimblebitError = (u: unknown): u is NimblebitError => Predicate.hasProperty(u, TypeId);

/**
 * @since 1.0.0
 * @category Errors
 */
export class NimblebitError extends Data.TaggedError("NimblebitError")<{
    method: string;
    module: string;
    cause: unknown;
}> {
    readonly [TypeId]: TypeId = TypeId;
}
