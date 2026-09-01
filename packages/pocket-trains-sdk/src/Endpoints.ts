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

import * as Schema from "effect/Schema";
import * as HttpApi from "effect/unstable/httpapi/HttpApi";
import * as HttpApiEndpoint from "effect/unstable/httpapi/HttpApiEndpoint";
import * as HttpApiError from "effect/unstable/httpapi/HttpApiError";
import * as HttpApiGroup from "effect/unstable/httpapi/HttpApiGroup";

import * as NimblebitConfig from "@tinyburg/nimblebit-sdk/NimblebitConfig";
import * as ResourceServer from "effect-oidc/ResourceServer";

import * as Scopes from "./Scopes.ts";

/** @internal */
export const U32 = Schema.Int.check(Schema.isUint32());

/** @internal */
export const ApiErrors = [
    HttpApiError.Forbidden,
    HttpApiError.BadRequest,
    HttpApiError.Unauthorized,
    HttpApiError.InternalServerError,
] as const;

/** @internal */
export const ErrorResponse = Schema.Struct({ error: Schema.String });

/** @internal */
export const NotFoundResponse = Schema.Struct({ success: Schema.Literal("NotFound") });

/** @internal */
export const SentResponse = Schema.Struct({ success: Schema.Literal("Sent") });

/** @internal */
export const NotSentResponse = Schema.Struct({ success: Schema.Literal("NotSent") });

/**
 * A gift/item in the general item channel (get_items / send_item). Verified DTO
 * NBSyncItemsGift on pt: `{gift_id, gift_to, gift_from, gift_type, item_type,
 * gift_str, h}` (no `c`, unlike pp). Left open for the data-schema work.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const Gift = Schema.Unknown;

/**
 * A Pocket Trains gift (get_gifts_pt channel). Verified DTO NBSyncGetPTGift:
 * `{gift_id, gift_to, gift_from, alt_id, gift_type, gift_str: int, gift_quantity:
 * int, h}`. Left open for the data-schema work.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const PTGift = Schema.Unknown;

/** @internal */
export const DeviceNewPlayerEndpoint = HttpApiEndpoint.get("DeviceNewPlayer", "/register/pt/:salt1/:salt2/:hash", {
    params: { salt1: U32, salt2: U32, hash: Schema.String },
    error: ApiErrors,
    success: [
        ErrorResponse,
        Schema.Struct({
            playerId: NimblebitConfig.PlayerIdSchema,
            playerSs: NimblebitConfig.PlayerAuthKeySchema,
        }).pipe(Schema.encodeKeys({ playerId: "player_id", playerSs: "player_ss" })),
    ],
});

/** @internal */
export const DevicePlayerDetailsEndpoint = HttpApiEndpoint.get(
    "DevicePlayerDetails",
    "/player_details/pt/:playerId/:salt/:hash",
    {
        params: { playerId: NimblebitConfig.PlayerIdSchema, salt: U32, hash: Schema.String },
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
                    checksum: Schema.String,
                }).pipe(Schema.encodeKeys({ playerId: "player_id", playerEmail: "email", checksum: "h" })),
            }),
        ],
    }
).annotate(ResourceServer.OIDCScopes, Scopes.Device.read.player_details.grants);

/** @internal */
export const DeviceVerifyDeviceEndpoint = HttpApiEndpoint.get(
    "DeviceVerifyDevice",
    "/verify_device/pt/:playerId/:verificationCode",
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
).annotate(ResourceServer.OIDCScopes, Scopes.Device.write.verify_device.grants);

/**
 * Pull the player's cloud save. VERIFIED envelope (NBSyncGameSaveResponse). No-save
 * case returns `{ error: "SaveNotFound" }`. `data` is base64 pako-deflated bytes.
 *
 * @internal
 */
