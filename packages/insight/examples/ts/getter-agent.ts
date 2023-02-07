import "frida-il2cpp-bridge";

import type { IIsMusicEnabledAgentExports } from "./shared.js";
import { TinyTowerFridaAgent } from "../../src/agents/base-frida-agent.js";

/**
 * This agent showcases how to retrieve information from the game. In this case,
 * it will retrieve if the music setting in the settings menu is enabled.
 */
export class IsMusicEnabledAgent extends TinyTowerFridaAgent<IsMusicEnabledAgent> {
    public loadDependencies() {
        const csharpAssembly = Il2Cpp.Domain.assembly("Assembly-CSharp");
        const VPlayerClass = csharpAssembly.image.class("VPlayer");
        const musicEnabledField = VPlayerClass.field<boolean>("musicEnabled");
        return { csharpAssembly, VPlayerClass, musicEnabledField };
    }

    public retrieveData() {
        const musicEnabled = this.dependencies.musicEnabledField.value;
        return { musicEnabled };
    }
}

/**
 * Defines the public interface of this agent, i.e what methods and properties
 * will be available over the frida rpc channel. In this case, only a main
 * function is exposed, which will create a new instance of the agent and start
 * it. The start method takes care of everything from retrying dependency
 * loading to calling the retrieve data method.
 */
const rpcExports: IIsMusicEnabledAgentExports = {
    main: async () => {
        const instance = await new IsMusicEnabledAgent().start();
        return instance.data;
    },
};
rpc.exports = rpcExports as unknown as RpcExports;
