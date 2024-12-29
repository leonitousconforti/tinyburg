import "frida-il2cpp-bridge";

import type { IFloorAgentExports } from "../shared/floor-agent-exports.js";

import { copyDictionaryToJs } from "../helpers/copy-dictionary-to-js.js";
import { readEnumFields } from "../helpers/get-enum-fields.js";
import { readObject } from "../helpers/read.js";
import { TinyTowerFridaAgent } from "./base-frida-agent.js";

export class GetFloorData extends TinyTowerFridaAgent<GetFloorData> {
    public loadDependencies() {
        const csharpAssembly = Il2Cpp.domain.assembly("Assembly-CSharp");
        const AppUtilClass = csharpAssembly.image.class("AppUtil");
        const FloorTypeClass = csharpAssembly.image.class("FloorType");
        const VFloorDataClass = csharpAssembly.image.class("VFloorData");
        const floorInfoDictionary = VFloorDataClass.field<Il2Cpp.Object>("info").value;
        return { AppUtilClass, FloorTypeClass, VFloorDataClass, floorInfoDictionary };
    }

    public retrieveData() {
        // Extract the version of the game
        const version = this.dependencies.AppUtilClass.method<Il2Cpp.String>("VersionString").invoke().content;

        // Extract the FloorType enum fields
        const floorTypeEnumFields = readEnumFields(this.dependencies.FloorTypeClass);

        // Extract the floors
        const floors =
            // Copy the floors dictionary to JS
            Object.entries(copyDictionaryToJs<number, Il2Cpp.Object>(this.dependencies.floorInfoDictionary))

                // Map every floor entry to its index and copy the floor data over to JS
                .map(
                    ([index, floorDictionary]) =>
                        [
                            Number.parseInt(index),
                            copyDictionaryToJs<Il2Cpp.String, Il2Cpp.Object>(floorDictionary),
                        ] as const
                )
                .map(([index, floorData]) => [
                    ...Object.entries(floorData).map(([property, value]) => [property, readObject(value)]),
                    ["index", index],
                ])

                // Reassemble a floor object from its entries
                .map((entries) => Object.fromEntries(entries))

                // Filter to get only the floors that have a positive index
                .filter((floor) => floor.index >= 0)

                // Sort the floors based on their index
                .sort((a, b) => {
                    if (a.index > b.index) return 1;
                    else if (a.index < b.index) return -1;
                    else return 0;
                });

        // Make sure that a floor exists at each index, this is needed so that when tinyburg
        // looks up a floor by name it gets the correct index. And yes, Nimblebit does skip
        // some indexes for some obscure reason
        floors
            .map((floor) => floor.index)
            .filter((index, arrayIndex, array) => array[arrayIndex + 1] && array[arrayIndex + 1] !== index + 1)
            .forEach((index) => floors.splice(index + 1, 0, { name: "undefined", type: "None" }));

        // Rename and remove some of the properties of the floors
        for (const floor of floors) {
            floor.products = floor.prods && floor.prods.length > 0 ? floor.prods : undefined;
            floor.animations = floor.anims && floor.anims.length > 0 ? floor.anims : undefined;
            floor.productImages = floor.prodimgs && floor.prodimgs.length > 0 ? floor.prodimgs : undefined;
            delete floor.anims;
            delete floor.prods;
            delete floor.prodimgs;
            delete floor.index;
            delete floor.fid;
        }

        return { TTVersion: version || "unknown", floorTypeEnumFields, floors };
    }

    public transformToSourceCode() {
        // Source code for the floor type enum
        const floorTypeEnumFieldsSource = this.transformEnumFieldsToSource(this.data.floorTypeEnumFields);
        const floorTypeSourceTS = `export enum FloorType {${floorTypeEnumFieldsSource}}\n`;

        // Source code for the floors array and type
        const floorsSourceString = JSON.stringify(this.data.floors).replaceAll(
            /"type":\s*"(\w+)"/gm,
            "type: FloorType.$1"
        );
        const floorsSourceTS = `export const floors = ${floorsSourceString} as const;\n`;
        const floorSourceTS = "export type Floor = typeof floors[number];\n";

        // Source code for the next floor cost
        // int num = count - 1;
        // long num2 = (long)Mathf.Max(5000f, (float)Mathf.CeilToInt((float)(num * num) * 500f - (float)(12 - num) * 9000f));
        // return num2 - num2 % 1000;
        const buildFloorCost = `export const buildFloorCost = (numFloors: number) => {
            const num1 = numFloors - 1;
            const num2 = Math.max(5000, Math.ceil((num1 * num1) * 500 - (12 - num1) * 9000));
            return num2 - num2 % 1000;
         };\n`;

        return (
            `// TinyTower version: ${this.data.TTVersion}\n` +
            buildFloorCost +
            "\n" +
            floorTypeSourceTS +
            "\n" +
            floorsSourceTS +
            floorSourceTS
        );
    }
}

// Main entry point exported for when this file is compiled as a frida agent.
const rpcExports: IFloorAgentExports = {
    main: async () => {
        const instance = await new GetFloorData().start();
        return instance.transformToSourceCode();
    },
};
rpc.exports = rpcExports as unknown as RpcExports;
