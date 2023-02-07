import type { IPageAgentExports } from "./shared.js";

import { TinyTowerFridaAgent } from "@tinyburg/insight/agents/base-frida-agent";

export class PageAgent extends TinyTowerFridaAgent<PageAgent> {
    loadDependencies() {
        return {};
    }

    retrieveData() {
        return {};
    }
}

// Main entry point exported for when this file is compiled as a frida agent
const rpcExports: IPageAgentExports = {
    main: async () => {},
};
