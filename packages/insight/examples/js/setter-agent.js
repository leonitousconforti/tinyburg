import "frida-il2cpp-bridge";

import { TinyTowerFridaAgent } from "../../src/agents/base-frida-agent.js";

/**
 * This agent showcases how to set information in the game. In this case, it
 * will toggle the music setting in the settings menu.
 */
// @ts-ignore
export class SetMusicStatusAgent extends TinyTowerFridaAgent {
    // @ts-ignore
    constructor(musicEnabled, loadDependenciesMaxRetries, loadDependenciesWaitMs) {
        super(loadDependenciesMaxRetries, loadDependenciesWaitMs);
        this._musicEnabled = musicEnabled;
    }

    loadDependencies() {
        const csharpAssembly = Il2Cpp.domain.assembly("Assembly-CSharp");
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

const rpcExports = {
    // @ts-ignore
    main: async (musicEnabled) => {
        const instance = await new SetMusicStatusAgent(musicEnabled).start();
        return instance.data;
    },
};
rpc.exports = rpcExports;
