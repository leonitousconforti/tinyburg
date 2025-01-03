import "frida-il2cpp-bridge";

import type { IMissionAgentExports } from "../src/shared/mission-agent-exports.js";

import { TinyTowerFridaAgent } from "./base-frida-agent.js";
import { copyDictionaryToJs } from "./helpers/copy-dictionary-to-js.js";
import { readEnumFields } from "./helpers/get-enum-fields.js";
import { readField } from "./helpers/read.js";

export class GetMissionData extends TinyTowerFridaAgent<GetMissionData> {
    public loadDependencies() {
        const csharpAssembly = Il2Cpp.domain.assembly("Assembly-CSharp");
        const AppUtilClass = csharpAssembly.image.class("AppUtil");
        const VMissionClass = csharpAssembly.image.class("VMission");
        const MissionTypeClass = csharpAssembly.image.class("MissionType");
        const VMissionDataClass = csharpAssembly.image.class("VMissionData");
        const missionsDictionary = VMissionDataClass.field<Il2Cpp.Object>("missions").value;
        const tipMissionsDictionary = VMissionDataClass.field<Il2Cpp.Object>("tipMissions").value;
        const tutorialMissionsDictionary = VMissionDataClass.field<Il2Cpp.Object>("tutMissions").value;

        return {
            AppUtilClass,
            VMissionClass,
            MissionTypeClass,
            VMissionDataClass: {
                dependency: VMissionDataClass,
                meta: { callStaticConstructor: true },
            },
            missionsDictionary,
            tipMissionsDictionary,
            tutorialMissionsDictionary,
        };
    }

    public retrieveData() {
        // Extract the game version
        const version = this.dependencies.AppUtilClass.method<Il2Cpp.String>("VersionString").invoke().content;

        // Extract the MissionType enum fields
        const missionTypeEnumFields = readEnumFields(this.dependencies.MissionTypeClass);

        const extractMissionEntries = (object: Il2Cpp.Object) =>
            // Copy the missions dictionary over to JS and map the entries (key is the tutorial
            // mission index and value is the mission data) to a list of entries with the mission's properties
            Object.entries(copyDictionaryToJs<number, Il2Cpp.Object>(object))
                .map(
                    ([index, data]) =>
                        [
                            index,
                            ["id", "mType", "text", "charId", "floorId", "floorType", "count"].map((property) => [
                                property,
                                readField(data.field(property)),
                            ]),
                        ] as const
                )

                // Reassemble the list of mission entries into an object
                .map(([index, data]) => [index, Object.fromEntries(data)] as const);

        // Extract the missions
        const tutorialMissionEntries = extractMissionEntries(this.dependencies.tutorialMissionsDictionary);
        const tipMIssionsEntries = extractMissionEntries(this.dependencies.tipMissionsDictionary);
        const missionEntries = extractMissionEntries(this.dependencies.missionsDictionary);

        return {
            TTVersion: version || "unknown",
            missionTypeEnumFields,
            missions: Object.fromEntries(missionEntries),
            tipMissions: Object.fromEntries(tipMIssionsEntries),
            tutorialMissions: Object.fromEntries(tutorialMissionEntries),
        };
    }

    public transformToSourceCode() {
        // Import for the floor type enum

        const floorTypeEnumImport = 'import { FloorType } from "./floors.js";\n';

        // Source code for the mission type enum
        const missionTypeEnumFieldsSource = this.transformEnumFieldsToSource(this.data.missionTypeEnumFields);
        const missionTypeSourceTS = `export enum MissionType {${missionTypeEnumFieldsSource}}\n`;

        const formatMissionSource = (name: string, data: { [k: string]: unknown }) =>
            `export const ${name} = ${JSON.stringify(data)} as const;`
                .replaceAll(/"floorType":\s*"(\w+)"/gm, "floorType: FloorType.$1")
                .replaceAll(/"mType":\s*"(\w+)"/gm, "missionType: MissionType.$1");

        // Source code for the missions
        const tutorialMissionsSourceTs = formatMissionSource("tutorialMissions", this.data.tutorialMissions);
        const tipMissionsSourceTs = formatMissionSource("tipMissions", this.data.tipMissions);
        const missionsSourceTs = formatMissionSource("missions", this.data.missions);
        const tutorialMissionSourceTs = "export type TutorialMission = typeof tutorialMissions;\n";
        const tipMissionSourceTs = "export type TipMission = typeof tipMissions;\n";
        const missionSourceTs = "export type Mission = typeof missions;\n";

        return (
            `// TinyTower version: ${this.data.TTVersion}\n` +
            floorTypeEnumImport +
            "\n" +
            missionTypeSourceTS +
            "\n" +
            tutorialMissionsSourceTs +
            tutorialMissionSourceTs +
            "\n" +
            tipMissionsSourceTs +
            tipMissionSourceTs +
            "\n" +
            missionsSourceTs +
            missionSourceTs
        );
    }
}

// Main entry point exported for when this file is compiled as a frida agent.
const rpcExports: IMissionAgentExports = {
    main: async () => {
        const instance = await new GetMissionData().start();
        return instance.transformToSourceCode();
    },
};
rpc.exports = rpcExports as unknown as RpcExports;
