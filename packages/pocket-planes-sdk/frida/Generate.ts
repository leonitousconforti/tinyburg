import { Effect, Path } from "effect";
import { RpcClient } from "effect/rpc";

import { NodeRuntime, NodeServices } from "@effect/platform-node";
import * as Generate from "@tinyburg/insight/node/Generate";

import { Rpcs } from "./Rpcs.ts";

// Regenerates the data files in ../src from Pocket Planes itself, on insight's
// emulator, unless they are from the game's current version on Google Play.
// `--force` regenerates them anyway. See packages/insight/README.md.
const files = ["Bitizens", "Cargo", "Cities", "CityEvents", "Planes", "Skins"];

const generate = Effect.gen(function* () {
    const path = yield* Path.Path;
    const srcDir = yield* path.fromFileUrl(new URL("../src", import.meta.url));

    const client = yield* RpcClient.make(Rpcs);
    yield* client.SetFps(1);
    yield* Effect.sleep("5 seconds");
    const version = yield* client.Version();
    yield* Effect.logInfo(`Pocket Planes version: ${version}`);
    const banner = yield* Generate.banner("Pocket Planes", version);

    yield* Effect.logInfo("Generating bitizen data");
    const { femaleNames, lastNames, maleNames } = yield* client.GetAllBitizenNames();
    yield* Generate.replaceGeneratedContent(
        path.join(srcDir, "Bitizens.ts"),
        `${banner}
        export const maleNames = ${JSON.stringify(maleNames)} as const;\n
        export type MaleName = (typeof maleNames)[number];\n\n
        export const femaleNames = ${JSON.stringify(femaleNames)} as const;\n
        export type FemaleName = (typeof femaleNames)[number];\n\n
        export const lastNames = ${JSON.stringify(lastNames)} as const;\n
        export type LastName = (typeof lastNames)[number];
        `
    );

    yield* Effect.logInfo("Generating cargo data");
    const { packageNames, vipPackageNames } = yield* client.GetAllCargo();
    yield* Generate.replaceGeneratedContent(
        path.join(srcDir, "Cargo.ts"),
        `${banner}
        export const packageNames = ${JSON.stringify(packageNames)} as const;\n
        export type PackageName = (typeof packageNames)[number];\n\n
        export const vipPackageNames = ${JSON.stringify(vipPackageNames)} as const;\n
        export type VipPackageName = (typeof vipPackageNames)[number];
        `
    );

    yield* Effect.logInfo("Generating cities data");
    const cities = yield* client.GetAllCities();
    yield* Generate.replaceGeneratedContent(
        path.join(srcDir, "Cities.ts"),
        `${banner}
        export const cities = ${JSON.stringify(cities)} as const;\n
        export type City = (typeof cities)[number];\n
        export type Region = City["region"];
        `
    );

    yield* Effect.logInfo("Generating city events data");
    const { events, types: eventTypes } = yield* client.GetAllCityEvents();
    yield* Generate.replaceGeneratedContent(
        path.join(srcDir, "CityEvents.ts"),
        `${banner}
        export const cityEventType = ${JSON.stringify(eventTypes)} as const;\n
        export type CityEventType = keyof typeof cityEventType;\n\n
        export const cityEvents = ${Generate.replaceEnumTypeFields(JSON.stringify(events), "type", eventTypes, "cityEventType")} as const;\n
        export type CityEvent = (typeof cityEvents)[number];
        `
    );

    yield* Effect.logInfo("Generating planes data");
    const planes = yield* client.GetAllPlanes();
    yield* Generate.replaceGeneratedContent(
        path.join(srcDir, "Planes.ts"),
        `${banner}
        export const planes = ${JSON.stringify(planes)} as const;\n
        export type Plane = (typeof planes)[number];
        `
    );

    yield* Effect.logInfo("Generating skins data");
    const skins = yield* client.GetAllSkins();
    yield* Generate.replaceGeneratedContent(
        path.join(srcDir, "Skins.ts"),
        `${banner}
        export const skins = ${JSON.stringify(skins)} as const;\n
        export type Skin = (typeof skins)[number];
        `
    );
});

Effect.gen(function* () {
    const path = yield* Path.Path;
    const srcDir = yield* path.fromFileUrl(new URL("../src", import.meta.url));
    yield* Generate.main({
        bundleIdentifier: "com.nimblebit.pocketplanes",
        game: "Pocket Planes",
        agent: new URL("./Agent.ts", import.meta.url),
        files: files.map((file) => path.join(srcDir, `${file}.ts`)),
        force: process.argv.includes("--force"),
        generate,
    });
}).pipe(Effect.provide(NodeServices.layer), NodeRuntime.runMain);
