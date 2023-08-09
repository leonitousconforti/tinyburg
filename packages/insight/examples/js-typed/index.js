/* eslint-disable @rushstack/typedef-var */

import { fileURLToPath } from "node:url";

import { bootstrapAgentOverUsb, cleanupAgent } from "../../src/index.js";

/** Run the getter agent */
const getterAgent = {
    agentFile: fileURLToPath(new URL("getter-agent.js", import.meta.url)),

    /** @type {import("./shared.js").IIsMusicEnabledAgentExports} */
    // @ts-ignore
    rpcTypes: {},
};

const { runAgentMain: runAgentMain1, ...agentDetails1 } = await bootstrapAgentOverUsb(getterAgent);
const data1 = await runAgentMain1();
await cleanupAgent(agentDetails1);
console.log(`isMusicEnabled: ${data1.musicEnabled}`);

/** Run the setter agent */
const setterAgent = {
    agentFile: fileURLToPath(new URL("setter-agent.js", import.meta.url)),

    /** @type {import("./shared.js").ISetMusicEnabledAgentExports} */
    // @ts-ignore
    rpcTypes: {},
};

const { runAgentMain: runAgentMain2, ...agentDetails2 } = await bootstrapAgentOverUsb(setterAgent);
const data2 = await runAgentMain2(!data1.musicEnabled);
await cleanupAgent(agentDetails2);
console.log(`isMusicEnabled: ${data2.musicEnabled}`);

/** Run one version of the alert agent */
const alertAgent1 = {
    agentFile: fileURLToPath(new URL("alert-agent1.js", import.meta.url)),

    /** @type {import("./shared.js").ISubscribeToMusicStatusAgent1Exports} */
    // @ts-ignore
    rpcTypes: {},
};

const { runAgentMain: runAgentMain3, ...agentDetails3 } = await bootstrapAgentOverUsb(alertAgent1);
const callback3 = (/** @type {boolean} */ musicStatus) => {
    console.log(`isMusicEnabled: ${musicStatus}`);
    cleanupAgent(agentDetails3).catch((error) => console.error(error));
};
await runAgentMain3(callback3);

/** Runt the other version of the alert agent */
const alertAgent2 = {
    agentFile: fileURLToPath(new URL("alert-agent1.js", import.meta.url)),

    /** @type {import("./shared.js").ISubscribeToMusicStatusAgent2Exports} */
    // @ts-ignore
    rpcTypes: {},
};

const { runAgentMain: runAgentMain4, ...agentDetails4 } = await bootstrapAgentOverUsb(alertAgent2);
const data4 = await runAgentMain4();
data4.on("musicStatusChanged", (musicStatus) => {
    console.log(`isMusicEnabled: ${musicStatus}`);
    cleanupAgent(agentDetails4).catch((error) => console.error(error));
});
