/**
 * @since 1.0.0
 */

/**
 * Bit City SDK: signed calls against Nimblebit's NBSync service.
 *
 * Signing reuses `@tinyburg/nimblebit-sdk` (`NimblebitAuth`): the game secret
 * salt (from `NBSync._ss`) is provided as the auth key, and each request is
 * `md5(<preimage> + <secret salt>)` with a random signed int32 `salt` in the path.
 * All method preimages below are the Tiny Tower formula with the `bc` game code.
 *
 * The methods that were exercised live against sync.nimblebit.com are marked
 * VERIFIED; save-bearing / write paths follow the same pattern but were not
 * exercised. Save bytes are returned raw (base64-decoded); inflating (pako) and
 * parsing into a save schema is left to the caller.
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
 * Signing: a random `salt` (signed int32) goes in the path, and `hash` is
 * `md5(<preimage> + <game secret salt>)` with the preimage
 * `bc/<playerId>/<salt><playerAuthKey>` (variants noted per endpoint). The
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
 * - Minimal NBSync endpoint set (Bit City is a lightweight city builder).
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
 * Bit City's save: the game's `GameState` object as JSON, written by
 * Newtonsoft.Json.
 *
 * `Player.Save()` builds a `GameState`, serializes it with
 * `JsonConvert.SerializeObject` and stores the string under the PlayerPrefs key
 * `bitcity3` (`Player.SaveKey`). `Player.LoadFromDisk()` reads that key back and
 * deserializes it into a `GameState`. The game only stores a save whose
 * `pTaps` is at least 1, so a fresh install still in its tutorial has none.
 *
 * The cloud copy (`/sync/pull/bc/...`, see `BitCity.sync_pullSave`) is the
 * same JSON without the `playerS` and `playerE` keys, zlib-compressed: the
 * game's `NBSync.decodeSave` turns the pulled base64 `data` into the save
 * string by base64-decoding and inflating it. {@link SaveDataFromBytes} reads
 * those bytes.
 *
 * Determined against Bit City 1.6.0 on an Android emulator with Frida: by
 * hooking `JsonConvert.SerializeObject`, `PlayerPrefs.SetString` and
 * `NBSync.decodeSave` while the game saved and pulled its save from the
 * server, by reading the calls `Player.Save()` and `Player.LoadFromDisk()`
 * make, and by growing a city with the game's own methods (buying and building
 * lots, upgrades, vehicles and missions) to see every key filled in. The test
 * fixtures are those saves, with the player's id and secret replaced.
 *
 * The JSON is decoded losslessly: numbers keep their exact text until a field's
 * schema reads them, so C# `long` values above 2^53 (`cLastEarnTime`, in
 * `DateTime` ticks) survive. Keys this module does not model, which a newer
 * game version could add to the save, its lots or its progressive rewards, are
 * kept as they were read, as {@link JsonValue}s (numbers as their source text;
 * typed `unknown` on the decoded side), and written back; encoding checks their
 * values against {@link JsonValue} again. The player's auth salt (`playerS`)
 * and email (`playerE`) decode to `Redacted` values, so printing or logging a
 * decoded save does not show them. This needs `JSON.parse` source text access
 * and `JSON.rawJSON` (Node.js 21 and later).
 *
 * Encoding writes JSON the way the game does: no whitespace, Newtonsoft's
 * string escapes (`\"`, `\\`, `\b`, `\t`, `\n`, `\f`, `\r`, `\u00XX` for other
 * control characters, and `\u0085`, `\u2028`, `\u2029`; everything else as
 * is), and doubles as the game's Mono runtime formats them (`50000.0`,
 * `1E+15`, 17 digits when 15 do not round-trip). Encoding a decoded save the
 * game wrote gives back the same string, byte for byte, with these exceptions:
 *
 * - Keys that look like array indexes ("0", "1", ...) come first in their
 *   object, in ascending order, as JavaScript objects order such keys.
 * - In the save, in each lot and in `progressiveRewards`, the keys this module
 *   models come back in the order it lists them (the game's order), followed
 *   by the keys it does not model, in the order they were read. Dictionaries
 *   (`cLots`, `uCounts`, ...) keep their keys in the order they were read.
 *
 * A string the game would not write (whitespace between tokens, other escapes
 * such as `\/` or `\u0041`, a double in a modeled field written with other
 * digits) decodes, and is written back the game's way.
 *
 * @since 1.0.0
 */
export * as Save from "./Save.ts"

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
