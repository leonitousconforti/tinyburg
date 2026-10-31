/**
 * @since 1.0.0
 */

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
 * Pocket Planes SDK: signed calls against Nimblebit's NBSync service.
 *
 * Signing reuses `@tinyburg/nimblebit-sdk` (`NimblebitAuth`): the game secret
 * salt (from `NBSync._ss`) is provided as the auth key, and each request is
 * `md5(<preimage> + <secret salt>)` with a random uint32 `salt` in the path.
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
 * The scopes the Pocket Planes api is guarded by, as a game-rooted tree, built with
 * `@tinyburg/nimblebit-sdk`'s `defineGame`. Only the endpoints this sdk defines
 * are covered; areas without both a read and a write side are left out until
 * their endpoints exist.
 *
 * @since 1.0.0
 * @category Scopes
 */
export * as Scopes from "./Scopes.ts"
