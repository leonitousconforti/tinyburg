/**
 * @since 1.0.0
 * @category Endpoints
 */

import * as Schema from "effect/Schema";
import * as SchemaTransformation from "effect/SchemaTransformation";
import * as HttpApi from "effect/unstable/httpapi/HttpApi";
import * as HttpApiEndpoint from "effect/unstable/httpapi/HttpApiEndpoint";
import * as HttpApiError from "effect/unstable/httpapi/HttpApiError";
import * as HttpApiGroup from "effect/unstable/httpapi/HttpApiGroup";

import * as NimblebitConfig from "@tinyburg/nimblebit-sdk/NimblebitConfig";

import * as Bitizen from "./Bitizens.ts";
import * as Gift from "./Gift.ts";
import * as SyncItemType from "./SyncItemType.ts";

/** @internal */
export const U32 = Schema.Int.check(Schema.isUint32());

/**
 * Errors shared by every endpoint in the api.
 *
 * @internal
 */
export const ApiErrors = [
    HttpApiError.Forbidden,
    HttpApiError.BadRequest,
    HttpApiError.Unauthorized,
    HttpApiError.InternalServerError,
] as const;

/** @internal */
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
export const EnteredResponse = Schema.Struct({ success: Schema.Literal("Entered") });

/** @internal */
export const NotEnteredResponse = Schema.Struct({ success: Schema.Literal("NotEntered") });

/** @internal */
export const ReceivedResponse = Schema.Struct({ success: Schema.Literal("Received") });

/** @internal */
export const NotReceivedResponse = Schema.Struct({ success: Schema.Literal("NotReceived") });

/** @internal */
export const SentResponse = Schema.Struct({ success: Schema.Literal("Sent") });

/** @internal */
export const NotSentResponse = Schema.Struct({ success: Schema.Literal("NotSent") });

/**
 * Player metadata associated with save data and snapshots.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const PlayerMetaData = Schema.Struct({
    /**
     * Number of stories/floors, counted the same as they are on the elevator
     * shaft.
     */
    stories: Schema.NumberFromString.pipe(Schema.decodeTo(Schema.Int)),

    /**
     * Doorman bitizen, shows as avatar in friend list. Can be any valid
     * bitizen.
     */
    doorman: Bitizen.Bitizen,

    /** All time number of golden tickets they have. */
    maxGold: Schema.NumberFromString.pipe(Schema.decodeTo(Schema.Int)),

    /**
     * If they are requesting bitizen for a particular floor, this is that floor
     * id. You can lookup the name of the floor using the floor blocks.
     */
    requestedFloorId: Schema.NumberFromString.pipe(Schema.decodeTo(Schema.Int)),

    /** Bitbook post? not 100% sure */
    bitbook: Schema.optionalKey(Schema.String),

    /** Unknown */
    ts: Schema.String,

    /** Indicates that they are vip. */
    vip: Schema.Literals(["1", "0"]).transform([true, false]).pipe(Schema.decodeTo(Schema.Boolean)),
}).pipe(
    Schema.encodeKeys({
        stories: "level",
        doorman: "avatar",
        maxGold: "mg",
        requestedFloorId: "reqFID",
        bitbook: "bb",
    })
);

/** @internal */
export const DeviceNewPlayerEndpoint = HttpApiEndpoint.get("DeviceNewPlayer", "/register/tt/:salt1/:salt2/:hash", {
    params: { salt1: U32, salt2: U32, hash: Schema.String },
    error: ApiErrors,
    success: [
        ErrorResponse,
        Schema.Struct({
            playerId: NimblebitConfig.PlayerIdSchema,
            playerSs: NimblebitConfig.PlayerAuthKeySchema,
        }).pipe(
            Schema.encodeKeys({
                playerId: "player_id",
                playerSs: "player_ss",
            })
        ),
    ],
});

/** @internal */
export const DevicePlayerDetailsEndpoint = HttpApiEndpoint.get(
    "DevicePlayerDetails",
    "/player_details/tt/:playerId/:salt/:hash",
    {
        params: { playerId: NimblebitConfig.PlayerIdSchema, salt: U32, hash: Schema.String },
        error: ApiErrors,
        success: [
            ErrorResponse,
            Schema.Struct({
                player: Schema.Struct({
                    playerEmail: NimblebitConfig.PlayerEmailSchema,
                    playerId: NimblebitConfig.PlayerIdSchema,
                    registered: Schema.NumberFromString.pipe(Schema.decodeTo(Schema.BooleanFromBit)),
                    blacklisted: Schema.NumberFromString.pipe(Schema.decodeTo(Schema.BooleanFromBit)),
                }).pipe(
                    Schema.encodeKeys({
                        playerEmail: "email",
                        playerId: "player_id",
                    })
                ),
            }),
        ],
    }
);

