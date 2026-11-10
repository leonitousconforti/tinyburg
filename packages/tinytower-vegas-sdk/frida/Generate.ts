import { Effect, Path } from "effect";
import { RpcClient } from "effect/rpc";

import { NodeRuntime, NodeServices } from "@effect/platform-node";
import * as Generate from "@tinyburg/insight/node/Generate";

import { Rpcs } from "./Rpcs.ts";

// Regenerates the data files in ../src from Tiny Tower Vegas itself, on
// insight's emulator, unless they are from the game's current version on
// Google Play. `--force` regenerates them anyway. See packages/insight/README.md.
const files = ["Bitizens", "Characters", "Elevators", "Floors", "Missions", "Roofs"];

const generate = Effect.gen(function* () {
    const path = yield* Path.Path;
    const srcDir = yield* path.fromFileUrl(new URL("../src", import.meta.url));

    const client = yield* RpcClient.make(Rpcs);
    yield* client.SetFps(1);
    yield* Effect.sleep("5 seconds");
    const version = yield* client.Version();
    yield* Effect.logInfo(`Tiny Tower Vegas version: ${version}`);
    const banner = yield* Generate.banner("Tiny Tower Vegas", version);

    yield* Effect.logInfo("Generating bitizen data");
    const { cities, femaleNames, lastNames, maleNames } = yield* client.GetAllBitizenData();
    yield* Generate.replaceGeneratedContent(
        path.join(srcDir, "Bitizens.ts"),
        `${banner}
        export const maleNames = ${JSON.stringify(maleNames)} as const;\n
        export const femaleNames = ${JSON.stringify(femaleNames)} as const;\n
        export const lastNames = ${JSON.stringify(lastNames)} as const;\n
        export const cities = ${JSON.stringify(cities)} as const;
        `
    );

    yield* Effect.logInfo("Generating characters data");
    const characters = yield* client.GetAllCharacters();
    yield* Generate.replaceGeneratedContent(
        path.join(srcDir, "Characters.ts"),
        `${banner}
        export const characters = ${JSON.stringify(characters)} as const;\n
        export type Character = (typeof characters)[number];\n
        export type CharacterId = Character["id"];
        `
    );

    yield* Effect.logInfo("Generating elevators data");
    const elevators = yield* client.GetAllElevators();
    yield* Generate.replaceGeneratedContent(
        path.join(srcDir, "Elevators.ts"),
        `${banner}
        export const elevators = ${JSON.stringify(elevators)} as const;\n
        export type Elevator = (typeof elevators)[number];
        `
    );

    yield* Effect.logInfo("Generating floors data");
    const { floors, subTypes: floorSubTypes, types: floorTypes } = yield* client.GetAllFloors();
    yield* Generate.replaceGeneratedContent(
        path.join(srcDir, "Floors.ts"),
        `${banner}
        export const floorType = ${JSON.stringify(floorTypes)} as const;\n
        export type FloorType = keyof typeof floorType;\n\n
        export const floorSubType = ${JSON.stringify(floorSubTypes)} as const;\n
        export type FloorSubType = keyof typeof floorSubType;\n\n
        export const floors = ${Generate.replaceEnumTypeFields(Generate.replaceEnumTypeFields(JSON.stringify(floors), "type", floorTypes, "floorType"), "subType", floorSubTypes, "floorSubType")} as const;\n
        export type Floor = (typeof floors)[number];
        `
    );

    yield* Effect.logInfo("Generating missions data");
    const { missions, tipMissions, tutorialMissions, types: missionTypes } = yield* client.GetAllMissions();
    const replaceMissionEnums = (stringified: string) =>
        Generate.replaceEnumTypeFields(
            Generate.replaceEnumTypeFields(stringified, "type", missionTypes, "missionType"),
            "floorType",
            floorTypes,
            "Floors.floorType"
        );
    yield* Generate.replaceGeneratedContent(
        path.join(srcDir, "Missions.ts"),
        `${banner}
        export const missionType = ${JSON.stringify(missionTypes)} as const;\n
        export type MissionType = keyof typeof missionType;\n\n
        export const tutorialMissions = ${replaceMissionEnums(JSON.stringify(tutorialMissions))} as const;\n
        export type TutorialMission = (typeof tutorialMissions)[number];\n\n
        export const tipMissions = ${replaceMissionEnums(JSON.stringify(tipMissions))} as const;\n
        export type TipMission = (typeof tipMissions)[number];\n\n
        export const missions = ${replaceMissionEnums(JSON.stringify(missions))} as const;\n
        export type Mission = (typeof missions)[number];
        `
    );

    yield* Effect.logInfo("Generating roofs data");
    const roofs = yield* client.GetAllRoofs();
    yield* Generate.replaceGeneratedContent(
        path.join(srcDir, "Roofs.ts"),
        `${banner}
        export const roofs = ${JSON.stringify(roofs)} as const;\n
        export type Roof = (typeof roofs)[number];
        `
    );
});

Effect.gen(function* () {
    const path = yield* Path.Path;
    const srcDir = yield* path.fromFileUrl(new URL("../src", import.meta.url));
    yield* Generate.main({
        bundleIdentifier: "com.nimblebit.vegas",
        game: "Tiny Tower Vegas",
        agent: new URL("./Agent.ts", import.meta.url),
        files: files.map((file) => path.join(srcDir, `${file}.ts`)),
        force: process.argv.includes("--force"),
        generate,
    });
}).pipe(Effect.provide(NodeServices.layer), NodeRuntime.runMain);
