import * as HttpApi from "@effect/platform/HttpApi";
import * as HttpApiEndpoint from "@effect/platform/HttpApiEndpoint";
import * as HttpApiError from "@effect/platform/HttpApiError";
import * as HttpApiGroup from "@effect/platform/HttpApiGroup";
import * as EffectSchemas from "effect-schemas";
import * as Schema from "effect/Schema";

import * as HttpApiSchema from "@effect/platform/HttpApiSchema";
import * as NimblebitConfig from "../NimblebitConfig.ts";

/** @internal */
export const hashParam = HttpApiSchema.param("hash", Schema.String);

/** @internal */
export const playerIdParam = HttpApiSchema.param("playerId", NimblebitConfig.PlayerIdSchema);

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
export const NewUserEndpoint = HttpApiEndpoint.get(
    "NewUser"
)`/register/tt/${salt1Param}/${salt2Param}/${hashParam}`.addSuccess(
    Schema.Union(
        Schema.Struct({
            player_id: Schema.String,
            player_ss: Schema.String,
        }),
        Schema.Struct({
            error: Schema.String,
        })
    ),
    { status: 200 }
);

/** @internal */
export const PlayerDetailsEndpoint = HttpApiEndpoint.get(
    "PlayerDetails"
)`/player_details/tt/${playerIdParam}/${saltParam}/${hashParam}`.addSuccess(
    Schema.Union(
        Schema.Struct({
            player: Schema.Struct({
                email: Schema.String,
                player_id: Schema.String,
                registered: Schema.compose(Schema.NumberFromString, Schema.BooleanFromUnknown),
                blacklisted: Schema.compose(Schema.NumberFromString, Schema.BooleanFromUnknown),
                id: Schema.optionalWith(Schema.NumberFromString, { nullable: true }),
                h: Schema.String,
            }),
        }),
        Schema.Struct({
            error: Schema.String,
        })
    ),
    { status: 200 }
);

/** @internal */
export const VerifyDeviceEndpoint = HttpApiEndpoint.get(
    "VerifyDevice"
)`/verify_device/tt/${playerIdParam}/:${HttpApiSchema.param("verificationCode", Schema.String)}`.addSuccess(
    Schema.Union(
        Schema.Struct({
            success: Schema.Literal("NewDevice"),
            player_ss: Schema.String,
            player_email: Schema.String,
            player_id: NimblebitConfig.PlayerIdSchema,
            player_photo: Schema.optionalWith(Schema.String, { nullable: true }),
            player_nickname: Schema.optionalWith(Schema.String, { nullable: true }),
        }),
        Schema.Struct({
            error: Schema.String,
        })
    )
);

/** @internal */
export const RegisterEmail = HttpApiEndpoint.post(
    "RegisterEmail"
)`/register_email/tt/${playerIdParam}/${saltParam}/${hashParam}`
    .setPayload(
        Schema.Struct({
            promote: Schema.Literal(1),
            email: Schema.Redacted(Schema.String),
        })
    )
    .addSuccess(
        Schema.Union(
            Schema.Struct({
                success: Schema.Literal("NewDevice", "NewEmail"),
            }),
            Schema.Struct({
                error: Schema.String,
            })
        )
    );

/** @internal */
export const PullSaveEndpoint = HttpApiEndpoint.get(
    "PullSave"
)`/sync/pull/tt/${playerIdParam}/${saltParam}/${hashParam}`.addSuccess(
    Schema.Union(
        Schema.Struct({
            success: Schema.Literal("Found"),
            data: Schema.Uint8ArrayFromBase64,
            checksum: Schema.String.pipe(Schema.propertySignature, Schema.fromKey("h")),
            saveId: Schema.NumberFromString.pipe(Schema.propertySignature, Schema.fromKey("id")),
        }),
        Schema.Struct({
            success: Schema.Literal("NotFound"),
        }),
        Schema.Struct({
            error: Schema.String,
        })
    ),
    { status: 200 }
);

/** @internal */
export const PushSaveEndpoint = HttpApiEndpoint.post(
    "PushSave"
)`/sync/push/tt/${playerIdParam}/${saltParam}/${hashParam}`;

/** @internal */
export const CheckForNewerSaveEndpoint = HttpApiEndpoint.get(
    "CheckForNewerSave"
)`/sync/current_version/tt/${playerIdParam}/${saltParam}/${hashParam}`.addSuccess(
    Schema.Union(
        Schema.Struct({
            success: Schema.Literal("Found", "NotFound"),
            saveId: Schema.NumberFromString.pipe(Schema.propertySignature, Schema.fromKey("id")),
            checksum: Schema.String.pipe(Schema.propertySignature, Schema.fromKey("h")),
        }),
        Schema.Struct({
            error: Schema.String,
        })
    ),
    { status: 200 }
);

/** @internal */
export const PushSnapshotEndpoint = HttpApiEndpoint.post(
    "PushSnapshot"
)`/sync/push_snapshot/tt/${playerIdParam}/${saltParam}/${hashParam}`;

