/**
 * @since 1.0.0
 */

/**
 * Bit City SDK: signed calls against Nimblebit's NBSync service.
 *
 * Signing reuses `@tinyburg/nimblebit-sdk` (`NimblebitAuth`): the game secret
 * salt (from `NBSync._ss`) is provided as the auth key, and each request is
 * `md5(<preimage> + <secret salt>)` with a random signed int32 `salt` in the path.
 *
 * Each method says where its preimage comes from: OBSERVED (the game made
 * this request, Play build 1.6.0, 2026-11-09) and/or REPLAYED (this function
 * ran against sync.nimblebit.com, 2026-11-09). Save bytes are returned raw
 * (base64-decoded); inflating (pako) and parsing into a save schema is left to
 * the caller.
 *
 * @since 1.0.0
 * @category SDK
 */
export * as BitCity from "./BitCity.ts"

/**
 * Bit City's buildings, from the game's `BuildingDefs`, with the zone types
 * they are built in.
 *
 * @since 1.0.0
 * @category Buildings
 */
export * as Buildings from "./Buildings.ts"

/**
 * The names of Bit City's cities, from the game's `City.cityNames`.
 *
 * @since 1.0.0
 * @category Cities
 */
export * as Cities from "./Cities.ts"

/**
 * Bit City (game code `bc`) NBSync api endpoints.
 *
 * Signing: a random `salt` goes in the path, and `hash` is
 * `md5(<preimage> + <game secret salt>)` with the preimage
 * `bc/<playerId>/<salt><playerAuthKey>` (variants noted per endpoint). The
 * secret salt is the value extracted from `NBSync._ss`. Every request the game
 * made was signed this way, `register` included.
 * The game's salt is a signed int32 (it sent a negative one), while the `salt`
 * params here accept only the uint32 salts `NimblebitAuth` generates.
 *
 * Provenance in the comments below:
 * - OBSERVED: the game made this request (Play build 1.6.0, 2026-11-09).
 * - REPLAYED: the SDK's client function ran against the live server and its
 *   signature was accepted (2026-11-09).
 * - DTO: the game's response class has these fields.
 * - LITERAL: the path is compiled into the game but was not exercised.
 * - DERIVED: inferred from Tiny Tower.
 *
 * The game has no `/receive_item/` path. Saves are uploaded by its Java plugin
 * (`com.nimblebit.nbsync.SyncPush`, `/sync/push/`), outside the il2cpp code the probe
 * hooks; that is not modelled yet. Not modelled yet (LITERAL only): `register_email`, which
 * starts the email and device verification that `verify_device` completes.
 * The Facebook (`register_fb`, `swap_fb`) and Google Play Games
 * (`register_pg`, `check_pg`, `swap_pg`) login flows are not modelled either.
 *
 * Game-specific save/meta schemas are left as `Schema.Unknown` placeholders.
 *
 * @since 1.0.0
 * @category Endpoints
 */
export * as Endpoints from "./Endpoints.ts"

/**
 * Bit City's missions, from the game's `MissionDefs`, with the mission types
 * they count towards.
 *
 * @since 1.0.0
 * @category Missions
 */
export * as Missions from "./Missions.ts"

/**
 * The scopes the Bit City api is guarded by: `bitcity` for the whole game,
 * `bitcity:read` and `bitcity:write` for every endpoint that only looks or that
 * changes a player's game, a `:read` and a `:write` scope for each area of the
 * api, such as `bitcity:device:read`, and one scope per endpoint, such as
 * `bitcity:device:player_details`.
 *
 * Each endpoint accepts its own scope, its area's side, the game's side and the
 * game, narrowest first:
 * `{ anyOf: [DevicePlayerDetails, DeviceRead, Read, BitCity] }`. An endpoint
 * this module has no scope for is left unscoped, and the authproxy guards it
 * with `bitcity:read` or `bitcity`.
 *
 * @since 1.0.0
 * @category Scopes
 */
export * as Scopes from "./Scopes.ts"

/**
 * Bit City's upgrades, from the game's `UpgradeDefs`, with the upgrade
 * variables they change.
 *
 * @since 1.0.0
 * @category Upgrades
 */
export * as Upgrades from "./Upgrades.ts"

/**
 * Bit City's cars, boats and planes, from the game's `CarDefs`, `BoatDefs`
 * and `PlaneDefs`: each boat and plane comes in three variants, such as a
 * rover in place of a boat on the Moon.
 *
 * @since 1.0.0
 * @category Vehicles
 */
export * as Vehicles from "./Vehicles.ts"
