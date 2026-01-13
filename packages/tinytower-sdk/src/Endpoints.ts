import * as HttpApi from "@effect/platform/HttpApi";
import * as HttpApiEndpoint from "@effect/platform/HttpApiEndpoint";
import * as HttpApiError from "@effect/platform/HttpApiError";
import * as HttpApiGroup from "@effect/platform/HttpApiGroup";
import * as HttpApiSchema from "@effect/platform/HttpApiSchema";
import * as NimblebitConfig from "@tinyburg/nimblebit-sdk/NimblebitConfig";
import * as EffectSchemas from "effect-schemas";
import * as Schema from "effect/Schema";

import * as TinyTowerSchema from "./Schema.ts";
import * as SyncItemType from "./SyncItemType.ts";

/** @internal */
export const hashParam = HttpApiSchema.param("hash", Schema.String);

/** @internal */
export const playerIdParam = HttpApiSchema.param("playerId", NimblebitConfig.PlayerIdSchema);

/** @internal */
export const friendIdParam = HttpApiSchema.param("friendId", NimblebitConfig.PlayerIdSchema);

/** @internal */
export const syncItemTypeParam = HttpApiSchema.param("syncItemType", Schema.Enums(SyncItemType.SyncItemType));

/** @internal */
export const giftIdParam = HttpApiSchema.param("giftId", Schema.compose(Schema.NumberFromString, Schema.Int));

/** @internal */
export const snapshotIdParam = HttpApiSchema.param("snapshotId", Schema.compose(Schema.NumberFromString, Schema.Int));

/** @internal */
export const saltParam = HttpApiSchema.param("salt", Schema.compose(Schema.NumberFromString, EffectSchemas.Number.U32));

/** @internal */
export const salt1Param = HttpApiSchema.param(
    "salt1",
    Schema.compose(Schema.NumberFromString, EffectSchemas.Number.U32)
);

/** @internal */
export const salt2Param = HttpApiSchema.param(
    "salt2",
    Schema.compose(Schema.NumberFromString, EffectSchemas.Number.U32)
);

/** @internal */
export const ErrorResponse = Schema.Struct({ error: Schema.String }).annotations(
    HttpApiSchema.annotations({ status: 200 })
);

/** @internal */
export const FoundResponse = Schema.Struct({ success: Schema.Literal("Found") }).annotations(
    HttpApiSchema.annotations({ status: 200 })
);

/** @internal */
export const NotFoundResponse = Schema.Struct({ success: Schema.Literal("NotFound") }).annotations(
    HttpApiSchema.annotations({ status: 200 })
);

/** @internal */
export const SavedResponse = Schema.Struct({ success: Schema.Literal("Saved") }).annotations(
    HttpApiSchema.annotations({ status: 200 })
);

/** @internal */
export const NotSavedResponse = Schema.Struct({ success: Schema.Literal("NotSaved") }).annotations(
    HttpApiSchema.annotations({ status: 200 })
);

/** @internal */
export const EnteredResponse = Schema.Struct({ success: Schema.Literal("Entered") }).annotations(
    HttpApiSchema.annotations({ status: 200 })
);

/** @internal */
export const NotEnteredResponse = Schema.Struct({ success: Schema.Literal("NotEntered") }).annotations(
    HttpApiSchema.annotations({ status: 200 })
);

/** @internal */
export const ReceivedResponse = Schema.Struct({ success: Schema.Literal("Received") }).annotations(
    HttpApiSchema.annotations({ status: 200 })
);

/** @internal */
export const NotReceivedResponse = Schema.Struct({ success: Schema.Literal("NotReceived") }).annotations(
    HttpApiSchema.annotations({ status: 200 })
);

/** @internal */
export const SentResponse = Schema.Struct({ success: Schema.Literal("Sent") }).annotations(
    HttpApiSchema.annotations({ status: 200 })
);

/** @internal */
export const NotSentResponse = Schema.Struct({ success: Schema.Literal("NotSent") }).annotations(
    HttpApiSchema.annotations({ status: 200 })
);

/** @internal */
export const DeviceNewPlayerEndpoint = HttpApiEndpoint.get(
    "DeviceNewPlayer"
)`/register/tt/${salt1Param}/${salt2Param}/${hashParam}`
    .addSuccess(ErrorResponse)
    .addSuccess(
        Schema.rename(
            Schema.Struct({
                player_id: NimblebitConfig.PlayerIdSchema,
                player_ss: NimblebitConfig.PlayerAuthKeySchema,
            }),
            {
                player_id: "playerId",
                player_ss: "playerSs",
            }
        ),
        { status: 200 }
    );

