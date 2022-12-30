/* eslint-disable @rushstack/typedef-var */

// Shared types that the agents use as well
import type {
    IIsMusicEnabledAgentExports,
    ISetMusicEnabledAgentExports,
    ISubscribeToMusicStatusAgent1,
    ISubscribeToMusicStatusAgent2,
} from "./shared.js";

// import type { IAgent } from "@tinyburg/insight/shared/agent-main.-export.js";
import type { IAgent } from "../../src/shared/agent-main-export.js";

// import { bootstrapAgentOverUsb, cleanupAgent } from "@tinyburg/insight"
import { bootstrapAgentOverUsb, cleanupAgent } from "../../src/index.js";

import { fileURLToPath } from "node:url";

const getterAgent = {
    agentFile: fileURLToPath(new URL("getter-agent.js", import.meta.url)),
    rpcTypes: {} as unknown as IIsMusicEnabledAgentExports,
} satisfies IAgent;

const setterAgent = {
    agentFile: fileURLToPath(new URL("setter-agent.js", import.meta.url)),
    rpcTypes: {} as unknown as ISetMusicEnabledAgentExports,
} satisfies IAgent;

const alertAgent1 = {
    agentFile: fileURLToPath(new URL("alert-agent1.js", import.meta.url)),
    rpcTypes: {} as unknown as ISubscribeToMusicStatusAgent1,
} satisfies IAgent;

const alertAgent2 = {
    agentFile: fileURLToPath(new URL("alert-agent1.js", import.meta.url)),
    rpcTypes: {} as unknown as ISubscribeToMusicStatusAgent2,
} satisfies IAgent;

const result1 = await bootstrapAgentOverUsb(getterAgent);
const data1 = await result1.runAgent();
console.log(`isMusicEnabled: ${data1.musicEnabled}`);

const result2 = await bootstrapAgentOverUsb(setterAgent);
const data2 = await result2.runAgent(!data1.musicEnabled);
console.log(`isMusicEnabled: ${data2.musicEnabled}`);

const result3 = await bootstrapAgentOverUsb(alertAgent1);
const callback3 = (musicStatus: boolean): void => console.log(`isMusicEnabled: ${musicStatus}`);
const data3 = await result3.runAgent(callback3);
setTimeout(() => cleanupAgent(result3), 20_000);

const result4 = await bootstrapAgentOverUsb(alertAgent2);
const data4 = await result4.runAgent();
data4.on("musicStatusChanged", (musicStatus) => console.log(`isMusicEnabled: ${musicStatus}`));
setTimeout(() => cleanupAgent(result4), 20_000);
