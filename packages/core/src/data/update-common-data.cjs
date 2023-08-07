/**
 * This script is automatically ran by heft during before typescript
 * transpilation and will regenerate the data files in this directory.
 */

const path = require("node:path");
const fs = require("node:fs/promises");
const debug = require("debug")("tinyburg:core:update-common-data");

// Banner to put at the top of every data file
const sourceCodeBanner = `/**
 * This file was auto-generated by a frida agent
 *
 * Generated by:
 * __filename
 *
 * With TinyTower version: __version
 *
 * On: __date
 */
`;

module.exports.runAsync = async () => {
    const { architect } = await import("@tinyburg/architect");
    const { loadApkFromApkpure } = await import("@tinyburg/apks");
    const { bootstrapAgentOnRemote, GetterAgents } = await import("@tinyburg/insight");

    // To know where to put the generated source code
    const AgentOutputFileMap = {
        "./bitbook-posts.ts": GetterAgents.BitbookAgent,
        "./bitizen.ts": GetterAgents.BitizenAgent,
        "./costumes.ts": GetterAgents.CostumeAgent,
        "./elevators.ts": GetterAgents.ElevatorAgent,
        "./floors.ts": GetterAgents.FloorAgent,
        "./missions.ts": GetterAgents.MissionAgent,
        "./pets.ts": GetterAgents.PetAgent,
        "./roofs.ts": GetterAgents.RoofAgent,
    };

    const alreadyGenerateForLatestVersion = await Promise.all(
        Object.keys(AgentOutputFileMap).map(async (file) => {
            const outputPath = path.join(__dirname, file);
            const contents = await fs.readFile(outputPath);
            return contents.toString().includes(`With TinyTower version: ${"4.24.0"}`);
        })
    );

    if (alreadyGenerateForLatestVersion.every((_) => _ === true)) {
        return;
    }

    // Create a container to extract information from
    const apk = await loadApkFromApkpure("4.24.0");
    const { fridaAddress, emulatorServices, emulatorDataVolume } = await architect();
    await emulatorServices.installApk(apk);

    for (const [outputDestination, agent] of Object.entries(AgentOutputFileMap)) {
        const { runAgentMain } = await bootstrapAgentOnRemote(agent, fridaAddress);

        const result = await runAgentMain();
        const version = result.match(/TinyTower version: ([\d.]+)/gm)?.[0];
        const cleanedSource = result.replaceAll(/\/\/ TinyTower version: ([\d.]+)/gm, "");

        const formattedBanner = sourceCodeBanner
            .replace("__filename", agent.agentFile)
            .replace("__date", new Date().toUTCString())
            .replace("__version", version?.split(":")[1]?.trim() || "unknown");

        const outputPath = path.join(__dirname, outputDestination);
        await fs.writeFile(outputPath, formattedBanner + cleanedSource);
    }

    await emulatorServices.stop();
    await emulatorServices.remove();
    await emulatorDataVolume.remove();
};
