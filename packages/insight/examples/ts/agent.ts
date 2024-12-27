/**
 * This will automatically be imported when you import TinyTowerFridaAgent, but
 * in the case where you do not want to use the base agent, you will need to
 * have this import explicitly.
 */
import "frida-il2cpp-bridge";

import type { IYourAgentExports } from "./shared.js";
import { TinyTowerFridaAgent } from "../../src/agents/base-frida-agent.js";

/**
 * All agents are expected to inherit from TinyTowerFridaAgent and implement the
 * two abstract methods from that class, loadDependencies and retrieveData.
 * TinyTowerFridaAgent is also a generic class so you must pass a type parameter
 * (this assists with the type checking)
 */
export class YourAgent extends TinyTowerFridaAgent<YourAgent> {
    public loadDependencies() {
        const csharpAssembly = Il2Cpp.domain.assembly("Assembly-CSharp");
        const AppUtilClass = csharpAssembly.image.class("AppUtil");
        return { csharpAssembly, AppUtilClass };
    }

    public retrieveData() {
        // Extract the version of the game, using the dependencies returned from loadDependencies
        const version = this.dependencies.AppUtilClass.method<Il2Cpp.String>("VersionString").invoke().content!;
        return { version };
    }
}

/** Main entry point exported for when this file is compiled as a frida agent. */
const rpcExports: IYourAgentExports = {
    main: async () => {
        const instance = await new YourAgent().start();
        return instance.data;
    },
};

/**
 * In some cases, we can not assign the above object directly to rpc.exports
 * because of type inconsistencies. Thus, it is done with a cast afterwards.
 */
rpc.exports = rpcExports as unknown as RpcExports;
