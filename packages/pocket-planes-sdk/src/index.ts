/**
 * @since 1.0.0
 */

/**
 * The first and last names the game gives its Bitizens, in the game's order, so a save's name indexes can be looked up.
 *
 * @since 1.0.0
 * @category Bitizens
 */
export * as Bitizens from "./Bitizens.ts"

/**
 * The names of the cargo packages and VIP packages planes carry between cities, in the game's order.
 *
 * @since 1.0.0
 * @category Cargo
 */
export * as Cargo from "./Cargo.ts"

/**
 * The cities of the world map, each with its id, region, country, position on the map and population.
 *
 * @since 1.0.0
 * @category Cities
 */
export * as Cities from "./Cities.ts"

/**
 * The events that can happen at a city, such as weather that closes its airport, and their effects on traffic.
 *
 * @since 1.0.0
 * @category CityEvents
 */
export * as CityEvents from "./CityEvents.ts"

/**
 * Pocket Planes (game code `pp`) NBSync api endpoints.
 *
 * Signing: a random `salt` (signed int32 - the game emits negatives too) goes
 * in the path, and `hash` is `md5(<preimage> + <game secret salt>)` where the
 * preimage is `pp/<playerId>/<salt><playerAuthKey>` (variants noted per
 * endpoint). The secret salt is the value extracted from `NBSync._ss`.
 *
 * Verification (against the live server + Frida inspection of the game,
 * 2026-08-26):
 * - Signing is MD5, VERIFIED server-side: `player_details` accepts the MD5 hash
 *   and rejects a garbage hash, no hash, and a SHA-256 hash. (The game itself
 *   computes SHA-256 in `NBSync.genHash` for the unauthenticated `register`
 *   call, which the server also accepts via MD5 - so it does not affect the
 *   authenticated endpoints this SDK signs.)
 * - Response envelopes VERIFIED by reading the game's DTO classes at runtime
 *   (immune to the metadata obfuscation): register (NBSyncRegisterResponse),
 *   player_details (NBSyncPlayerDetailsResponse), sync/pull
 *   (NBSyncGameSaveResponse: success/h/id/data), current_version
 *   (NBSyncCurrentCheckResponse), verify_device (NBSyncVerifyCodeResponse:
 *   success/player_id/player_ss/player_email - no photo/nickname on pp),
 *   get_visits/get_gifts (NBSyncItemsGetResponse), send_item
 *   (NBSyncItemsSendResponse), receive_item (NBSyncItemsReceiveResponse: also
 *   carries an `id`), friend/pull_game (NBSyncFriendGameSaveResponse),
 *   friend/pull_meta (NBSyncFriendGameMetaResponse). register/player_details/
 *   get_visits/get_gifts/request_items were also exercised live with a burnbot.
 * - Still open: pp appears to have NO snapshots (`sync/current_snapshots`
 *   returns Invalid Request), so `pull_snapshot` here is unconfirmed and may
 *   not exist. register_email is DERIVED from Tiny Tower.
 *
 * Game-specific payload/item schemas (the `gifts` element - real shape is
 * NBSyncItemsGift {gift_id, gift_to, gift_from, gift_type, item_type, gift_str,
 * h, c} - friend meta, save push meta) are `Schema.Unknown` placeholders for
 * the data-schema work.
 *
 * @since 1.0.0
 * @category Endpoints
 */
export * as Endpoints from "./Endpoints.ts"

/**
 * Every plane in the game, each with its id, the level that unlocks it, the
 * airport class it needs, its engine, stats and cabin layout. `engine` is the
 * game's raw number, which does not follow the names of its own
 * `planeEngineType` enum (jets have 1, the enum's Prop, and the electric
 * planes have 6, which the enum has no name for). `level` is -1 or -2 for
 * planes that no level unlocks.
 *
 * @since 1.0.0
 * @category Planes
 */
export * as Planes from "./Planes.ts"

/**
 * Pocket Planes SDK: signed calls against Nimblebit's NBSync service.
 *
 * Signing reuses `@tinyburg/nimblebit-sdk` (`NimblebitAuth`): the game secret
 * salt (from `NBSync._ss`) is provided as the auth key, and each request is
 * `md5(<preimage> + <secret salt>)` with a random signed int32 `salt` in the path.
 * All method preimages below are the Tiny Tower formula with the `pp` game code.
 *
 * The methods that were exercised live against sync.nimblebit.com are marked
 * VERIFIED; save-bearing / write paths follow the same pattern but were not
 * exercised. Save bytes are returned raw (base64-decoded); inflating (pako) and
 * parsing into a save schema is left to the caller.
 *
 * @since 1.0.0
 * @category SDK
 */
export * as PocketPlanes from "./PocketPlanes.ts"

/**
 * The scopes the Pocket Planes api is guarded by: `pocketplanes` for the whole
 * game, `pocketplanes:read` and `pocketplanes:write` for every endpoint that
 * only looks or that changes a player's game, a `:read` and a `:write` scope
 * for each area of the api, such as `pocketplanes:device:read`, and one scope
 * per endpoint, such as `pocketplanes:device:player_details`.
 *
 * Each endpoint accepts its own scope, its area's side, the game's side and the
 * game, narrowest first:
 * `{ anyOf: [DevicePlayerDetails, DeviceRead, Read, PocketPlanes] }`. An
 * endpoint this module has no scope for is left unscoped, and the authproxy
 * guards it with `pocketplanes:read` or `pocketplanes`.
 *
 * @since 1.0.0
 * @category Scopes
 */
export * as Scopes from "./Scopes.ts"

/**
 * The plane skins, each with the ids of the planes it fits and its home city's id (0 for none).
 *
 * @since 1.0.0
 * @category Skins
 */
export * as Skins from "./Skins.ts"
