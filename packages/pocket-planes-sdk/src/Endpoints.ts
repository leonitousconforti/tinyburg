/**
 * Pocket Planes (game code `pp`) NBSync api endpoints.
 *
 * Provenance words used below:
 * - OBSERVED: the game made this request (Play build 2.17.3, 2026-11-09).
 * - REPLAYED: the SDK's client function succeeded against the live server
 *   (2026-11-09).
 * - DTO: the game's response class has these fields.
 * - LITERAL: the path is compiled into the game but was not exercised.
 * - DERIVED: inferred from Tiny Tower.
 *
 * Signing: a random `salt` goes in the path, and `hash` is
 * `md5(<preimage> + <NBSync._ss>)` where the preimage is
 * `pp/<playerId>/<salt><playerAuthKey>` (variants noted per endpoint). Every
 * REPLAYED client function used this scheme. The game signs its own `NBSync`
 * requests (register, player_details, sync/current_version, sync/pull,
 * friend/pull_game, friend/pull_meta) with
 * `sha256(<preimage> + <128-char secret>)`, which the server also accepts, and
 * its `NBSyncItems` requests (request_items, get_visits) with md5 and
 * `NBSync._ss` (OBSERVED). A replay signed with sha256 and `NBSync._ss` was
 * rejected.
 *
 * Salts: the game sends signed int32 salts (OBSERVED `-783493558` on
 * pull_meta), but the params schemas here accept only uint32, which is what
 * `NimblebitAuth.salt` generates.
 *
 * POST payloads: the game posts form fields (OBSERVED on pull_meta). The POST
 * endpoints here encode their payloads as JSON, and whether the server
 * accepts JSON is unverified.
 *
 * pp has no snapshot endpoints. Saves are uploaded by the game's Java plugin
 * (`com.nimblebit.nbsync.SyncPush`, whose dex holds `/sync/push/`), outside the il2cpp
 * code the probe hooks, so no push endpoint is modelled yet.
 *
 * Not modelled yet:
 * - `new_id/verify` (LITERAL).
 * - Play Games and Facebook login flows (LITERAL): `check_pg`, `register_pg`,
 *   `swap_pg`, `register_fb`, `swap_fb`.
 * - Static S3 files the game fetches at startup (OBSERVED, not NBSync):
 *   `NBStatic/ppVersion.json` (`{ current, min }`) and
 *   `NBStatic/sync/tt/current.ics`.
 *
 * @since 1.0.0
 * @category Endpoints
 */

import { HttpApi, HttpApiEndpoint, HttpApiError, HttpApiGroup } from "effect/http-api";
import * as Schema from "effect/Schema";

import * as NimblebitConfig from "@tinyburg/nimblebit-sdk/NimblebitConfig";
import * as OAuthScope from "@yielded/auth/OAuthScope";

import * as Scopes from "./Scopes.ts";

/** @internal */
export const I32 = Schema.Int.check(Schema.isInt32());

/** @internal */
export const ApiErrors = [
    HttpApiError.Forbidden,
    HttpApiError.BadRequest,
    HttpApiError.Unauthorized,
    HttpApiError.InternalServerError,
] as const;

/**
 * NBSync returns errors as `{ error: <string> }`. Values seen include
 * `"Invalid Request"`, `"Invalid Request1"` (a replay of register with a bad
 * signature), `"NoSave"` and `"SaveNotFound"`.
 *
 * @internal
 */
export const ErrorResponse = Schema.Struct({ error: Schema.String });

/** @internal */
export const FoundResponse = Schema.Struct({ success: Schema.Literal("Found") });

/** @internal */
export const NotFoundResponse = Schema.Struct({ success: Schema.Literal("NotFound") });

/** @internal */
export const SavedResponse = Schema.Struct({ success: Schema.Literal("Saved") });

/** @internal */
export const NotSavedResponse = Schema.Struct({ success: Schema.Literal("NotSaved") });

/** @internal */
export const SentResponse = Schema.Struct({ success: Schema.Literal("Sent") });

/** @internal */
export const NotSentResponse = Schema.Struct({ success: Schema.Literal("NotSent") });

/** @internal */
export const ReceivedResponse = Schema.Struct({ success: Schema.Literal("Received") });

/** @internal */
export const NotReceivedResponse = Schema.Struct({ success: Schema.Literal("NotReceived") });

