/**
 * LEGO Tower (game code `lt`) NBSync api endpoints.
 *
 * Signing: a random `salt` goes in the path, and `hash` is
 * `md5(<preimage> + <game secret salt>)` with the preimage
 * `lt/<playerId>/<salt><playerAuthKey>` (variants noted per endpoint). The
 * secret salt is the value of `NBSync._ss`. Every NBSync request the game
 * made, `register` included, was signed this way. Salts are signed int32, as
 * the game sends (it sent a negative one).
 *
 * Each endpoint says how it is known (Play build 1.27.2, 2026-11-09):
 * - OBSERVED: the game made this request.
 * - REPLAYED: the sdk's client function succeeded against the live server.
 * - DTO: the game's response class has these fields.
 * - LITERAL: the path is compiled into the game but was not exercised.
 * - DERIVED: inferred from Tiny Tower.
 *
 * DTO int fields can arrive as numeric strings (the mailbox `total` did), so
 * int schemas on replies that were never observed may be too strict. LEGO
 * Tower issues player ids longer than 5 chars (relaxed `PlayerId` schema).
 *
 * Not modelled yet (LITERAL only): `receive_item`, `send_trade`,
 * `accept_trade`, `reject_trade`, `remove_trade`, `get_ag`, `send_ag`,
 * `sync/push_snapshot`, `friend/editorpull_game`, `register_email`,
 * `register_email_lang`, `code/verify` and `af/lt`. The Facebook, Play Games
 * and LEGO Life flows (`register_fb`, `swap_fb`, `register_pg`, `check_pg`,
 * `swap_pg`, `register_ll`, `check_ll`, `swap_ll`, `friends_ll`) are left out
 * too. Saves are uploaded by the game's Java plugin (`com.nimblebit.nbsync.SyncPush`,
 * `/sync/push/`), which the il2cpp probe does not see; that is not modelled
 * yet either.
 *
 * Game-specific save/meta schemas are left as `Schema.Unknown` placeholders.
 *
 * @since 1.0.0
 * @category Endpoints
 */

import * as Config from "effect/Config";
import { HttpApi, HttpApiEndpoint, HttpApiError, HttpApiGroup } from "effect/http-api";
import * as Schema from "effect/Schema";

import * as NimblebitConfig from "@tinyburg/nimblebit-sdk/NimblebitConfig";
import * as OAuthScope from "@yielded/auth/OAuthScope";

import * as Scopes from "./Scopes.ts";

/**
 * LEGO Tower player id. Unlike tt/pp/pt, LEGO Tower issues ids longer than 5
 * chars (e.g. `1QVVY7`), so the shared `PlayerId`
 * (max length 5) is too strict here.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const PlayerId = Schema.String.pipe(
    Schema.check(Schema.isMinLength(1)),
    Schema.check(Schema.isMaxLength(10)),
    Schema.check(Schema.isPattern(/^([\dA-Z]*)$/)),
    Schema.brand("PlayerId")
);

/**
 * An authenticated LEGO Tower player. The shared
 * `NimblebitConfig.AuthenticatedPlayerSchema` limits ids to 5 chars and
 * rejects LEGO Tower ids.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const AuthenticatedPlayer = Schema.Struct({
    playerAuthKey: NimblebitConfig.PlayerAuthKeySchema,
    playerId: PlayerId,
});

/**
 * Loads an {@link AuthenticatedPlayer} from `PLAYER_AUTH_KEY` and `PLAYER_ID`.
 *
 * @since 1.0.0
 * @category Config
 */
export const AuthenticatedPlayerConfig: Config.Config<Schema.Schema.Type<typeof AuthenticatedPlayer>> = Config.all({
    playerAuthKey: NimblebitConfig.PlayerAuthKeyConfig,
    playerId: Config.schema(PlayerId, "PLAYER_ID"),
});

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
 * A gift/item in the general item channel (get_items / send_item). DTO
 * NBSyncItemsGift `{gift_id: String, gift_to: String, gift_from: String,
 * gift_type: String, item_type: NBSyncItemType (None 0, Play 1, Gift 2, Visit
 * 3, Promo 4), gift_str: String, h: String}`. Only empty gift lists were
 * observed, so the wire type of `item_type` is unknown.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const Gift = Schema.Unknown;