export const SyncPullSaveEndpoint = HttpApiEndpoint.get("SyncPullSave", "/sync/pull/pt/:playerId/:salt/:hash", {
    params: { playerId: NimblebitConfig.PlayerIdSchema, salt: U32, hash: Schema.String },
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
 * VERIFIED envelope (NBSyncCurrentCheckResponse); no-save returns `{ error: "NoSave" }`.
 *
 * @internal
 */
export const SyncCheckForNewerSaveEndpoint = HttpApiEndpoint.get(
    "SyncCheckForNewerSave",
    "/sync/current_version/pt/:playerId/:salt/:hash",
    {
        params: { playerId: NimblebitConfig.PlayerIdSchema, salt: U32, hash: Schema.String },
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
 * VERIFIED live: `/get_items/pt/:playerId/:salt/:hash` -> `{ success:"Found",
 * gifts:[...] }` (NBSyncItemsGetResponse; no `total` on pt).
 *
 * @internal
 */
export const SocialGetItemsEndpoint = HttpApiEndpoint.get("SocialGetItems", "/get_items/pt/:playerId/:salt/:hash", {
    params: { playerId: NimblebitConfig.PlayerIdSchema, salt: U32, hash: Schema.String },
    error: ApiErrors,
    success: [
        ErrorResponse,
        NotFoundResponse,
        Schema.Struct({ success: Schema.Literal("Found"), gifts: Schema.Array(Gift) }),
    ],
}).annotate(ResourceServer.OIDCScopes, Scopes.Social.read.get_items.grants);

/**
 * Pocket Trains gift channel. Response VERIFIED (NBSyncGetPTGiftResponse) but the
 * REQUEST params are UNCONFIRMED - the `/get_gifts_pt/pt/:playerId/:salt/:hash`
 * form was rejected with "Invalid Request", so pt's gift request likely needs a
 * gift-id (see NBSyncGetGiftIDResponse / `friend/pull_meta_gift_id`). Path/params
 * below are a placeholder to be confirmed by capturing the live request.
 *
 * @internal
 */
export const SocialGetGiftsPtEndpoint = HttpApiEndpoint.get(
    "SocialGetGiftsPt",
    "/get_gifts_pt/pt/:playerId/:salt/:hash",
    {
        params: { playerId: NimblebitConfig.PlayerIdSchema, salt: U32, hash: Schema.String },
        error: ApiErrors,
        success: [
            ErrorResponse,
            NotFoundResponse,
            Schema.Struct({ success: Schema.Literal("Found"), gifts: Schema.Array(PTGift) }),
        ],
    }
).annotate(ResourceServer.OIDCScopes, Scopes.Social.read.get_gifts_pt.grants);

/**
 * DERIVED from Tiny Tower. Sends an item to a friend. Response VERIFIED
 * (NBSyncItemsSendResponse: success/error). pt also has a `/send_pt/` variant.
 *
 * @internal
 */
export const SocialSendItemEndpoint = HttpApiEndpoint.post(
    "SocialSendItem",
    "/send_item/pt/:itemType/:playerId/:friendId/:salt/:hash",
    {
        params: {
            itemType: Schema.String,
            playerId: NimblebitConfig.PlayerIdSchema,
            friendId: NimblebitConfig.PlayerIdSchema,
            salt: U32,
            hash: Schema.String,
        },
        payload: Schema.Struct({ itemStr: Schema.String }),
        error: ApiErrors,
        success: [ErrorResponse, SentResponse, NotSentResponse],
    }
).annotate(ResourceServer.OIDCScopes, Scopes.Social.write.send_item.grants);

/**
 * VERIFIED envelope (NBSyncFriendGameSaveResponse); preimage
 * `pt/<playerId>/<friendId>/<salt><playerAuthKey>`.
 *
 * @internal
 */
export const SocialPullFriendGameEndpoint = HttpApiEndpoint.get(
    "SocialPullFriendGame",
    "/friend/pull_game/pt/:playerId/:friendId/:salt/:hash",
    {
        params: {
            playerId: NimblebitConfig.PlayerIdSchema,
            friendId: NimblebitConfig.PlayerIdSchema,
            salt: U32,
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
).annotate(ResourceServer.OIDCScopes, Scopes.Social.read.pull_friend_game.grants);

/**
 * VERIFIED envelope (NBSyncFriendGameMetaResponse; `meta` is a flat
 * Dictionary<String,Object> on pt). Preimage `pt/<playerId>/<salt><friendId><playerAuthKey>`.
 *
 * @internal
 */
export const SocialPullFriendMetaEndpoint = HttpApiEndpoint.post(
    "SocialPullFriendMeta",
    "/friend/pull_meta/pt/:playerId/:salt/:hash",
    {
        params: { playerId: NimblebitConfig.PlayerIdSchema, salt: U32, hash: Schema.String },
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
).annotate(ResourceServer.OIDCScopes, Scopes.Social.read.pull_friend_meta.grants);

/** @internal */
export const DeviceManagementGroup = HttpApiGroup.make("DeviceManagementGroup")
    .add(DeviceNewPlayerEndpoint)
    .add(DevicePlayerDetailsEndpoint)
    .add(DeviceVerifyDeviceEndpoint);

/** @internal */
export const SyncManagementGroup = HttpApiGroup.make("SyncManagementGroup")
    .add(SyncPullSaveEndpoint)
    .add(SyncCheckForNewerSaveEndpoint);

/** @internal */
export const SocialGroup = HttpApiGroup.make("SocialGroup")
    .add(SocialGetItemsEndpoint)
    .add(SocialGetGiftsPtEndpoint)
    .add(SocialSendItemEndpoint)
    .add(SocialPullFriendGameEndpoint)
    .add(SocialPullFriendMetaEndpoint);

/**
 * The Pocket Trains NBSync api.
 *
 * @since 1.0.0
 * @category Api
 */
export const Api = HttpApi.make("PocketTrainsApi").add(DeviceManagementGroup).add(SyncManagementGroup).add(SocialGroup);