/**
 * One element of a `gifts` array. Still `Schema.Unknown`: every `gifts` array
 * seen on the wire was empty. DTO `NBSyncItemsGift`: `gift_id` String,
 * `gift_to` String, `gift_from` String, `gift_type` String, `item_type`
 * NBSyncItemType, `gift_str` String, `h` String, `c` Int32. DTO
 * `NBSyncItemType`: None=0, Play=1, Gift=2, Visit=3, Promo=4, Cloud=5,
 * Raffle=6.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const Gift = Schema.Unknown;

/**
 * OBSERVED at game startup and REPLAYED: `{ player_id, player_ss }`, preimage
 * `pp/<salt1>/<salt2>`. DTO `NBSyncRegisterResponse` also has `registered`
 * (Int32), which was not in the observed response.
 *
 * @internal
 */
export const DeviceNewPlayerEndpoint = HttpApiEndpoint.get("DeviceNewPlayer", "/register/pp/:salt1/:salt2/:hash", {
    params: { salt1: I32, salt2: I32, hash: Schema.String },
    error: ApiErrors,
    success: [
        ErrorResponse,
        Schema.Struct({
            playerId: NimblebitConfig.PlayerIdSchema,
            playerSs: NimblebitConfig.PlayerAuthKeySchema,
        }).pipe(Schema.encodeKeys({ playerId: "player_id", playerSs: "player_ss" })),
    ],
});

/**
 * OBSERVED and REPLAYED:
 * `{"success":"Found","player":{"player_id","registered","email","blacklisted","saveVersion","h"}}`.
 *
 * @internal
 */
export const DevicePlayerDetailsEndpoint = HttpApiEndpoint.get(
    "DevicePlayerDetails",
    "/player_details/pp/:playerId/:salt/:hash",
    {
        params: { playerId: NimblebitConfig.PlayerIdSchema, salt: I32, hash: Schema.String },
        error: ApiErrors,
        success: [
            ErrorResponse,
            Schema.Struct({
                success: Schema.Literal("Found"),
                player: Schema.Struct({
                    playerId: NimblebitConfig.PlayerIdSchema,
                    playerEmail: NimblebitConfig.PlayerEmailSchema,
                    registered: Schema.NumberFromString.pipe(Schema.decodeTo(Schema.BooleanFromBit)),
                    blacklisted: Schema.NumberFromString.pipe(Schema.decodeTo(Schema.BooleanFromBit)),
                    saveVersion: Schema.NumberFromString.pipe(Schema.decodeTo(Schema.Int)),
                    /**
                     * Uses the request's hash algorithm: 64 hex characters when
                     * the request was signed with sha256, 32 with md5.
                     */
                    checksum: Schema.String,
                }).pipe(Schema.encodeKeys({ playerId: "player_id", playerEmail: "email", checksum: "h" })),
            }),
        ],
    }
).annotate(OAuthScope.Required, {
    anyOf: [Scopes.DevicePlayerDetails, Scopes.DeviceRead, Scopes.Read, Scopes.PocketPlanes],
});

/**
 * LITERAL. The path and the `NewDevice` success value are DERIVED. DTO
 * `NBSyncVerifyCodeResponse`: success, player_id, player_ss, player_email,
 * error (no photo or nickname).
 *
 * @internal
 */
export const DeviceVerifyDeviceEndpoint = HttpApiEndpoint.get(
    "DeviceVerifyDevice",
    "/verify_device/pp/:playerId/:verificationCode",
    {
        params: { playerId: NimblebitConfig.PlayerIdSchema, verificationCode: Schema.String },
        error: ApiErrors,
        success: [
            ErrorResponse,
            Schema.Struct({
                success: Schema.Literal("NewDevice"),
                playerId: NimblebitConfig.PlayerIdSchema,
                playerAuthKey: NimblebitConfig.PlayerAuthKeySchema,
                playerEmail: NimblebitConfig.PlayerEmailSchema,
            }).pipe(
                Schema.encodeKeys({ playerId: "player_id", playerAuthKey: "player_ss", playerEmail: "player_email" })
            ),
        ],
    }
).annotate(OAuthScope.Required, {
    anyOf: [Scopes.DeviceVerifyDevice, Scopes.DeviceWrite, Scopes.Write, Scopes.PocketPlanes],
});

