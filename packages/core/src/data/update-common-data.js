/**
 * This script is automatically ran by heft during before typescript
 * transpilation and will regenerate the data files in this directory.
 */

import fs from "node:fs/promises";

import { architect } from "@tinyburg/architect";
import { loadApkFromApkpure } from "@tinyburg/apks";
import { bootstrapAgentOnRemote, GetterAgents } from "@tinyburg/insight";

// Banner to put at the top of every data file
const sourceCodeBanner = `/**
 * This file was auto-generated by a frida agent
 *
 * Generated by: __filename
 *
 * with TinyTower version: __version
 *
 * on: __date
 */
`;

// Create a container to extract information from
const apk = await loadApkFromApkpure("3.15.4");
const { installApk } = await architect();
await installApk(apk);
await new Promise((resolve) => setTimeout(resolve, 100_000));

// To know where to put the generated source code
// eslint-disable-next-line @rushstack/typedef-var
const AgentOutputFileMap = {
    "../src/data/bitbook-posts.ts": GetterAgents.BitbookAgent,
    "../src/data/bitizen.ts": GetterAgents.BitizenAgent,
    "../src/data/costumes.ts": GetterAgents.CostumeAgent,
    "../src/data/elevators.ts": GetterAgents.ElevatorAgent,
    "../src/data/floors.ts": GetterAgents.FloorAgent,
    "../src/data/missions.ts": GetterAgents.MissionAgent,
    "../src/data/pets.ts": GetterAgents.PetAgent,
    "../src/data/roofs.ts": GetterAgents.RoofAgent,
};

for (const [outputDestination, agent] of Object.entries(AgentOutputFileMap)) {
    console.log(`* Running agent: ${agent.agentFile}`);
    const { runAgentMain } = await bootstrapAgentOnRemote(agent, "192.168.1.138:27043", {
        compiler: "esbuild",
    });

    const result = await runAgentMain();
    const version = result.match(/TinyTower version: ([\d.]+)/gm)?.[0];
    const cleanedSource = result.replaceAll(/\/\/ TinyTower version: ([\d.]+)/gm, "");

    const formattedBanner = sourceCodeBanner
        .replace("__filename", agent.agentFile)
        .replace("__date", new Date().toUTCString())
        .replace("__version", version?.split(":")[1]?.trim() || "unknown");

    const outputPath = new URL(outputDestination, import.meta.url);
    await fs.writeFile(outputPath, formattedBanner + cleanedSource);
    console.log(`* Done running agent: ${agent}`);
    console.log("---------------------------");
}

await container.stop();
await container.remove();