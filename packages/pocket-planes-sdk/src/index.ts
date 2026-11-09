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
 * Provenance words used below:
 * - OBSERVED: the game made this request (Play build 2.17.3, 2026-11-09).
 * - REPLAYED: the SDK's client function succeeded against the live server
 *   (2026-11-09).
 * - DTO: the game's response class has these fields.
 * - LITERAL: the path is compiled into the game but was not exercised.
 * - DERIVED: inferred from Tiny Tower.
 *
 * Signing: a random `salt` goes in the path, and `hash` is
 * `md5(<preimage> + <NBSync._ss>)` where the preimage is
 * `pp/<playerId>/<salt><playerAuthKey>` (variants noted per endpoint). Every
 * REPLAYED client function used this scheme. The game signs its own `NBSync`
 * requests (register, player_details, sync/current_version, sync/pull,
 * friend/pull_game, friend/pull_meta) with
 * `sha256(<preimage> + <128-char secret>)`, which the server also accepts, and
 * its `NBSyncItems` requests (request_items, get_visits) with md5 and
 * `NBSync._ss` (OBSERVED). A replay signed with sha256 and `NBSync._ss` was
 * rejected.
 *
 * Salts: the game sends signed int32 salts (OBSERVED `-783493558` on
 * pull_meta), but the params schemas here accept only uint32, which is what
 * `NimblebitAuth.salt` generates.
 *
 * POST payloads: the game posts form fields (OBSERVED on pull_meta). The POST
 * endpoints here encode their payloads as JSON, and whether the server
 * accepts JSON is unverified.
 *
 * pp has no snapshot endpoints. Saves are uploaded by the game's Java plugin
 * (`com.nimblebit.nbsync.SyncPush`, whose dex holds `/sync/push/`), outside the il2cpp
 * code the probe hooks, so no push endpoint is modelled yet.
 *
 * Not modelled yet:
 * - `new_id/verify` (LITERAL).
 * - Play Games and Facebook login flows (LITERAL): `check_pg`, `register_pg`,
 *   `swap_pg`, `register_fb`, `swap_fb`.
 * - Static S3 files the game fetches at startup (OBSERVED, not NBSync):
 *   `NBStatic/ppVersion.json` (`{ current, min }`) and
 *   `NBStatic/sync/tt/current.ics`.
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
 * The preimages below are the ones the game used (OBSERVED), except for
 * get_gifts, which the game never calls. The game signs its own `NBSync`
 * requests with sha256 and another secret; see `Endpoints` for details.
 *
 * Each function is marked OBSERVED when the game made its request (Play build
 * 2.17.3, 2026-11-09) and REPLAYED when the function itself succeeded against
 * the live server (2026-11-09). Save bytes are returned raw (base64-decoded);
 * inflating (pako) and parsing into a save schema is left to the caller.
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
