/**
 * @since 1.0.0
 */

/**
 * Disco Zoo's animals, in the game's order, with the region each lives in, its
 * rarity, its coins per minute, its timings in ticks and its pattern on the
 * rescue grid, and the rarities themselves.
 *
 * @since 1.0.0
 * @category Animals
 */
export * as Animals from "./Animals.ts"

/**
 * Disco Zoo's pen decorations, each with the character the game looks it up by
 * and its price.
 *
 * @since 1.0.0
 * @category Decorations
 */
export * as Decorations from "./Decorations.ts"

/**
 * Disco Zoo SDK: signed calls against Nimblebit's NBSync service.
 *
 * Signing reuses `@tinyburg/nimblebit-sdk` (`NimblebitAuth`): the game secret
 * salt (from `NBSync._ss`) is provided as the auth key, and each request is
 * `md5(<preimage> + <secret salt>)` with a random signed int32 `salt` in the path.
 * All method preimages below are the Tiny Tower formula with the `dz` game code.
 *
 * The methods that were exercised live against sync.nimblebit.com are marked
 * VERIFIED; save-bearing / write paths follow the same pattern but were not
 * exercised. Save bytes are returned raw (base64-decoded); inflating (pako) and
 * parsing into a save schema is left to the caller.
 *
 * @since 1.0.0
 * @category SDK
 */
export * as DiscoZoo from "./DiscoZoo.ts"

/**
 * Disco Zoo (game code `dz`) NBSync api endpoints.
 *
 * Signing: a random `salt` (signed int32) goes in the path, and `hash` is
 * `md5(<preimage> + <game secret salt>)` with the preimage
 * `dz/<playerId>/<salt><playerAuthKey>` (variants noted per endpoint). The
 * secret salt is the value extracted from `NBSync._ss`.
 *
 * Verification (live server + Frida DTO inspection of the game, 2026-08-26):
 * - Signing is MD5, server-validated (same scheme as Tiny Tower / Pocket
 *   Planes; the game computes SHA-256 only for the unauthenticated `register`).
 * - Response envelopes VERIFIED by reading the game's DTO classes at runtime:
 *   register, player_details, sync/pull (NBSyncGameSaveResponse), current_version,
 *   verify_device, friend/pull_game, friend/pull_meta (meta is a flat
 *   Dictionary<String,Object> on pt), send_item (NBSyncItemsSendResponse),
 *   get_items (NBSyncItemsGetResponse: success/gifts, NO `total` unlike pp).
 *   `get_items` was also exercised live with a burnbot.
 * - Standard NBSync endpoint set plus get_visits and receive_item.
 *
 * Game-specific save/meta schemas are left as `Schema.Unknown` placeholders.
 *
 * @since 1.0.0
 * @category Endpoints
 */
export * as Endpoints from "./Endpoints.ts"

/**
 * Disco Zoo's hats, each with the character the game looks it up by and its
 * price.
 *
 * @since 1.0.0
 * @category Hats
 */
export * as Hats from "./Hats.ts"

/**
 * Disco Zoo's pet grades, pet species and the quirks a pet can have.
 *
 * @since 1.0.0
 * @category Pets
 */
export * as Pets from "./Pets.ts"

/**
 * Disco Zoo's regions, in the game's order, with the aircraft that flies to
 * each and what it costs to unlock and to explore.
 *
 * @since 1.0.0
 * @category Regions
 */
export * as Regions from "./Regions.ts"

/**
 * The scopes the Disco Zoo api is guarded by: `discozoo` for the whole game,
 * `discozoo:read` and `discozoo:write` for every endpoint that only looks or
 * that changes a player's game, a `:read` and a `:write` scope for each area of
 * the api, such as `discozoo:device:read`, and one scope per endpoint, such as
 * `discozoo:device:player_details`.
 *
 * Each endpoint accepts its own scope, its area's side, the game's side and the
 * game, narrowest first:
 * `{ anyOf: [DevicePlayerDetails, DeviceRead, Read, DiscoZoo] }`. An endpoint
 * this module has no scope for is left unscoped, and the authproxy guards it
 * with `discozoo:read` or `discozoo`.
 *
 * @since 1.0.0
 * @category Scopes
 */
export * as Scopes from "./Scopes.ts"

/**
 * Disco Zoo's pen toys, each with the character the game looks it up by and
 * its prices.
 *
 * @since 1.0.0
 * @category Toys
 */
export * as Toys from "./Toys.ts"