/**
 * OBSERVED and REPLAYED. Preimage `lt/<salt1>/<salt2>`. DTO
 * NBSyncRegisterResponse also has `registered: Int32`, which the live reply
 * did not carry.
 *
 * @internal
 */
export const DeviceNewPlayerEndpoint = HttpApiEndpoint.get("DeviceNewPlayer", "/register/lt/:salt1/:salt2/:hash", {
    params: { salt1: I32, salt2: I32, hash: Schema.String },
    error: ApiErrors,
    success: [
        ErrorResponse,
        Schema.Struct({
            playerId: PlayerId,
            playerSs: NimblebitConfig.PlayerAuthKeySchema,
        }).pipe(Schema.encodeKeys({ playerId: "player_id", playerSs: "player_ss" })),
    ],
});

/**
 * OBSERVED and REPLAYED. DTO NBSyncPlayerDetailsResponse types `player` as
 * Dictionary<String,Object>; its fields here are from the live reply, where
 * every number is a string.
 *
 * @internal
 */
export const DevicePlayerDetailsEndpoint = HttpApiEndpoint.get(
    "DevicePlayerDetails",
    "/player_details/lt/:playerId/:salt/:hash",
    {
        params: { playerId: PlayerId, salt: I32, hash: Schema.String },
        error: ApiErrors,
        success: [
            ErrorResponse,
            Schema.Struct({
                success: Schema.Literal("Found"),
                player: Schema.Struct({
                    playerId: PlayerId,
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
    anyOf: [Scopes.DevicePlayerDetails, Scopes.DeviceRead, Scopes.Read, Scopes.LEGOTower],
});

/**
 * LITERAL `/verify_device/`; path, params and the `NewDevice` literal DERIVED.
 * DTO NBSyncVerifyCodeResponse `{success, player_id, player_ss, player_email,
 * error}`.
 *
 * @internal
 */
export const DeviceVerifyDeviceEndpoint = HttpApiEndpoint.get(
    "DeviceVerifyDevice",
    "/verify_device/lt/:playerId/:verificationCode",
    {
        params: { playerId: PlayerId, verificationCode: Schema.String },
        error: ApiErrors,
        success: [
            ErrorResponse,
            Schema.Struct({
                success: Schema.Literal("NewDevice"),
                playerId: PlayerId,
                playerAuthKey: NimblebitConfig.PlayerAuthKeySchema,
                playerEmail: NimblebitConfig.PlayerEmailSchema,
            }).pipe(
                Schema.encodeKeys({ playerId: "player_id", playerAuthKey: "player_ss", playerEmail: "player_email" })
            ),
        ],
    }
).annotate(OAuthScope.Required, {
    anyOf: [Scopes.DeviceVerifyDevice, Scopes.DeviceWrite, Scopes.Write, Scopes.LEGOTower],
});

/**
 * Pull the player's cloud save. REPLAYED: the server accepted this path and
 * preimage and answered `{ error: "SaveNotFound" }` for a player with no save;
 * the game made no request. DTO NBSyncGameSaveResponse `{success, h, id: Int32,
 * data, error}`. The Found reply was not observed; `data` as base64
 * pako-deflated bytes and `id` as a numeric string are DERIVED.
 *
 * @internal
 */
export const SyncPullSaveEndpoint = HttpApiEndpoint.get("SyncPullSave", "/sync/pull/lt/:playerId/:salt/:hash", {
    params: { playerId: PlayerId, salt: I32, hash: Schema.String },
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
 * LITERAL `/sync/current_version/`; path and params DERIVED. DTO
 * NBSyncCurrentCheckResponse `{success, h, id: Int32, error}`. The no-save
 * `{ error: "NoSave" }` reply was not observed for lt.
 *
 * @internal
 */
export const SyncCheckForNewerSaveEndpoint = HttpApiEndpoint.get(
    "SyncCheckForNewerSave",
    "/sync/current_version/lt/:playerId/:salt/:hash",
    {
        params: { playerId: PlayerId, salt: I32, hash: Schema.String },
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
export const SocialGetItemsEndpoint = HttpApiEndpoint.get("SocialGetItems", "/get_items/lt/:playerId/:salt/:hash", {
    params: { playerId: PlayerId, salt: I32, hash: Schema.String },
    error: ApiErrors,
    success: [
        ErrorResponse,
        NotFoundResponse,
        Schema.Struct({ success: Schema.Literal("Found"), gifts: Schema.Array(Gift) }),
    ],
}).annotate(OAuthScope.Required, { anyOf: [Scopes.SocialGetItems, Scopes.SocialRead, Scopes.Read, Scopes.LEGOTower] });

/**
 * Sends an item to a friend. LITERAL `/send_item/`; path, params and payload
 * DERIVED. DTO NBSyncItemsSendResponse `{success, error}`. The game's
 * NBSyncItem.itemType is NBSyncItemType (None 0, Play 1, Gift 2, Visit 3,
 * Promo 4); how it is written in the path was not observed. The game posts
 * form fields; this payload is sent as JSON, and whether the server accepts
 * JSON is unverified.
 *
 * @internal
 */
export const SocialSendItemEndpoint = HttpApiEndpoint.post(
    "SocialSendItem",
    "/send_item/lt/:itemType/:playerId/:friendId/:salt/:hash",
    {
        params: {
            itemType: Schema.String,
            playerId: PlayerId,
            friendId: PlayerId,
            salt: I32,
            hash: Schema.String,
        },
        payload: Schema.Struct({ itemStr: Schema.String }),
        error: ApiErrors,
        success: [ErrorResponse, SentResponse, NotSentResponse],
    }
).annotate(OAuthScope.Required, { anyOf: [Scopes.SocialSendItem, Scopes.SocialWrite, Scopes.Write, Scopes.LEGOTower] });

/**
 * OBSERVED: preimage `lt/<playerId>/<friendId>/<salt><playerAuthKey>`, with
 * the player's own id as `friendId`. Only `{ error: "SaveNotFound" }` came
 * back. DTO NBSyncFriendGameSaveResponse `{success, h, id: Int32, player_id,
 * data, error}`; the Found reply was not observed.
 *
 * @internal
 */
export const SocialPullFriendGameEndpoint = HttpApiEndpoint.get(
    "SocialPullFriendGame",
    "/friend/pull_game/lt/:playerId/:friendId/:salt/:hash",
    {
        params: {
            playerId: PlayerId,
            friendId: PlayerId,
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
                playerId: PlayerId,
            }).pipe(Schema.encodeKeys({ checksum: "h", saveId: "id", playerId: "player_id" })),
        ],
    }
).annotate(OAuthScope.Required, {
    anyOf: [Scopes.SocialPullFriendGame, Scopes.SocialRead, Scopes.Read, Scopes.LEGOTower],
});

/**
 * OBSERVED: preimage `lt/<playerId>/<salt><friends><playerAuthKey>`, reply
 * `{ success: "Found", meta: {} }`. DTO NBSyncFriendGameMetaResponse
 * `{success, meta: Dictionary<String,Object>, error}`. The game keeps each
 * friend's meta as LTFriendMeta `{level: Int32, avatar:
 * Dictionary<String,Object>, vip: Int32, ts: Int32, rpid: String, rfid:
 * String, mg: Int32, ver: String}`; no values were observed, so they stay
 * `Schema.Unknown`.
 *
 * The game posts `friends` as a form field and passes a list of ids (only one
 * id was observed, so the separator is unknown). This payload is a single id
 * sent as JSON, and whether the server accepts JSON is unverified.
 *
 * @internal
 */
export const SocialPullFriendMetaEndpoint = HttpApiEndpoint.post(
    "SocialPullFriendMeta",
    "/friend/pull_meta/lt/:playerId/:salt/:hash",
    {
        params: { playerId: PlayerId, salt: I32, hash: Schema.String },
        payload: Schema.Struct({ friends: PlayerId }),
        error: ApiErrors,
        success: [
            ErrorResponse,
            NotFoundResponse,
            Schema.Struct({
                success: Schema.Literal("Found"),
                meta: Schema.Record(PlayerId, Schema.Unknown),
            }),
        ],
    }
).annotate(OAuthScope.Required, {
    anyOf: [Scopes.SocialPullFriendMeta, Scopes.SocialRead, Scopes.Read, Scopes.LEGOTower],
});

/**
 * LITERAL `/get_visits/`: the game made no request when its visits call was
 * driven. Path, params and reply DERIVED; whether the reply has Tiny Tower's
 * `total` is unknown.
 *
 * @internal
 */
export const SocialGetVisitsEndpoint = HttpApiEndpoint.get("SocialGetVisits", "/get_visits/lt/:playerId/:salt/:hash", {
    params: { playerId: PlayerId, salt: I32, hash: Schema.String },
    error: ApiErrors,
    success: [
        ErrorResponse,
        NotFoundResponse,
        Schema.Struct({ success: Schema.Literal("Found"), gifts: Schema.Array(Gift) }),
    ],
}).annotate(OAuthScope.Required, { anyOf: [Scopes.SocialGetVisits, Scopes.SocialRead, Scopes.Read, Scopes.LEGOTower] });

/**
 * OBSERVED: `/get_mailbox_count/lt/:playerId/:salt/:hash` with the standard
 * preimage, reply `{ success: "Found", total: "0", from: [], maxDisplay: 50 }`.
 * DTO NBMailboxCount `{success, error, total: Int32, maxDisplay: Int32, from:
 * List<String>}`; `total` is a string on the wire. No `from` entries were
 * observed, so they stay `Schema.Unknown`.
 *
 * @internal
 */
export const SocialGetMailboxCountEndpoint = HttpApiEndpoint.get(
    "SocialGetMailboxCount",
    "/get_mailbox_count/lt/:playerId/:salt/:hash",
    {
        params: { playerId: PlayerId, salt: I32, hash: Schema.String },
        error: ApiErrors,
        success: [
            ErrorResponse,
            NotFoundResponse,
            Schema.Struct({
                success: Schema.Literal("Found"),
                total: Schema.FiniteFromString.pipe(Schema.decodeTo(Schema.Int)),
                maxDisplay: Schema.Int,
                from: Schema.Array(Schema.Unknown),
            }),
        ],
    }
).annotate(OAuthScope.Required, {
    anyOf: [Scopes.SocialGetMailboxCount, Scopes.SocialRead, Scopes.Read, Scopes.LEGOTower],
});

/**
 * OBSERVED: `/get_mailbox/lt/:playerId/:salt/:hash` with the standard
 * preimage, reply `{ success: "Found", total: "0", maxDisplay: 50 }`; `mail`
 * is left out when the mailbox is empty. DTO NBMailbox `{success, error,
 * total: Int32, maxDisplay: Int32, mail: List<NBMailboxItem>}`, NBMailboxItem
 * `{type: NBMailBoxItemType (Gift 0, Trade 1), added: Int64, item:
 * NBSyncItemsGift, trade: NBSyncTradeItem}`. No mail items were observed, so
 * they stay `Schema.Unknown`.
 *
 * @internal
 */
export const SocialGetMailboxEndpoint = HttpApiEndpoint.get(
    "SocialGetMailbox",
    "/get_mailbox/lt/:playerId/:salt/:hash",
    {
        params: { playerId: PlayerId, salt: I32, hash: Schema.String },
        error: ApiErrors,
        success: [
            ErrorResponse,
            NotFoundResponse,
            Schema.Struct({
                success: Schema.Literal("Found"),
                total: Schema.FiniteFromString.pipe(Schema.decodeTo(Schema.Int)),
                maxDisplay: Schema.Int,
                mail: Schema.optionalKey(Schema.Array(Schema.Unknown)),
            }),
        ],
    }
).annotate(OAuthScope.Required, {
    anyOf: [Scopes.SocialGetMailbox, Scopes.SocialRead, Scopes.Read, Scopes.LEGOTower],
});

/**
 * OBSERVED: the game's snapshot list call (NBSyncSnapshot.getSnapshotList),
 * with its own id as `friendId`. Preimage
 * `lt/<playerId>/<friendId>/<salt><playerAuthKey>`, reply `{ success: "Found",
 * saves: [] }`. DTO NBSyncSnapshotList `{success, error, saves:
 * List<NBSyncSnapshotItem {id: Int32, created: Int32, meta:
 * Dictionary<String,Object>}>}`. No saves were observed, so they stay
 * `Schema.Unknown`.
 *
 * @internal
 */
export const SocialRetrieveFriendsSnapshotListEndpoint = HttpApiEndpoint.get(
    "SocialRetrieveFriendsSnapshotList",
    "/sync/current_player_snapshots/lt/:playerId/:friendId/:salt/:hash",
    {
        params: {
            playerId: PlayerId,
            friendId: PlayerId,
            salt: I32,
            hash: Schema.String,
        },
        error: ApiErrors,
        success: [
            ErrorResponse,
            NotFoundResponse,
            Schema.Struct({
                success: Schema.Literal("Found"),
                saves: Schema.Array(Schema.Unknown),
            }),
        ],
    }
).annotate(OAuthScope.Required, {
    anyOf: [Scopes.SocialListFriendSnapshots, Scopes.SocialRead, Scopes.Read, Scopes.LEGOTower],
});

/**
 * LITERAL `/sync/current_snapshots/`; path and params DERIVED. The game's
 * snapshot list call used `/sync/current_player_snapshots/` instead. DTO
 * NBSyncSnapshotList `{success, error, saves: List<NBSyncSnapshotItem {id:
 * Int32, created: Int32, meta: Dictionary<String,Object>}>}`; `id` and
 * `created` may arrive as numeric strings.
 *
 * @internal
 */
export const SyncRetrieveSnapshotListEndpoint = HttpApiEndpoint.get(
    "SyncRetrieveSnapshotList",
    "/sync/current_snapshots/lt/:playerId/:salt/:hash",
    {
        params: { playerId: PlayerId, salt: I32, hash: Schema.String },
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
 * Pull one snapshot. LITERAL `/sync/pull_snapshot/`; path, params, preimage
 * `lt/<playerId>/<snapshotId>/<salt><playerAuthKey>` and reply DERIVED. The
 * game's NBSyncSnapshot.pullSnapshot has no dedicated response DTO.
 *
 * @internal
 */
export const SyncPullSnapshotEndpoint = HttpApiEndpoint.get(
    "SyncPullSnapshot",
    "/sync/pull_snapshot/lt/:playerId/:snapshotId/:salt/:hash",
    {
        params: { playerId: PlayerId, snapshotId: Schema.Int, salt: I32, hash: Schema.String },
        error: ApiErrors,
        success: [
            ErrorResponse,
            NotFoundResponse,
            Schema.Struct({
                success: Schema.Literal("Found"),
                data: Schema.Uint8ArrayFromBase64,
                checksum: Schema.String,
                snapshotId: Schema.NumberFromString,
            }).pipe(Schema.encodeKeys({ checksum: "h", snapshotId: "id" })),
        ],
    }
);

/**
 * Trades list. LITERAL `/get_trades/`; params assume the standard preimage.
 * DTO NBSyncTradeItemsGetResponse `{success, trades: List<NBSyncTradeItem>,
 * error}`, NBSyncTradeItem `{id: Int32, to: String, from: String, status:
 * NBSyncTradeStatus (Unknown 0, Active 1, Complete 2, Expired 3, Rejected 4,
 * Archived 5), payload: String, added: Int64, expire: Int64}`. The int fields
 * may arrive as numeric strings.
 *
 * @internal
 */
export const TradeGetTradesEndpoint = HttpApiEndpoint.get("TradeGetTrades", "/get_trades/lt/:playerId/:salt/:hash", {
    params: { playerId: PlayerId, salt: I32, hash: Schema.String },
    error: ApiErrors,
    success: [
        ErrorResponse,
        NotFoundResponse,
        Schema.Struct({
            success: Schema.Literal("Found"),
            trades: Schema.Array(
                Schema.Struct({
                    id: Schema.Int,
                    to: Schema.String,
                    from: Schema.String,
                    status: Schema.Int,
                    payload: Schema.String,
                    added: Schema.Int,
                    expire: Schema.Int,
                })
            ),
        }),
    ],
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
    .add(SyncRetrieveSnapshotListEndpoint)
    .add(SyncPullSnapshotEndpoint);

/** @internal */
export const TradeGroup = HttpApiGroup.make("TradeGroup").add(TradeGetTradesEndpoint);

/** @internal */
export const SocialGroup = HttpApiGroup.make("SocialGroup")
    .add(SocialGetItemsEndpoint)
    .add(SocialGetVisitsEndpoint)
    .add(SocialSendItemEndpoint)
    .add(SocialPullFriendGameEndpoint)
    .add(SocialPullFriendMetaEndpoint)
    .add(SocialGetMailboxCountEndpoint)
    .add(SocialGetMailboxEndpoint)
    .add(SocialRetrieveFriendsSnapshotListEndpoint);

/**
 * The LEGO Tower NBSync api.
 *
 * @since 1.0.0
 * @category Api
 */
export const Api = HttpApi.make("LegoTowerApi")
    .add(DeviceManagementGroup)
    .add(SyncManagementGroup)
    .add(SocialGroup)
    .add(TradeGroup);
