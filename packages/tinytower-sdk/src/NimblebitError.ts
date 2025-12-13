import * as PlatformError from "@effect/platform/Error";
import * as Predicate from "effect/Predicate";

/**
 * @since 1.0.0
 * @category Error
 */
export const NimblebitErrorTypeId = Symbol.for("@tinyburg/tinytower-sdk/NimblebitError");

/**
 * @since 1.0.0
 * @category Error
 */
export const isNimblebitError = (u: unknown): u is NimblebitError => Predicate.hasProperty(u, NimblebitErrorTypeId);

/**
 * @since 1.0.0
 * @category Error
 */
export class NimblebitError extends PlatformError.TypeIdError(NimblebitErrorTypeId, "NimblebitError")<{
    method: string;
    module: string;
    cause: unknown;
}> {}
