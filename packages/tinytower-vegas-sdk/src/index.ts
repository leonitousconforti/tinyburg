/**
 * @since 1.0.0
 */

/**
 * The first names, last names and cities Tiny Tower Vegas uses for its
 * Bitizens.
 *
 * @since 1.0.0
 * @category Bitizens
 */
export * as Bitizens from "./Bitizens.ts"

/**
 * Tiny Tower Vegas's special characters, whose ids the missions and floors
 * refer to.
 *
 * @since 1.0.0
 * @category Characters
 */
export * as Characters from "./Characters.ts"

/**
 * Tiny Tower Vegas's elevators and their prices, indexed by elevator id.
 *
 * @since 1.0.0
 * @category Elevators
 */
export * as Elevators from "./Elevators.ts"

/**
 * Tiny Tower Vegas (game code `vegas`) NBSync api endpoints.
 *
 * Signing: `hash` is `md5(<preimage> + <game secret salt>)`, where the secret
 * salt is `NBSync._ss` and the usual preimage is
 * `vegas/<playerId>/<salt><playerAuthKey>` (variants noted per endpoint). Every
 * NBSync request the game made, `register` included, used this md5 scheme. The
 * game's `salt` is a signed int32 (OBSERVED: -2037394745). The `U32` salt
 * params only accept uint32 salts, which the server also accepts (REPLAYED), so
 * a game-style negative salt fails param decoding here.
 *
 * Provenance used below:
 *
 * - OBSERVED: the game made this request (Play build 1.5.2, 2026-11-09).
 * - REPLAYED: the SDK's client function succeeded against the live server
 *   (2026-11-09).
 * - DTO: the game's class has these fields.
 * - LITERAL: the path is compiled into the game but was not exercised.
 * - DERIVED: inferred from Tiny Tower.
 *
 * The game has only three NBSync response DTOs: NBSyncItemsGetResponse
 * `{success, gifts, total Int32, error}`, NBSyncItemsSendResponse `{success,
 * error}` and NBSyncItemsReceiveResponse `{success, error, id}`. No other reply
 * has a DTO class.
 *
 * Not modelled yet (LITERAL only): `register_email`, `event/details`,
 * `event/leaderboards`, `event/register_group` and `event/send_score`. Also
 * left out are the Game Center, Play Games and Facebook flows (`register_gc`,
 * `check_gc`, `swap_gc`, `register_pg`, `check_pg`, `swap_pg`, `register_fb`,
 * `friends`, `friends_fb`), and the save upload: `NBSync.pushToServer` hands
 * saves to the game's Java plugin (`com.nimblebit.nbsync.SyncPush`), which posts them to
 * `/sync/push/` outside the il2cpp code the probe hooks.
 *
 * Game-specific save, meta, gift and snapshot schemas are left as
 * `Schema.Unknown` placeholders.
 *
 * @since 1.0.0
 * @category Endpoints
 */
export * as Endpoints from "./Endpoints.ts"

/**
 * Tiny Tower Vegas's floors, indexed by floor id, with their types, prices,
 * products and stocking times. Index 0 is the game's empty placeholder, with
 * no name and type `None`, so that every other floor sits at its id.
 *
 * @since 1.0.0
 * @category Floors
 */
export * as Floors from "./Floors.ts"

/**
 * Tiny Tower Vegas's missions: the tutorial's, the tips' and the ones its
 * characters give.
 *
 * @since 1.0.0
 * @category Missions
 */
export * as Missions from "./Missions.ts"

/**
 * Tiny Tower Vegas's roofs and their prices, indexed by roof id.
 *
 * @since 1.0.0
 * @category Roofs
 */
export * as Roofs from "./Roofs.ts"

/**
 * The scopes the Tiny Tower Vegas api is guarded by: `tinytowervegas` for the
 * whole game, `tinytowervegas:read` and `tinytowervegas:write` for every
 * endpoint that only looks or that changes a player's game, a `:read` and a
 * `:write` scope for each area of the api, such as
 * `tinytowervegas:device:read`, and one scope per endpoint, such as
 * `tinytowervegas:device:player_details`.
 *
 * Each endpoint accepts its own scope, its area's side, the game's side and the
 * game, narrowest first:
 * `{ anyOf: [DevicePlayerDetails, DeviceRead, Read, TinyTowerVegas] }`. An
 * endpoint this module has no scope for is left unscoped, and the authproxy
 * guards it with `tinytowervegas:read` or `tinytowervegas`.
 *
 * @since 1.0.0
 * @category Scopes
 */
export * as Scopes from "./Scopes.ts"

/**
 * Tiny Tower Vegas SDK: signed calls against Nimblebit's NBSync service.
 *
 * Signing reuses `@tinyburg/nimblebit-sdk` (`NimblebitAuth`): the game secret
 * salt (from `NBSync._ss`) is provided as the auth key, and each request is
 * `md5(<preimage> + <secret salt>)` with a random `salt` in the path. The SDK
 * draws uint32 salts, which the server accepts; the game sends signed int32
 * ones. Each preimage below is the one the game was OBSERVED signing (Play
 * build 1.5.2, 2026-11-09), except `sync_pullSave`'s, which the game did not
 * send.
 *
 * Functions marked REPLAYED succeeded against sync.nimblebit.com (2026-11-09).
 * Save bytes are returned raw (base64-decoded); inflating (pako) and parsing
 * into a save schema is left to the caller.
 *
 * @since 1.0.0
 * @category SDK
 */
export * as TinyTowerVegas from "./TinyTowerVegas.ts"
