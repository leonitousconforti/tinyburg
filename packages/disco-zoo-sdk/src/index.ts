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
 * Disco Zoo's save (game version 1.6.3, save `dataVersion` 14).
 *
 * The game keeps its state in two `DataManager`s. The "global" one holds the
 * `PlayerData`, `ZooData`, `StatsData`, `QuestManager`, `PetManager` and
 * `LoonManager`, the "local" one the `SceneryData`, `SettingsData` and
 * `StoreData`. `DataManager.GetSaveDataString` writes each with the game's
 * MiniJson as a JSON object from the data's name to the JSON string of its
 * `GetJSON()` (so every item is JSON inside a JSON string), and
 * `DataManager.LoadDataFromString` reads it back. The game writes those two
 * strings to `global.data` and `local.data` in its files directory, and
 * `CloudManager.Save` copies them into a `CloudSave`, whose `ToJson()` it
 * keeps in PlayerPrefs under `discozoo` (`CloudManager.SaveKey`). That string,
 * `{"localDataString":...,"globalDataString":...,"dataVersion":14,"xp":...}`,
 * is {@link SaveData}; {@link GlobalData} and {@link LocalData} are the two
 * `DataManager` strings.
 *
 * For the sync server, `NBSync.savePlayer` hands the PlayerPrefs key
 * (`NBSync._prefName`, also `discozoo`) to the game's Java `SyncPush`
 * service, which reads that preference, URL-decodes it, removes the player's
 * salt and email (`,\"playerSalt\":\"...\"` and `,\"playerEmail\":\"...\"`
 * inside the nested `SettingsData`), and posts `NBSync.compress` of it: UTF-8,
 * zlib (`java.util.zip.Deflater` at its default level) and base64. So the
 * bytes the SDK's sync pull returns (`data` after base64) are the
 * zlib-compressed save without those two keys, which
 * {@link SaveDataFromBytes} reads; the salt and email are optional for that
 * reason. Both decode to `Redacted` values (`""` while the game has none), so
 * printing or logging a decoded save does not show them.
 *
 * How this was determined: saves taken from the game on an emulator with a
 * Frida agent (`GetSaveDataString` of both managers, `CloudSave.ToJson`, the
 * PlayerPrefs value and the two files, which matched each other, for a fresh
 * game and for one grown with the game's own methods: debug unlocks, stats,
 * hats, decorations, toys, name tags, pets, a generated scenery lot, and pens
 * loaded through `LoadDataFromString` and written back by the game), the
 * field types the game's classes declare, the game's `MiniJson.Json.Serialize`
 * run on a test string, and the game's Java code (disassembly of `NBSync` and
 * `SyncPush`). The test fixtures are those saves, with the player's id and
 * salt replaced by fakes.
 *
 * Numbers the game writes as strings stay strings in the save, so C# `long`
 * values (`DateTime` ticks, timers, coin totals) decode to `bigint` without
 * losing digits.
 *
 * Every JSON object in the save (the `CloudSave`, the two `DataManager`
 * objects, each item and the objects inside items, such as pens, quests, pets
 * and scenery lots) keeps the keys this module does not model, such as ones a
 * newer game version adds, as JSON values beside the keys it does, and
 * encoding writes them back. Decoding never drops a key the game wrote.
 *
 * Round trips: decoding a save string the game wrote and encoding it again
 * gives back the same string, byte for byte, whenever every key in it is one
 * this module models, as in every save game version 1.6.3 writes. Every
 * known exception:
 *
 * - Encoding writes each object's unknown keys after its known keys (in the
 *   order they were read), so unknown keys read before or between known ones
 *   move to the end of their object.
 * - Unknown keys' values are read with `JSON.parse` and written the way
 *   MiniJson writes them, so strings, booleans, `null` and integers up to
 *   2^53 come back as they were, but a number that JavaScript writes
 *   differently (exponent notation such as `1E-05`, a trailing `.0`, an
 *   integer past 2^53) changes, and keys that look like array indexes
 *   (`"5"`) inside an unknown object move to its start.
 * - A key of an {@link AccountData} that looks like an array index would move
 *   to the start too (the game's keys are names).
 * - Text the game does not write (whitespace, other escapes, floats not in
 *   `float.ToString()` form, a key written twice in a JSON object, which
 *   keeps the last) decodes, but encodes in the game's form.
 *
 * {@link SaveDataFromBytes} gives back the same save string, with the same
 * exceptions, but not necessarily the same compressed bytes.
 *
 * @since 1.0.0
 */
export * as Save from "./Save.ts"

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
