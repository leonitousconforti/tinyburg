import "frida-il2cpp-bridge";

import { type IGameStateAgentExports } from "../shared/game-state-exports.js";

import { TinyTowerFridaAgent } from "./base-frida-agent.js";
import { copyArrayToJs } from "../helpers/copy-array-to-js.js";

export class GetGameState extends TinyTowerFridaAgent<GetGameState> {
    public loadDependencies() {
        const csharpAssembly = Il2Cpp.domain.assembly("Assembly-CSharp");
        const AppUtilClass = csharpAssembly.image.class("AppUtil");
        const VPlayerClass = csharpAssembly.image.class("VPlayer");
        const BuxField = VPlayerClass.field<number>("bux");
        const CoinsField = VPlayerClass.field<number>("coins");
        const GoldenTicketsField = VPlayerClass.field<number>("GoldenTickets");
        const elevatorSpeedField = VPlayerClass.field<number>("elevatorSpeed");
        const floorsArrayField = VPlayerClass.field<Il2Cpp.Array>("floors").value;
        const bitizenArrayField = VPlayerClass.field<Il2Cpp.Array>("Bitizens").value;

        return {
            csharpAssembly,
            AppUtilClass,
            BuxField,
            CoinsField,
            GoldenTicketsField,
            elevatorSpeedField,
            floorsArrayField,
            bitizenArrayField,
        };
    }

    public retrieveData() {
        const version = this.dependencies.AppUtilClass.method<Il2Cpp.String>("VersionString").invoke().content;
        return {
            version: version || "unknown",
            coins: this.dependencies.CoinsField.value,
            bux: this.dependencies.BuxField.value,
            goldTickets: this.dependencies.GoldenTicketsField.value,
            elevatorSpeed: this.dependencies.elevatorSpeedField.value,
            floors: copyArrayToJs(this.dependencies.floorsArrayField).length,
            bitizens: copyArrayToJs(this.dependencies.bitizenArrayField).length,
        };
    }
}

// Main entry point exported for when this file is compiled as a frida agent.
const rpcExports: IGameStateAgentExports = {
    main: async () => {
        const instance = await new GetGameState().start();
        return instance.data;
    },
};
rpc.exports = rpcExports as unknown as RpcExports;
