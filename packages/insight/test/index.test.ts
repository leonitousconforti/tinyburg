import type Dockerode from "dockerode";

import apks from "@tinyburg/archive";
import architect from "@tinyburg/architect";
import { bootstrapAgentOnRemote, AllAgents, cleanupAgent } from "../src/index.js";

const GoodAgent = AllAgents["GoodAgent"];
const BadAgent = AllAgents["BadAgent"];
const BitbookAgent = AllAgents["BitbookAgent"];
const BitizenAgent = AllAgents["BitizenAgent"];
const CostumeAgent = AllAgents["CostumeAgent"];
const ElevatorAgent = AllAgents["ElevatorAgent"];
const FloorAgent = AllAgents["FloorAgent"];
const MissionAgent = AllAgents["MissionAgent"];
const PetAgent = AllAgents["PetAgent"];
const RoofAgent = AllAgents["RoofAgent"];

// Timeout tests after 2 minutes and prep after 5 minutes
const INSIGHT_TEST_TIMEOUT_MS = Number.parseInt(process.env["INSIGHT_TEST_TIMEOUT_MS"] as string) || 1000 * 60 * 2;
const INSIGHT_PREP_TIMEOUT_MS = Number.parseInt(process.env["INSIGHT_PREP_TIMEOUT_MS"] as string) || 1000 * 60 * 5;

describe("All important agents should return something and not throw any errors", () => {
    let fridaAddress: string;
    let emulatorContainer: Dockerode.Container;

    beforeAll(async () => {
        const apk = await apks.loadApk(apks.Games.TinyTower, "4.27.1");
        const architectResult = await architect();
        await architectResult.installApk(apk);
        fridaAddress = architectResult.containerEndpoints[0].fridaAddress;
        emulatorContainer = architectResult.emulatorContainer;
    }, INSIGHT_PREP_TIMEOUT_MS);

    afterAll(async () => {
        await emulatorContainer.stop();
        await emulatorContainer.remove();
    }, INSIGHT_PREP_TIMEOUT_MS);

    it(
        "GoodAgent should produce data without throwing any errors",
        async () => {
            const { runAgentMain, ...agentDetails } = await bootstrapAgentOnRemote(GoodAgent, fridaAddress);
            const data = await runAgentMain("me");
            await cleanupAgent(agentDetails);
            expect(data).toEqual([1, "Hello, me"]);
        },
        INSIGHT_TEST_TIMEOUT_MS
    );

    it.skip(
        "BadAgent should not produce data and throwing an error",
        async () => {
            const { runAgentMain } = await bootstrapAgentOnRemote(BadAgent, fridaAddress);
            await expect(runAgentMain()).rejects.toThrowError("This is an error");
        },
        INSIGHT_TEST_TIMEOUT_MS
    );

    it.skip(
        "BitbookAgent should produce data without throwing any errors",
        async () => {
            const { runAgentMain, ...agentDetails } = await bootstrapAgentOnRemote(BitbookAgent, fridaAddress);
            const data = await runAgentMain();
            await cleanupAgent(agentDetails);
            expect(data).toMatchSnapshot();
        },
        INSIGHT_TEST_TIMEOUT_MS
    );

    it.skip(
        "BitizenAgent should produce data without throwing any errors",
        async () => {
            const { runAgentMain, ...agentDetails } = await bootstrapAgentOnRemote(BitizenAgent, fridaAddress);
            const data = await runAgentMain();
            await cleanupAgent(agentDetails);
            expect(data).toMatchSnapshot();
        },
        INSIGHT_TEST_TIMEOUT_MS
    );

    it.skip(
        "CostumeAgent should produce data without throwing any errors",
        async () => {
            const { runAgentMain, ...agentDetails } = await bootstrapAgentOnRemote(CostumeAgent, fridaAddress);
            const data = await runAgentMain();
            await cleanupAgent(agentDetails);
            expect(data).toMatchSnapshot();
        },
        INSIGHT_TEST_TIMEOUT_MS
    );

    it.skip(
        "ElevatorAgent should produce data without throwing any errors",
        async () => {
            const { runAgentMain, ...agentDetails } = await bootstrapAgentOnRemote(ElevatorAgent, fridaAddress);
            const data = await runAgentMain();
            await cleanupAgent(agentDetails);
            expect(data).toMatchSnapshot();
        },
        INSIGHT_TEST_TIMEOUT_MS
    );

    it.skip(
        "FloorAgent should produce data without throwing any errors",
        async () => {
            const { runAgentMain, ...agentDetails } = await bootstrapAgentOnRemote(FloorAgent, fridaAddress);
            const data = await runAgentMain();
            await cleanupAgent(agentDetails);
            expect(data).toMatchSnapshot();
        },
        INSIGHT_TEST_TIMEOUT_MS
    );

    it.skip(
        "MissionAgent should produce data without throwing any errors",
        async () => {
            const { runAgentMain, ...agentDetails } = await bootstrapAgentOnRemote(MissionAgent, fridaAddress);
            const data = await runAgentMain();
            await cleanupAgent(agentDetails);
            expect(data).toMatchSnapshot();
        },
        INSIGHT_TEST_TIMEOUT_MS
    );

    it.skip(
        "PetAgent should produce data without throwing any errors",
        async () => {
            const { runAgentMain, ...agentDetails } = await bootstrapAgentOnRemote(PetAgent, fridaAddress);
            const data = await runAgentMain();
            await cleanupAgent(agentDetails);
            expect(data).toMatchSnapshot();
        },
        INSIGHT_TEST_TIMEOUT_MS
    );

    it.skip(
        "RoofAgent should produce data without throwing any errors",
        async () => {
            const { runAgentMain, ...agentDetails } = await bootstrapAgentOnRemote(RoofAgent, fridaAddress);
            const data = await runAgentMain();
            await cleanupAgent(agentDetails);
            expect(data).toMatchSnapshot();
        },
        INSIGHT_TEST_TIMEOUT_MS
    );
});
