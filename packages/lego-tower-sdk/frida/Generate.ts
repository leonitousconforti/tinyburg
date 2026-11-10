import { Effect, Path } from "effect";
import { RpcClient } from "effect/rpc";

import { NodeRuntime, NodeServices } from "@effect/platform-node";
import * as Generate from "@tinyburg/insight/node/Generate";

import { Rpcs } from "./Rpcs.ts";

// Regenerates the data files in ../src from LEGO Tower itself, on insight's
// emulator, unless they are from the game's current version on Google Play.
// `--force` regenerates them anyway. See packages/insight/README.md.
const files = ["Floors", "Minifigures", "Missions", "Pieces", "Sets"];

const generate = Effect.gen(function* () {
    const path = yield* Path.Path;
    const srcDir = yield* path.fromFileUrl(new URL("../src", import.meta.url));

    const client = yield* RpcClient.make(Rpcs);
    yield* client.SetFps(1);
    yield* Effect.sleep("5 seconds");
    const version = yield* client.Version();
    yield* Effect.logInfo(`LEGO Tower version: ${version}`);
    const banner = yield* Generate.banner("LEGO Tower", version);

    yield* Effect.logInfo("Generating floors data");
    const { floors, types: floorTypes } = yield* client.GetAllFloors();
    yield* Generate.replaceGeneratedContent(
        path.join(srcDir, "Floors.ts"),
        `${banner}
        export const floorType = ${JSON.stringify(floorTypes)} as const;\n
        export type FloorType = keyof typeof floorType;\n\n
        export const floors = ${Generate.replaceEnumTypeFields(JSON.stringify(floors), "type", floorTypes, "floorType")} as const;\n
        export type Floor = (typeof floors)[number];
        `
    );

    yield* Effect.logInfo("Generating minifigures data");
    const { femaleNames, hiddenCharacters, maleNames, pedestrianPieces, surnames } = yield* client.GetAllMinifigures();
    yield* Generate.replaceGeneratedContent(
        path.join(srcDir, "Minifigures.ts"),
        `${banner}
        export const maleNames = ${JSON.stringify(maleNames)} as const;\n
        export const femaleNames = ${JSON.stringify(femaleNames)} as const;\n
        export const surnames = ${JSON.stringify(surnames)} as const;\n
        export const hiddenCharacters = ${JSON.stringify(hiddenCharacters)} as const;\n
        export type HiddenCharacter = keyof typeof hiddenCharacters;\n\n
        export const pedestrianPieces = ${JSON.stringify(pedestrianPieces)} as const;
        `
    );

    yield* Effect.logInfo("Generating missions data");
    const { missions, props, types: missionTypes } = yield* client.GetAllMissions();
    yield* Generate.replaceGeneratedContent(
        path.join(srcDir, "Missions.ts"),
        `${banner}
        export const missionType = ${JSON.stringify(missionTypes)} as const;\n
        export type MissionType = keyof typeof missionType;\n\n
        export const missions = ${Generate.replaceEnumTypeFields(JSON.stringify(missions), "type", missionTypes, "missionType")} as const;\n
        export type Mission = (typeof missions)[number];\n\n
        export const props = ${JSON.stringify(props)} as const;\n
        export type Prop = (typeof props)[number];
        `
    );

    yield* Effect.logInfo("Generating pieces data");
    const { goldRarity, pieces, silverRarity, types: pieceTypes } = yield* client.GetAllPieces();
    yield* Generate.replaceGeneratedContent(
        path.join(srcDir, "Pieces.ts"),
        `${banner}
        export const pieceType = ${JSON.stringify(pieceTypes)} as const;\n
        export type PieceType = keyof typeof pieceType;\n\n
        export const goldRarity = ${goldRarity} as const;
        export const silverRarity = ${silverRarity} as const;\n
        export const pieces = ${Generate.replaceEnumTypeFields(JSON.stringify(pieces), "type", pieceTypes, "pieceType")} as const;\n
        export type Piece = (typeof pieces)[number];
        `
    );

    yield* Effect.logInfo("Generating sets data");
    const { clubExclusive, elevators, promotional, roofs, skylines, vehicles, vipVehicles } =
        yield* client.GetAllSets();
    yield* Generate.replaceGeneratedContent(
        path.join(srcDir, "Sets.ts"),
        `${banner}
        export const roofs = ${JSON.stringify(roofs)} as const;\n
        export type Roof = (typeof roofs)[number];\n\n
        export const elevators = ${JSON.stringify(elevators)} as const;\n
        export type Elevator = (typeof elevators)[number];\n\n
        export const vehicles = ${JSON.stringify(vehicles)} as const;\n
        export type Vehicle = (typeof vehicles)[number];\n\n
        export const vipVehicles = ${JSON.stringify(vipVehicles)} as const;\n
        export type VipVehicle = (typeof vipVehicles)[number];\n\n
        export const skylines = ${JSON.stringify(skylines)} as const;\n
        export type Skyline = (typeof skylines)[number];\n\n
        export const clubExclusive = ${JSON.stringify(clubExclusive)} as const;\n
        export const promotional = ${JSON.stringify(promotional)} as const;
        `
    );
});

Effect.gen(function* () {
    const path = yield* Path.Path;
    const srcDir = yield* path.fromFileUrl(new URL("../src", import.meta.url));
    yield* Generate.main({
        bundleIdentifier: "com.nimblebit.legotower",
        game: "LEGO Tower",
        agent: new URL("./Agent.ts", import.meta.url),
        files: files.map((file) => path.join(srcDir, `${file}.ts`)),
        force: process.argv.includes("--force"),
        generate,
    });
}).pipe(Effect.provide(NodeServices.layer), NodeRuntime.runMain);
