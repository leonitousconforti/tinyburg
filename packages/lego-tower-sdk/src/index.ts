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
 * LEGO Tower SDK: signed calls against Nimblebit's NBSync service.
 *
 * Signing reuses `@tinyburg/nimblebit-sdk` (`NimblebitAuth`): the game secret
 * salt (from `NBSync._ss`) is provided as the auth key, and each request is
 * `md5(<preimage> + <secret salt>)` with a random uint32 `salt` in the path.
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
 * The scopes the LEGO Tower api is guarded by, as a game-rooted tree, built with
 * `@tinyburg/nimblebit-sdk`'s `defineGame`. Only the endpoints this sdk defines
 * are covered; areas without both a read and a write side are left out until
 * their endpoints exist.
 *
 * @since 1.0.0
 * @category Scopes
 */
export * as Scopes from "./Scopes.ts"
