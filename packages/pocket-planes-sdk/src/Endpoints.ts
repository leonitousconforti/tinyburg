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

/**
 * NBSync returns errors as `{ error: <string> }`. Observed values include
 * `"Invalid Request"`, `"NoSave"`, and `"SaveNotFound"`.
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
 * One gift/visit item. Shape is game-specific; left open for the data-schema
 * work. Verified only that `get_visits`/`get_gifts` return `{ gifts: [...] }`.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const Gift = Schema.Unknown;

/**
 * Player summary. VERIFIED shape:
 * `{"success":"Found","player":{"player_id","registered","email","blacklisted","saveVersion","h"}}`.
 *
 * @internal
 */
export const DeviceNewPlayerEndpoint = HttpApiEndpoint.get("DeviceNewPlayer", "/register/pp/:salt1/:salt2/:hash", {
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
    "/player_details/pp/:playerId/:salt/:hash",
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

/**
 * DERIVED from Tiny Tower; not yet confirmed for pp.
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
).annotate(ResourceServer.OIDCScopes, Scopes.Device.write.verify_device.grants);

/**
 * DERIVED from Tiny Tower; not yet confirmed for pp.
 *
 * @internal
 */
export const DeviceRegisterEmailEndpoint = HttpApiEndpoint.post(
    "DeviceRegisterEmail",
    "/register_email/pp/:playerId/:salt/:hash",
    {
        params: { playerId: NimblebitConfig.PlayerIdSchema, salt: U32, hash: Schema.String },
        payload: Schema.Struct({ promote: Schema.Literal(1), email: Schema.Redacted(Schema.String) }),
        error: ApiErrors,
        success: [
            ErrorResponse,
            Schema.Struct({ success: Schema.Literal("NewEmail") }),
            Schema.Struct({ success: Schema.Literal("NewDevice") }),
        ],
    }
).annotate(ResourceServer.OIDCScopes, Scopes.Device.write.register_email.grants);

/**
 * Pull the player's cloud save. `data` is base64 pako-deflated bytes (parse into
 * the game save schema separately). VERIFIED the no-save case returns
 * `{ error: "SaveNotFound" }`; the Found envelope is DERIVED from Tiny Tower.
 *
 * @internal
 */
export const SyncPullSaveEndpoint = HttpApiEndpoint.get("SyncPullSave", "/sync/pull/pp/:playerId/:salt/:hash", {
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
 * VERIFIED the no-save case returns `{ error: "NoSave" }`; Found envelope
 * DERIVED from Tiny Tower.
 *
 * @internal
 */
export const SyncCheckForNewerSaveEndpoint = HttpApiEndpoint.get(
    "SyncCheckForNewerSave",
    "/sync/current_version/pp/:playerId/:salt/:hash",
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
 * VERIFIED: `/get_visits/pp/:playerId/:salt/:hash` -> `{ success:"Found", gifts:[...], total }`.
 *
 * @internal
 */
export const SocialGetVisitsEndpoint = HttpApiEndpoint.get("SocialGetVisits", "/get_visits/pp/:playerId/:salt/:hash", {
    params: { playerId: NimblebitConfig.PlayerIdSchema, salt: U32, hash: Schema.String },
    error: ApiErrors,
    success: [
        ErrorResponse,
        NotFoundResponse,
        Schema.Struct({ success: Schema.Literal("Found"), gifts: Schema.Array(Gift), total: Schema.Int }),
    ],
}).annotate(ResourceServer.OIDCScopes, Scopes.Social.read.get_visits.grants);

/**
 * VERIFIED: `/get_gifts/pp/:playerId/:salt/:hash` -> `{ success:"Found", gifts:[...], total }`.
 *
 * @internal
 */
export const SocialGetGiftsEndpoint = HttpApiEndpoint.get("SocialGetGifts", "/get_gifts/pp/:playerId/:salt/:hash", {
    params: { playerId: NimblebitConfig.PlayerIdSchema, salt: U32, hash: Schema.String },
    error: ApiErrors,
    success: [
        ErrorResponse,
        NotFoundResponse,
        Schema.Struct({ success: Schema.Literal("Found"), gifts: Schema.Array(Gift), total: Schema.Int }),
    ],
}).annotate(ResourceServer.OIDCScopes, Scopes.Social.read.get_gifts.grants);

/**
 * VERIFIED: `/request_items/pp/:playerId/:salt/:hash` -> `{ success:"Found", gifts:[...] }`
 * (note: no `total`, unlike get_visits/get_gifts). Pocket Planes specific.
 *
 * @internal
 */
export const SocialRequestItemsEndpoint = HttpApiEndpoint.get(
    "SocialRequestItems",
    "/request_items/pp/:playerId/:salt/:hash",
    {
        params: { playerId: NimblebitConfig.PlayerIdSchema, salt: U32, hash: Schema.String },
        error: ApiErrors,
        success: [
            ErrorResponse,
            NotFoundResponse,
            Schema.Struct({ success: Schema.Literal("Found"), gifts: Schema.Array(Gift) }),
        ],
    }
).annotate(ResourceServer.OIDCScopes, Scopes.Social.read.request_items.grants);

/**
 * DERIVED from Tiny Tower. Sends an item to a friend (write path, not exercised).
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
            salt: U32,
            hash: Schema.String,
        },
        payload: Schema.Struct({ itemStr: Schema.String }),
        error: ApiErrors,
        success: [ErrorResponse, SentResponse, NotSentResponse],
    }
).annotate(ResourceServer.OIDCScopes, Scopes.Social.write.send_item.grants);

/**
 * Preimage `pp/<playerId>/<giftId>/<salt><playerAuthKey>` (path derived from Tiny
 * Tower). Response DTO NBSyncItemsReceiveResponse also carries an `id`.
 *
 * @internal
 */
export const SocialReceiveItemEndpoint = HttpApiEndpoint.get(
    "SocialReceiveItem",
    "/receive_item/pp/:playerId/:giftId/:salt/:hash",
    {
        params: { playerId: NimblebitConfig.PlayerIdSchema, giftId: Schema.Int, salt: U32, hash: Schema.String },
        error: ApiErrors,
        success: [
            ErrorResponse,
            Schema.Struct({ success: Schema.Literal("Received"), id: Schema.optionalKey(Schema.String) }),
            NotReceivedResponse,
        ],
    }
).annotate(ResourceServer.OIDCScopes, Scopes.Social.write.receive_item.grants);

/**
 * DERIVED from Tiny Tower; preimage `pp/<playerId>/<salt><friendId><playerAuthKey>`.
 * `meta` element shape is game-specific (placeholder).
 *
 * @internal
 */
export const SocialPullFriendMetaEndpoint = HttpApiEndpoint.post(
    "SocialPullFriendMeta",
    "/friend/pull_meta/pp/:playerId/:salt/:hash",
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

/**
 * DERIVED from Tiny Tower; preimage `pp/<playerId>/<friendId>/<salt><playerAuthKey>`.
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
