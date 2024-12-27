import "frida-il2cpp-bridge";

import type { IRoofAgentExports } from "../shared/roof-agent-exports.js";

import { readObject } from "../helpers/read.js";
import { TinyTowerFridaAgent } from "./base-frida-agent.js";
import { copyArrayToJs } from "../helpers/copy-array-to-js.js";
import { copyDictionaryToJs } from "../helpers/copy-dictionary-to-js.js";

export class GetRoofData extends TinyTowerFridaAgent<GetRoofData> {
    public loadDependencies() {
        const csharpAssembly = Il2Cpp.domain.assembly("Assembly-CSharp");
        const AppUtilClass = csharpAssembly.image.class("AppUtil");
        const VRoofDataClass = csharpAssembly.image.class("VRoofData");
        const roofsArray = VRoofDataClass.field<Il2Cpp.Array<Il2Cpp.Object>>("info").value;
        return { AppUtilClass, VRoofDataClass, roofsArray };
    }

    public retrieveData() {
        // Extract the tinytower version
        const version = this.dependencies.AppUtilClass.method<Il2Cpp.String>("VersionString").invoke().content;

        // Extract the number of roofs
        const numberOfRoofs = this.dependencies.VRoofDataClass.tryField<number>("NUM_ROOFS")?.value;

        // Extract the roofs
        const roofs =
            // First copy the entire roofs array over to js
            copyArrayToJs(this.dependencies.roofsArray)
                // Then each entry in the JS array is a dictionary, so map to that dictionary
                .map((roof) => copyDictionaryToJs<Il2Cpp.String, Il2Cpp.Object>(roof))

                // Next, map the entries of the roof dictionary to the property name and extract its JS value
                .map((roof) => Object.entries(roof).map(([property, value]) => [property, readObject(value)]))

                // Finally, reassemble an object form the entries
                .map((entries) => Object.fromEntries(entries));

        // Cleanup the roof definitions
        for (const roof of roofs) {
            roof.animations = roof.anims;
            delete roof.anims;
        }

        return { TTVersion: version || "unknown", numberOfRoofs, roofs };
    }

    public transformToSourceCode() {
        // Source code for the number of roofs
        const numberOfRoofsSource = `export const numberOfRoofs = ${this.data.numberOfRoofs} as const;\n`;

        // Source code for the roofs array and Roof type
        const roofsSource = `export const roofs = ${JSON.stringify(this.data.roofs)} as const;\n`;
        const roofSource = "export type Roof = typeof roofs[number];\n";

        return (
            `// TinyTower version: ${this.data.TTVersion}` +
            "\n" +
            numberOfRoofsSource +
            "\n" +
            roofsSource +
            roofSource
        );
    }
}

// Main entry point exported for when this file is compiled as a frida agent.
const rpcExports: IRoofAgentExports = {
    main: async () => {
        const instance = await new GetRoofData().start();
        return instance.transformToSourceCode();
    },
};
rpc.exports = rpcExports as unknown as RpcExports;