/** @internal */
export const DevicePlayerDetailsEndpoint = HttpApiEndpoint.get(
    "DevicePlayerDetails"
)`/player_details/tt/${playerIdParam}/${saltParam}/${hashParam}`
    .addSuccess(ErrorResponse)
    .addSuccess(
        Schema.Struct({
            player: Schema.rename(
                Schema.Struct({
                    email: NimblebitConfig.PlayerEmailSchema,
                    player_id: NimblebitConfig.PlayerIdSchema,
                    registered: Schema.compose(Schema.NumberFromString, Schema.BooleanFromUnknown),
                    blacklisted: Schema.compose(Schema.NumberFromString, Schema.BooleanFromUnknown),
                }),
                {
                    email: "playerEmail",
                    player_id: "playerId",
                }
            ),
        }),
        { status: 200 }
    );

/** @internal */
export const DeviceVerifyDeviceEndpoint = HttpApiEndpoint.get(
    "DeviceVerifyDevice"
)`/verify_device/tt/${playerIdParam}/:${HttpApiSchema.param("verificationCode", Schema.String)}`
    .addSuccess(ErrorResponse)
    .addSuccess(
        Schema.rename(
            Schema.Struct({
                success: Schema.Literal("NewDevice"),
                player_id: NimblebitConfig.PlayerIdSchema,
                player_ss: NimblebitConfig.PlayerAuthKeySchema,
                player_email: NimblebitConfig.PlayerEmailSchema,
                player_photo: Schema.optionalWith(Schema.String, { nullable: true }),
                player_nickname: Schema.optionalWith(Schema.String, { nullable: true }),
            }),
            {
                player_id: "playerId",
                player_ss: "playerAuthKey",
                player_email: "playerEmail",
                player_photo: "playerPhoto",
                player_nickname: "playerNickname",
            }
        ),
        { status: 200 }
    );

/** @internal */
export const DeviceRegisterEmailEndpoint = HttpApiEndpoint.post(
    "DeviceRegisterEmail"
)`/register_email/tt/${playerIdParam}/${saltParam}/${hashParam}`
    .addSuccess(ErrorResponse)
    .addSuccess(Schema.Struct({ success: Schema.Literal("NewEmail") }), { status: 200 })
    .addSuccess(Schema.Struct({ success: Schema.Literal("NewDevice") }), { status: 200 })
    .setPayload(Schema.Struct({ promote: Schema.Literal(1), email: Schema.Redacted(Schema.String) }));

/** @internal */
export const SyncPullSaveEndpoint = HttpApiEndpoint.get(
    "SyncPullSave"
)`/sync/pull/tt/${playerIdParam}/${saltParam}/${hashParam}`
    .addSuccess(ErrorResponse)
    .addSuccess(NotFoundResponse)
    .addSuccess(
        Schema.Struct({
            success: Schema.Literal("Found"),
            data: Schema.Uint8ArrayFromBase64,
            checksum: Schema.String.pipe(Schema.propertySignature, Schema.fromKey("h")),
            saveId: Schema.NumberFromString.pipe(Schema.propertySignature, Schema.fromKey("id")),
        }),
        { status: 200 }
    );

/** @internal */
export const SyncPushSaveEndpoint = HttpApiEndpoint.post(
    "SyncPushSave"
)`/sync/push/tt/${playerIdParam}/${saltParam}/${hashParam}`
    .setPayload(
        Schema.Struct({
            data: Schema.Uint8ArrayFromBase64.pipe(Schema.propertySignature, Schema.fromKey("saveData")),
            doorman: TinyTowerSchema.Bitizen.pipe(Schema.propertySignature, Schema.fromKey("avatar")),
            saveVersion: Schema.compose(Schema.NumberFromString, Schema.Int),
            level: Schema.compose(Schema.NumberFromString, Schema.Int),
            reqFID: Schema.compose(Schema.NumberFromString, Schema.Int),
            mg: Schema.compose(Schema.NumberFromString, Schema.Int),
            vip: Schema.BooleanFromString,
            p: Schema.Literal("IOS", "Android"),
            l: Schema.String,
        })
    )
    .addSuccess(ErrorResponse)
    .addSuccess(SavedResponse)
    .addSuccess(NotSavedResponse);

