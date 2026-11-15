/**
 * Pocket Trains (game code `pt`) NBSync api endpoints.
 *
 * Signing: a random `salt` (signed int32) goes in the path, and `hash` is
 * `md5(<preimage> + <game secret salt>)` with the preimage
 * `pt/<playerId>/<salt><playerAuthKey>` (variants noted per endpoint). The
 * secret salt is the value extracted from `NBSync._ss`.
 *
 * Provenance, per endpoint (2026-11-09):
 *
 * - OBSERVED: the game made this request (Play build 1.10.2).
 * - REPLAYED: the SDK's client function succeeded against the live server.
 * - DTO: the game's response class has these fields.
 * - LITERAL: the path is compiled into the game but was not exercised.
 * - DERIVED: inferred from Tiny Tower.
 *
 * POST bodies: the game was seen posting form fields (friend/pull_meta), but a
 * `Schema.Struct` payload is sent as JSON. Whether the server accepts JSON is
 * unverified.
 *
 * Not modelled yet (LITERAL only): `friend/pull_meta_gift_id`, `send_pt`,
 * `register_pt`, `register_email`, `new_id/verify`. Facebook and Play Games
 * login flows: `register_fb`, `swap_fb`, `register_pg`, `swap_pg`, `check_pg`.
 * The game also fetches an unsigned iCalendar from
 * `s3.amazonaws.com/NBStatic/sync/tt/current.ics` (OBSERVED), which is not an
 * NBSync endpoint.
 *
 * Game-specific save, meta and gift schemas are left as `Schema.Unknown`
 * placeholders where their wire format was not observed.
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
 * A gift in the general item channel (get_items / send_item), as REPLAYED from
 * get_items: every field is a string except `c`, a number. DTO NBSyncItemsGift
 * has the same string fields plus `item_type` (NBSyncItemType), which the server
 * does not send, and no `c`.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const Gift = Schema.Struct({
    gift_id: Schema.String,
    gift_to: Schema.String,
    gift_from: Schema.String,
    gift_type: Schema.String,
    gift_str: Schema.String,
    h: Schema.String,
    // Sent by the server but not in the game's DTO, so it may not always be there
    c: Schema.optionalKey(Schema.Finite),
});

/**
 * A Pocket Trains gift (get_gifts_pt channel), not seen on the wire. DTO
 * NBSyncGetPTGift: `{gift_id: String, gift_to: String, gift_from: String, alt_id:
 * String, gift_type: String, gift_str: Int32, gift_quantity: Int32, h: String}`.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const PTGift = Schema.Unknown;

/**
 * OBSERVED and REPLAYED: `{player_id, player_ss}`, preimage `pt/<salt1>/<salt2>`.
 * DTO NBSyncRegisterResponse also has `registered: Int32`, which was not sent.
 *
 * @internal
 */
export const DeviceNewPlayerEndpoint = HttpApiEndpoint.get("DeviceNewPlayer", "/register/pt/:salt1/:salt2/:hash", {
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
 * OBSERVED and REPLAYED.
 *
 * @internal
 */
export const DevicePlayerDetailsEndpoint = HttpApiEndpoint.get(
    "DevicePlayerDetails",
    "/player_details/pt/:playerId/:salt/:hash",
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
    anyOf: [Scopes.DevicePlayerDetails, Scopes.DeviceRead, Scopes.Read, Scopes.PocketTrains],
});

/**
 * LITERAL (`/verify_device/`). DTO NBSyncVerifyCodeResponse `{success, player_id,
 * player_ss, player_email, error}`. The path after the literal and the
 * `NewDevice` success value are DERIVED.
 *
 * @internal
 */
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
).annotate(OAuthScope.Required, {
    anyOf: [Scopes.DeviceVerifyDevice, Scopes.DeviceWrite, Scopes.Write, Scopes.PocketTrains],
});

/**
 * Pull the player's cloud save. OBSERVED and REPLAYED, error branch only: a
 * player without a save gets `{ error: "SaveNotFound" }`. The Found branch is
 * from DTO NBSyncGameSaveResponse `{success, h, id: Int32, data, error}`; the
 * wire type of `id` is unobserved. `data` is base64 pako-deflated bytes.
 *
 * @internal
 */
