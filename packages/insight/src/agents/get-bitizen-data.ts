import "frida-il2cpp-bridge";

import type { IBitizenAgentExports } from "../shared/bitizen-agent-exports.js";

import { TinyTowerFridaAgent } from "./base-frida-agent.js";
import { copyListToJs } from "../helpers/copy-list-to-js.js";
import { colorToObject } from "../helpers/color-to-object.js";
import { copyArrayToJs } from "../helpers/copy-array-to-js.js";

export class GetBitizenData extends TinyTowerFridaAgent<GetBitizenData> {
    public loadDependencies() {
        const csharpAssembly = Il2Cpp.domain.assembly("Assembly-CSharp");
        const AppUtilClass = csharpAssembly.image.class("AppUtil");
        const VBitizenClass = csharpAssembly.image.class("VBitizen");
        const skinColorsList = VBitizenClass.field<Il2Cpp.Object>("skinColors").value;
        const hairColorsList = VBitizenClass.field<Il2Cpp.Object>("hairColors").value;
        const maleNamesArray = VBitizenClass.field<Il2Cpp.Array<Il2Cpp.String>>("maleNames").value;
        const femaleNamesArray = VBitizenClass.field<Il2Cpp.Array<Il2Cpp.String>>("femaleNames").value;
        const lastNamesArray = VBitizenClass.field<Il2Cpp.Array<Il2Cpp.String>>("lastNames").value;

        return {
            csharpAssembly,
            AppUtilClass,
            VBitizenClass,
            skinColorsList,
            hairColorsList,
            maleNamesArray,
            femaleNamesArray,
            lastNamesArray,
        };
    }

    public retrieveData() {
        // Extract the version of the game
        const version = this.dependencies.AppUtilClass.method<Il2Cpp.String>("VersionString").invoke().content;

        // Extract some constants about accessories (maybe move these to costume structs?)
        const numberHairAccessories = this.dependencies.VBitizenClass.tryField<number>("numHairAcc")?.value;
        const numberGlasses = this.dependencies.VBitizenClass.tryField<number>("numGlasses")?.value;
        const numberFemaleHats = this.dependencies.VBitizenClass.tryField<number>("numFHats")?.value;
        const numberMaleHats = this.dependencies.VBitizenClass.tryField<number>("numMHats")?.value;
        const numberBiHats = this.dependencies.VBitizenClass.tryField<number>("numBHats")?.value;

        // Extract all the males names, female names, and last names by enumerating over the arrays
        const maleNames = copyArrayToJs(this.dependencies.maleNamesArray).map((name) => name.toString());
        const femaleNames = copyArrayToJs(this.dependencies.femaleNamesArray).map((name) => name.toString());
        const lastNames = copyArrayToJs(this.dependencies.lastNamesArray).map((name) => name.toString());

        // Extract all the skin colors by first enumerating over all the skin colors, then
        // enumerating over each color which is an array of three numbers; r, g, b. Finally
        // map each array of r, g, b values to an object
        const skinColors = copyListToJs<Il2Cpp.Array<Il2Cpp.Object>>(this.dependencies.skinColorsList)
            .map((il2cppArray) => copyArrayToJs(il2cppArray))
            .map((jsIl2cppObjectArray) => jsIl2cppObjectArray.map(Number))
            .map((jsNumberArray) => colorToObject(jsNumberArray as [number, number, number]));

        // Extract all the hair colors by first enumerating over all the hair colors, then
        // enumerating over each color which is an array of three numbers; r, g, b. Finally
        // map each array of r, g, b values to an object
        const hairColors = copyListToJs<Il2Cpp.Array<Il2Cpp.Object>>(this.dependencies.hairColorsList)
            .map((il2CppArray) => copyArrayToJs(il2CppArray))
            .map((jsIl2cppObjectArray) => jsIl2cppObjectArray.map(Number))
            .map((jsNumberArray) => colorToObject(jsNumberArray as [number, number, number]));

        return {
            TTVersion: version || "unknown",
            numberHairAccessories,
            numberGlasses,
            numberFemaleHats,
            numberMaleHats,
            numberBiHats,
            hairColors,
            skinColors,
            maleNames,
            femaleNames,
            lastNames,
        };
    }