/** @internal */
export const SyncCheckForNewerSaveEndpoint = HttpApiEndpoint.get(
    "SyncCheckForNewerSave"
)`/sync/current_version/tt/${playerIdParam}/${saltParam}/${hashParam}`
    .addSuccess(ErrorResponse)
    .addSuccess(NotFoundResponse)
    .addSuccess(
        Schema.Struct({
            success: Schema.Literal("Found"),
            checksum: Schema.String.pipe(Schema.propertySignature, Schema.fromKey("h")),
            saveId: Schema.NumberFromString.pipe(Schema.propertySignature, Schema.fromKey("id")),
        }),
        { status: 200 }
    );

/** @internal */
export const SyncPullSnapshotEndpoint = HttpApiEndpoint.get(
    "SyncPullSnapshot"
)`/sync/pull_snapshot/tt/${playerIdParam}/${snapshotIdParam}/${saltParam}/${hashParam}`
    .addSuccess(ErrorResponse)
    .addSuccess(NotFoundResponse)
    .addSuccess(
        Schema.Struct({
            success: Schema.Literal("Found"),
            data: Schema.Uint8ArrayFromBase64,
            checksum: Schema.String.pipe(Schema.propertySignature, Schema.fromKey("h")),
            snapshotId: Schema.NumberFromString.pipe(Schema.propertySignature, Schema.fromKey("id")),
        }),
        { status: 200 }
    );

/** @internal */
export const SyncPushSnapshotEndpoint = HttpApiEndpoint.post(
    "SyncPushSnapshot"
)`/sync/push_snapshot/tt/${playerIdParam}/${saltParam}/${hashParam}`
    .setPayload(
        Schema.Struct({
            data: Schema.Uint8ArrayFromBase64.pipe(Schema.propertySignature, Schema.fromKey("snapshotData")),
            doorman: TinyTowerSchema.Bitizen.pipe(Schema.propertySignature, Schema.fromKey("avatar")),
            saveVersion: Schema.compose(Schema.NumberFromString, Schema.Int),
            level: Schema.compose(Schema.NumberFromString, Schema.Int),
            reqFID: Schema.compose(Schema.NumberFromString, Schema.Int),
            mg: Schema.compose(Schema.NumberFromString, Schema.Int),
            vip: Schema.BooleanFromString,
            p: Schema.Literal("IOS", "Android"),
            l: Schema.String,
        })
    )
    .addSuccess(ErrorResponse)
    .addSuccess(SavedResponse)
    .addSuccess(NotSavedResponse);

/** @internal */
export const SyncRetrieveSnapshotListEndpoint = HttpApiEndpoint.get(
    "SyncRetrieveSnapshotList"
)`/sync/current_snapshots/tt/${playerIdParam}/${saltParam}/${hashParam}`
    .addSuccess(ErrorResponse)
    .addSuccess(NotFoundResponse)
    .addSuccess(
        Schema.Struct({
            success: Schema.Literal("Found"),
            saves: Schema.Array(
                Schema.Struct({
                    id: Schema.compose(Schema.NumberFromString, Schema.Int),
                    timestamp: Schema.BigInt,
                    meta: TinyTowerSchema.PlayerMetaData,
                })
            ),
        }),
        { status: 200 }
    );

/** @internal */
export const RaffleEnterEndpoint = HttpApiEndpoint.post(
    "RaffleEnter"
)`/raffle/enter/tt/${playerIdParam}/${saltParam}/${hashParam}`
    .addSuccess(ErrorResponse)
    .addSuccess(EnteredResponse)
    .addSuccess(NotEnteredResponse);

/** @internal */
export const RaffleEnterMultiEndpoint = HttpApiEndpoint.post(
    "RaffleEnterMulti"
)`/raffle/enter_multi/tt/${playerIdParam}/${saltParam}/${hashParam}`
    .addSuccess(ErrorResponse)
    .addSuccess(EnteredResponse)
    .addSuccess(NotEnteredResponse);

/** @internal */
export const RaffleCheckEnteredCurrentEndpoint = HttpApiEndpoint.get(
    "RaffleCheckEnteredCurrent"
)`/raffle/entered_current/tt/${playerIdParam}/${saltParam}/${hashParam}`
    .addSuccess(ErrorResponse)
    .addSuccess(EnteredResponse)
    .addSuccess(NotEnteredResponse);

/** @internal */
export const SocialSendItemEndpoint = HttpApiEndpoint.post(
    "SocialSendItem"
)`/send_item/tt/${syncItemTypeParam}/${playerIdParam}/${friendIdParam}/${saltParam}/${hashParam}`
    .setPayload(Schema.Struct({ itemStr: Schema.String }))
    .addSuccess(ErrorResponse)
    .addSuccess(SentResponse)
    .addSuccess(NotSentResponse);

