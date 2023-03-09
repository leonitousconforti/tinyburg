/* eslint-disable @rushstack/typedef-var */

// Shared types that the agents use as well
import type {
    IIsMusicEnabledAgentExports,
    ISetMusicEnabledAgentExports,
    ISubscribeToMusicStatusAgent1Exports,
    ISubscribeToMusicStatusAgent2Exports,
} from "./shared.js";

import type { IAgent } from "../../src/shared/agent-main-export.js";
import { bootstrapAgentOverUsb, cleanupAgent } from "../../src/index.js";

import { fileURLToPath } from "node:url";

/** Run the getter agent */
const getterAgent = {
    agentFile: fileURLToPath(new URL("getter-agent.js", import.meta.url)),
    rpcTypes: {} as unknown as IIsMusicEnabledAgentExports,
} satisfies IAgent;

const result1 = await bootstrapAgentOverUsb(getterAgent);
const data1 = await result1.runAgentMain();
console.log(`isMusicEnabled: ${data1.musicEnabled}`);

/** Run the setter agent */
const setterAgent = {
    agentFile: fileURLToPath(new URL("setter-agent.js", import.meta.url)),
    rpcTypes: {} as unknown as ISetMusicEnabledAgentExports,
} satisfies IAgent;

const result2 = await bootstrapAgentOverUsb(setterAgent);
const data2 = await result2.runAgentMain(!data1.musicEnabled);
console.log(`isMusicEnabled: ${data2.musicEnabled}`);

/** Run one version of the alert agent */
const alertAgent1 = {
    agentFile: fileURLToPath(new URL("alert-agent1.js", import.meta.url)),
    rpcTypes: {} as unknown as ISubscribeToMusicStatusAgent1Exports,
} satisfies IAgent;

const result3 = await bootstrapAgentOverUsb(alertAgent1);
const callback3 = (musicStatus: boolean): void => {
    console.log(`isMusicEnabled: ${musicStatus}`);
    cleanupAgent(result3).catch((error) => console.error(error));
};
await result3.runAgentMain(callback3);

/** Runt the other version of the alert agent */
const alertAgent2 = {
    agentFile: fileURLToPath(new URL("alert-agent1.js", import.meta.url)),
    rpcTypes: {} as unknown as ISubscribeToMusicStatusAgent2Exports,
} satisfies IAgent;

const result4 = await bootstrapAgentOverUsb(alertAgent2);
const data4 = await result4.runAgentMain();
data4.on("musicStatusChanged", (musicStatus) => {
    console.log(`isMusicEnabled: ${musicStatus}`);
    cleanupAgent(result4).catch((error) => console.error(error));
});
