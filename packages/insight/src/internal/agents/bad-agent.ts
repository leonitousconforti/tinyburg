import "frida-il2cpp-bridge";

import type { IBadAgentExports } from "../shared/bad-agent-exports.js";
import { TinyTowerFridaAgent } from "./base-frida-agent.js";

export class BadAgent extends TinyTowerFridaAgent<BadAgent> {
    public loadDependencies() {
        return {};
    }

    public retrieveData() {
        throw new Error("This is an error");
    }
}

// Main entry point exported for when this file is compiled as a frida agent
const rpcExports: IBadAgentExports = {
    main: async () => await new BadAgent().start(),
};
rpc.exports = rpcExports as unknown as RpcExports;