export const SyncPullSaveEndpoint = HttpApiEndpoint.get("SyncPullSave", "/sync/pull/pt/:playerId/:salt/:hash", {
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
 * OBSERVED, error branch only: a player without a save gets
 * `{ error: "NoSave" }`. The Found branch is from DTO NBSyncCurrentCheckResponse
 * `{success, h, id: Int32, error}`; the wire type of `id` is unobserved.
 *
 * @internal
 */
export const SyncCheckForNewerSaveEndpoint = HttpApiEndpoint.get(
    "SyncCheckForNewerSave",
    "/sync/current_version/pt/:playerId/:salt/:hash",
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
 * REPLAYED: `{ success: "Found", gifts: [...] }`, no `total` on pt. LITERAL in
 * the game, whose own request was not observed. A later call for the same
 * player returned no gifts, so this may consume them (unverified).
 *
 * @internal
 */
export const SocialGetItemsEndpoint = HttpApiEndpoint.get("SocialGetItems", "/get_items/pt/:playerId/:salt/:hash", {
    params: { playerId: NimblebitConfig.PlayerIdSchema, salt: I32, hash: Schema.String },
    error: ApiErrors,
    success: [
        ErrorResponse,
        NotFoundResponse,
        Schema.Struct({ success: Schema.Literal("Found"), gifts: Schema.Array(Gift) }),
    ],
}).annotate(OAuthScope.Required, {
    anyOf: [Scopes.SocialGetItems, Scopes.SocialRead, Scopes.Read, Scopes.PocketTrains],
});

/**
 * Pocket Trains gift channel. LITERAL (`/get_gifts_pt/`). DTO
 * NBSyncGetPTGiftResponse `{success, gifts: List<NBSyncGetPTGift>, error}`. The
 * request params are unconfirmed: this `/get_gifts_pt/pt/:playerId/:salt/:hash`
 * form was rejected with "Invalid Request" (2026-08-26), so the path below is a
 * placeholder.
 *
 * @internal
 */
export const SocialGetGiftsPtEndpoint = HttpApiEndpoint.get(
    "SocialGetGiftsPt",
    "/get_gifts_pt/pt/:playerId/:salt/:hash",
    {
        params: { playerId: NimblebitConfig.PlayerIdSchema, salt: I32, hash: Schema.String },
        error: ApiErrors,
        success: [
            ErrorResponse,
            NotFoundResponse,
            Schema.Struct({ success: Schema.Literal("Found"), gifts: Schema.Array(PTGift) }),
        ],
    }
).annotate(OAuthScope.Required, {
    anyOf: [Scopes.SocialGetGiftsPt, Scopes.SocialRead, Scopes.Read, Scopes.PocketTrains],
});

/**
 * Sends an item to a friend. LITERAL (`/send_item/`); the path, the `itemStr`
 * body and the `Sent`/`NotSent` values are DERIVED. DTO NBSyncItemsSendResponse
 * `{success, error}`. The game's item type is the enum NBSyncItemType (None=0,
 * Play=1, Gift=2); whether the path carries the number or the name is unknown.
 * The game's body was not observed; this payload is sent as JSON, and whether
 * the server accepts JSON is unverified.
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
            salt: I32,
            hash: Schema.String,
        },
        payload: Schema.Struct({ itemStr: Schema.String }),
        error: ApiErrors,
        success: [ErrorResponse, SentResponse, NotSentResponse],
    }
).annotate(OAuthScope.Required, {
    anyOf: [Scopes.SocialSendItem, Scopes.SocialWrite, Scopes.Write, Scopes.PocketTrains],
});

/**
 * OBSERVED, error branch only (`{ error: "SaveNotFound" }`); preimage
 * `pt/<playerId>/<friendId>/<salt><playerAuthKey>`. The game was driven with its
 * own id as the friend, so the two id slots were not told apart. The Found
 * branch is from DTO NBSyncFriendGameSaveResponse `{success, h, id: Int32,
 * player_id, data, error}`.
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
    anyOf: [Scopes.SocialPullFriendGame, Scopes.SocialRead, Scopes.Read, Scopes.PocketTrains],
});

/**
 * OBSERVED: the game posts the form field `friends` and got `{ success: "Found",
 * meta: {} }`; preimage `pt/<playerId>/<salt><friends><playerAuthKey>`. DTO
 * NBSyncFriendGameMetaResponse types `meta` as Dictionary<String,Object>; its
 * values were not observed. The game passes a list of friends, but only a single
 * id was observed, so how several are joined is unknown. This payload is sent as
 * JSON, and whether the server accepts JSON is unverified.
 *
 * @internal
 */
export const SocialPullFriendMetaEndpoint = HttpApiEndpoint.post(
    "SocialPullFriendMeta",
    "/friend/pull_meta/pt/:playerId/:salt/:hash",
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
    anyOf: [Scopes.SocialPullFriendMeta, Scopes.SocialRead, Scopes.Read, Scopes.PocketTrains],
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
