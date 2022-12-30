import { AllAgents, bootstrapAgentOnRemote } from "../src/index.js";

const remoteAddress = "host.docker.internal:27042";

for (const [agentName, agentProperties] of Object.entries(AllAgents)) {
    console.log(`agentName: ${agentName}`);

    const { device, session, script, pid, runAgent } = await bootstrapAgentOnRemote(remoteAddress, agentProperties);
    console.log(`device: ${device}`);
    console.log(`session: ${session}`);
    console.log(`script: ${script}`);
    console.log(`pid: ${pid}`);

    const result = await runAgent();
    console.log(`result: ${result}`);
}