/** @internal */
export const DeviceVerifyDeviceEndpoint = HttpApiEndpoint.get(
    "DeviceVerifyDevice",
    "/verify_device/tt/:playerId/:verificationCode",
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
                playerPhoto: Schema.optionalKey(Schema.NullOr(Schema.String)),
                playerNickname: Schema.optionalKey(Schema.NullOr(Schema.String)),
            }).pipe(
                Schema.encodeKeys({
                    playerId: "player_id",
                    playerAuthKey: "player_ss",
                    playerEmail: "player_email",
                    playerPhoto: "player_photo",
                    playerNickname: "player_nickname",
                })
            ),
        ],
    }
);

/** @internal */
export const DeviceRegisterEmailEndpoint = HttpApiEndpoint.post(
    "DeviceRegisterEmail",
    "/register_email/tt/:playerId/:salt/:hash",
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
);

/** @internal */
export const SyncPullSaveEndpoint = HttpApiEndpoint.get("SyncPullSave", "/sync/pull/tt/:playerId/:salt/:hash", {
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
        }).pipe(
            Schema.encodeKeys({
                checksum: "h",
                saveId: "id",
            })
        ),
    ],
});

/** @internal */
export const SyncPushSaveEndpoint = HttpApiEndpoint.post("SyncPushSave", "/sync/push/tt/:playerId/:salt/:hash", {
    params: { playerId: NimblebitConfig.PlayerIdSchema, salt: U32, hash: Schema.String },
    payload: Schema.Struct({
        data: Schema.Uint8ArrayFromBase64,
        doorman: Bitizen.Bitizen,
        saveVersion: Schema.NumberFromString.pipe(Schema.decodeTo(Schema.Int)),
        level: Schema.NumberFromString.pipe(Schema.decodeTo(Schema.Int)),
        reqFID: Schema.NumberFromString.pipe(Schema.decodeTo(Schema.Int)),
        mg: Schema.NumberFromString.pipe(Schema.decodeTo(Schema.Int)),
        vip: Schema.Literals(["true", "false"]).transform([true, false]).pipe(Schema.decodeTo(Schema.Boolean)),
        p: Schema.Literals(["IOS", "Android"]),
        l: Schema.String,
    }).pipe(
        Schema.encodeKeys({
            data: "saveData",
            doorman: "avatar",
        })
    ),
    error: ApiErrors,
    success: [ErrorResponse, SavedResponse, NotSavedResponse],
});

/** @internal */
export const SyncCheckForNewerSaveEndpoint = HttpApiEndpoint.get(
    "SyncCheckForNewerSave",
    "/sync/current_version/tt/:playerId/:salt/:hash",
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
            }).pipe(
                Schema.encodeKeys({
                    checksum: "h",
                    saveId: "id",
                })
            ),
        ],
    }
);

/** @internal */
export const SyncPullSnapshotEndpoint = HttpApiEndpoint.get(
    "SyncPullSnapshot",
    "/sync/pull_snapshot/tt/:playerId/:snapshotId/:salt/:hash",
    {
        params: { playerId: NimblebitConfig.PlayerIdSchema, snapshotId: Schema.Int, salt: U32, hash: Schema.String },
        error: ApiErrors,
        success: [
            ErrorResponse,
            NotFoundResponse,
            Schema.Struct({
                success: Schema.Literal("Found"),
                data: Schema.Uint8ArrayFromBase64,
                checksum: Schema.String,
                snapshotId: Schema.NumberFromString,
            }).pipe(
                Schema.encodeKeys({
                    checksum: "h",
                    snapshotId: "id",
                })
            ),
        ],
    }
);

