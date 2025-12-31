import * as Rpc from "@effect/rpc/Rpc";
import * as RpcGroup from "@effect/rpc/RpcGroup";
import * as Schema from "effect/Schema";

export class TowerCredentials extends Schema.Class<TowerCredentials>("TowerCredentials")({
    playerId: Schema.String,
    playerSalt: Schema.String,
    playerEmail: Schema.Option(Schema.String),
}) {}

export class GameState extends Schema.Class<GameState>("GameState")({
    version: Schema.String,
    bux: Schema.Number,
    coins: Schema.Number,
    elevatorSpeed: Schema.Number,
    goldenTickets: Schema.Number,
    allTimeGoldenTickets: Schema.Number,
    numberOfFloors: Schema.Number,
    numberOfBitizens: Schema.Number,
    numberOfRoofsUnlocked: Schema.Number,
    numberOfLobbiesUnlocked: Schema.Number,
    numberOfCostumesUnlocked: Schema.Number,
    numberOfElevatorsUnlocked: Schema.Number,
    gameScreen: Schema.String,
}) {}

export class Rpcs extends RpcGroup.make(
    Rpc.make("Version", {
        success: Schema.String,
    }),
    Rpc.make("GetTowerCredentials", {
        success: TowerCredentials,
    }),
    Rpc.make("SetTowerCredentials", {
        payload: TowerCredentials,
        success: TowerCredentials,
    })
    // Rpc.make("GetGameState", {
    //     success: GameState,
    // })
) {}
