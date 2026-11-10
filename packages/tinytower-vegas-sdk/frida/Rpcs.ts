import { Schema } from "effect";
import { Rpc, RpcGroup } from "effect/rpc";

import * as Insight from "@tinyburg/insight/shared/Rpcs";

export const Floor = Schema.Struct({
    name: Schema.String,
    type: Schema.String,
    subType: Schema.optionalKey(Schema.String),
    buxCost: Schema.optionalKey(Schema.Int),
    chipCost: Schema.optionalKey(Schema.Int),
    character: Schema.optionalKey(Schema.String),
    products: Schema.optionalKey(Schema.Array(Schema.String)),
    stockTime: Schema.optionalKey(Schema.Int),
    holiday: Schema.optionalKey(Schema.String),
});

export const Elevator = Schema.Struct({
    name: Schema.String,
    buxCost: Schema.optionalKey(Schema.Int),
    chipCost: Schema.optionalKey(Schema.Int),
    holiday: Schema.optionalKey(Schema.String),
});

export const Roof = Schema.Struct({
    name: Schema.String,
    buxCost: Schema.optionalKey(Schema.Int),
    chipCost: Schema.optionalKey(Schema.Int),
    platform: Schema.optionalKey(Schema.String),
    holiday: Schema.optionalKey(Schema.String),
    hidden: Schema.optionalKey(Schema.Boolean),
});

export const Mission = Schema.Struct({
    id: Schema.Int,
    type: Schema.String,
    text: Schema.String,
    characterId: Schema.String,
    prop: Schema.optionalKey(Schema.String),
    floorType: Schema.String,
    count: Schema.Int,
});

export const Character = Schema.Struct({
    id: Schema.String,
    name: Schema.String,
    costume: Schema.String,
    missionComplete: Schema.String,
    holiday: Schema.String,
});

/** The RPCs only Tiny Tower Vegas's agent serves. */
export class TinyTowerVegasRpcs extends RpcGroup.make(
    Rpc.make("GetAllFloors", {
        success: Schema.Struct({
            types: Schema.Record(Schema.String, Schema.String),
            subTypes: Schema.Record(Schema.String, Schema.String),
            floors: Schema.Array(Floor),
        }),
    }),
    Rpc.make("GetAllElevators", {
        success: Schema.Array(Elevator),
    }),
    Rpc.make("GetAllRoofs", {
        success: Schema.Array(Roof),
    }),
    Rpc.make("GetAllMissions", {
        success: Schema.Struct({
            types: Schema.Record(Schema.String, Schema.String),
            tutorialMissions: Schema.Array(Mission),
            tipMissions: Schema.Array(Mission),
            missions: Schema.Array(Mission),
        }),
    }),
    Rpc.make("GetAllBitizenData", {
        success: Schema.Struct({
            maleNames: Schema.Array(Schema.String),
            femaleNames: Schema.Array(Schema.String),
            lastNames: Schema.Array(Schema.String),
            cities: Schema.Array(Schema.String),
        }),
    }),
    Rpc.make("GetAllCharacters", {
        success: Schema.Array(Character),
    })
) {}

/** Everything Tiny Tower Vegas's agent serves: insight's own RPCs and Tiny Tower Vegas's. */
export class Rpcs extends Insight.Rpcs.merge(TinyTowerVegasRpcs) {}
