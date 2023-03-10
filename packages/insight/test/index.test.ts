import { testingDevice } from "./setup.js";
import { bootstrapAgentOnRemote, cleanupAgent, GetterAgents } from "../src/index.js";

describe("All getter agents should return something and not throw any errors", async () => {
    for (const [agentName, agent] of Object.entries(GetterAgents)) {
        it(`${agentName} should produce data without throwing any errors`, async () => {
            const { device, session, script, pid, runAgentMain } = await bootstrapAgentOnRemote(agent, testingDevice);
            const data = await runAgentMain();
            expect(data).toBeTruthy();
            await cleanupAgent({ device, session, script, pid });
        });
    }
});
