import { Effect, Path } from "effect";
import { RpcClient } from "effect/rpc";

import { NodeRuntime, NodeServices } from "@effect/platform-node";
import * as Generate from "@tinyburg/insight/node/Generate";

import { Rpcs } from "./Rpcs.ts";

// Regenerates the data files in ../src from Pocket Trains itself, on
// insight's emulator, unless they are from the game's current version on
// Google Play. `--force` regenerates them anyway. See packages/insight/README.md.
const files = ["Cars", "Cities", "Engines", "Events", "Tracks"];

const generate = Effect.gen(function* () {
    const path = yield* Path.Path;
    const srcDir = yield* path.fromFileUrl(new URL("../src", import.meta.url));

    const client = yield* RpcClient.make(Rpcs);
    yield* client.SetFps(1);
    yield* Effect.sleep("5 seconds");
    const version = yield* client.Version();
    yield* Effect.logInfo(`Pocket Trains version: ${version}`);
    const banner = yield* Generate.banner("Pocket Trains", version);

    yield* Effect.logInfo("Generating cars data");
    const cars = yield* client.GetAllCars();
    yield* Generate.replaceGeneratedContent(
        path.join(srcDir, "Cars.ts"),
        `${banner}
        export const cars = ${JSON.stringify(cars)} as const;\n
        export type Car = (typeof cars)[number];\n
        export type CarId = Car["id"];
        `
    );

    yield* Effect.logInfo("Generating cities data");
    const { cities, regions } = yield* client.GetAllCities();
    yield* Generate.replaceGeneratedContent(
        path.join(srcDir, "Cities.ts"),
        `${banner}
        export const regions = ${JSON.stringify(regions)} as const;\n
        export type Region = (typeof regions)[number];\n\n
        export const cities = ${JSON.stringify(cities)} as const;\n
        export type City = (typeof cities)[number];\n
        export type CityId = City["id"];
        `
    );

    yield* Effect.logInfo("Generating engines data");
    const engines = yield* client.GetAllEngines();
    yield* Generate.replaceGeneratedContent(
        path.join(srcDir, "Engines.ts"),
        `${banner}
        export const engines = ${JSON.stringify(engines)} as const;\n
        export type Engine = (typeof engines)[number];\n
        export type EngineId = Engine["id"];
        `
    );

    yield* Effect.logInfo("Generating events data");
    const events = yield* client.GetAllEvents();
    yield* Generate.replaceGeneratedContent(
        path.join(srcDir, "Events.ts"),
        `${banner}
        export const events = ${JSON.stringify(events)} as const;\n
        export type Event = (typeof events)[number];
        `
    );

    yield* Effect.logInfo("Generating tracks data");
    const tracks = yield* client.GetAllTracks();
    yield* Generate.replaceGeneratedContent(
        path.join(srcDir, "Tracks.ts"),
        `${banner}
        export const tracks = ${JSON.stringify(tracks)} as const;\n
        export type Track = (typeof tracks)[number];\n
        export type TrackId = Track["id"];
        `
    );
});

Effect.gen(function* () {
    const path = yield* Path.Path;
    const srcDir = yield* path.fromFileUrl(new URL("../src", import.meta.url));
    yield* Generate.main({
        bundleIdentifier: "com.nimblebit.pockettrains",
        game: "Pocket Trains",
        agent: new URL("./Agent.ts", import.meta.url),
        files: files.map((file) => path.join(srcDir, `${file}.ts`)),
        force: process.argv.includes("--force"),
        generate,
    });
}).pipe(Effect.provide(NodeServices.layer), NodeRuntime.runMain);
