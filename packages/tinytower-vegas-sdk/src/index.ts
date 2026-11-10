/**
 * @since 1.0.0
 */

/**
 * The first names, last names and cities Tiny Tower Vegas uses for its
 * Bitizens.
 *
 * @since 1.0.0
 * @category Bitizens
 */
export * as Bitizens from "./Bitizens.ts"

/**
 * Tiny Tower Vegas's special characters, whose ids the missions and floors
 * refer to.
 *
 * @since 1.0.0
 * @category Characters
 */
export * as Characters from "./Characters.ts"

/**
 * Tiny Tower Vegas's elevators and their prices, indexed by elevator id.
 *
 * @since 1.0.0
 * @category Elevators
 */
export * as Elevators from "./Elevators.ts"

/**
 * Tiny Tower Vegas (game code `vegas`) NBSync api endpoints.
 *
 * Signing: a random `salt` (signed int32) goes in the path, and `hash` is
 * `md5(<preimage> + <game secret salt>)` with the preimage
 * `vegas/<playerId>/<salt><playerAuthKey>` (variants noted per endpoint). The
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
 * Tiny Tower Vegas's floors, indexed by floor id, with their types, prices,
 * products and stocking times. Index 0 is the game's empty placeholder, with
 * no name and type `None`, so that every other floor sits at its id.
 *
 * @since 1.0.0
 * @category Floors
 */
export * as Floors from "./Floors.ts"

/**
 * Tiny Tower Vegas's missions: the tutorial's, the tips' and the ones its
 * characters give.
 *
 * @since 1.0.0
 * @category Missions
 */
export * as Missions from "./Missions.ts"

/**
 * Tiny Tower Vegas's roofs and their prices, indexed by roof id.
 *
 * @since 1.0.0
 * @category Roofs
 */
export * as Roofs from "./Roofs.ts"

/**
 * The scopes the Tiny Tower Vegas api is guarded by: `tinytowervegas` for the
 * whole game, `tinytowervegas:read` and `tinytowervegas:write` for every
 * endpoint that only looks or that changes a player's game, a `:read` and a
 * `:write` scope for each area of the api, such as
 * `tinytowervegas:device:read`, and one scope per endpoint, such as
 * `tinytowervegas:device:player_details`.
 *
 * Each endpoint accepts its own scope, its area's side, the game's side and the
 * game, narrowest first:
 * `{ anyOf: [DevicePlayerDetails, DeviceRead, Read, TinyTowerVegas] }`. An
 * endpoint this module has no scope for is left unscoped, and the authproxy
 * guards it with `tinytowervegas:read` or `tinytowervegas`.
 *
 * @since 1.0.0
 * @category Scopes
 */
export * as Scopes from "./Scopes.ts"

/**
 * Tiny Tower Vegas SDK: signed calls against Nimblebit's NBSync service.
 *
 * Signing reuses `@tinyburg/nimblebit-sdk` (`NimblebitAuth`): the game secret
 * salt (from `NBSync._ss`) is provided as the auth key, and each request is
 * `md5(<preimage> + <secret salt>)` with a random signed int32 `salt` in the path.
 * All method preimages below are the Tiny Tower formula with the `vegas` game code.
 *
 * The methods that were exercised live against sync.nimblebit.com are marked
 * VERIFIED; save-bearing / write paths follow the same pattern but were not
 * exercised. Save bytes are returned raw (base64-decoded); inflating (pako) and
 * parsing into a save schema is left to the caller.
 *
 * @since 1.0.0
 * @category SDK
 */
export * as TinyTowerVegas from "./TinyTowerVegas.ts"
