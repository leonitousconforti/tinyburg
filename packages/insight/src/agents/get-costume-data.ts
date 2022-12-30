import "frida-il2cpp-bridge";

import type { ICostumeAgentExports } from "../shared/costume-agent-exports.js";

import { readField } from "../helpers/read.js";
import { TinyTowerFridaAgent } from "../shared/base-frida-agent.js";
import { copyDictionaryToJs } from "../helpers/copy-dictionary-to-js.js";

export class GetCostumeData extends TinyTowerFridaAgent<GetCostumeData> {
    public loadDependencies() {
        const csharpAssembly = Il2Cpp.Domain.assembly("Assembly-CSharp");
        const AppUtilClass = csharpAssembly.image.class("AppUtil");
        const CostumeClass = csharpAssembly.image.class("VCostume");
        const VCostumeTableClass = csharpAssembly.image.class("VCostumeTable");
        const VCostumeTableInstance = VCostumeTableClass.field<Il2Cpp.Object>("_instance").value;
        const costumesDictionary = VCostumeTableInstance.field<Il2Cpp.Object>("costumes").value;
        return { AppUtilClass, CostumeClass, VCostumeTableClass, VCostumeTableInstance, costumesDictionary };
    }

    public retrieveData() {
        // Extract the version of the game
        const version = this.dependencies.AppUtilClass.method<Il2Cpp.String>("VersionString").invoke().content;

        // Extract the costumes
        const costumeEntries =
            // Copy the costumes dictionary over to JS and map the entries (key is the name of the
            // costume and value is the costume data) to a list of entries with the costume properties
            Object.entries(copyDictionaryToJs<Il2Cpp.String, Il2Cpp.Object>(this.dependencies.costumesDictionary))
                .map(
                    ([name, costume]) =>
                        [
                            name,
                            costume.class.fields.map((property) => [
                                property.name,
                                readField(costume.field(property.name)),
                            ]),
                        ] as const
                )
                // Reassemble the list of costume entries into an object
                .map(([name, data]) => [name, Object.fromEntries(data)] as const);

        return { TTVersion: version || "unknown", costumes: Object.fromEntries(costumeEntries) };
    }

    public transformToSourceCode() {
        // Source code for the costumes array
        const costumesSourceTS = `export const costumes = ${JSON.stringify(this.data.costumes)} as const;\n`;
        const costumeSourceTS = "export type Costume = typeof costumes;\n";
        return `// TinyTower version: ${this.data.TTVersion}\n` + costumesSourceTS + costumeSourceTS;
    }
}

// Main entry point exported for when this file is compiled as a frida agent
const rpcExports: ICostumeAgentExports = {
    main: async () => {
        const instance = await new GetCostumeData().start();
        return instance.transformToSourceCode();
    },
    mainProducesSourceCode: true,
};
rpc.exports = rpcExports as unknown as RpcExports;