/** @internal */
export const SocialGetGiftsEndpoint = HttpApiEndpoint.get(
    "SocialGetGifts"
)`/get_gifts/tt/${playerIdParam}/${saltParam}/${hashParam}`
    .addSuccess(ErrorResponse)
    .addSuccess(NotFoundResponse)
    .addSuccess(
        Schema.Struct({
            success: Schema.Literal("Found"),
            gifts: Schema.Array(TinyTowerSchema.Gift),
            total: Schema.Int,
        }),
        { status: 200 }
    );

/** @internal */
export const SocialReceiveGiftEndpoint = HttpApiEndpoint.post(
    "SocialReceiveGift"
)`/receive_item/tt/${playerIdParam}/${giftIdParam}/${saltParam}/${hashParam}`
    .addSuccess(ErrorResponse)
    .addSuccess(ReceivedResponse)
    .addSuccess(NotReceivedResponse);

/** @internal */
export const SocialPullFriendMetaEndpoint = HttpApiEndpoint.post(
    "SocialPullFriendMeta"
)`/friend/pull_meta/tt/${playerIdParam}/${saltParam}/${hashParam}`
    .setPayload(Schema.Struct({ friends: NimblebitConfig.PlayerIdSchema }))
    .addSuccess(ErrorResponse)
    .addSuccess(NotFoundResponse)
    .addSuccess(
        Schema.Struct({
            success: Schema.Literal("Found"),
            meta: Schema.Record({
                key: NimblebitConfig.PlayerIdSchema,
                value: TinyTowerSchema.PlayerMetaData,
            }),
        }),
        { status: 200 }
    );

/** @internal */
export const SocialPullFriendTowerEndpoint = HttpApiEndpoint.get(
    "SocialPullFriendTower"
)`/friend/pull_game/tt/${playerIdParam}/${friendIdParam}/${saltParam}/${hashParam}`
    .addSuccess(ErrorResponse)
    .addSuccess(NotFoundResponse)
    .addSuccess(
        Schema.Struct({
            success: Schema.Literal("Found"),
            data: Schema.Uint8ArrayFromBase64,
            checksum: Schema.String.pipe(Schema.propertySignature, Schema.fromKey("h")),
            saveId: Schema.NumberFromString.pipe(Schema.propertySignature, Schema.fromKey("id")),
            playerId: NimblebitConfig.PlayerIdSchema.pipe(Schema.propertySignature, Schema.fromKey("player_id")),
        }),
        { status: 200 }
    );

/** @internal */
export const SocialRetrieveFriendsSnapshotListEndpoint = HttpApiEndpoint.get(
    "SocialRetrieveFriendsSnapshotList"
)`/sync/current_player_snapshots/tt/${playerIdParam}/${friendIdParam}/${saltParam}/${hashParam}`
    .addSuccess(ErrorResponse)
    .addSuccess(NotFoundResponse)
    .addSuccess(
        Schema.Struct({
            success: Schema.Literal("Found"),
            saves: Schema.Array(
                Schema.Struct({
                    snapshotId: Schema.compose(Schema.NumberFromString, Schema.Int).pipe(
                        Schema.propertySignature,
                        Schema.fromKey("id")
                    ),
                    created: Schema.compose(
                        Schema.transform(Schema.NumberFromString, Schema.Int, {
                            encode: (n) => n / 1000,
                            decode: (n) => n * 1000,
                        }),
                        Schema.DateFromNumber
                    ),
                    meta: TinyTowerSchema.PlayerMetaData,
                })
            ),
        }),
        { status: 200 }
    );

/** @internal */
export const SocialGetVisitsEndpoint = HttpApiEndpoint.get(
    "SocialGetVisits"
)`/get_visits/tt/${playerIdParam}/${saltParam}/${hashParam}`
    .addSuccess(ErrorResponse)
    .addSuccess(NotFoundResponse)
    .addSuccess(
        Schema.Struct({
            success: Schema.Literal("Found"),
            gifts: Schema.Array(TinyTowerSchema.Gift),
            total: Schema.Int,
        }),
        { status: 200 }
    );

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
    .addError(HttpApiError.BadRequest)
    .addError(HttpApiError.Unauthorized)
    .addError(HttpApiError.InternalServerError)
    .add(DeviceManagementGroup)
    .add(SyncManagementGroup)
    .add(RaffleGroup)
    .add(SocialGroup);
