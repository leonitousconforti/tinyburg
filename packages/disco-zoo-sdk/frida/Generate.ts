import { Effect, Path } from "effect";
import { RpcClient } from "effect/rpc";

import { NodeRuntime, NodeServices } from "@effect/platform-node";
import * as Generate from "@tinyburg/insight/node/Generate";

import { Rpcs } from "./Rpcs.ts";

// Regenerates the data files in ../src from Disco Zoo itself, on insight's
// emulator, unless they are from the game's current version on Google Play.
// `--force` regenerates them anyway. See packages/insight/README.md.
const files = ["Animals", "Decorations", "Hats", "Pets", "Regions", "Toys"];

const generate = Effect.gen(function* () {
    const path = yield* Path.Path;
    const srcDir = yield* path.fromFileUrl(new URL("../src", import.meta.url));

    const client = yield* RpcClient.make(Rpcs);
    const version = yield* client.Version();
    yield* Effect.logInfo(`Disco Zoo version: ${version}`);

    // Disco Zoo sets up its data well after il2cpp is ready, so it gets a
    // minute at full speed before the agent reads anything
    yield* Effect.sleep("60 seconds");
    yield* client.SetFps(1);
    yield* Effect.sleep("5 seconds");
    const banner = yield* Generate.banner("Disco Zoo", version);

    yield* Effect.logInfo("Generating animals data");
    const { animals, rarities } = yield* client.GetAllAnimals();
    yield* Generate.replaceGeneratedContent(
        path.join(srcDir, "Animals.ts"),
        `${banner}
        export const rarities = ${JSON.stringify(rarities)} as const;\n
        export type Rarity = keyof typeof rarities;\n\n
        export const animals = ${JSON.stringify(animals)} as const;\n
        export type Animal = (typeof animals)[number];
        `
    );

    yield* Effect.logInfo("Generating decorations data");
    const decorations = yield* client.GetAllDecorations();
    yield* Generate.replaceGeneratedContent(
        path.join(srcDir, "Decorations.ts"),
        `${banner}
        export const decorations = ${JSON.stringify(decorations)} as const;\n
        export type Decoration = (typeof decorations)[number];
        `
    );

    yield* Effect.logInfo("Generating hats data");
    const hats = yield* client.GetAllHats();
    yield* Generate.replaceGeneratedContent(
        path.join(srcDir, "Hats.ts"),
        `${banner}
        export const hats = ${JSON.stringify(hats)} as const;\n
        export type Hat = (typeof hats)[number];
        `
    );

    yield* Effect.logInfo("Generating pets data");
    const { grades, quirks, species } = yield* client.GetAllPets();
    yield* Generate.replaceGeneratedContent(
        path.join(srcDir, "Pets.ts"),
        `${banner}
        export const grades = ${JSON.stringify(grades)} as const;\n
        export type Grade = (typeof grades)[number];\n\n
        export const species = ${JSON.stringify(species)} as const;\n
        export type Species = (typeof species)[number];\n\n
        export const quirks = ${JSON.stringify(quirks)} as const;\n
        export type Quirk = (typeof quirks)[number];
        `
    );

    yield* Effect.logInfo("Generating regions data");
    const regions = yield* client.GetAllRegions();
    yield* Generate.replaceGeneratedContent(
        path.join(srcDir, "Regions.ts"),
        `${banner}
        export const regions = ${JSON.stringify(regions)} as const;\n
        export type Region = (typeof regions)[number];
        `
    );

    yield* Effect.logInfo("Generating toys data");
    const toys = yield* client.GetAllToys();
    yield* Generate.replaceGeneratedContent(
        path.join(srcDir, "Toys.ts"),
        `${banner}
        export const toys = ${JSON.stringify(toys)} as const;\n
        export type Toy = (typeof toys)[number];
        `
    );
});

Effect.gen(function* () {
    const path = yield* Path.Path;
    const srcDir = yield* path.fromFileUrl(new URL("../src", import.meta.url));
    yield* Generate.main({
        bundleIdentifier: "com.nimblebit.discozoo",
        game: "Disco Zoo",
        agent: new URL("./Agent.ts", import.meta.url),
        files: files.map((file) => path.join(srcDir, `${file}.ts`)),
        force: process.argv.includes("--force"),
        generate,
    });
}).pipe(Effect.provide(NodeServices.layer), NodeRuntime.runMain);
