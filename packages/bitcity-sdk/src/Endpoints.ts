/**
 * Bit City (game code `bc`) NBSync api endpoints.
 *
 * Signing: a random `salt` goes in the path, and `hash` is
 * `md5(<preimage> + <game secret salt>)` with the preimage
 * `bc/<playerId>/<salt><playerAuthKey>` (variants noted per endpoint). The
 * secret salt is the value extracted from `NBSync._ss`. Every request the game
 * made was signed this way, `register` included.
 * Salts are signed int32, as the game sends (it sent a negative one).
 *
 * Provenance in the comments below:
 * - OBSERVED: the game made this request (Play build 1.6.0, 2026-11-09).
 * - REPLAYED: the SDK's client function ran against the live server and its
 *   signature was accepted (2026-11-09).
 * - DTO: the game's response class has these fields.
 * - LITERAL: the path is compiled into the game but was not exercised.
 * - DERIVED: inferred from Tiny Tower.
 *
 * The game has no `/receive_item/` path. Saves are uploaded by its Java plugin
 * (`com.nimblebit.nbsync.SyncPush`, `/sync/push/`), outside the il2cpp code the probe
 * hooks; that is not modelled yet. Not modelled yet (LITERAL only): `register_email`, which
 * starts the email and device verification that `verify_device` completes.
 * The Facebook (`register_fb`, `swap_fb`) and Google Play Games
 * (`register_pg`, `check_pg`, `swap_pg`) login flows are not modelled either.
 *
 * Game-specific save/meta schemas are left as `Schema.Unknown` placeholders.
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
 * A gift in the item channel (get_items). Only an empty `gifts` list was
 * OBSERVED, so this is left open. DTO NBSyncItemsGift: `gift_id`, `gift_to`,
 * `gift_from`, `gift_type`, `gift_str` and `h` (String), and `item_type`
 * (NBSyncItemType: None=0, Play=1, Gift=2). Whether `item_type` arrives as a
 * number or a name is unobserved.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const Gift = Schema.Unknown;

/**
 * OBSERVED and REPLAYED. The preimage is `bc/<salt1>/<salt2>`. DTO
 * NBSyncRegisterResponse also has `registered` (Int32), which the observed
 * response did not include.
 *
 * @internal
 */
export const DeviceNewPlayerEndpoint = HttpApiEndpoint.get("DeviceNewPlayer", "/register/bc/:salt1/:salt2/:hash", {
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
 * OBSERVED and REPLAYED. Every `player` field arrives as a string. DTO
 * NBSyncPlayerDetailsResponse: `success`, `player` (Dictionary<String,Object>),
 * `error`.
 *
 * @internal
 */
export const DevicePlayerDetailsEndpoint = HttpApiEndpoint.get(
    "DevicePlayerDetails",
    "/player_details/bc/:playerId/:salt/:hash",
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
    anyOf: [Scopes.DevicePlayerDetails, Scopes.DeviceRead, Scopes.Read, Scopes.BitCity],
});

/**
 * LITERAL. DTO NBSyncVerifyCodeResponse: `success`, `player_id`, `player_ss`,
 * `player_email`, `error`. The unsigned path and the `NewDevice` value are
 * DERIVED.
 *
 * @internal
 */
export const DeviceVerifyDeviceEndpoint = HttpApiEndpoint.get(
    "DeviceVerifyDevice",
    "/verify_device/bc/:playerId/:verificationCode",
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
    anyOf: [Scopes.DeviceVerifyDevice, Scopes.DeviceWrite, Scopes.Write, Scopes.BitCity],
});

/**
 * Pull the player's cloud save. REPLAYED but not OBSERVED: the server accepted
 * the SDK's signature and answered `{ error: "SaveNotFound" }` for a player
 * with no save. DTO NBSyncGameSaveResponse: `success`, `h`, `id` (Int32),
 * `data`, `error`. No save was returned, so `NotFound`, `data` being base64
 * pako-deflated bytes and `id` arriving as a numeric string are DERIVED.
 *
 * @internal
 */
