import "frida-il2cpp-bridge";

import { TinyTowerFridaAgent } from "../../src/agents/base-frida-agent.js";

/**
 * This agent showcases how to set information in the game. In this case, it
 * will toggle the music setting in the settings menu.
 *
 * @extends {TinyTowerFridaAgent<SetMusicStatusAgent>}
 */
export class SetMusicStatusAgent extends TinyTowerFridaAgent {
    /**
     * @param {boolean} musicEnabled
     * @param {number | undefined} [loadDependenciesMaxRetries]
     * @param {number | undefined} [loadDependenciesWaitMs]
     */
    constructor(musicEnabled, loadDependenciesMaxRetries, loadDependenciesWaitMs) {
        super(loadDependenciesMaxRetries, loadDependenciesWaitMs);
        this._musicEnabled = musicEnabled;
    }

    loadDependencies() {
        const csharpAssembly = Il2Cpp.Domain.assembly("Assembly-CSharp");
        const VPlayerClass = csharpAssembly.image.class("VPlayer");

        /** @type {Il2Cpp.Field<boolean>} */
        const musicEnabledField = VPlayerClass.field("musicEnabled");
        return { csharpAssembly, VPlayerClass, musicEnabledField };
    }

    retrieveData() {
        this.dependencies.musicEnabledField.value = this._musicEnabled;
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
 * @type {import("./shared.js").ISetMusicEnabledAgentExports}
 */
const rpcExports = {
    main: async (musicEnabled) => {
        const instance = await new SetMusicStatusAgent(musicEnabled).start();
        return instance.data;
    },
};
rpc.exports = rpcExports;
