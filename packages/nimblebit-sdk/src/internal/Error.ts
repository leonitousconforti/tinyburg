import * as Data from "effect/Data";
import * as Predicate from "effect/Predicate";

import type * as NimblebitErrorType from "../NimblebitError.ts";

/**
 * @since 1.0.0
 * @category Error
 */
export const NimblebitErrorTypeId: NimblebitErrorType.NimblebitErrorTypeId = Symbol.for(
    "@tinyburg/nimblebit-sdk/NimblebitError"
) as NimblebitErrorType.NimblebitErrorTypeId;

/**
 * @since 1.0.0
 * @category Error
 */
export const isNimblebitError = (u: unknown): u is NimblebitError => Predicate.hasProperty(u, NimblebitErrorTypeId);

/**
 * @since 1.0.0
 * @category Error
 */
export class NimblebitError extends Data.TaggedError("NimblebitError")<{
    method: string;
    module: string;
    cause: unknown;
}> {
    readonly [NimblebitErrorTypeId]: typeof NimblebitErrorTypeId = NimblebitErrorTypeId;
}