    public transformToSourceCode() {
        // Source code for accessories (maybe move these to costume structs?)
        const numberHairAccessoriesSourceTS = `export const numberHairAccessories = ${this.data.numberHairAccessories} as const;\n`;
        const numberGlassesSourceTS = `export const numberGlasses = ${this.data.numberGlasses} as const;\n`;
        const numberFemaleHatsSourceTS = `export const numberFemaleHats = ${this.data.numberFemaleHats} as const;\n`;
        const numberMaleHatsSourceTS = `export const numberMaleHats = ${this.data.numberMaleHats} as const;\n`;
        const numberBiHatsSourceTS = `export const numberBiHats = ${this.data.numberBiHats} as const;\n`;

        // Source code for the hair colors array
        const hairColorsArrayString = this.data.hairColors.map((color) => JSON.stringify(color)).join(", ");
        const hairColorsSourceTS = `export const hairColors = [${hairColorsArrayString}] as const;\n`;
        const hairColorSourceTS = "export type HairColor = typeof hairColors[number];\n";

        // Source code for the skin colors array
        const skinColorsArrayString = this.data.skinColors.map((color) => JSON.stringify(color)).join(", ");
        const skinColorsSourceTS = `export const skinColors = [${skinColorsArrayString}] as const;\n`;
        const skinColorSourceTS = "export type SkinColor = typeof skinColors[number]\n";

        // Source code for the male names array. Male names are in all caps, but I prefer
        // only first character capitalized.
        const maleNamesArrayString = this.data.maleNames
            .map((name) => name.charAt(0) + name.charAt(1).toUpperCase() + name.slice(2).toLowerCase())
            .join(", ");
        const maleNamesSourceTS = `export const maleNames = [${maleNamesArrayString}] as const;\n`;
        const maleNameSourceTS = "export type MaleName = typeof maleNames[number];\n";

        // Source code for the female names array. Female names are in all caps, but I prefer
        // only first character capitalized.
        const femaleNamesArrayString = this.data.femaleNames
            .map((name) => name.charAt(0) + name.charAt(1).toUpperCase() + name.slice(2).toLowerCase())
            .join(", ");
        const femaleNamesSourceTS = `export const femaleNames = [${femaleNamesArrayString}] as const;\n`;
        const femaleNameSourceTS = "export type FemaleName = typeof femaleNames[number];\n";

        // Source code for the last names array. Lase names are in all caps, but I prefer
        // only first character capitalized.
        const lastNamesArrayString = this.data.lastNames
            .map((name) => name.charAt(0) + name.charAt(1).toUpperCase() + name.slice(2).toLowerCase())
            .join(", ");
        const lastNamesSourceTS = `export const lastNames = [${lastNamesArrayString}] as const;\n`;
        const lastNameSourceTS = "export type LastName = typeof lastNames[number];\n";

        return (
            `// TinyTower version: ${this.data.TTVersion}` +
            "\n" +
            numberHairAccessoriesSourceTS +
            numberGlassesSourceTS +
            numberFemaleHatsSourceTS +
            numberMaleHatsSourceTS +
            numberBiHatsSourceTS +
            "\n" +
            hairColorsSourceTS +
            hairColorSourceTS +
            "\n" +
            skinColorsSourceTS +
            skinColorSourceTS +
            "\n" +
            maleNamesSourceTS +
            maleNameSourceTS +
            "\n" +
            femaleNamesSourceTS +
            femaleNameSourceTS +
            "\n" +
            lastNamesSourceTS +
            lastNameSourceTS
        );
    }
}

// Main entry point exported for when this file is compiled as a frida agent
const rpcExports: IBitizenAgentExports = {
    main: async () => {
        const instance = await new GetBitizenData().start();
        return instance.transformToSourceCode();
    },
    mainProducesSourceCode: true,
};
rpc.exports = rpcExports as unknown as RpcExports;
