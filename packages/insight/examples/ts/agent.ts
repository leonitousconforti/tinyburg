import type { IYourAgentExports } from "./shared.js";
import { TinyTowerFridaAgent } from "../../src/shared/base-frida-agent.js";

/**
 * All agents are expected to inherit from TinyTowerFridaAgent and implement the
 * two abstract methods from that class, loadDependencies and retrieveData.
 * TinyTowerFridaAgent is also a generic class so you must pass a type
 * parameter.
 */
export class YourAgent extends TinyTowerFridaAgent<YourAgent> {
    public loadDependencies() {
        return {};
    }

    public retrieveData() {
        return {};
    }
}

// Main entry point exported for when this file is compiled as a frida agent
const rpcExports: IYourAgentExports = {
    main: async () => {
        const instance = await new YourAgent().start();
        return instance.data;
    },
};
rpc.exports = rpcExports as unknown as RpcExports;