/** @internal */
export const SyncPushSnapshotEndpoint = HttpApiEndpoint.post(
    "SyncPushSnapshot",
    "/sync/push_snapshot/tt/:playerId/:salt/:hash",
    {
        params: { playerId: NimblebitConfig.PlayerIdSchema, salt: U32, hash: Schema.String },
        payload: Schema.Struct({
            data: Schema.Uint8ArrayFromBase64,
            doorman: Bitizen.Bitizen,
            saveVersion: Schema.NumberFromString.pipe(Schema.decodeTo(Schema.Int)),
            level: Schema.NumberFromString.pipe(Schema.decodeTo(Schema.Int)),
            reqFID: Schema.NumberFromString.pipe(Schema.decodeTo(Schema.Int)),
            mg: Schema.NumberFromString.pipe(Schema.decodeTo(Schema.Int)),
            vip: Schema.Literals(["true", "false"]).transform([true, false]).pipe(Schema.decodeTo(Schema.Boolean)),
            p: Schema.Literals(["IOS", "Android"]),
            l: Schema.String,
        }).pipe(
            Schema.encodeKeys({
                data: "snapshotData",
                doorman: "avatar",
            })
        ),
        error: ApiErrors,
        success: [ErrorResponse, SavedResponse, NotSavedResponse],
    }
);

/** @internal */
export const SyncRetrieveSnapshotListEndpoint = HttpApiEndpoint.get(
    "SyncRetrieveSnapshotList",
    "/sync/current_snapshots/tt/:playerId/:salt/:hash",
    {
        params: { playerId: NimblebitConfig.PlayerIdSchema, salt: U32, hash: Schema.String },
        error: ApiErrors,
        success: [
            ErrorResponse,
            NotFoundResponse,
            Schema.Struct({
                success: Schema.Literal("Found"),
                saves: Schema.Array(
                    Schema.Struct({
                        id: Schema.NumberFromString.pipe(Schema.decodeTo(Schema.Int)),
                        timestamp: Schema.BigInt,
                        meta: PlayerMetaData,
                    })
                ),
            }),
        ],
    }
);

/** @internal */
export const RaffleEnterEndpoint = HttpApiEndpoint.get("RaffleEnter", "/raffle/enter/tt/:playerId/:salt/:hash", {
    params: { playerId: NimblebitConfig.PlayerIdSchema, salt: U32, hash: Schema.String },
    error: ApiErrors,
    success: [ErrorResponse, EnteredResponse, NotEnteredResponse],
});

/** @internal */
export const RaffleEnterMultiEndpoint = HttpApiEndpoint.get(
    "RaffleEnterMulti",
    "/raffle/enter_multi/tt/:playerId/:salt/:hash",
    {
        params: { playerId: NimblebitConfig.PlayerIdSchema, salt: U32, hash: Schema.String },
        error: ApiErrors,
        success: [ErrorResponse, EnteredResponse, NotEnteredResponse],
    }
);

/** @internal */
export const RaffleCheckEnteredCurrentEndpoint = HttpApiEndpoint.get(
    "RaffleCheckEnteredCurrent",
    "/raffle/entered_current/tt/:playerId/:salt/:hash",
    {
        params: { playerId: NimblebitConfig.PlayerIdSchema, salt: Schema.Int, hash: Schema.String },
        error: ApiErrors,
        success: [ErrorResponse, EnteredResponse, NotEnteredResponse],
    }
);

/** @internal */
export const SocialSendItemEndpoint = HttpApiEndpoint.post(
    "SocialSendItem",
    "/send_item/tt/:syncItemType/:playerId/:friendId/:salt/:hash",
    {
        params: {
            syncItemType: Schema.Enum(SyncItemType.SyncItemType),
            playerId: NimblebitConfig.PlayerIdSchema,
            friendId: NimblebitConfig.PlayerIdSchema,
            salt: U32,
            hash: Schema.String,
        },
        payload: Schema.Struct({ itemStr: Schema.String }),
        error: ApiErrors,
        success: [ErrorResponse, SentResponse, NotSentResponse],
    }
);

/** @internal */
export const SocialGetGiftsEndpoint = HttpApiEndpoint.get("SocialGetGifts", "/get_gifts/tt/:playerId/:salt/:hash", {
    params: { playerId: NimblebitConfig.PlayerIdSchema, salt: U32, hash: Schema.String },
    error: ApiErrors,
    success: [
        ErrorResponse,
        NotFoundResponse,
        Schema.Struct({
            success: Schema.Literal("Found"),
            gifts: Schema.Array(Gift.Gift),
            total: Schema.Int,
        }),
    ],
});

