import loadApk from "@tinyburg/apks";
import architect from "@tinyburg/architect";
import { AllAgents, bootstrapAgentOnRemote } from "@tinyburg/insight";

const apk: string = await loadApk("apkpure", "4.22.0");
const { fridaAddress, installApk } = await architect({ reuseExistingContainers: true });
await installApk(apk);

const { runAgentMain } = await bootstrapAgentOnRemote(AllAgents.BitbookAgent, fridaAddress);
const data: string = await runAgentMain();
console.log(data);
