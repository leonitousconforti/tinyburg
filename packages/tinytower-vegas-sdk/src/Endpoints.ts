/**
 * Tiny Tower Vegas (game code `vegas`) NBSync api endpoints.
 *
 * Signing: `hash` is `md5(<preimage> + <game secret salt>)`, where the secret
 * salt is `NBSync._ss` and the usual preimage is
 * `vegas/<playerId>/<salt><playerAuthKey>` (variants noted per endpoint). Every
 * NBSync request the game made, `register` included, used this md5 scheme.
 * Salts are signed int32, as the game sends (OBSERVED: -2037394745).
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
 * A gift/item in the item channel (get_items, get_visits). Every observed
 * `gifts` array was empty, so this stays `Schema.Unknown`. DTO NBSyncItemsGift:
 * `gift_id` String, `gift_to` String, `gift_from` String, `gift_type` String,
 * `item_type` NBSyncItemType (Int32 enum: None=0, Play=1, Gift=2, Visit=3,
 * Promo=4, Cloud=5, Raffle=6, Referral=7, Leaderboards=8), `gift_str` String,
 * `h` String, `c` Int32. Those are C# types after parsing; the JSON wire types
 * are unobserved.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const Gift = Schema.Unknown;

/**
 * OBSERVED and REPLAYED. Preimage `vegas/<salt1>/<salt2>`.
 *
 * @internal
 */
export const DeviceNewPlayerEndpoint = HttpApiEndpoint.get("DeviceNewPlayer", "/register/vegas/:salt1/:salt2/:hash", {
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
 * OBSERVED and REPLAYED. No DTO: the game parses the reply as a
 * Dictionary<String,Object>.
 *
 * @internal
 */
export const DevicePlayerDetailsEndpoint = HttpApiEndpoint.get(
    "DevicePlayerDetails",
    "/player_details/vegas/:playerId/:salt/:hash",
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
    anyOf: [Scopes.DevicePlayerDetails, Scopes.DeviceRead, Scopes.Read, Scopes.TinyTowerVegas],
});

/**
 * LITERAL. Envelope DERIVED from Tiny Tower. The game's callback gets
 * `(success, playerID, playerSalt, playerEmail)`, which fits but does not prove
 * the key names.
 *
 * @internal
 */
export const DeviceVerifyDeviceEndpoint = HttpApiEndpoint.get(
    "DeviceVerifyDevice",
    "/verify_device/vegas/:playerId/:verificationCode",
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
    anyOf: [Scopes.DeviceVerifyDevice, Scopes.DeviceWrite, Scopes.Write, Scopes.TinyTowerVegas],
});

/**
 * Pull the player's cloud save. LITERAL (the game sent no request when driven).
 * Replayed for a player with no save, the server answered `{ error:
 * "SaveNotFound" }`, so it accepts the SDK's path and preimage. The `Found`
 * envelope is DERIVED from Tiny Tower. `data` is base64 pako-deflated bytes.
 *
 * @internal
 */
