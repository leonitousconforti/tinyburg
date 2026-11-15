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
 * Signing: a random `salt` (signed int32) goes in the path, and `hash` is
 * `md5(<preimage> + <game secret salt>)` with the preimage
 * `vegas/<playerId>/<salt><playerAuthKey>` (variants noted per endpoint). The
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
 * Tiny Tower Vegas's save: what the static `VPlayer.ToBlock()` writes, which
 * `VGame.SaveToDisk` keeps in the `vegas` PlayerPref and `VPlayer.FromBlock`
 * reads back when the tower loads (and again in `VGame.OnCloudData` for a
 * cloud save). It is Nimblebit's block format, the one Pocket Trains uses:
 * each value written by `Block.Val(key, value, num)` or `NBUtils.blockStr` as
 * `[key]value[key]`, where a numbered block appends its number to the key
 * (`[story1]...[story1]`), and objects are blocks nested in blocks. Values are
 * C#'s `ToString()` of the field: `True`/`False` for a `bool` (but `p_preg`
 * is written as `1`), the enum's name for a `VIPType`, its number for the
 * other enums. The blocks are read here rather than with
 * `NimblebitSchema.parseNimblebitObject`, which finds a key anywhere in the
 * text: the floors and posts are numbered blocks after a count, a floor
 * writes only its non-zero stock and sale slots and its occupied beds, each
 * by slot number, and many blocks are only written when they are set.
 *
 * The server's copy is the same text: `NBSync.pushToServer` passes the Java
 * plugin (`com.nimblebit.nbsync.NBSync.NBSyncPushSave`) the name of the
 * PlayerPref to read (`NBSync._prefName`) rather than the text, and unlike
 * Pocket Trains nothing is left out: the save pulled back still held the
 * player's salt and email. {@link SaveDataFromBytes} reads the bytes
 * `sync/pull` hands back.
 *
 * Determined against Tiny Tower Vegas 1.5.2 (Android, arm64) in two ways.
 * Offline, by disassembling `VPlayer.ToBlock`, `VFloor.ToBlock`,
 * `VBitizen.ToBlock`, `VBBPost.ToBlock`, `VMission.ToBlock`, `Block.Val`,
 * `NBUtils.blockStr` and `NBSync.pushToServer` in the APK's `libil2cpp.so`,
 * with the keys read from the metadata's string literals: that gives the
 * order of the blocks and the condition each optional block is written under.
 * Then on an emulator with a Frida probe (November 2026), from text the game
 * wrote: two fresh installs' saves, one grown by calling the game's own
 * methods (`VTowerPage.BuildNewFloor`, `TrySpawnVIP`, the `VPlayer` setters),
 * ones where the probe also set the fields that only some floors, posts and
 * bitizens have, so that every optional block was written, the save the game
 * pulled back from the server, and what `Block.Val` writes for a range of
 * floats. The fixtures under `test/fixtures` are those saves, with the
 * player's id, auth salt and email replaced. Every key the game writes is
 * modeled, in the game's order.
 *
 * Decoding never drops part of a save: a block this module does not know, such
 * as one a later version of the game adds, fails to decode, as does a missing
 * or reordered block, text between blocks, or a value written another way than
 * the game writes it, in the save and in every object nested in it (a floor,
 * a bitizen, a post, the mission). In exchange, the round trip is exact: every
 * text that decodes encodes back to the same text, byte for byte, with no
 * exceptions.
 *
 * The player's auth salt (`p_ps`) and email (`p_em`) decode to `Redacted`
 * values, with `NimblebitConfig.PlayerAuthKeySchema` (which also requires the
 * salt to be a UUID) and `NimblebitConfig.PlayerEmailSchema`, so printing or
 * logging a decoded save does not show them; `Redacted.value` reads them.
 *
 * C# `long` and `ulong` values are `bigint`s: the save holds `DateTime` ticks
 * (`f_od`, `bb_date` and the floor timers) and a `ulong` (`tp`), which are
 * past what a `number` holds exactly. A C# `float` keeps the seven digits the
 * game writes, and only reads text written the way C# writes it with `.` for
 * the decimal point: the game writes `f_sln` and `bb_ft` in the device's
 * culture, so a save from a device that uses `,` fails to decode.
 *
 * @since 1.0.0
 * @category Save
 */
export * as Save from "./Save.ts"

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
 * `md5(<preimage> + <secret salt>)` with a random signed int32 `salt` in the path.
 * All method preimages below are the Tiny Tower formula with the `vegas` game code.
 *
 * The methods that were exercised live against sync.nimblebit.com are marked
 * VERIFIED; save-bearing / write paths follow the same pattern but were not
 * exercised. Save bytes are returned raw (base64-decoded); inflating (pako) and
 * parsing into a save schema is left to the caller.
 *
 * @since 1.0.0
 * @category SDK
 */
export * as TinyTowerVegas from "./TinyTowerVegas.ts"
