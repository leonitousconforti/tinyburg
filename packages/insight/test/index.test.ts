/* eslint-disable dot-notation */

import type Dockerode from "dockerode";

import loadApk from "@tinyburg/apks";
import architect from "@tinyburg/architect";

import { bootstrapAgentOnRemote, cleanupAgent, GetterAgents } from "../src/index.js";

// Timeout tests after 1 minute and prep after 3 minute
const INSIGHT_TEST_TIMEOUT_MS = Number.parseInt(process.env["INSIGHT_TEST_TIMEOUT_MS"] as string) || 60_000;
const INSIGHT_PREP_TIMEOUT_MS = Number.parseInt(process.env["INSIGHT_PREP_TIMEOUT_MS"] as string) || 1000 * 60 * 3;

// Override the docker host environment variable just for these tests
process.env["DOCKER_HOST"] = process.env["ARCHITECT_TEST_DOCKER_HOST"] || process.env["DOCKER_HOST"];

describe("All getter agents should return something and not throw any errors", () => {
    let container: Dockerode.Container;
    let fridaAddress: string;

    beforeAll(async () => {
        const apk = await loadApk("apkpure", "4.21.1");
        const architectResult = await architect();
        await architectResult.installApk(apk);
        container = architectResult.container;
        fridaAddress = architectResult.fridaAddress;
    }, INSIGHT_PREP_TIMEOUT_MS);

    afterAll(async () => {
        await container.stop();
        await container.remove();
    }, INSIGHT_PREP_TIMEOUT_MS);

    for (const [agentName, agent] of Object.entries(GetterAgents)) {
        it(
            `${agentName} should produce data without throwing any errors`,
            async () => {
                const { device, session, script, pid, runAgentMain } = await bootstrapAgentOnRemote(
                    agent,
                    fridaAddress
                );
                const data = await runAgentMain();
                expect(data).toBeDefined();
                await cleanupAgent({ device, session, script, pid });
            },
            INSIGHT_TEST_TIMEOUT_MS
        );
    }
});