/**
 * LITERAL. The path, payload and success values are DERIVED. The game posts
 * form fields; this payload is sent as JSON, and whether the server accepts
 * JSON here is unverified.
 *
 * @internal
 */
export const DeviceRegisterEmailEndpoint = HttpApiEndpoint.post(
    "DeviceRegisterEmail",
    "/register_email/pp/:playerId/:salt/:hash",
    {
        params: { playerId: NimblebitConfig.PlayerIdSchema, salt: I32, hash: Schema.String },
        payload: Schema.Struct({ promote: Schema.Literal(1), email: Schema.Redacted(Schema.String) }),
        error: ApiErrors,
        success: [
            ErrorResponse,
            Schema.Struct({ success: Schema.Literal("NewEmail") }),
            Schema.Struct({ success: Schema.Literal("NewDevice") }),
        ],
    }
).annotate(OAuthScope.Required, {
    anyOf: [Scopes.DeviceRegisterEmail, Scopes.DeviceWrite, Scopes.Write, Scopes.PocketPlanes],
});

/**
 * Pull the player's cloud save. `data` is base64 pako-deflated bytes (parse into
 * the game save schema separately). OBSERVED and REPLAYED only the no-save
 * case, `{ error: "SaveNotFound" }`. The Found envelope is DERIVED and matches
 * DTO `NBSyncGameSaveResponse` (success, h, id, data, error). The DTO types
 * `id` as Int32; its wire type was not observed.
 *
 * @internal
 */
export const SyncPullSaveEndpoint = HttpApiEndpoint.get("SyncPullSave", "/sync/pull/pp/:playerId/:salt/:hash", {
    params: { playerId: NimblebitConfig.PlayerIdSchema, salt: I32, hash: Schema.String },
    error: ApiErrors,
    success: [
        ErrorResponse,
        NotFoundResponse,
        Schema.Struct({
            success: Schema.Literal("Found"),
            data: Schema.Uint8ArrayFromBase64,
            checksum: Schema.String,
            saveId: Schema.NumberFromString,
        }).pipe(Schema.encodeKeys({ checksum: "h", saveId: "id" })),
    ],
});

/**
 * OBSERVED only the no-save case, `{ error: "NoSave" }`. The Found envelope is
 * DERIVED and matches DTO `NBSyncCurrentCheckResponse` (success, h, id,
 * error). The DTO types `id` as Int32; its wire type was not observed.
 *
 * @internal
 */
export const SyncCheckForNewerSaveEndpoint = HttpApiEndpoint.get(
    "SyncCheckForNewerSave",
    "/sync/current_version/pp/:playerId/:salt/:hash",
    {
        params: { playerId: NimblebitConfig.PlayerIdSchema, salt: I32, hash: Schema.String },
        error: ApiErrors,
        success: [
            ErrorResponse,
            NotFoundResponse,
            Schema.Struct({
                success: Schema.Literal("Found"),
                checksum: Schema.String,
                saveId: Schema.NumberFromString,
            }).pipe(Schema.encodeKeys({ checksum: "h", saveId: "id" })),
        ],
    }
);

/**
 * OBSERVED and REPLAYED: `{ success: "Found", gifts: [], total }`. DTO
 * `NBSyncItemsGetResponse`.
 *
 * @internal
 */
export const SocialGetVisitsEndpoint = HttpApiEndpoint.get("SocialGetVisits", "/get_visits/pp/:playerId/:salt/:hash", {
    params: { playerId: NimblebitConfig.PlayerIdSchema, salt: I32, hash: Schema.String },
    error: ApiErrors,
    success: [
        ErrorResponse,
        NotFoundResponse,
        Schema.Struct({ success: Schema.Literal("Found"), gifts: Schema.Array(Gift), total: Schema.Int }),
    ],
}).annotate(OAuthScope.Required, {
    anyOf: [Scopes.SocialGetVisits, Scopes.SocialRead, Scopes.Read, Scopes.PocketPlanes],
});

/**
 * REPLAYED: `{ success: "Found", gifts: [], total }`. The pp client has no
 * `get_gifts` path literal and never calls it; it fetches its incoming items
 * with `request_items`.
 *
 * @internal
 */