/** @internal */
export const SocialReceiveGiftEndpoint = HttpApiEndpoint.get(
    "SocialReceiveGift",
    "/receive_item/tt/:playerId/:giftId/:salt/:hash",
    {
        params: { playerId: NimblebitConfig.PlayerIdSchema, giftId: Schema.Int, salt: U32, hash: Schema.String },
        error: ApiErrors,
        success: [ErrorResponse, ReceivedResponse, NotReceivedResponse],
    }
);

/** @internal */
export const SocialPullFriendMetaEndpoint = HttpApiEndpoint.post(
    "SocialPullFriendMeta",
    "/friend/pull_meta/tt/:playerId/:salt/:hash",
    {
        params: { playerId: NimblebitConfig.PlayerIdSchema, salt: U32, hash: Schema.String },
        payload: Schema.Struct({ friends: NimblebitConfig.PlayerIdSchema }),
        error: ApiErrors,
        success: [
            ErrorResponse,
            NotFoundResponse,
            Schema.Struct({
                success: Schema.Literal("Found"),
                meta: Schema.Record(NimblebitConfig.PlayerIdSchema, PlayerMetaData),
            }),
        ],
    }
);

/** @internal */
export const SocialPullFriendTowerEndpoint = HttpApiEndpoint.get(
    "SocialPullFriendTower",
    "/friend/pull_game/tt/:playerId/:friendId/:salt/:hash",
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
            }).pipe(
                Schema.encodeKeys({
                    checksum: "h",
                    saveId: "id",
                    playerId: "player_id",
                })
            ),
        ],
    }
);

/** @internal */
export const SocialRetrieveFriendsSnapshotListEndpoint = HttpApiEndpoint.get(
    "SocialRetrieveFriendsSnapshotList",
    "/sync/current_player_snapshots/tt/:playerId/:friendId/:salt/:hash",
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
                saves: Schema.Array(
                    Schema.Struct({
                        meta: Schema.Any,
                        snapshotId: Schema.NumberFromString.pipe(Schema.decodeTo(Schema.Int)),
                        created: Schema.NumberFromString.pipe(
                            Schema.decode(
                                SchemaTransformation.transform({
                                    decode: (seconds) => seconds * 1000,
                                    encode: (ms) => ms / 1000,
                                })
                            ),
                            Schema.decodeTo(
                                Schema.Date,
                                SchemaTransformation.transform({
                                    decode: (ms) => new Date(ms),
                                    encode: (date) => date.getTime(),
                                })
                            )
                        ),
                    }).pipe(
                        Schema.encodeKeys({
                            snapshotId: "id",
                        })
                    )
                ),
            }),
        ],
    }
);

/** @internal */
export const SocialGetVisitsEndpoint = HttpApiEndpoint.get("SocialGetVisits", "/get_visits/tt/:playerId/:salt/:hash", {
    params: { playerId: NimblebitConfig.PlayerIdSchema, salt: U32, hash: Schema.String },
    error: ApiErrors,
    success: [
        ErrorResponse,
        NotFoundResponse,
        Schema.Struct({
            success: Schema.Literal("Found"),
            gifts: Schema.Array(Gift.Gift),
            total: Schema.Int,
        }),
    ],
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
    .add(SyncPushSaveEndpoint)
    .add(SyncCheckForNewerSaveEndpoint)
    .add(SyncPushSnapshotEndpoint)
    .add(SyncPullSnapshotEndpoint)
    .add(SyncRetrieveSnapshotListEndpoint);

/** @internal */
export const RaffleGroup = HttpApiGroup.make("RaffleGroup")
    .add(RaffleEnterEndpoint)
    .add(RaffleEnterMultiEndpoint)
    .add(RaffleCheckEnteredCurrentEndpoint);

/** @internal */
export const SocialGroup = HttpApiGroup.make("SocialGroup")
    .add(SocialSendItemEndpoint)
    .add(SocialGetGiftsEndpoint)
    .add(SocialReceiveGiftEndpoint)
    .add(SocialPullFriendMetaEndpoint)
    .add(SocialPullFriendTowerEndpoint)
    .add(SocialRetrieveFriendsSnapshotListEndpoint)
    .add(SocialGetVisitsEndpoint);

/** @internal */
export const Api = HttpApi.make("TinyTowerApi")
    .add(DeviceManagementGroup)
    .add(SyncManagementGroup)
    .add(RaffleGroup)
    .add(SocialGroup);
