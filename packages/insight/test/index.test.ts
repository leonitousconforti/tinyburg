import type Dockerode from "dockerode";

import loadApk from "@tinyburg/apks";
import architect from "@tinyburg/architect";

import { bootstrapAgentOnRemote, cleanupAgent, GetterAgents } from "../src/index.js";
const BitbookAgent = GetterAgents["BitbookAgent"];
const BitizenAgent = GetterAgents["BitizenAgent"];
const CostumeAgent = GetterAgents["CostumeAgent"];
const ElevatorAgent = GetterAgents["ElevatorAgent"];
const FloorAgent = GetterAgents["FloorAgent"];
const MissionAgent = GetterAgents["MissionAgent"];
const PetAgent = GetterAgents["PetAgent"];
const RoofAgent = GetterAgents["RoofAgent"];

// Timeout tests after 1 minute and prep after 3 minutes
const INSIGHT_TEST_TIMEOUT_MS = Number.parseInt(process.env["INSIGHT_TEST_TIMEOUT_MS"] as string) || 1000 * 60 * 1;
const INSIGHT_PREP_TIMEOUT_MS = Number.parseInt(process.env["INSIGHT_PREP_TIMEOUT_MS"] as string) || 1000 * 60 * 3;

describe("All getter agents should return something and not throw any errors", () => {
    let fridaAddress: string;
    let emulatorContainer: Dockerode.Container;

    beforeAll(async () => {
        const apk = await loadApk("apkmirror", "4.22.0");
        const architectResult = await architect({ reuseExistingContainers: false });
        await architectResult.installApk(apk);
        fridaAddress = architectResult.fridaAddress;
        emulatorContainer = architectResult.emulatorContainer;
    }, INSIGHT_PREP_TIMEOUT_MS);

    afterAll(async () => {
        await emulatorContainer.stop();
        await emulatorContainer.remove();
    }, INSIGHT_PREP_TIMEOUT_MS);

    it(
        `BitbookAgent should produce data without throwing any errors`,
        async () => {
            const { device, session, script, pid, runAgentMain } = await bootstrapAgentOnRemote(
                BitbookAgent,
                fridaAddress,
                { compiler: "esbuild" }
            );
            const data = await runAgentMain();
            expect(data).toBeDefined();
            await cleanupAgent({ device, session, script, pid });
        },
        INSIGHT_TEST_TIMEOUT_MS
    );

    it(
        `BitizenAgent should produce data without throwing any errors`,
        async () => {
            const { device, session, script, pid, runAgentMain } = await bootstrapAgentOnRemote(
                BitizenAgent,
                fridaAddress,
                { compiler: "esbuild" }
            );
            const data = await runAgentMain();
            expect(data).toBeDefined();
            await cleanupAgent({ device, session, script, pid });
        },
        INSIGHT_TEST_TIMEOUT_MS
    );

    it(
        `CostumeAgent should produce data without throwing any errors`,
        async () => {
            const { device, session, script, pid, runAgentMain } = await bootstrapAgentOnRemote(
                CostumeAgent,
                fridaAddress,
                { compiler: "esbuild" }
            );
            const data = await runAgentMain();
            expect(data).toBeDefined();
            await cleanupAgent({ device, session, script, pid });
        },
        INSIGHT_TEST_TIMEOUT_MS
    );

    it(
        `ElevatorAgent should produce data without throwing any errors`,
        async () => {
            const { device, session, script, pid, runAgentMain } = await bootstrapAgentOnRemote(
                ElevatorAgent,
                fridaAddress,
                { compiler: "esbuild" }
            );
            const data = await runAgentMain();
            expect(data).toBeDefined();
            await cleanupAgent({ device, session, script, pid });
        },
        INSIGHT_TEST_TIMEOUT_MS
    );

    it(
        `FloorAgent should produce data without throwing any errors`,
        async () => {
            const { device, session, script, pid, runAgentMain } = await bootstrapAgentOnRemote(
                FloorAgent,
                fridaAddress,
                { compiler: "esbuild" }
            );
            const data = await runAgentMain();
            expect(data).toBeDefined();
            await cleanupAgent({ device, session, script, pid });
        },
        INSIGHT_TEST_TIMEOUT_MS
    );

    it(
        `MissionAgent should produce data without throwing any errors`,
        async () => {
            const { device, session, script, pid, runAgentMain } = await bootstrapAgentOnRemote(
                MissionAgent,
                fridaAddress,
                { compiler: "esbuild" }
            );
            const data = await runAgentMain();
            expect(data).toBeDefined();
            await cleanupAgent({ device, session, script, pid });
        },
        INSIGHT_TEST_TIMEOUT_MS
    );

    it(
        `PetAgent should produce data without throwing any errors`,
        async () => {
            const { device, session, script, pid, runAgentMain } = await bootstrapAgentOnRemote(
                PetAgent,
                fridaAddress,
                { compiler: "esbuild" }
            );
            const data = await runAgentMain();
            expect(data).toBeDefined();
            await cleanupAgent({ device, session, script, pid });
        },
        INSIGHT_TEST_TIMEOUT_MS
    );

    it(
        `RoofAgent should produce data without throwing any errors`,
        async () => {
            const { device, session, script, pid, runAgentMain } = await bootstrapAgentOnRemote(
                RoofAgent,
                fridaAddress,
                { compiler: "esbuild" }
            );
            const data = await runAgentMain();
            expect(data).toBeDefined();
            await cleanupAgent({ device, session, script, pid });
        },
        INSIGHT_TEST_TIMEOUT_MS
    );
});
