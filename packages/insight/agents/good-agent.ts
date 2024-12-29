import "frida-il2cpp-bridge";

import type { IGoodAgentExports } from "../src/shared/good-agent-exports.js";
import { TinyTowerFridaAgent } from "./base-frida-agent.js";

export class GoodAgent extends TinyTowerFridaAgent<GoodAgent> {
    private readonly _name: string;

    public constructor(name: string) {
        super();
        this._name = name;
    }

    public loadDependencies() {
        return {};
    }

    public retrieveData() {
        return [1, `Hello, ${this._name}`] as [number, string];
    }
}

// Main entry point exported for when this file is compiled as a frida agent
const rpcExports: IGoodAgentExports = {
    main: async (name: string) => {
        const instance = await new GoodAgent(name).start();
        return instance.data;
    },
};
rpc.exports = rpcExports as unknown as RpcExports;
