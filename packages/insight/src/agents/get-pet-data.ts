import "frida-il2cpp-bridge";

import type { IPetAgentExports } from "../shared/pet-agent-exports.js";

// import { readObject } from "../helpers/read.js";
import { TinyTowerFridaAgent } from "./base-frida-agent.js";
// import { copyDictionaryToJs } from "../helpers/copy-dictionary-to-js.js";

export class GetPetData extends TinyTowerFridaAgent<GetPetData> {
    public loadDependencies() {
        const csharpAssembly = Il2Cpp.domain.assembly("Assembly-CSharp");
        const AppUtilClass = csharpAssembly.image.class("AppUtil");
        // const VPetClass = csharpAssembly.image.class("VPet");
        // const VPetDefinitions = VPetClass.field<Il2Cpp.Object>("definitions").value;

        return {
            AppUtilClass,
            // VPetClass: {
            //     dependency: VPetClass,
            //     meta: { callStaticConstructor: true },
            // },
            // VPetDefinitions,
        };
    }

    public retrieveData() {
        // Extract the version of the game
        const version = this.dependencies.AppUtilClass.method<Il2Cpp.String>("VersionString").invoke().content;

        // Extract the pet data
        // const petEntries =
        //     // Copy the pet data over to JS and map the entries to the pet's name and then the dictionary data
        //     Object.entries(copyDictionaryToJs<Il2Cpp.String, Il2Cpp.Object>(this.dependencies.VPetDefinitions))
        //         .map(
        //             ([petName, petData]) =>
        //                 [petName, copyDictionaryToJs<Il2Cpp.String, Il2Cpp.Object>(petData)] as const
        //         )

        //         // Map the dictionary data to entries
        //         .map(([petName, petData]) => [petName, Object.entries(petData)] as const)

        //         // Use the readObject helper to read every attribute of the data entries to JS
        //         .map(
        //             ([petName, petAttributes]) =>
        //                 [petName, petAttributes.map(([attribute, value]) => [attribute, readObject(value)])] as const
        //         )

        //         // Reassemble an entry with the pet name and then the pet's data entries
        //         .map(([petName, petAttributeEntries]) => [petName, Object.fromEntries(petAttributeEntries)] as const);

        return { TTVersion: version || "unknown", pets: {} };
    }

    public transformToSourceCode() {
        const petSourceTs = `export const pets = ${JSON.stringify(this.data.pets)} as const;\n`;
        const petTypeTs = "export type Pet = typeof pets";
        return `// TinyTower version: ${this.data.TTVersion}\n` + petSourceTs + petTypeTs;
    }
}

// Main entry point exported for when this file is compiled as a frida agent.
const rpcExports: IPetAgentExports = {
    main: async () => {
        const instance = await new GetPetData().start();
        return instance.transformToSourceCode();
    },
    mainProducesSourceCode: true,
};
rpc.exports = rpcExports as unknown as RpcExports;
