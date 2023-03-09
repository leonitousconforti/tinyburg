/**
 * This will automatically be imported when you import TinyTowerFridaAgent, but
 * in the case where you do not want to use the base agent, you will need to
 * have this import explicitly.
 */
import "frida-il2cpp-bridge";

import { TinyTowerFridaAgent } from "../../src/agents/base-frida-agent.js";

/**
 * All agents are expected to inherit from TinyTowerFridaAgent and implement the
 * two abstract methods from that class, loadDependencies and retrieveData.
 * TinyTowerFridaAgent is also a generic class so you must pass a type parameter
 * (this assists with the type checking)
 *
 * @extends TinyTowerFridaAgent<YourAgent>
 */
export class YourAgent extends TinyTowerFridaAgent {
    loadDependencies() {
        const csharpAssembly = Il2Cpp.Domain.assembly("Assembly-CSharp");
        const AppUtilClass = csharpAssembly.image.class("AppUtil");
        return { csharpAssembly, AppUtilClass };
    }

    retrieveData() {
        /**
         * Extract the version of the game, using the dependencies returned from
         * loadDependencies
         *
         * @type {Il2Cpp.Method<Il2Cpp.String>}
         */
        const version = this.dependencies.AppUtilClass.method("VersionString");
        return { version: version.invoke().content || "unknown" };
    }
}

/**
 * Main entry point exported for when this file is compiled as a frida agent.
 *
 * @type {import("./shared.js").IYourAgentExports}
 */
const rpcExports = {
    main: async () => {
        const instance = await new YourAgent().start();
        return instance.data;
    },
};

/**
 * In some cases, we can not assign the above object directly to rpc.exports
 * because of type inconsistencies. Thus, it is done with a cast afterwards.
 */
rpc.exports = rpcExports;