export const SyncPullSaveEndpoint = HttpApiEndpoint.get("SyncPullSave", "/sync/pull/vegas/:playerId/:salt/:hash", {
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
 * LITERAL. Envelope DERIVED from Tiny Tower.
 *
 * @internal
 */
export const SyncCheckForNewerSaveEndpoint = HttpApiEndpoint.get(
    "SyncCheckForNewerSave",
    "/sync/current_version/vegas/:playerId/:salt/:hash",
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
 * OBSERVED and REPLAYED: `{ success: "Found", event_rewards: [], gifts: [] }`.
 * `event_rewards` holds the game's NBGlobalEventRewardItem, whose fields were
 * not dumped. The DTO NBSyncItemsGetResponse also has `total` Int32, but this
 * reply had none.
 *
 * @internal
 */
export const SocialGetItemsEndpoint = HttpApiEndpoint.get("SocialGetItems", "/get_items/vegas/:playerId/:salt/:hash", {
    params: { playerId: NimblebitConfig.PlayerIdSchema, salt: I32, hash: Schema.String },
    error: ApiErrors,
    success: [
        ErrorResponse,
        NotFoundResponse,
        Schema.Struct({
            success: Schema.Literal("Found"),
            event_rewards: Schema.optionalKey(Schema.Array(Schema.Unknown)),
            gifts: Schema.Array(Gift),
        }),
    ],
}).annotate(OAuthScope.Required, {
    anyOf: [Scopes.SocialGetItems, Scopes.SocialRead, Scopes.Read, Scopes.TinyTowerVegas],
});

/**
 * Sends an item to a friend. LITERAL. The path, payload and `Sent`/`NotSent`
 * replies are DERIVED from Tiny Tower. DTO NBSyncItemsSendResponse `{success,
 * error}`. The game's NBSyncItem.itemType is the NBSyncItemType Int32 enum; how
 * it is written in the path is unobserved. The payload is sent as JSON; the
 * game's send_item body was not observed (it posts pull_meta as form fields),
 * and whether the server accepts JSON is unverified.
 *
 * @internal
 */
export const SocialSendItemEndpoint = HttpApiEndpoint.post(
    "SocialSendItem",
    "/send_item/vegas/:itemType/:playerId/:friendId/:salt/:hash",
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
    anyOf: [Scopes.SocialSendItem, Scopes.SocialWrite, Scopes.Write, Scopes.TinyTowerVegas],
});

/**
 * OBSERVED: preimage `vegas/<playerId>/<friendId>/<salt><playerAuthKey>`, reply
 * `{ error: "SaveNotFound" }`. The capture used the player's own id as
 * `friendId`, so the order of the two ids is DERIVED from Tiny Tower, as is the
 * `Found` envelope. The game's callback also takes a `censor` Boolean whose
 * source is unobserved.
 *
 * @internal
 */
export const SocialPullFriendGameEndpoint = HttpApiEndpoint.get(
    "SocialPullFriendGame",
    "/friend/pull_game/vegas/:playerId/:friendId/:salt/:hash",
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
    anyOf: [Scopes.SocialPullFriendGame, Scopes.SocialRead, Scopes.Read, Scopes.TinyTowerVegas],
});

/**
 * OBSERVED: preimage `vegas/<playerId>/<salt><friendId><playerAuthKey>`, reply
 * `{ success: "Found", meta: {} }`, captured with the player's own id as the
 * friend. No DTO: the game parses `meta` as a Dictionary<String,Object>. The
 * game takes a List<String> of friends and posted the form field `friends`
 * with a single id; how several ids are joined is unobserved, so the payload
 * holds one id. The payload is sent as JSON; whether the server accepts JSON
 * is unverified.
 *
 * @internal
 */
export const SocialPullFriendMetaEndpoint = HttpApiEndpoint.post(
    "SocialPullFriendMeta",
    "/friend/pull_meta/vegas/:playerId/:salt/:hash",
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
    anyOf: [Scopes.SocialPullFriendMeta, Scopes.SocialRead, Scopes.Read, Scopes.TinyTowerVegas],
});

/**
 * OBSERVED: `{ success: "Found", gifts: [], total: 0 }`. The game passes `total`
 * on as an Int32. Unlike get_items, there is no `event_rewards`.
 *
 * @internal
 */
export const SocialGetVisitsEndpoint = HttpApiEndpoint.get(
    "SocialGetVisits",
    "/get_visits/vegas/:playerId/:salt/:hash",
    {
        params: { playerId: NimblebitConfig.PlayerIdSchema, salt: I32, hash: Schema.String },
        error: ApiErrors,
        success: [
            ErrorResponse,
            NotFoundResponse,
            Schema.Struct({ success: Schema.Literal("Found"), gifts: Schema.Array(Gift), total: Schema.Int }),
        ],
    }
).annotate(OAuthScope.Required, {
    anyOf: [Scopes.SocialGetVisits, Scopes.SocialRead, Scopes.Read, Scopes.TinyTowerVegas],
});

