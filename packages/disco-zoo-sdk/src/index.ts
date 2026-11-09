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
 * `md5(<preimage> + <secret salt>)` with a random uint32 `salt` in the path.
 * The game itself uses signed int32 salts; the server accepts both.
 *
 * Each method says where its preimage comes from (Play build 1.6.3,
 * 2026-11-09): OBSERVED (the game made this request) or REPLAYED (this function
 * was accepted by the live server). Save bytes are returned raw
 * (base64-decoded); inflating (pako) and parsing into a save schema is left to
 * the caller.
 *
 * @since 1.0.0
 * @category SDK
 */
export * as DiscoZoo from "./DiscoZoo.ts"

/**
 * Disco Zoo (game code `dz`) NBSync api endpoints.
 *
 * Signing: a random `salt` goes in the path, and `hash` is
 * `md5(<preimage> + <game secret salt>)` with the preimage
 * `dz/<playerId>/<salt><playerAuthKey>` (variants noted per endpoint). The
 * secret salt is the value of `NBSync._ss`. Every NBSync call, register
 * included, uses MD5; the server rejected SHA-256 replays.
 *
 * The game's salt is a signed int32 string (it sent `-867764578` and got
 * `Found`), but the `salt` params here accept uint32 only, which is what the
 * SDK generates.
 *
 * Provenance (Play build 1.6.3, 2026-11-09):
 *
 * - OBSERVED, the game made the request: register, player_details, get_items,
 *   friend/pull_game, friend/pull_meta.
 * - REPLAYED, the SDK's client function was accepted by the live server:
 *   register, player_details, get_items, and sync/pull (SaveNotFound for a
 *   fresh player).
 * - DTO, the game's response class has the fields named per endpoint.
 * - LITERAL, the path is compiled into the game but was not exercised:
 *   verify_device, sync/current_version, get_visits, receive_item, send_item.
 * - DERIVED, inferred from Tiny Tower.
 *
 * Not modelled yet (LITERAL only): `register_email`, `register_email_lang`,
 * `friend/editorpull_game`, and the Facebook and Play Games login flows
 * (`register_fb`, `swap_fb`, `register_pg`, `check_pg`, `swap_pg`), and the
 * save upload, which the game's Java plugin (`com.nimblebit.nbsync.SyncPush`) sends to
 * `/sync/push/` outside the il2cpp code the probe hooks.
 *
 * Gift and friend meta schemas are left as `Schema.Unknown` placeholders.
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
