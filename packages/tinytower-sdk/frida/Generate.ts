import { Effect, Path } from "effect";
import { RpcClient } from "effect/rpc";

import { NodeRuntime, NodeServices } from "@effect/platform-node";
import * as Generate from "@tinyburg/insight/node/Generate";

import { Rpcs } from "./Rpcs.ts";

// Regenerates the data files in ../src from Tiny Tower itself, on insight's
// emulator, unless they are from the game's current version on Google Play.
// `--force` regenerates them anyway. See packages/insight/README.md.
const files = ["BitbookPosts", "Bitizens", "Costumes", "Elevators", "Floors", "Missions", "Pets", "Roofs"];

const generate = Effect.gen(function* () {
    const path = yield* Path.Path;
    const srcDir = yield* path.fromFileUrl(new URL("../src", import.meta.url));

    const client = yield* RpcClient.make(Rpcs);
    yield* client.SetFps(1);
    yield* Effect.sleep("5 seconds");
    const version = yield* client.Version();
    yield* Effect.logInfo(`Tiny Tower version: ${version}`);
    const banner = yield* Generate.banner("Tiny Tower", version);

    yield* Effect.logInfo("Generating bitbook posts data");
    const { eventTypes, mediaTypes, posts } = yield* client.GetAllBitbookPosts();
    yield* Generate.replaceGeneratedContent(
        path.join(srcDir, "BitbookPosts.ts"),
        `${banner}
        export const eventTypes = ${JSON.stringify(eventTypes)} as const;\n
        export type EventType = keyof typeof eventTypes;\n\n
        export const mediaTypes = ${JSON.stringify(mediaTypes)} as const;\n
        export type MediaType = keyof typeof mediaTypes;\n\n
        export const posts = ${Generate.replaceEnumTypeFields(Generate.replaceEnumTypeFields(JSON.stringify(posts), "mediatype", mediaTypes, "mediaTypes"), "event", eventTypes, "eventTypes")} as const;\n
        export type Post = (typeof posts)[number];
        `
    );

    yield* Effect.logInfo("Generating bitizen data");
    const {
        femaleLastNames,
        femaleNames,
        maleLastNames,
        maleNames,
        numberBiHats,
        numberFemaleHats,
        numberGlasses,
        numberHairAccessories,
        numberMaleHats,
    } = yield* client.GetAllBitizenData();
    yield* Generate.replaceGeneratedContent(
        path.join(srcDir, "Bitizens.ts"),
        `${banner}
        export const numberBiHats = ${numberBiHats} as const;
        export const numberFemaleHats = ${numberFemaleHats} as const;
        export const numberGlasses = ${numberGlasses} as const;
        export const numberHairAccessories = ${numberHairAccessories} as const;
        export const numberMaleHats = ${numberMaleHats} as const;\n
        export const maleNames = ${JSON.stringify(maleNames)} as const;\n
        export const maleLastNames = ${JSON.stringify(maleLastNames)} as const;\n
        export const femaleNames = ${JSON.stringify(femaleNames)} as const;\n
        export const femaleLastNames = ${JSON.stringify(femaleLastNames)} as const;\n
        `
    );

    yield* Effect.logInfo("Generating costumes data");
    const costumes = yield* client.GetAllCostumes();
    yield* Generate.replaceGeneratedContent(
        path.join(srcDir, "Costumes.ts"),
        `${banner}
        export const costumes = ${JSON.stringify(costumes)} as const;\n
        export type Costume = keyof typeof costumes;
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
    const { floors, types: floorTypes } = yield* client.GetAllFloors();
    yield* Generate.replaceGeneratedContent(
        path.join(srcDir, "Floors.ts"),
        `${banner}
        export const floorType = ${JSON.stringify(floorTypes)} as const;\n
        export type FloorType = keyof typeof floorType;\n\n
        export const floors = ${Generate.replaceEnumTypeFields(JSON.stringify(Generate.sortIndexable(floors)), "type", floorTypes, "floorType")} as const;\n
        export type Floor = (typeof floors)[number];
        `
    );

    yield* Effect.logInfo("Generating missions data");
    const { missions, tipMissions, tutorialMissions, types: missionTypes } = yield* client.GetAllMissions();
    yield* Generate.replaceGeneratedContent(
        path.join(srcDir, "Missions.ts"),
        `${banner}
        export const missionType = ${JSON.stringify(missionTypes)} as const;\n
        export type MissionType = keyof typeof missionType;\n\n
        export const tutorialMissions = ${Generate.replaceEnumTypeFields(JSON.stringify(tutorialMissions), "mType", missionTypes, "missionType")} as const;\n
        export type TutorialMission = (typeof tutorialMissions)[number];\n\n
        export const tipMissions = ${Generate.replaceEnumTypeFields(JSON.stringify(tipMissions), "mType", missionTypes, "missionType")} as const;\n
        export type TipMission = (typeof tipMissions)[number];\n\n
        export const missions = ${Generate.replaceEnumTypeFields(JSON.stringify(missions), "mType", missionTypes, "missionType")} as const;\n
        export type Mission = (typeof missions)[number];
        `
    );

    yield* Effect.logInfo("Generating pets data");
    const pets = yield* client.GetAllPets();
    yield* Generate.replaceGeneratedContent(
        path.join(srcDir, "Pets.ts"),
        `${banner}
        export const pets = ${JSON.stringify(pets)} as const;\n
        export type Pet = keyof typeof pets;
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
        bundleIdentifier: "com.nimblebit.tinytower",
        game: "Tiny Tower",
        agent: new URL("./Agent.ts", import.meta.url),
        files: files.map((file) => path.join(srcDir, `${file}.ts`)),
        force: process.argv.includes("--force"),
        generate,
    });
}).pipe(Effect.provide(NodeServices.layer), NodeRuntime.runMain);
