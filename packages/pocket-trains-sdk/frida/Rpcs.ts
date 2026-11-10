import { Schema } from "effect";
import { Rpc, RpcGroup } from "effect/rpc";

import * as Insight from "@tinyburg/insight/shared/Rpcs";

/** A car a train can haul: freight (type `j`, for job) or passengers (`p`). */
export const Car = Schema.Struct({
    id: Schema.Int,
    name: Schema.String,
    type: Schema.String,
    value: Schema.Int,
    active: Schema.Boolean,
});

export const City = Schema.Struct({
    id: Schema.Int,
    name: Schema.String,
    region: Schema.String,
});

export const Engine = Schema.Struct({
    id: Schema.Int,
    name: Schema.String,
    level: Schema.Int,
    maxCars: Schema.Int,
    speed: Schema.Finite,
    fuel: Schema.Int,
    maxEngines: Schema.Int,
    maxTenders: Schema.Int,
    special: Schema.Boolean,
});

/** A city event: deliveries of one car into (`inbound`) or out of the event's city. */
export const EventInfo = Schema.Struct({
    story: Schema.String,
    carId: Schema.Int,
    inbound: Schema.Boolean,
    costume: Schema.NullOr(Schema.String),
});

/** A track between two cities. */
export const Track = Schema.Struct({
    id: Schema.Int,
    name: Schema.String,
    cityAId: Schema.Int,
    cityBId: Schema.Int,
    distance: Schema.Finite,
});

/** The RPCs only Pocket Trains' agent serves. */
export class PocketTrainsRpcs extends RpcGroup.make(
    Rpc.make("GetAllCars", {
        success: Schema.Array(Car),
    }),
    Rpc.make("GetAllCities", {
        success: Schema.Struct({
            regions: Schema.Array(Schema.String),
            cities: Schema.Array(City),
        }),
    }),
    Rpc.make("GetAllEngines", {
        success: Schema.Array(Engine),
    }),
    Rpc.make("GetAllEvents", {
        success: Schema.Array(EventInfo),
    }),
    Rpc.make("GetAllTracks", {
        success: Schema.Array(Track),
    })
) {}

/** Everything Pocket Trains' agent serves: insight's own RPCs and Pocket Trains'. */
export class Rpcs extends Insight.Rpcs.merge(PocketTrainsRpcs) {}
