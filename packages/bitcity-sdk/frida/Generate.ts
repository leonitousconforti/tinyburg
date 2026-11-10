import { Effect, Path } from "effect";
import { RpcClient } from "effect/rpc";

import { NodeRuntime, NodeServices } from "@effect/platform-node";
import * as Generate from "@tinyburg/insight/node/Generate";

import { Rpcs } from "./Rpcs.ts";

// Regenerates the data files in ../src from Bit City itself, on insight's
// emulator, unless they are from the game's current version on Google Play.
// `--force` regenerates them anyway. See packages/insight/README.md.
const files = ["Buildings", "Cities", "Missions", "Upgrades", "Vehicles"];

const generate = Effect.gen(function* () {
    const path = yield* Path.Path;
    const srcDir = yield* path.fromFileUrl(new URL("../src", import.meta.url));

    const client = yield* RpcClient.make(Rpcs);
    yield* client.SetFps(1);
    yield* Effect.sleep("5 seconds");
    const version = yield* client.Version();
    yield* Effect.logInfo(`Bit City version: ${version}`);
    const banner = yield* Generate.banner("Bit City", version);

    yield* Effect.logInfo("Generating buildings data");
    const { buildings, zoneTypes } = yield* client.GetAllBuildings();
    yield* Generate.replaceGeneratedContent(
        path.join(srcDir, "Buildings.ts"),
        `${banner}
        export const zoneType = ${JSON.stringify(zoneTypes)} as const;\n
        export type ZoneType = keyof typeof zoneType;\n\n
        export const buildings = ${Generate.replaceEnumTypeFields(JSON.stringify(buildings), "type", zoneTypes, "zoneType")} as const;\n
        export type Building = (typeof buildings)[number];
        `
    );

    yield* Effect.logInfo("Generating cities data");
    const cities = yield* client.GetAllCities();
    yield* Generate.replaceGeneratedContent(
        path.join(srcDir, "Cities.ts"),
        `${banner}
        export const cities = ${JSON.stringify(cities)} as const;\n
        export type City = (typeof cities)[number];
        `
    );

    yield* Effect.logInfo("Generating missions data");
    const { missions, types: missionTypes } = yield* client.GetAllMissions();
    yield* Generate.replaceGeneratedContent(
        path.join(srcDir, "Missions.ts"),
        `${banner}
        export const missionType = ${JSON.stringify(missionTypes)} as const;\n
        export type MissionType = keyof typeof missionType;\n\n
        export const missions = ${Generate.replaceEnumTypeFields(JSON.stringify(missions), "type", missionTypes, "missionType")} as const;\n
        export type Mission = (typeof missions)[number];
        `
    );

    yield* Effect.logInfo("Generating upgrades data");
    const { upgrades, vars: upgradeVars } = yield* client.GetAllUpgrades();
    yield* Generate.replaceGeneratedContent(
        path.join(srcDir, "Upgrades.ts"),
        `${banner}
        export const upgradeVar = ${JSON.stringify(upgradeVars)} as const;\n
        export type UpgradeVar = keyof typeof upgradeVar;\n\n
        export const upgrades = ${Generate.replaceEnumTypeFields(JSON.stringify(upgrades), "var", upgradeVars, "upgradeVar")} as const;\n
        export type Upgrade = (typeof upgrades)[number];
        `
    );

    yield* Effect.logInfo("Generating vehicles data");
    const { boats, cars, planes } = yield* client.GetAllVehicles();
    yield* Generate.replaceGeneratedContent(
        path.join(srcDir, "Vehicles.ts"),
        `${banner}
        export const cars = ${JSON.stringify(cars)} as const;\n
        export type Car = (typeof cars)[number];\n\n
        export const boats = ${JSON.stringify(boats)} as const;\n
        export type Boat = (typeof boats)[number];\n\n
        export const planes = ${JSON.stringify(planes)} as const;\n
        export type Plane = (typeof planes)[number];
        `
    );
});

Effect.gen(function* () {
    const path = yield* Path.Path;
    const srcDir = yield* path.fromFileUrl(new URL("../src", import.meta.url));
    yield* Generate.main({
        bundleIdentifier: "com.nimblebit.bitcity",
        game: "Bit City",
        agent: new URL("./Agent.ts", import.meta.url),
        files: files.map((file) => path.join(srcDir, `${file}.ts`)),
        force: process.argv.includes("--force"),
        generate,
    });
}).pipe(Effect.provide(NodeServices.layer), NodeRuntime.runMain);
