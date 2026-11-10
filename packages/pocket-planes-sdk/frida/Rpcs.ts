import { Schema } from "effect";
import { Rpc, RpcGroup } from "effect/rpc";

import * as Insight from "@tinyburg/insight/shared/Rpcs";

/** A city of the world map, from `CityMetaTable`. */
export const City = Schema.Struct({
    id: Schema.Int,
    name: Schema.String,
    region: Schema.String,
    countryCode: Schema.String,
    population: Schema.Finite,
    x: Schema.Int,
    y: Schema.Int,
    factoid: Schema.String,
});

/** A plane, from `PlaneMetaTable`. */
export const Plane = Schema.Struct({
    id: Schema.Int,
    name: Schema.String,
    level: Schema.Int,
    airportClass: Schema.Int,
    engine: Schema.Int,
    speed: Schema.Finite,
    range: Schema.Finite,
    weight: Schema.Finite,
    costMultiplier: Schema.Finite,
    layout: Schema.String,
});

/** A plane skin, from `SkinTable`. */
export const Skin = Schema.Struct({
    id: Schema.String,
    planeIds: Schema.Array(Schema.Int),
    homeCityId: Schema.Int,
});

/** A city event, from `CityEventTable`. */
export const CityEvent = Schema.Struct({
    id: Schema.Int,
    name: Schema.String,
    type: Schema.String,
    alert: Schema.Boolean,
    chance: Schema.Int,
    maxDuration: Schema.Int,
    closure: Schema.Int,
    reward: Schema.Int,
    zones: Schema.String,
    passengersIn: Schema.String,
    passengersOut: Schema.String,
    cargoIn: Schema.String,
    cargoOut: Schema.String,
});

/** The RPCs only Pocket Planes' agent serves. */
export class PocketPlanesRpcs extends RpcGroup.make(
    Rpc.make("GetAllCities", {
        success: Schema.Array(City),
    }),
    Rpc.make("GetAllPlanes", {
        success: Schema.Array(Plane),
    }),
    Rpc.make("GetAllSkins", {
        success: Schema.Array(Skin),
    }),
    Rpc.make("GetAllCityEvents", {
        success: Schema.Struct({
            types: Schema.Record(Schema.String, Schema.String),
            events: Schema.Array(CityEvent),
        }),
    }),
    Rpc.make("GetAllCargo", {
        success: Schema.Struct({
            packageNames: Schema.Array(Schema.String),
            vipPackageNames: Schema.Array(Schema.String),
        }),
    }),
    Rpc.make("GetAllBitizenNames", {
        success: Schema.Struct({
            maleNames: Schema.Array(Schema.String),
            femaleNames: Schema.Array(Schema.String),
            lastNames: Schema.Array(Schema.String),
        }),
    })
) {}

/** Everything Pocket Planes' agent serves: insight's own RPCs and Pocket Planes'. */
export class Rpcs extends Insight.Rpcs.merge(PocketPlanesRpcs) {}
