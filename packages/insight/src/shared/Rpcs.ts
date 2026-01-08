import * as Rpc from "@effect/rpc/Rpc";
import * as RpcGroup from "@effect/rpc/RpcGroup";
import * as Schema from "effect/Schema";

// export class TowerCredentials extends Schema.Class<TowerCredentials>("TowerCredentials")({
//     playerId: Schema.String,
//     playerAuthKey: Schema.String,
//     playerEmail: Schema.Option(Schema.String),
// }) {}

export const TowerCredentials = Schema.Struct({
    playerId: Schema.String,
    playerAuthKey: Schema.String,
    playerEmail: Schema.Option(Schema.String),
});

export class GameState extends Schema.Class<GameState>("GameState")({
    bux: Schema.Int,
    coins: Schema.Int,
    elevatorSpeed: Schema.Number,
    goldenTickets: Schema.Int,
    // allTimeGoldenTickets: Schema.Number,
    // numberOfFloors: Schema.Number,
    // numberOfBitizens: Schema.Number,
    // numberOfRoofsUnlocked: Schema.Number,
    // numberOfLobbiesUnlocked: Schema.Number,
    // numberOfCostumesUnlocked: Schema.Number,
    // numberOfElevatorsUnlocked: Schema.Number,
    // gameScreen: Schema.String,
}) {}

export class Rpcs extends RpcGroup.make(
    Rpc.make("Version", {
        success: Schema.String,
    }),
    Rpc.make("SetFps", {
        payload: Schema.Number,
        success: Schema.Void,
    }),
    Rpc.make("GetTowerCredentials", {
        success: TowerCredentials,
    }),
    Rpc.make("SetTowerCredentials", {
        payload: TowerCredentials,
        success: TowerCredentials,
    }),
    Rpc.make("GetGameState", {
        success: GameState,
    }),
    Rpc.make("GetAllFloors", {
        success: Schema.Struct({
            floors: Schema.Record({
                key: Schema.String,
                value: Schema.Struct({
                    index: Schema.String,
                    type: Schema.String,
                }),
            }),
            types: Schema.Record({
                key: Schema.String,
                value: Schema.String,
            }),
        }),
    }),
    Rpc.make("GetAllElevators", {
        success: Schema.Array(Schema.String),
    }),
    Rpc.make("GetAllRoofs", {
        success: Schema.Array(Schema.String),
    }),
    Rpc.make("GetAllCostumes", {
        success: Schema.Record({
            key: Schema.String,
            value: Schema.Record({
                key: Schema.String,
                value: Schema.Union(Schema.String, Schema.Number, Schema.Boolean),
            }),
        }),
    }),
    Rpc.make("GetAllBitbookPosts", {
        success: Schema.Struct({
            eventTypes: Schema.Record({
                key: Schema.String,
                value: Schema.String,
            }),
            mediaTypes: Schema.Record({
                key: Schema.String,
                value: Schema.String,
            }),
            posts: Schema.Array(
                Schema.Record({
                    key: Schema.String,
                    value: Schema.Union(Schema.String, Schema.Number, Schema.Boolean),
                })
            ),
        }),
    }),
    Rpc.make("GetAllBitizenData", {
        success: Schema.Struct({
            numberHairAccessories: Schema.Int,
            numberGlasses: Schema.Int,
            numberFemaleHats: Schema.Int,
            numberMaleHats: Schema.Int,
            numberBiHats: Schema.Int,
            maleNames: Schema.Array(Schema.String),
            femaleNames: Schema.Array(Schema.String),
            maleLastNames: Schema.Array(Schema.String),
            femaleLastNames: Schema.Array(Schema.String),
            skinColors: Schema.Array(Schema.String),
            hairColors: Schema.Array(Schema.String),
        }),
    }),
    Rpc.make("GetAllMissions", {
        success: Schema.Struct({
            types: Schema.Record({
                key: Schema.String,
                value: Schema.String,
            }),
            tutorialMissions: Schema.Array(
                Schema.Record({
                    key: Schema.String,
                    value: Schema.Union(Schema.String, Schema.Number, Schema.Boolean),
                })
            ),
            tipMissions: Schema.Array(
                Schema.Record({
                    key: Schema.String,
                    value: Schema.Union(Schema.String, Schema.Number, Schema.Boolean),
                })
            ),
            missions: Schema.Array(
                Schema.Record({
                    key: Schema.String,
                    value: Schema.Union(Schema.String, Schema.Number, Schema.Boolean),
                })
            ),
        }),
    }),
    Rpc.make("GetAllPets", {
        success: Schema.Record({
            key: Schema.String,
            value: Schema.Record({
                key: Schema.String,
                value: Schema.Union(Schema.String, Schema.Number, Schema.Boolean),
            }),
        }),
    })
) {}
