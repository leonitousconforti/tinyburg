import loadApk from "@tinyburg/apks";
import architect from "@tinyburg/architect";
import { AllAgents, bootstrapAgentOnRemote } from "@tinyburg/insight";

const apk: string = await loadApk("apkpure", "4.23.0");
const { fridaAddress, installApk } = await architect({ reuseExistingContainers: false });
await installApk(apk);

const { runAgentMain } = await bootstrapAgentOnRemote(AllAgents.GoodAgent, fridaAddress);
const data: [number, string] = await runAgentMain("world");
console.log(`${data[0]} : ${data[1]}`);
