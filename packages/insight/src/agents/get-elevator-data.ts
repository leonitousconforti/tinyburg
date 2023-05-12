import "frida-il2cpp-bridge";

import type { IElevatorAgentExports } from "../shared/elevator-agent-exports.js";

import { readObject } from "../helpers/read.js";
import { TinyTowerFridaAgent } from "./base-frida-agent.js";
import { copyArrayToJs } from "../helpers/copy-array-to-js.js";
import { copyDictionaryToJs } from "../helpers/copy-dictionary-to-js.js";

export class GetElevatorData extends TinyTowerFridaAgent<GetElevatorData> {
    public loadDependencies() {
        const csharpAssembly = Il2Cpp.Domain.assembly("Assembly-CSharp");
        const AppUtilClass = csharpAssembly.image.class("AppUtil");
        const VElevatorDataClass = csharpAssembly.image.class("VElevatorData");
        const elevatorsArray = VElevatorDataClass.field<Il2Cpp.Array>("info").value.object;
        return { AppUtilClass, VElevatorDataClass, elevatorsArray };
    }

    public retrieveData() {
        // Extract the version of the game
        const version = this.dependencies.AppUtilClass.method<Il2Cpp.String>("VersionString").invoke().content;

        // Get the number of elevators
        const numberElevators = this.dependencies.VElevatorDataClass.field<number>("NUM_ELEVATORS").value;

        // Extract the elevators
        const elevators = copyArrayToJs<Il2Cpp.Object>(this.dependencies.elevatorsArray)
            // Copy the elevators array over to js
            .map((elevator) => copyDictionaryToJs<Il2Cpp.String, Il2Cpp.Object>(elevator))

            // Read all the properties of every elevator entry
            .map((elevator) => Object.entries(elevator).map(([property, value]) => [property, readObject(value)]))

            // Reassemble the elevator object from its entries
            .map((entries) => Object.fromEntries(entries));

        // Rename some of the properties of the elevators
        for (const elevator of elevators) {
            elevator.animations = elevator.anims && elevator.anims.length > 0 ? elevator.anims : undefined;
            delete elevator.anims;
        }

        return { TTVersion: version || "unknown", numberElevators, elevators };
    }

    public transformToSourceCode() {
        // Source code for the number of elevators
        const numberElevatorsSource = `export const numberElevators = ${this.data.numberElevators} as const;\n`;

        // Source code for the elevators array
        const elevatorsSourceTS = `export const elevators = ${JSON.stringify(this.data.elevators)} as const;\n`;
        const elevatorSourceTS = "export type Elevator = typeof elevators[number];\n";

        // Mathf.Ceil(VPlayer.liftSpeed * VPlayer.liftSpeed * 100f)
        const upgradeElevatorCost = `export const upgradeElevatorCost = (liftSpeed: number) => {
            return liftSpeed * liftSpeed * 100;
        };\n`;

        return (
            `// TinyTower version: ${this.data.TTVersion}` +
            "\n" +
            upgradeElevatorCost +
            "\n" +
            numberElevatorsSource +
            "\n" +
            elevatorsSourceTS +
            elevatorSourceTS
        );
    }
}

// Main entry point exported for when this file is compiled as a frida agent
const rpcExports: IElevatorAgentExports = {
    main: async () => {
        const instance = await new GetElevatorData().start();
        return instance.transformToSourceCode();
    },
    mainProducesSourceCode: true,
};
rpc.exports = rpcExports as unknown as RpcExports;
