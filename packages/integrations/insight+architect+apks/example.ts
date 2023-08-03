import loadApk from "@tinyburg/apks";
import architect from "@tinyburg/architect";
import { AllAgents, bootstrapAgentOnRemote } from "@tinyburg/insight";

const apk: string = await loadApk("apkpure", "4.23.1");
const { emulatorServices, fridaAddress } = await architect({ reuseExistingContainers: false });
await emulatorServices.installApk(apk);

const { runAgentMain } = await bootstrapAgentOnRemote(AllAgents.GoodAgent, fridaAddress);
const data: [number, string] = await runAgentMain("world");
console.log(`${data[0]} : ${data[1]}`);
