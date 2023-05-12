import "frida-il2cpp-bridge";

import { TinyTowerFridaAgent } from "../../src/agents/base-frida-agent.js";

/**
 * This agent showcases how to retrieve information from the game. In this case,
 * it will retrieve if the music setting in the settings menu is enabled.
 *
 * @extends {TinyTowerFridaAgent<IsMusicEnabledAgent>}
 */
export class IsMusicEnabledAgent extends TinyTowerFridaAgent {
    loadDependencies() {
        const csharpAssembly = Il2Cpp.domain.assembly("Assembly-CSharp");
        const VPlayerClass = csharpAssembly.image.class("VPlayer");

        /** @type {Il2Cpp.Field<boolean>} */
        const musicEnabledField = VPlayerClass.field("musicEnabled");
        return { csharpAssembly, VPlayerClass, musicEnabledField };
    }

    retrieveData() {
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
 *
 * @type {import("./shared.js").IIsMusicEnabledAgentExports}
 */
const rpcExports = {
    main: async () => {
        const instance = await new IsMusicEnabledAgent().start();
        return instance.data;
    },
};
rpc.exports = rpcExports;
