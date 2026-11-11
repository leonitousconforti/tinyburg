/**
 * @since 1.0.0
 */

/**
 * LEGO Tower (game code `lt`) NBSync api endpoints.
 *
 * Signing: a random `salt` goes in the path, and `hash` is
 * `md5(<preimage> + <game secret salt>)` with the preimage
 * `lt/<playerId>/<salt><playerAuthKey>` (variants noted per endpoint). The
 * secret salt is the value of `NBSync._ss`. Every NBSync request the game
 * made, `register` included, was signed this way. Salts are signed int32, as
 * the game sends (it sent a negative one).
 *
 * Each endpoint says how it is known (Play build 1.27.2, 2026-11-09):
 * - OBSERVED: the game made this request.
 * - REPLAYED: the sdk's client function succeeded against the live server.
 * - DTO: the game's response class has these fields.
 * - LITERAL: the path is compiled into the game but was not exercised.
 * - DERIVED: inferred from Tiny Tower.
 *
 * DTO int fields can arrive as numeric strings (the mailbox `total` did), so
 * int schemas on replies that were never observed may be too strict. LEGO
 * Tower issues player ids longer than 5 chars (relaxed `PlayerId` schema).
 *
 * Not modelled yet (LITERAL only): `receive_item`, `send_trade`,
 * `accept_trade`, `reject_trade`, `remove_trade`, `get_ag`, `send_ag`,
 * `sync/push_snapshot`, `friend/editorpull_game`, `register_email`,
 * `register_email_lang`, `code/verify` and `af/lt`. The Facebook, Play Games
 * and LEGO Life flows (`register_fb`, `swap_fb`, `register_pg`, `check_pg`,
 * `swap_pg`, `register_ll`, `check_ll`, `swap_ll`, `friends_ll`) are left out
 * too. Saves are uploaded by the game's Java plugin (`com.nimblebit.nbsync.SyncPush`,
 * `/sync/push/`), which the il2cpp probe does not see; that is not modelled
 * yet either.
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
 * Each method signs the preimage the game was observed signing, except
 * `sync_pullSave`, whose preimage the live server accepted on replay.
 *
 * Methods say how they are known (Play build 1.27.2, 2026-11-09): OBSERVED
 * means the game made the request, REPLAYED means the method succeeded against
 * sync.nimblebit.com. Save bytes are returned raw (base64-decoded); inflating
 * (pako) and parsing into a save schema is left to the caller.
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