export const SyncPullSaveEndpoint = HttpApiEndpoint.get("SyncPullSave", "/sync/pull/bc/:playerId/:salt/:hash", {
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
 * LITERAL. DTO NBSyncCurrentCheckResponse: `success`, `h`, `id` (Int32),
 * `error`. The preimage, the success values and `id` arriving as a numeric
 * string are DERIVED.
 *
 * @internal
 */
export const SyncCheckForNewerSaveEndpoint = HttpApiEndpoint.get(
    "SyncCheckForNewerSave",
    "/sync/current_version/bc/:playerId/:salt/:hash",
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
 * NBSyncItemsGetResponse: `success`, `gifts` (List<NBSyncItemsGift>), `error`,
 * with no `total`.
 *
 * @internal
 */
export const SocialGetItemsEndpoint = HttpApiEndpoint.get("SocialGetItems", "/get_items/bc/:playerId/:salt/:hash", {
    params: { playerId: NimblebitConfig.PlayerIdSchema, salt: I32, hash: Schema.String },
    error: ApiErrors,
    success: [
        ErrorResponse,
        NotFoundResponse,
        Schema.Struct({ success: Schema.Literal("Found"), gifts: Schema.Array(Gift) }),
    ],
}).annotate(OAuthScope.Required, { anyOf: [Scopes.SocialGetItems, Scopes.SocialRead, Scopes.Read, Scopes.BitCity] });

/**
 * Sends an item to a friend. LITERAL; the path order, preimage, `itemStr`
 * field and the `Sent`/`NotSent` values are DERIVED. DTO
 * NBSyncItemsSendResponse: `success`, `error`. The game's `NBSyncItem.itemType`
 * is NBSyncItemType (None=0, Play=1, Gift=2); how the path renders it is
 * unobserved. The payload is sent as JSON; the game posts form fields, and
 * whether the server accepts JSON is unverified.
 *
 * @internal
 */
export const SocialSendItemEndpoint = HttpApiEndpoint.post(
    "SocialSendItem",
    "/send_item/bc/:itemType/:playerId/:friendId/:salt/:hash",
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
).annotate(OAuthScope.Required, { anyOf: [Scopes.SocialSendItem, Scopes.SocialWrite, Scopes.Write, Scopes.BitCity] });

/**
 * OBSERVED: preimage `bc/<playerId>/<friendId>/<salt><playerAuthKey>`, and a
 * friend with no save gets `{ error: "SaveNotFound" }`. The game was driven
 * with its own id as the friend, so the order of the two ids is DERIVED. DTO
 * NBSyncFriendGameSaveResponse: `success`, `h`, `id` (Int32), `player_id`,
 * `data`, `error`. The `Found` branch was not observed.
 *
 * @internal
 */
export const SocialPullFriendGameEndpoint = HttpApiEndpoint.get(
    "SocialPullFriendGame",
    "/friend/pull_game/bc/:playerId/:friendId/:salt/:hash",
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
    anyOf: [Scopes.SocialPullFriendGame, Scopes.SocialRead, Scopes.Read, Scopes.BitCity],
});

/**
 * OBSERVED: a POST with the form field `friends`, preimage
 * `bc/<playerId>/<salt><friends><playerAuthKey>`, answered
 * `{ success: "Found", meta: {} }`. The game was driven with its own id as the
 * friend, so whether the middle token is `friends` or the player id is
 * DERIVED. DTO NBSyncFriendGameMetaResponse: `success`, `meta`
 * (Dictionary<String,Object>), `error`. The game passes a List<String> of
 * friends, but only one id was observed, so `friends` takes a single id. The
 * payload is sent as JSON; the game posts form fields, and whether the server
 * accepts JSON is unverified.
 *
 * @internal
 */
export const SocialPullFriendMetaEndpoint = HttpApiEndpoint.post(
    "SocialPullFriendMeta",
    "/friend/pull_meta/bc/:playerId/:salt/:hash",
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
    anyOf: [Scopes.SocialPullFriendMeta, Scopes.SocialRead, Scopes.Read, Scopes.BitCity],
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
    .add(SocialSendItemEndpoint)
    .add(SocialPullFriendGameEndpoint)
    .add(SocialPullFriendMetaEndpoint);

/**
 * The Bit City NBSync api.
 *
 * @since 1.0.0
 * @category Api
 */
export const Api = HttpApi.make("BitCityApi").add(DeviceManagementGroup).add(SyncManagementGroup).add(SocialGroup);
