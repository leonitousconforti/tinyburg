import "frida-il2cpp-bridge";
import Emittery from "emittery";

import { TinyTowerFridaAgent } from "../../src/agents/base-frida-agent.js";
import type { ISubscribeToMusicStatusAgent2Exports, ISubscribeToMusicStatusAgent2Events } from "./shared.js";

/**
 * This agent showcases how to subscribe to information changes in the game. In
 * this case, it will alert if the music setting in the settings menu changes.
 *
 * While this could be achieved by polling the desired field very frequently,
 * there is a more elegant solution in my mind. Using frida MemoryAccessMonitor
 * we can watch regions of memory and be alerted when they are accessed or
 * modified. Then we can pass that alert through frida rpc channel to the
 * node.js side
 */
export class SubscribeToMusicStatusAgent2 extends TinyTowerFridaAgent<SubscribeToMusicStatusAgent2> {
    public readonly emittery: Emittery<ISubscribeToMusicStatusAgent2Events> = new Emittery();

    public loadDependencies() {
        const csharpAssembly = Il2Cpp.Domain.assembly("Assembly-CSharp");
        const VPlayerClass = csharpAssembly.image.class("VPlayer");
        const musicEnabledField = VPlayerClass.field<boolean>("musicEnabled");
        return { csharpAssembly, VPlayerClass, musicEnabledField };
    }

    public retrieveData() {
        const memoryRange = { base: this.dependencies.musicEnabledField.handle, size: 1 };
        const callbacks = {
            onAccess: (_details: MemoryAccessDetails) =>
                this.emittery.emit("musicStatusChanged", this.dependencies.musicEnabledField.value),
        };
        MemoryAccessMonitor.enable(memoryRange, callbacks);
        return;
    }
}

/**
 * Defines the public interface of this agent, i.e what methods and properties
 * will be available over the frida rpc channel. In this case, only a main
 * function is exposed, which will create a new instance of the agent and start
 * it. The start method takes care of everything from retrying dependency
 * loading to calling the retrieve data method.
 */
const rpcExports: ISubscribeToMusicStatusAgent2Exports = {
    main: async () => {
        const instance = await new SubscribeToMusicStatusAgent2().start();
        return instance.emittery;
    },
};
rpc.exports = rpcExports as unknown as RpcExports;
