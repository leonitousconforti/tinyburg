import { Schema } from "effect";
import { Rpc, RpcGroup } from "effect/rpc";

import * as Insight from "@tinyburg/insight/shared/Rpcs";

/** An enum's members, by name. */
const Enum = Schema.Record(Schema.String, Schema.String);

export const Building = Schema.Struct({
    name: Schema.String,
    prefab: Schema.String,
    type: Schema.String,
    size: Schema.Int,
    levels: Schema.String,
    dp: Schema.optionalKey(Schema.String),
    boost: Schema.optionalKey(Schema.Int),
});

export const Mission = Schema.Struct({
    id: Schema.String,
    type: Schema.String,
    need: Schema.Finite,
    title: Schema.String,
    description: Schema.String,
    prefab: Schema.optionalKey(Schema.String),
});

export const Upgrade = Schema.Struct({
    id: Schema.String,
    var: Schema.String,
    tier: Schema.Int,
    max: Schema.Int,
    displayDelta: Schema.Int,
    varDelta: Schema.Finite,
    bcp: Schema.Finite,
    eD: Schema.Finite,
    button: Schema.String,
    titles: Schema.Array(Schema.String),
    descriptions: Schema.Array(Schema.String),
    icons: Schema.Array(Schema.String),
});

export const Car = Schema.Struct({
    name: Schema.String,
    prefab: Schema.String,
    icon: Schema.String,
    description: Schema.String,
});

export const VehicleVariant = Schema.Struct({
    name: Schema.String,
    prefab: Schema.String,
    icon: Schema.String,
    speed: Schema.Finite,
    description: Schema.String,
});

/** The RPCs only Bit City's agent serves. */
export class BitCityRpcs extends RpcGroup.make(
    Rpc.make("GetAllBuildings", {
        success: Schema.Struct({
            zoneTypes: Enum,
            buildings: Schema.Array(Building),
        }),
    }),
    Rpc.make("GetAllCities", {
        success: Schema.Array(Schema.String),
    }),
    Rpc.make("GetAllMissions", {
        success: Schema.Struct({
            types: Enum,
            missions: Schema.Array(Mission),
        }),
    }),
    Rpc.make("GetAllUpgrades", {
        success: Schema.Struct({
            vars: Enum,
            upgrades: Schema.Array(Upgrade),
        }),
    }),
    Rpc.make("GetAllVehicles", {
        success: Schema.Struct({
            cars: Schema.Array(Car),
            boats: Schema.Array(Schema.Array(VehicleVariant)),
            planes: Schema.Array(Schema.Array(VehicleVariant)),
        }),
    })
) {}

/** Everything Bit City's agent serves: insight's own RPCs and Bit City's. */
export class Rpcs extends Insight.Rpcs.merge(BitCityRpcs) {}
