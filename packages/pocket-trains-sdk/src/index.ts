/**
 * @since 1.0.0
 */

/**
 * Every car a Pocket Trains train can haul, by id: freight (type `j`) or
 * passengers (type `p`), with its value from 1 to 4 and the table's `active` flag.
 *
 * @since 1.0.0
 * @category Cars
 */
export * as Cars from "./Cars.ts"

/**
 * Pocket Trains' cities by id, with the region each is in, and its regions.
 *
 * @since 1.0.0
 * @category Cities
 */
export * as Cities from "./Cities.ts"

/**
 * Pocket Trains (game code `pt`) NBSync api endpoints.
 *
 * Signing: a random `salt` (signed int32) goes in the path, and `hash` is
 * `md5(<preimage> + <game secret salt>)` with the preimage
 * `pt/<playerId>/<salt><playerAuthKey>` (variants noted per endpoint). The
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
 * - pt-specific gifting: `get_gifts_pt` -> NBSyncGetPTGiftResponse with
 *   NBSyncGetPTGift elements, plus a gift-id flow (NBSyncGetGiftIDResponse,
 *   `friend/pull_meta_gift_id`). The get_gifts_pt REQUEST params are UNCONFIRMED
 *   (the tried `/get_gifts_pt/pt/:playerId/:salt/:hash` form was rejected), so
 *   that endpoint is marked accordingly.
 *
 * Game-specific save/meta schemas are left as `Schema.Unknown` placeholders.
 *
 * @since 1.0.0
 * @category Endpoints
 */
export * as Endpoints from "./Endpoints.ts"

/**
 * Pocket Trains' engines by id, with each one's level, speed, fuel and how
 * many cars, engines and tenders its train takes, and whether it is special.
 *
 * @since 1.0.0
 * @category Engines
 */
export * as Engines from "./Engines.ts"

/**
 * The city events Pocket Trains picks from, in the game's order: a story with
 * `%c` for the city, the car its jobs haul into the city (`inbound`) or out of
 * it, and the costume of its passengers, if any.
 *
 * @since 1.0.0
 * @category Events
 */
export * as Events from "./Events.ts"

/**
 * Pocket Trains SDK: signed calls against Nimblebit's NBSync service.
 *
 * Signing reuses `@tinyburg/nimblebit-sdk` (`NimblebitAuth`): the game secret
 * salt (from `NBSync._ss`) is provided as the auth key, and each request is
 * `md5(<preimage> + <secret salt>)` with a random signed int32 `salt` in the path.
 * All method preimages below are the Tiny Tower formula with the `pt` game code.
 *
 * The methods that were exercised live against sync.nimblebit.com are marked
 * VERIFIED; save-bearing / write paths follow the same pattern but were not
 * exercised. Save bytes are returned raw (base64-decoded); inflating (pako) and
 * parsing into a save schema is left to the caller.
 *
 * @since 1.0.0
 * @category SDK
 */
export * as PocketTrains from "./PocketTrains.ts"

/**
 * Pocket Trains' save: what `TRPlayer.ToBlockStr()` writes, which
 * `TRPlayer.saveGame()` keeps in the `TRBLOCK` PlayerPref and the game reads
 * back with `TRPlayer.FromBlock`. It is Nimblebit's block format: each value
 * written as `[key]value[key]`, with blocks nested in blocks. A list is a block
 * holding its length (`[ccount]5[ccount]`) and one block per item keyed by its
 * index (`[c0]...[c0]`), a few short lists are comma separated, and the
 * friends list is item blocks joined with commas. The blocks are read here
 * rather than with `NimblebitSchema.parseNimblebitObject`, which finds a key
 * anywhere in the text: these lists are numbered blocks after a count, and
 * short keys repeat at different depths (`c` is the coins, a crate's count
 * and a day's cars).
 *
 * `NBSync.pushToServer` sends the same text without the `pS` and `pE` blocks
 * (the player's auth salt and email): `NBSync.encodeSave` deflates it with
 * zlib and base64 encodes it, `sync/pull` hands that string back unchanged, and
 * `NBSync.decodeSave` reverses it before `TRGame.HandleCloudChange` loads it.
 * {@link SaveDataFromBytes} reads those bytes.
 *
 * Determined against Pocket Trains 1.10.2 on an emulator with a Frida probe
 * (November 2026), from saves the game wrote: a fresh install's, and one grown
 * by calling the game's own methods (coins, crates, parts, yard items,
 * achievements, tips, friends, jobs, licenses) and setting fields the save
 * only writes when they are set. The fixtures under `test/fixtures` are those
 * saves, with the player's id and salt replaced. Every key the game wrote is
 * modeled, in the game's order.
 *
 * Decoding never drops part of a save: it fails on a block the schema does not
 * model (such as one a newer version of the game adds), and on a missing,
 * repeated or reordered block, a list whose count disagrees with its items,
 * text outside the blocks, or a value written other than the way the game
 * writes it (`1e4` for `10000`, say). So the round trip is exact, with no
 * exceptions: any text {@link SaveData} decodes encodes back to the same text,
 * byte for byte.
 *
 * The player's auth salt (`pS`) and email (`pE`) decode to `Redacted` values
 * (`NimblebitConfig.PlayerAuthKeySchema` and `PlayerEmailSchema`), so printing
 * or logging a decoded save does not show them; `Redacted.value` reads them.
 *
 * Not seen: keys a 1.10.2 save would only hold in states the probe did not
 * reach, a lost and found holding more than one part (`PLFP` is read as a
 * comma separated list, like the game's other lists), and what `jBE`, `cPC`
 * and `cPRI` hold beyond being C# `long`s.
 *
 * @since 1.0.0
 * @category Save
 */
export * as Save from "./Save.ts"

/**
 * The scopes the Pocket Trains api is guarded by: `pockettrains` for the whole
 * game, `pockettrains:read` and `pockettrains:write` for every endpoint that
 * only looks or that changes a player's game, a `:read` and a `:write` scope
 * for each area of the api, such as `pockettrains:device:read`, and one scope
 * per endpoint, such as `pockettrains:device:player_details`.
 *
 * Each endpoint accepts its own scope, its area's side, the game's side and the
 * game, narrowest first:
 * `{ anyOf: [DevicePlayerDetails, DeviceRead, Read, PocketTrains] }`. An
 * endpoint this module has no scope for is left unscoped, and the authproxy
 * guards it with `pockettrains:read` or `pockettrains`.
 *
 * @since 1.0.0
 * @category Scopes
 */
export * as Scopes from "./Scopes.ts"

/**
 * Every track Pocket Trains has, by id, with the two cities it joins and its
 * length.
 *
 * @since 1.0.0
 * @category Tracks
 */
export * as Tracks from "./Tracks.ts"
