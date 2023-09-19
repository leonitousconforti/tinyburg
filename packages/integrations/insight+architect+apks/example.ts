import loadApk from "@tinyburg/apks";
import architect from "@tinyburg/architect";
import { AllAgents, bootstrapAgentOnRemote, cleanupAgent } from "@tinyburg/insight";

const apk: string = await loadApk("TinyTower");
const { emulatorContainer, fridaAddress, installApk } = await architect();
await installApk(apk);

const { runAgentMain, ...agentDetails } = await bootstrapAgentOnRemote(AllAgents.GoodAgent, fridaAddress);
const data: [number, string] = await runAgentMain("world");
await cleanupAgent(agentDetails);
console.log(`${data[0]} : ${data[1]}`);

await emulatorContainer.stop();
await emulatorContainer.remove();