/** @internal */
export const PullSnapshotEndpoint = HttpApiEndpoint.get(
    "PullSnapshot"
)`/sync/pull_snapshot/tt/${playerIdParam}/${saltParam}/${hashParam}`;

/** @internal */
export const RetrieveSnapshotListEndpoint = HttpApiEndpoint.get(
    "RetrieveSnapshotList"
)`/sync/current_snapshots/tt/${playerIdParam}/${saltParam}/${hashParam}`;

/** @internal */
export const RetrieveFriendsSnapshotListEndpoint = HttpApiEndpoint.get(
    "RetrieveFriendsSnapshotList"
)`/sync/current_player_snapshots/tt/${playerIdParam}/${saltParam}/${hashParam}`;

/** @internal */
export const EnterRaffleEndpoint = HttpApiEndpoint.post(
    "EnterRaffle"
)`/raffle/enter/tt/${playerIdParam}/${saltParam}/${hashParam}`.addSuccess(
    Schema.Union(
        Schema.Struct({
            success: Schema.Literal("Entered", "NotEntered"),
        }),
        Schema.Struct({
            error: Schema.String,
        })
    ),
    { status: 200 }
);

/** @internal */
export const EnterMultiRaffleEndpoint = HttpApiEndpoint.post(
    "EnterMultiRaffle"
)`/raffle/enter_multi/tt/${playerIdParam}/${saltParam}/${hashParam}`.addSuccess(
    Schema.Union(
        Schema.Struct({
            success: Schema.Literal("Entered", "NotEntered"),
        }),
        Schema.Struct({
            error: Schema.String,
        })
    ),
    { status: 200 }
);

/** @internal */
export const EnteredCurrentEndpoint = HttpApiEndpoint.get(
    "EnteredCurrent"
)`/raffle/entered_current/tt/${playerIdParam}/${saltParam}/${hashParam}`.addSuccess(
    Schema.Union(
        Schema.Struct({
            success: Schema.Literal("Entered", "NotEntered"),
        }),
        Schema.Struct({
            error: Schema.String,
        })
    ),
    { status: 200 }
);

/** @internal */
export const SendItemEndpoint = HttpApiEndpoint.post(
    "SendItem"
)`/send_item/tt/${playerIdParam}/${saltParam}/${hashParam}`;

/** @internal */
export const GetGiftsEndpoint = HttpApiEndpoint.get(
    "GetGifts"
)`/get_gifts/tt/${playerIdParam}/${saltParam}/${hashParam}`;

/** @internal */
export const ReceiveGiftEndpoint = HttpApiEndpoint.post(
    "ReceiveGift"
)`/receive_item/tt/${playerIdParam}/${saltParam}/${hashParam}`;

/** @internal */
export const FriendPullMetaEndpoint = HttpApiEndpoint.get(
    "FriendPullMeta"
)`/friend/pull_meta/tt/${playerIdParam}/${saltParam}/${hashParam}`;

/** @internal */
export const FriendPullTowerEndpoint = HttpApiEndpoint.get(
    "FriendPullTower"
)`/friend/pull_game/tt/${playerIdParam}/${saltParam}/${hashParam}`;

/** @internal */
export const GetVisitsEndpoint = HttpApiEndpoint.get(
    "GetVisits"
)`/get_visits/tt/${playerIdParam}/${saltParam}/${hashParam}`;

/** @internal */
export const PlayerManagementGroup = HttpApiGroup.make("PlayerManagementGroup")
    .add(NewUserEndpoint)
    .add(PlayerDetailsEndpoint)
    .add(VerifyDeviceEndpoint)
    .add(RegisterEmail);

/** @internal */
export const SaveManagementGroup = HttpApiGroup.make("SaveManagementGroup")
    .add(PullSaveEndpoint)
    .add(PushSaveEndpoint)
    .add(CheckForNewerSaveEndpoint)
    .add(PushSnapshotEndpoint)
    .add(PullSnapshotEndpoint)
    .add(RetrieveSnapshotListEndpoint)
    .add(RetrieveFriendsSnapshotListEndpoint);

/** @internal */
export const RaffleGroup = HttpApiGroup.make("RaffleGroup")
    .add(EnterRaffleEndpoint)
    .add(EnterMultiRaffleEndpoint)
    .add(EnteredCurrentEndpoint);

/** @internal */
export const FriendsGroup = HttpApiGroup.make("FriendsGroup")
    .add(SendItemEndpoint)
    .add(GetGiftsEndpoint)
    .add(ReceiveGiftEndpoint)
    .add(FriendPullMetaEndpoint)
    .add(FriendPullTowerEndpoint)
    .add(GetVisitsEndpoint);

/** @internal */
export const Api = HttpApi.make("TinyTowerApi")
    .addError(HttpApiError.BadRequest)
    .addError(HttpApiError.InternalServerError)
    .add(PlayerManagementGroup)
    .add(SaveManagementGroup)
    .add(RaffleGroup)
    .add(FriendsGroup);
