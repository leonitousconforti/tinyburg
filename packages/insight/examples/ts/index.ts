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

const { runAgentMain: runAgentMain1, ...agentDetails1 } = await bootstrapAgentOverUsb(getterAgent);
const data1 = await runAgentMain1();
await cleanupAgent(agentDetails1);
console.log(`isMusicEnabled: ${data1.musicEnabled}`);

/** Run the setter agent */
const setterAgent = {
    agentFile: fileURLToPath(new URL("setter-agent.js", import.meta.url)),
    rpcTypes: {} as unknown as ISetMusicEnabledAgentExports,
} satisfies IAgent;

const { runAgentMain: runAgentMain2, ...agentDetails2 } = await bootstrapAgentOverUsb(setterAgent);
const data2 = await runAgentMain2(!data1.musicEnabled);
await cleanupAgent(agentDetails2);
console.log(`isMusicEnabled: ${data2.musicEnabled}`);

/** Run one version of the alert agent */
const alertAgent1 = {
    agentFile: fileURLToPath(new URL("alert-agent1.js", import.meta.url)),
    rpcTypes: {} as unknown as ISubscribeToMusicStatusAgent1Exports,
} satisfies IAgent;

const { runAgentMain: runAgentMain3, ...agentDetails3 } = await bootstrapAgentOverUsb(alertAgent1);
const callback3 = (musicStatus: boolean): void => {
    console.log(`isMusicEnabled: ${musicStatus}`);
    cleanupAgent(agentDetails3).catch((error) => console.error(error));
};
await runAgentMain3(callback3);

/** Runt the other version of the alert agent */
const alertAgent2 = {
    agentFile: fileURLToPath(new URL("alert-agent1.js", import.meta.url)),
    rpcTypes: {} as unknown as ISubscribeToMusicStatusAgent2Exports,
} satisfies IAgent;

const { runAgentMain: runAgentMain4, ...agentDetails4 } = await bootstrapAgentOverUsb(alertAgent2);
const data4 = await runAgentMain4();
data4.on("musicStatusChanged", (musicStatus) => {
    console.log(`isMusicEnabled: ${musicStatus}`);
    cleanupAgent(agentDetails4).catch((error) => console.error(error));
});
