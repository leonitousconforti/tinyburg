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

/** @internal */
export const ErrorResponse = Schema.Struct({ error: Schema.String });

/** @internal */
export const NotFoundResponse = Schema.Struct({ success: Schema.Literal("NotFound") });

/** @internal */
export const SentResponse = Schema.Struct({ success: Schema.Literal("Sent") });

/** @internal */
export const NotSentResponse = Schema.Struct({ success: Schema.Literal("NotSent") });

/**
 * A gift/item in the get_items / get_visits channel. Left open because every
 * observed `gifts` array was empty. DTO NBSyncItemsGift: `{gift_id: String,
 * gift_to: String, gift_from: String, gift_type: String, item_type:
 * NBSyncItemType, gift_str: String, h: String}`, with no `c`. NBSyncItemType is
 * an Int32 enum: None=0, Play=1, Gift=2, Visit=3, Promo=4.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const Gift = Schema.Unknown;

/**
 * OBSERVED and REPLAYED, preimage `dz/<salt1>/<salt2>`. DTO
 * NBSyncRegisterResponse also has `registered: Int32`, which the observed
 * response did not carry and which is not modelled.
 *
 * @internal
 */
export const DeviceNewPlayerEndpoint = HttpApiEndpoint.get("DeviceNewPlayer", "/register/dz/:salt1/:salt2/:hash", {
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
 * OBSERVED and REPLAYED. The numeric fields arrive as strings (`"0"`). DTO
 * NBSyncPlayerDetailsResponse: `{success, player: Dictionary<String,Object>,
 * error}`.
 *
 * @internal
 */
export const DevicePlayerDetailsEndpoint = HttpApiEndpoint.get(
    "DevicePlayerDetails",
    "/player_details/dz/:playerId/:salt/:hash",
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
                    checksum: Schema.String,
                }).pipe(Schema.encodeKeys({ playerId: "player_id", playerEmail: "email", checksum: "h" })),
            }),
        ],
    }
).annotate(OAuthScope.Required, {
    anyOf: [Scopes.DevicePlayerDetails, Scopes.DeviceRead, Scopes.Read, Scopes.DiscoZoo],
});

/**
 * LITERAL. Field names match DTO NBSyncVerifyCodeResponse `{success, player_id,
 * player_ss, player_email, error}`. The `NewDevice` literal, the path after the
 * segment and the lack of signing are DERIVED.
 *
 * @internal
 */
export const DeviceVerifyDeviceEndpoint = HttpApiEndpoint.get(
    "DeviceVerifyDevice",
    "/verify_device/dz/:playerId/:verificationCode",
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
    anyOf: [Scopes.DeviceVerifyDevice, Scopes.DeviceWrite, Scopes.Write, Scopes.DiscoZoo],
});

/**
 * Pull the player's cloud save. REPLAYED: the server accepted the SDK's path
 * and signature and answered `{ error: "SaveNotFound" }` for a fresh player.
 * The Found body is not captured yet; its field names come from DTO
 * NBSyncGameSaveResponse `{success, h, id: Int32, data, error}`. `saveId` is
 * decoded from a string, which is unobserved here (player_details sends its
 * ints as strings). `data` is base64 pako-deflated bytes (DERIVED).
 *
 * @internal
 */
