/**
 * This script is automatically ran by heft during before typescript
 * transpilation and will regenerate the data files in this directory.
 */

const path = require("node:path");
const fs = require("node:fs/promises");
const prettier = require("prettier");
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
    const { getTinyTowerVersions, loadApk } = await import("@tinyburg/apks");
    const { bootstrapAgentOnRemote, cleanupAgent, GetterAgents } = await import("@tinyburg/insight");

    // Find editorconfig and prettier formatting files
    const prettierOptions = {
        parser: "typescript",
        ...(await prettier.resolveConfig(process.cwd(), { editorconfig: true })),
    };

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

    const latestVersion = Object.entries(await getTinyTowerVersions()).find(
        ([requestedVersion, _semanticVersion]) => requestedVersion === "0 versions before latest"
    )[1];
    const alreadyGenerateForLatestVersion = await Promise.all(
        Object.keys(AgentOutputFileMap).map(async (file) => {
            const outputPath = path.join(__dirname, file);
            const contents = await fs.readFile(outputPath);
            return contents.toString().includes(`With TinyTower version: ${latestVersion}`);
        })
    );

    if (alreadyGenerateForLatestVersion.every((_) => _ === true)) {
        return;
    }

    // Create a container to extract information from
    const apk = await loadApk("TinyTower", "latest version");
    const { fridaAddress, emulatorContainer, installApk } = await architect();
    await installApk(apk);

    for (const [outputDestination, agent] of Object.entries(AgentOutputFileMap)) {
        const { runAgentMain, ...agentDetails } = await bootstrapAgentOnRemote(agent, fridaAddress);

        const result = await runAgentMain();
        await cleanupAgent(agentDetails);
        const formattedSource = await prettier.format(result, prettierOptions);
        const version = result.match(/TinyTower version: ([\d.]+)/gm)?.[0];
        const cleanedSource = formattedSource.replaceAll(/\/\/ TinyTower version: ([\d.]+)/gm, "");

        const formattedBanner = sourceCodeBanner
            .replace("__filename", agent.agentFile)
            .replace("__date", new Date().toUTCString())
            .replace("__version", version?.split(":")[1]?.trim() || "unknown");

        const outputPath = path.join(__dirname, outputDestination);
        await fs.writeFile(outputPath, formattedBanner + cleanedSource);
    }

    await emulatorContainer.stop();
    await emulatorContainer.remove();
};
