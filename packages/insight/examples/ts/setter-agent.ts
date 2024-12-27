import "frida-il2cpp-bridge";

import type { ISetMusicEnabledAgentExports } from "./shared.js";
import { TinyTowerFridaAgent } from "../../src/agents/base-frida-agent.js";

/**
 * This agent showcases how to set information in the game. In this case, it
 * will toggle the music setting in the settings menu.
 */
export class SetMusicStatusAgent extends TinyTowerFridaAgent<SetMusicStatusAgent> {
    private readonly _musicEnabled: boolean;

    public constructor(musicEnabled: boolean, loadDependenciesMaxRetries?: number, loadDependenciesWaitMs?: number) {
        super(loadDependenciesMaxRetries, loadDependenciesWaitMs);
        this._musicEnabled = musicEnabled;
    }

    public loadDependencies() {
        const csharpAssembly = Il2Cpp.domain.assembly("Assembly-CSharp");
        const VPlayerClass = csharpAssembly.image.class("VPlayer");
        const musicEnabledField = VPlayerClass.field<boolean>("musicEnabled");
        return { csharpAssembly, VPlayerClass, musicEnabledField };
    }

    public retrieveData() {
        this.dependencies.musicEnabledField.value = this._musicEnabled;
        const musicEnabled = this.dependencies.musicEnabledField.value;
        return { musicEnabled };
    }
}

/**
 * Defines the public interface of this agent, i.e what methods and properties
 * will be available over the frida rpc channel. In this case, only a main
 * function is exposed, which will create a new instance of the agent and starts
 * it. The start method takes care of everything from retrying dependency
 * loading to calling the retrieve data method.
 */
const rpcExports: ISetMusicEnabledAgentExports = {
    main: async (musicEnabled: boolean) => {
        const instance = await new SetMusicStatusAgent(musicEnabled).start();
        return instance.data;
    },
};
rpc.exports = rpcExports as unknown as RpcExports;
