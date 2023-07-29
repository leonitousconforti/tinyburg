import "dotenv/config";

import type { ArchitectDataVolume, ArchitectEmulatorServices } from "@tinyburg/architect";

import architect from "@tinyburg/architect";
import loadApk, { LatestVersion } from "@tinyburg/apks";
import { bootstrapAgentOnRemote, AllAgents } from "../src/index.js";

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

describe("All getter agents should return something and not throw any errors", () => {
    let fridaAddress: string;
    let emulatorDataVolume: ArchitectDataVolume;
    let emulatorServices: ArchitectEmulatorServices;

    beforeAll(async () => {
        const apk = await loadApk("apkpure", LatestVersion);
        const architectResult = await architect({ reuseExistingContainers: false });
        await architectResult.emulatorServices.installApk(apk);
        fridaAddress = architectResult.fridaAddress;
        emulatorServices = architectResult.emulatorServices;
        emulatorDataVolume = architectResult.emulatorDataVolume;
    }, INSIGHT_PREP_TIMEOUT_MS);

    afterAll(async () => {
        await emulatorServices.stop();
        await emulatorServices.remove();
        await emulatorDataVolume.remove();
    }, INSIGHT_PREP_TIMEOUT_MS);

    it(
        "GoodAgent should produce data without throwing any errors",
        async () => {
            const { runAgentMain } = await bootstrapAgentOnRemote(GoodAgent, fridaAddress);
            const data = await runAgentMain("me");
            expect(data).toEqual([1, "Hello, me"]);
        },
        INSIGHT_TEST_TIMEOUT_MS
    );

    it(
        "BadAgent should not produce data and throwing an error",
        async () => {
            const { runAgentMain } = await bootstrapAgentOnRemote(BadAgent, fridaAddress);
            await expect(runAgentMain()).rejects.toThrowError("This is an error");
        },
        INSIGHT_TEST_TIMEOUT_MS
    );

    it(
        "BitbookAgent should produce data without throwing any errors",
        async () => {
            const { runAgentMain } = await bootstrapAgentOnRemote(BitbookAgent, fridaAddress);
            const data = await runAgentMain();
            expect(data).toMatchSnapshot();
        },
        INSIGHT_TEST_TIMEOUT_MS
    );

    it(
        "BitizenAgent should produce data without throwing any errors",
        async () => {
            const { runAgentMain } = await bootstrapAgentOnRemote(BitizenAgent, fridaAddress);
            const data = await runAgentMain();
            expect(data).toMatchSnapshot();
        },
        INSIGHT_TEST_TIMEOUT_MS
    );

    it(
        "CostumeAgent should produce data without throwing any errors",
        async () => {
            const { runAgentMain } = await bootstrapAgentOnRemote(CostumeAgent, fridaAddress);
            const data = await runAgentMain();
            expect(data).toMatchSnapshot();
        },
        INSIGHT_TEST_TIMEOUT_MS
    );

    it(
        "ElevatorAgent should produce data without throwing any errors",
        async () => {
            const { runAgentMain } = await bootstrapAgentOnRemote(ElevatorAgent, fridaAddress);
            const data = await runAgentMain();
            expect(data).toMatchSnapshot();
        },
        INSIGHT_TEST_TIMEOUT_MS
    );

    it(
        "FloorAgent should produce data without throwing any errors",
        async () => {
            const { runAgentMain } = await bootstrapAgentOnRemote(FloorAgent, fridaAddress);
            const data = await runAgentMain();
            expect(data).toMatchSnapshot();
        },
        INSIGHT_TEST_TIMEOUT_MS
    );

    it(
        "MissionAgent should produce data without throwing any errors",
        async () => {
            const { runAgentMain } = await bootstrapAgentOnRemote(MissionAgent, fridaAddress);
            const data = await runAgentMain();
            expect(data).toMatchSnapshot();
        },
        INSIGHT_TEST_TIMEOUT_MS
    );

    it(
        "PetAgent should produce data without throwing any errors",
        async () => {
            const { runAgentMain } = await bootstrapAgentOnRemote(PetAgent, fridaAddress);
            const data = await runAgentMain();
            expect(data).toMatchSnapshot();
        },
        INSIGHT_TEST_TIMEOUT_MS
    );

    it(
        "RoofAgent should produce data without throwing any errors",
        async () => {
            const { runAgentMain } = await bootstrapAgentOnRemote(RoofAgent, fridaAddress);
            const data = await runAgentMain();
            expect(data).toMatchSnapshot();
        },
        INSIGHT_TEST_TIMEOUT_MS
    );
});