export const SyncPullSaveEndpoint = HttpApiEndpoint.get("SyncPullSave", "/sync/pull/dz/:playerId/:salt/:hash", {
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
 * LITERAL. Field names from DTO NBSyncCurrentCheckResponse `{success, h, id:
 * Int32, error}`. The no-save reply was not observed.
 *
 * @internal
 */
export const SyncCheckForNewerSaveEndpoint = HttpApiEndpoint.get(
    "SyncCheckForNewerSave",
    "/sync/current_version/dz/:playerId/:salt/:hash",
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
 * OBSERVED and REPLAYED: `{ success: "Found", gifts: [] }`. DTO
 * NBSyncItemsGetResponse `{success, gifts: List<NBSyncItemsGift>, error}` has
 * no `total`.
 *
 * @internal
 */
export const SocialGetItemsEndpoint = HttpApiEndpoint.get("SocialGetItems", "/get_items/dz/:playerId/:salt/:hash", {
    params: { playerId: NimblebitConfig.PlayerIdSchema, salt: I32, hash: Schema.String },
    error: ApiErrors,
    success: [
        ErrorResponse,
        NotFoundResponse,
        Schema.Struct({ success: Schema.Literal("Found"), gifts: Schema.Array(Gift) }),
    ],
}).annotate(OAuthScope.Required, { anyOf: [Scopes.SocialGetItems, Scopes.SocialRead, Scopes.Read, Scopes.DiscoZoo] });

/**
 * Sends an item to a friend. LITERAL; the path shape, preimage and the
 * Sent/NotSent literals are DERIVED. Response fields match DTO
 * NBSyncItemsSendResponse `{success, error}`. The game holds the item type as
 * NBSyncItemType (None=0, Play=1, Gift=2, Visit=3, Promo=4); whether the path
 * carries its name or its int is unobserved. The game posts form fields, but
 * this payload goes out as JSON, and whether the server accepts JSON is
 * unverified. The form field name is unobserved.
 *
 * @internal
 */
export const SocialSendItemEndpoint = HttpApiEndpoint.post(
    "SocialSendItem",
    "/send_item/dz/:itemType/:playerId/:friendId/:salt/:hash",
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
).annotate(OAuthScope.Required, { anyOf: [Scopes.SocialSendItem, Scopes.SocialWrite, Scopes.Write, Scopes.DiscoZoo] });

/**
 * OBSERVED, preimage `dz/<playerId>/<friendId>/<salt><playerAuthKey>`. The game
 * was driven with its own id as `friendId`, so the order of the two ids is not
 * disambiguated. Only `{ error: "SaveNotFound" }` was observed; the Found field
 * names come from DTO NBSyncFriendGameSaveResponse `{success, h, id: Int32,
 * player_id, data, error}`.
 *
 * @internal
 */
export const SocialPullFriendGameEndpoint = HttpApiEndpoint.get(
    "SocialPullFriendGame",
    "/friend/pull_game/dz/:playerId/:friendId/:salt/:hash",
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
    anyOf: [Scopes.SocialPullFriendGame, Scopes.SocialRead, Scopes.Read, Scopes.DiscoZoo],
});

/**
 * OBSERVED, preimage `dz/<playerId>/<salt><friends><playerAuthKey>`, response
 * `{ success: "Found", meta: {} }`. The game was driven with its own id as the
 * friend, so the two ids are not disambiguated. DTO NBSyncFriendGameMetaResponse
 * `{success, meta: Dictionary<String,Object>, error}`. The game builds its own
 * meta as a string map (SyncMeta.metaDSO), but no non-empty meta was captured.
 *
 * The game posts `friends` as a form field, but this payload goes out as JSON,
 * and whether the server accepts JSON is unverified. The game also sends a
 * list of friends (List<String>, join format unobserved), while this payload
 * carries one player id.
 *
 * @internal
 */
export const SocialPullFriendMetaEndpoint = HttpApiEndpoint.post(
    "SocialPullFriendMeta",
    "/friend/pull_meta/dz/:playerId/:salt/:hash",
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
    anyOf: [Scopes.SocialPullFriendMeta, Scopes.SocialRead, Scopes.Read, Scopes.DiscoZoo],
});

/**
 * LITERAL. The full path, the preimage and the envelope (assumed equal to
 * get_items) are DERIVED. Driving NBSyncItems.getSyncVisits issued no request.
 *
 * @internal
 */
export const SocialGetVisitsEndpoint = HttpApiEndpoint.get("SocialGetVisits", "/get_visits/dz/:playerId/:salt/:hash", {
    params: { playerId: NimblebitConfig.PlayerIdSchema, salt: I32, hash: Schema.String },
    error: ApiErrors,
    success: [
        ErrorResponse,
        NotFoundResponse,
        Schema.Struct({ success: Schema.Literal("Found"), gifts: Schema.Array(Gift) }),
    ],
}).annotate(OAuthScope.Required, { anyOf: [Scopes.SocialGetVisits, Scopes.SocialRead, Scopes.Read, Scopes.DiscoZoo] });

/**
 * LITERAL. Response fields match DTO NBSyncItemsReceiveResponse `{success,
 * error, id: String}`. The preimage `dz/<playerId>/<giftId>/<salt><playerAuthKey>`
 * and the Received/NotReceived literals are DERIVED. The game holds gift ids as
 * strings (NBSyncItemsGift.gift_id), while `giftId` here is an Int.
 *
 * @internal
 */
export const SocialReceiveItemEndpoint = HttpApiEndpoint.get(
    "SocialReceiveItem",
    "/receive_item/dz/:playerId/:giftId/:salt/:hash",
    {
        params: { playerId: NimblebitConfig.PlayerIdSchema, giftId: Schema.Int, salt: I32, hash: Schema.String },
        error: ApiErrors,
        success: [
            ErrorResponse,
            Schema.Struct({ success: Schema.Literal("Received"), id: Schema.optionalKey(Schema.String) }),
            Schema.Struct({ success: Schema.Literal("NotReceived") }),
        ],
    }
).annotate(OAuthScope.Required, {
    anyOf: [Scopes.SocialReceiveItem, Scopes.SocialWrite, Scopes.Write, Scopes.DiscoZoo],
});

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
    .add(SocialGetVisitsEndpoint)
    .add(SocialReceiveItemEndpoint)
    .add(SocialSendItemEndpoint)
    .add(SocialPullFriendGameEndpoint)
    .add(SocialPullFriendMetaEndpoint);

/**
 * The Disco Zoo NBSync api.
 *
 * @since 1.0.0
 * @category Api
 */
export const Api = HttpApi.make("DiscoZooApi").add(DeviceManagementGroup).add(SyncManagementGroup).add(SocialGroup);
