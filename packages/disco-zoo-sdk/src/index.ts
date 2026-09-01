/**
 * @since 1.0.0
 */

/**
 * Disco Zoo (game code `dz`) NBSync api endpoints.
 *
 * @since 1.0.0
 * @category Endpoints
 */
export * as Endpoints from "./Endpoints.ts";

/**
 * Disco Zoo SDK: signed calls against Nimblebit's NBSync service.
 *
 * @since 1.0.0
 * @category SDK
 */
export * as DiscoZoo from "./DiscoZoo.ts";

/**
 * The scopes this game's api is guarded by: a `device` and a `social` area
 * under the game, each split into `:read` and `:write`, with a leaf per
 * endpoint. Built by `@tinyburg/nimblebit-sdk`'s `defineGame`, so every game
 * shares the same tree shape and only the names differ.
 *
 * @since 1.0.0
 * @category Scopes
 */
export * as Scopes from "./Scopes.ts";
