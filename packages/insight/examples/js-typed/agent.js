import { TinyTowerFridaAgent } from "../../src/agents/base-frida-agent.js";

/**
 * Asdf
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
 * @type
 */
const rpcExports = {
    main: async () => {
        const instance = await new YourAgent().start();
    },
};

/**
 * In some cases, we can not assign the above object directly to rpc.exports
 * because of type inconsistencies. Thus, it is done with a cast afterwards.
 */
rpc.exports = rpcExports;
