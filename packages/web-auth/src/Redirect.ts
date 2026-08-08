/**
 * The open-redirect guard for `returnTo`-style parameters.
 *
 * @since 1.0.0
 */

import { Effect, Option, Schema } from "effect";
import { HttpServerRequest } from "effect/unstable/http";

/**
 * Whether a redirect target stays on this site: it must be an absolute path,
 * and resolving it against a sentinel origin must not escape that origin,
 * however creatively the value is written (`//evil.example`,
 * `/\evil.example`, ...).
 *
 * @since 1.0.0
 */
export const isLocalPath = (value: string): boolean => {
    const NOWHERE = "https://redirect.invalid";
    if (!value.startsWith("/")) return false;
    try {
        return new URL(value, NOWHERE).origin === NOWHERE;
    } catch {
        return false;
    }
};

/**
 * The `returnTo` search param riding the current request, kept only when it
 * is a local path. Never fails: a missing, malformed, or foreign target
 * simply reads as `Option.none`.
 *
 * @since 1.0.0
 */
export const returnToParam: Effect.Effect<
    Option.Option<string>,
    never,
    HttpServerRequest.HttpServerRequest | HttpServerRequest.ParsedSearchParams
> = HttpServerRequest.schemaSearchParams(
    Schema.Struct({
        returnTo: Schema.optional(Schema.String),
    })
).pipe(
    Effect.map(({ returnTo }) => Option.fromUndefinedOr(returnTo)),
    Effect.map(Option.filter(isLocalPath)),
    Effect.option,
    Effect.map(Option.flatten)
);
