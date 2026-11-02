import * as Data from "effect/Data";
import * as Predicate from "effect/Predicate";

/**
 * @since 1.0.0
 * @category Error
 */
export const TypeId = "~@tinyburg/nimblebit-sdk/NimblebitError";

/**
 * @since 1.0.0
 * @category Error
 */
export const isNimblebitError = (u: unknown): u is NimblebitError => Predicate.hasProperty(u, TypeId);

/**
 * @since 1.0.0
 * @category Error
 */
export class NimblebitError extends Data.TaggedError("NimblebitError")<{
    method: string;
    module: string;
    cause: unknown;
}> {
    readonly [TypeId] = TypeId;
}