/**
 * LITERAL. Preimage `vegas/<playerId>/<giftId>/<salt><playerAuthKey>` and the
 * `Received`/`NotReceived` replies DERIVED from Tiny Tower. DTO
 * NBSyncItemsReceiveResponse `{success, error, id}`, all Strings. The game's
 * gift ids (NBSyncItemsGift.gift_id, NBSyncItem.itemID) are Strings; `giftId`
 * stays an Int until a gift is captured.
 *
 * @internal
 */
export const SocialReceiveItemEndpoint = HttpApiEndpoint.get(
    "SocialReceiveItem",
    "/receive_item/vegas/:playerId/:giftId/:salt/:hash",
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
    anyOf: [Scopes.SocialReceiveItem, Scopes.SocialWrite, Scopes.Write, Scopes.TinyTowerVegas],
});

/**
 * Snapshot list. LITERAL. The game's only snapshot method
 * (NBSync.getSnapshotList) called `/sync/current_player_snapshots/` instead
 * (`SocialRetrieveFriendsSnapshotList`). The `Found` envelope is unverified and
 * does not match Tiny Tower's (string ids, `timestamp`).
 *
 * @internal
 */
export const SyncRetrieveSnapshotListEndpoint = HttpApiEndpoint.get(
    "SyncRetrieveSnapshotList",
    "/sync/current_snapshots/vegas/:playerId/:salt/:hash",
    {
        params: { playerId: NimblebitConfig.PlayerIdSchema, salt: I32, hash: Schema.String },
        error: ApiErrors,
        success: [
            ErrorResponse,
            NotFoundResponse,
            Schema.Struct({
                success: Schema.Literal("Found"),
                saves: Schema.Array(
                    Schema.Struct({
                        id: Schema.Int,
                        created: Schema.Int,
                        meta: Schema.Record(Schema.String, Schema.Unknown),
                    })
                ),
            }),
        ],
    }
);

/**
 * OBSERVED from NBSync.getSnapshotList(onComplete, player_id): preimage
 * `vegas/<playerId>/<friendId>/<salt><playerAuthKey>`, captured with the
 * player's own id as `friendId`; the server answered `{ error: "Invalid
 * Request" }`. The order of the two ids and the `Found` envelope are DERIVED
 * from Tiny Tower. The game parses the list as a List<Object>, so its elements
 * stay `Schema.Unknown`.
 *
 * @internal
 */
export const SocialRetrieveFriendsSnapshotListEndpoint = HttpApiEndpoint.get(
    "SocialRetrieveFriendsSnapshotList",
    "/sync/current_player_snapshots/vegas/:playerId/:friendId/:salt/:hash",
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
            Schema.Struct({ success: Schema.Literal("Found"), saves: Schema.Array(Schema.Unknown) }),
        ],
    }
).annotate(OAuthScope.Required, {
    anyOf: [Scopes.SocialListFriendSnapshots, Scopes.SocialRead, Scopes.Read, Scopes.TinyTowerVegas],
});

/** @internal */
export const DeviceManagementGroup = HttpApiGroup.make("DeviceManagementGroup")
    .add(DeviceNewPlayerEndpoint)
    .add(DevicePlayerDetailsEndpoint)
    .add(DeviceVerifyDeviceEndpoint);

/** @internal */
export const SyncManagementGroup = HttpApiGroup.make("SyncManagementGroup")
    .add(SyncPullSaveEndpoint)
    .add(SyncCheckForNewerSaveEndpoint)
    .add(SyncRetrieveSnapshotListEndpoint);

/** @internal */
export const SocialGroup = HttpApiGroup.make("SocialGroup")
    .add(SocialGetItemsEndpoint)
    .add(SocialGetVisitsEndpoint)
    .add(SocialReceiveItemEndpoint)
    .add(SocialSendItemEndpoint)
    .add(SocialPullFriendGameEndpoint)
    .add(SocialPullFriendMetaEndpoint)
    .add(SocialRetrieveFriendsSnapshotListEndpoint);

/**
 * The Tiny Tower Vegas NBSync api.
 *
 * @since 1.0.0
 * @category Api
 */
export const Api = HttpApi.make("TinyTowerVegasApi")
    .add(DeviceManagementGroup)
    .add(SyncManagementGroup)
    .add(SocialGroup);