export const SocialGetGiftsEndpoint = HttpApiEndpoint.get("SocialGetGifts", "/get_gifts/pp/:playerId/:salt/:hash", {
    params: { playerId: NimblebitConfig.PlayerIdSchema, salt: I32, hash: Schema.String },
    error: ApiErrors,
    success: [
        ErrorResponse,
        NotFoundResponse,
        Schema.Struct({ success: Schema.Literal("Found"), gifts: Schema.Array(Gift), total: Schema.Int }),
    ],
}).annotate(OAuthScope.Required, {
    anyOf: [Scopes.SocialGetGifts, Scopes.SocialRead, Scopes.Read, Scopes.PocketPlanes],
});

/**
 * OBSERVED and REPLAYED: `{ success: "Found", gifts: [] }`, with no `total`
 * although DTO `NBSyncItemsGetResponse` declares one. The game calls it from
 * `NBSyncItems.getSyncItems`, which looks like the fetch of the items (gifts)
 * waiting for the player rather than of item requests. Pocket Planes specific.
 *
 * @internal
 */
export const SocialRequestItemsEndpoint = HttpApiEndpoint.get(
    "SocialRequestItems",
    "/request_items/pp/:playerId/:salt/:hash",
    {
        params: { playerId: NimblebitConfig.PlayerIdSchema, salt: I32, hash: Schema.String },
        error: ApiErrors,
        success: [
            ErrorResponse,
            NotFoundResponse,
            Schema.Struct({ success: Schema.Literal("Found"), gifts: Schema.Array(Gift) }),
        ],
    }
).annotate(OAuthScope.Required, {
    anyOf: [Scopes.SocialRequestItems, Scopes.SocialRead, Scopes.Read, Scopes.PocketPlanes],
});

/**
 * Sends an item to a friend. LITERAL; the path, params and payload are
 * DERIVED. DTO `NBSyncItemsSendResponse`: success, error. The game's
 * `NBSyncItemType` is None=0, Play=1, Gift=2, Visit=3, Promo=4, Cloud=5,
 * Raffle=6; whether `itemType` carries the name or the number is unknown. The
 * game posts form fields; this payload is sent as JSON, and whether the server
 * accepts JSON here is unverified.
 *
 * @internal
 */
export const SocialSendItemEndpoint = HttpApiEndpoint.post(
    "SocialSendItem",
    "/send_item/pp/:itemType/:playerId/:friendId/:salt/:hash",
    {
        params: {
            itemType: Schema.String,
            playerId: NimblebitConfig.PlayerIdSchema,
            friendId: NimblebitConfig.PlayerIdSchema,
            salt: I32,
            hash: Schema.String,
        },
        payload: Schema.Struct({ itemStr: Schema.String }),
        error: ApiErrors,
        success: [ErrorResponse, SentResponse, NotSentResponse],
    }
).annotate(OAuthScope.Required, {
    anyOf: [Scopes.SocialSendItem, Scopes.SocialWrite, Scopes.Write, Scopes.PocketPlanes],
});

/**
 * LITERAL; the path and preimage `pp/<playerId>/<giftId>/<salt><playerAuthKey>`
 * are DERIVED. DTO `NBSyncItemsReceiveResponse` also carries an `id` (String).
 * The DTO gift ids (`NBSyncItemsGift.gift_id`, `NBSyncItem.itemID`) are
 * strings; whether pp ids are always numeric is unknown.
 *
 * @internal
 */
export const SocialReceiveItemEndpoint = HttpApiEndpoint.get(
    "SocialReceiveItem",
    "/receive_item/pp/:playerId/:giftId/:salt/:hash",
    {
        params: { playerId: NimblebitConfig.PlayerIdSchema, giftId: Schema.Int, salt: I32, hash: Schema.String },
        error: ApiErrors,
        success: [
            ErrorResponse,
            Schema.Struct({ success: Schema.Literal("Received"), id: Schema.optionalKey(Schema.String) }),
            NotReceivedResponse,
        ],
    }
).annotate(OAuthScope.Required, {
    anyOf: [Scopes.SocialReceiveItem, Scopes.SocialWrite, Scopes.Write, Scopes.PocketPlanes],
});

