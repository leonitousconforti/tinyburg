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
 * LEGO Tower's save. The game (version 1.27.2) keeps it as one JSON string:
 * `LTPlayer._Save` fills an `LTSave` with `LTPlayer.PlayerDict()` and
 * `LTowerController.ToDSO()`, serializes it with `LTSave.ToJson`
 * (Newtonsoft.Json, no indentation) and stores it in PlayerPrefs under
 * `"LGTower"`; `LTPlayer.LoadFromDisk` reads that string back with
 * `JsonConvert.DeserializeObject<LTSave>`, and a save pulled from the sync
 * server reaches `LTPlayer.HandleSyncSave` as the same JSON. The game skips
 * saving while the intro box of a new tower is up.
 *
 * Determined on an Android emulator with Frida: the save strings in the test
 * fixtures are what `LTSave.ToJson` returned when the game's own
 * `LTPlayer._Save` ran (the PlayerPrefs value read back was identical), on a
 * tower fresh out of the intro and again after adding pieces, found bux, a
 * visit, a tip, a blocked code and a friend through the game's `LTPlayer`
 * methods. Which methods save and load, and the keys of the parts no
 * captured save held (missions, friend metadata), come from disassembling the
 * game's IL2CPP binary and its Java code.
 *
 * Newtonsoft.Json writes a C# `double` with a decimal point (`1000.0`), and
 * `long`s such as `DateTime` ticks past 2^53, so the save is read with a JSON
 * reader that keeps both. Decoding drops nothing: keys this module does not
 * model (a newer game version may add some to the save or to any object in
 * it) are kept, and encoding writes them back. Encoding a decoded save string
 * the game wrote gives back the same bytes, except for key order:
 *
 * - integer-like keys (the piece ids some dictionaries are keyed by) come
 *   first in their object, in ascending order, because JavaScript objects
 *   order such keys that way;
 * - in each object, the other keys this module models are written in the
 *   order it lists them (the order game version 1.27.2 writes them), and
 *   the keys it does not model after them, in the order they were read.
 *
 * Any other JSON that decodes (with whitespace, escapes the game would not
 * write, or numbers spelled another way, such as `1.50`, or `1000` for a C#
 * `double`) encodes to the same values written the way the game writes
 * them, not to the same bytes. The player's sync secret (`playerS`) and email
 * (`playerE`) decode to `Redacted` values, so printing or logging a decoded
 * save does not show them; encoding writes them back as they were.
 *
 * The sync server holds the save zlib-compressed, without the player's
 * secret and email ({@link SaveDataFromBytes}): the game's
 * `com.nimblebit.nbsync.SyncPush` cuts those out and compresses the rest with
 * `NBSync.compress`, which on the emulator gave the same bytes as zlib's
 * defaults.
 *
 * @since 1.0.0
 */
export * as Save from "./Save.ts"

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
