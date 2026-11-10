/**
 * @since 1.0.0
 */

/**
 * LEGO Tower (game code `lt`) NBSync api endpoints.
 *
 * Signing: a random `salt` (signed int32) goes in the path, and `hash` is
 * `md5(<preimage> + <game secret salt>)` with the preimage
 * `lt/<playerId>/<salt><playerAuthKey>` (variants noted per endpoint). The
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
 * - Rich endpoint set: adds snapshots, trades, mailbox, AG, and LL-friends.
 * - LEGO Tower issues player ids longer than 5 chars (relaxed PlayerId schema).
 *
 * Game-specific save/meta schemas are left as `Schema.Unknown` placeholders.
 *
 * @since 1.0.0
 * @category Endpoints
 */
export * as Endpoints from "./Endpoints.ts"

/**
 * The floors a LEGO Tower can be built with, each with its floor type, in the
 * order of the game's floor table.
 *
 * @since 1.0.0
 * @category Floors
 */
export * as Floors from "./Floors.ts"

/**
 * LEGO Tower SDK: signed calls against Nimblebit's NBSync service.
 *
 * Signing reuses `@tinyburg/nimblebit-sdk` (`NimblebitAuth`): the game secret
 * salt (from `NBSync._ss`) is provided as the auth key, and each request is
 * `md5(<preimage> + <secret salt>)` with a random signed int32 `salt` in the path.
 * All method preimages below are the Tiny Tower formula with the `lt` game code.
 *
 * The methods that were exercised live against sync.nimblebit.com are marked
 * VERIFIED; save-bearing / write paths follow the same pattern but were not
 * exercised. Save bytes are returned raw (base64-decoded); inflating (pako) and
 * parsing into a save schema is left to the caller.
 *
 * @since 1.0.0
 * @category SDK
 */
export * as LegoTower from "./LegoTower.ts"

/**
 * The names minifigures are given, by language, the hidden characters a tower
 * can find, and the pieces pedestrians wear.
 *
 * @since 1.0.0
 * @category Minifigures
 */
export * as Minifigures from "./Minifigures.ts"

/**
 * The missions a tower can take on, each with its type, vehicle and holiday,
 * and the props of the game's mission table.
 *
 * @since 1.0.0
 * @category Missions
 */
export * as Missions from "./Missions.ts"

/**
 * The minifigure pieces a tower can collect, each with its type, short id,
 * rarity and whether pedestrians wear it, and the game's gold and silver
 * rarities.
 *
 * @since 1.0.0
 * @category Pieces
 */
export * as Pieces from "./Pieces.ts"

/**
 * The scopes the LEGO Tower api is guarded by: `legotower` for the whole game,
 * `legotower:read` and `legotower:write` for every endpoint that only looks or
 * that changes a player's game, a `:read` and a `:write` scope for each area of
 * the api, such as `legotower:device:read`, and one scope per endpoint, such as
 * `legotower:device:player_details`.
 *
 * Each endpoint accepts its own scope, its area's side, the game's side and the
 * game, narrowest first:
 * `{ anyOf: [DevicePlayerDetails, DeviceRead, Read, LEGOTower] }`. An endpoint
 * this module has no scope for is left unscoped, and the authproxy guards it
 * with `legotower:read` or `legotower`.
 *
 * @since 1.0.0
 * @category Scopes
 */
export * as Scopes from "./Scopes.ts"

/**
 * The sets a tower is decorated with besides its floors: roofs, elevators,
 * vehicles, VIP vehicles and skylines, and which sets are club exclusive or
 * promotional.
 *
 * @since 1.0.0
 * @category Sets
 */
export * as Sets from "./Sets.ts"