/**
 * OBSERVED: path, method, form field `friends`, preimage
 * `pp/<playerId>/<salt><friendId><playerAuthKey>` and
 * `{ success: "Found", meta: {} }`. The friend was the player's own id, so the
 * friend slot in the preimage is not verified. The game takes a list of
 * friends (`List<String>`); this payload allows one id, and how the game joins
 * several is unknown. The game posts form fields; this payload is sent as
 * JSON, and whether the server accepts JSON here is unverified. DTO
 * `NBSyncFriendGameMetaResponse` types `meta` as
 * `Dictionary<String, Dictionary<String, Object>>`; its values stay
 * `Schema.Unknown` until a non-empty meta is seen.
 *
 * @internal
 */
export const SocialPullFriendMetaEndpoint = HttpApiEndpoint.post(
    "SocialPullFriendMeta",
    "/friend/pull_meta/pp/:playerId/:salt/:hash",
    {
        params: { playerId: NimblebitConfig.PlayerIdSchema, salt: I32, hash: Schema.String },
        payload: Schema.Struct({ friends: NimblebitConfig.PlayerIdSchema }),
        error: ApiErrors,
        success: [
            ErrorResponse,
            NotFoundResponse,
            Schema.Struct({
                success: Schema.Literal("Found"),
                meta: Schema.Record(NimblebitConfig.PlayerIdSchema, Schema.Unknown),
            }),
        ],
    }
).annotate(OAuthScope.Required, {
    anyOf: [Scopes.SocialPullFriendMeta, Scopes.SocialRead, Scopes.Read, Scopes.PocketPlanes],
});

/**
 * OBSERVED: path, method, preimage
 * `pp/<playerId>/<friendId>/<salt><playerAuthKey>` and the no-save answer
 * `{ error: "SaveNotFound" }`. The friend was the player's own id, so the order
 * of `playerId` and `friendId` is not verified. The Found envelope is DERIVED
 * and matches DTO `NBSyncFriendGameSaveResponse` (success, h, id, player_id,
 * data, error). The DTO types `id` as Int32; its wire type was not observed.
 *
 * @internal
 */
export const SocialPullFriendGameEndpoint = HttpApiEndpoint.get(
    "SocialPullFriendGame",
    "/friend/pull_game/pp/:playerId/:friendId/:salt/:hash",
    {
        params: {
            playerId: NimblebitConfig.PlayerIdSchema,
            friendId: NimblebitConfig.PlayerIdSchema,
            salt: I32,
            hash: Schema.String,
        },
        error: ApiErrors,
        success: [
            ErrorResponse,
            NotFoundResponse,
            Schema.Struct({
                success: Schema.Literal("Found"),
                data: Schema.Uint8ArrayFromBase64,
                checksum: Schema.String,
                saveId: Schema.NumberFromString,
                playerId: NimblebitConfig.PlayerIdSchema,
            }).pipe(Schema.encodeKeys({ checksum: "h", saveId: "id", playerId: "player_id" })),
        ],
    }
).annotate(OAuthScope.Required, {
    anyOf: [Scopes.SocialPullFriendGame, Scopes.SocialRead, Scopes.Read, Scopes.PocketPlanes],
});

/** @internal */
export const DeviceManagementGroup = HttpApiGroup.make("DeviceManagementGroup")
    .add(DeviceNewPlayerEndpoint)
    .add(DevicePlayerDetailsEndpoint)
    .add(DeviceVerifyDeviceEndpoint)
    .add(DeviceRegisterEmailEndpoint);

/** @internal */
export const SyncManagementGroup = HttpApiGroup.make("SyncManagementGroup")
    .add(SyncPullSaveEndpoint)
    .add(SyncCheckForNewerSaveEndpoint);

/** @internal */
export const SocialGroup = HttpApiGroup.make("SocialGroup")
    .add(SocialGetVisitsEndpoint)
    .add(SocialGetGiftsEndpoint)
    .add(SocialRequestItemsEndpoint)
    .add(SocialSendItemEndpoint)
    .add(SocialReceiveItemEndpoint)
    .add(SocialPullFriendMetaEndpoint)
    .add(SocialPullFriendGameEndpoint);

/**
 * The Pocket Planes NBSync api.
 *
 * @since 1.0.0
 * @category Api
 */
export const Api = HttpApi.make("PocketPlanesApi").add(DeviceManagementGroup).add(SyncManagementGroup).add(SocialGroup);
