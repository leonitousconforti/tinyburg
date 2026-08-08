import * as Schema from "effect/Schema";
import * as Rpc from "effect/unstable/rpc/Rpc";
import * as RpcGroup from "effect/unstable/rpc/RpcGroup";

export const TowerCredentials = Schema.Struct({
    playerId: Schema.String,
    playerAuthKey: Schema.String,
    playerEmail: Schema.Option(Schema.String),
});

export class GameState extends Schema.Class<GameState>("GameState")({
    bux: Schema.Int,
    coins: Schema.Int,
    elevatorSpeed: Schema.Finite,
    goldenTickets: Schema.Int,
    // allTimeGoldenTickets: Schema.Finite,
    // numberOfFloors: Schema.Finite,
    // numberOfBitizens: Schema.Finite,
    // numberOfRoofsUnlocked: Schema.Finite,
    // numberOfLobbiesUnlocked: Schema.Finite,
    // numberOfCostumesUnlocked: Schema.Finite,
    // numberOfElevatorsUnlocked: Schema.Finite,
    // gameScreen: Schema.String,
}) {}

export class Rpcs extends RpcGroup.make(
    Rpc.make("Version", {
        success: Schema.String,
    }),
    Rpc.make("SetFps", {
        payload: Schema.Finite,
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
            floors: Schema.Record(
                Schema.String,
                Schema.Struct({
                    index: Schema.String,
                    type: Schema.String,
                })
            ),
            types: Schema.Record(Schema.String, Schema.String),
        }),
    }),
    Rpc.make("GetAllElevators", {
        success: Schema.Array(Schema.String),
    }),
    Rpc.make("GetAllRoofs", {
        success: Schema.Array(Schema.String),
    }),
    Rpc.make("GetAllCostumes", {
        success: Schema.Record(Schema.String, Schema.Record(Schema.String, Schema.String)),
    }),
    Rpc.make("GetAllBitbookPosts", {
        success: Schema.Struct({
            eventTypes: Schema.Record(Schema.String, Schema.String),
            mediaTypes: Schema.Record(Schema.String, Schema.String),
            posts: Schema.Array(Schema.Record(Schema.String, Schema.String)),
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
            types: Schema.Record(Schema.String, Schema.String),
            tutorialMissions: Schema.Array(Schema.Record(Schema.String, Schema.String)),
            tipMissions: Schema.Array(Schema.Record(Schema.String, Schema.String)),
            missions: Schema.Array(Schema.Record(Schema.String, Schema.String)),
        }),
    }),
    Rpc.make("GetAllPets", {
        success: Schema.Record(Schema.String, Schema.Record(Schema.String, Schema.Boolean)),
    })
) {}
