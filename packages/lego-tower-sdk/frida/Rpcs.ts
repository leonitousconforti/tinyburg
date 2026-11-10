import { Schema } from "effect";
import { Rpc, RpcGroup } from "effect/rpc";

import * as Insight from "@tinyburg/insight/shared/Rpcs";

const Enum = Schema.Record(Schema.String, Schema.String);
const Ids = Schema.Array(Schema.String);

/** The RPCs only LEGO Tower's agent serves. */
export class LegoTowerRpcs extends RpcGroup.make(
    Rpc.make("GetAllFloors", {
        success: Schema.Struct({
            types: Enum,
            floors: Schema.Array(Schema.Struct({ id: Schema.String, type: Schema.String })),
        }),
    }),
    Rpc.make("GetAllSets", {
        success: Schema.Struct({
            roofs: Ids,
            elevators: Ids,
            vehicles: Schema.Array(Schema.Struct({ id: Schema.String, cost: Schema.Finite })),
            vipVehicles: Ids,
            skylines: Ids,
            clubExclusive: Ids,
            promotional: Ids,
        }),
    }),
    Rpc.make("GetAllPieces", {
        success: Schema.Struct({
            types: Enum,
            goldRarity: Schema.Finite,
            silverRarity: Schema.Finite,
            pieces: Schema.Array(
                Schema.Struct({
                    id: Schema.String,
                    shortId: Schema.String,
                    type: Schema.String,
                    rarity: Schema.Finite,
                    pedestrian: Schema.Boolean,
                })
            ),
        }),
    }),
    Rpc.make("GetAllMissions", {
        success: Schema.Struct({
            types: Enum,
            missions: Schema.Array(
                Schema.Struct({
                    id: Schema.String,
                    type: Schema.String,
                    vehicle: Schema.String,
                    holiday: Schema.String,
                })
            ),
            props: Ids,
        }),
    }),
    Rpc.make("GetAllMinifigures", {
        success: Schema.Struct({
            maleNames: Schema.Record(Schema.String, Ids),
            femaleNames: Schema.Record(Schema.String, Ids),
            surnames: Schema.Record(Schema.String, Ids),
            hiddenCharacters: Schema.Record(
                Schema.String,
                Schema.Struct({
                    headTop: Schema.String,
                    head: Schema.String,
                    torso: Schema.String,
                    legs: Schema.String,
                    brickBookPost: Schema.String,
                    prop: Schema.String,
                    minifigure: Schema.String,
                })
            ),
            pedestrianPieces: Schema.Struct({
                maleHair: Ids,
                femaleHair: Ids,
                heads: Ids,
                torsos: Ids,
                legs: Ids,
            }),
        }),
    })
) {}

/** Everything LEGO Tower's agent serves: insight's own RPCs and LEGO Tower's. */
export class Rpcs extends Insight.Rpcs.merge(LegoTowerRpcs) {}
