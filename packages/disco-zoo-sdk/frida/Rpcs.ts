import { Schema } from "effect";
import { Rpc, RpcGroup } from "effect/rpc";

import * as Insight from "@tinyburg/insight/shared/Rpcs";

/** A hat or a decoration: both are bought the same way. */
const ShopItem = Schema.Struct({
    name: Schema.String,
    character: Schema.String,
    title: Schema.String,
    cost: Schema.Int,
    costIsBux: Schema.Boolean,
});

/** The RPCs only Disco Zoo's agent serves. */
export class DiscoZooRpcs extends RpcGroup.make(
    Rpc.make("GetAllAnimals", {
        success: Schema.Struct({
            rarities: Schema.Record(
                Schema.String,
                Schema.Struct({
                    weight: Schema.Finite,
                    freedomMultiplier: Schema.Finite,
                    rescuesToGetOne: Schema.Finite,
                })
            ),
            animals: Schema.Array(
                Schema.Struct({
                    slug: Schema.String,
                    title: Schema.String,
                    titlePlural: Schema.String,
                    region: Schema.String,
                    rarity: Schema.String,
                    coinsPerMinute: Schema.Finite,
                    buildTicks: Schema.Int,
                    baseAwakeTicks: Schema.Int,
                    awakeIncrementTicks: Schema.Int,
                    pattern: Schema.String,
                })
            ),
        }),
    }),
    Rpc.make("GetAllRegions", {
        success: Schema.Array(
            Schema.Struct({
                slug: Schema.String,
                title: Schema.String,
                isSpaceRegion: Schema.Boolean,
                aircraft: Schema.Struct({
                    slug: Schema.String,
                    title: Schema.String,
                }),
                aircraftCost: Schema.Int,
                aircraftBuxCost: Schema.Int,
                baseExploreCost: Schema.Int,
                maxExploreCost: Schema.Int,
                exploreCostIncrement: Schema.Int,
            })
        ),
    }),
    Rpc.make("GetAllPets", {
        success: Schema.Struct({
            grades: Schema.Array(Schema.String),
            species: Schema.Array(
                Schema.Struct({
                    slug: Schema.String,
                    title: Schema.String,
                    titlePlural: Schema.String,
                    numberOfBreeds: Schema.Int,
                })
            ),
            quirks: Schema.Array(
                Schema.Struct({
                    slug: Schema.String,
                    id: Schema.String,
                    group: Schema.String,
                    species: Schema.Array(Schema.String),
                    ailment: Schema.String,
                    charm: Schema.String,
                    rareCharm: Schema.String,
                })
            ),
        }),
    }),
    Rpc.make("GetAllHats", {
        success: Schema.Array(ShopItem),
    }),
    Rpc.make("GetAllDecorations", {
        success: Schema.Array(ShopItem),
    }),
    Rpc.make("GetAllToys", {
        success: Schema.Array(
            Schema.Struct({
                name: Schema.String,
                character: Schema.String,
                title: Schema.String,
                description: Schema.String,
                coinCost: Schema.Int,
                buxCost: Schema.Int,
            })
        ),
    })
) {}

/** Everything Disco Zoo's agent serves: insight's own RPCs and Disco Zoo's. */
export class Rpcs extends Insight.Rpcs.merge(DiscoZooRpcs) {}
