import "frida-il2cpp-bridge";

import { type IGameStateAgentExports } from "../shared/game-state-exports.js";

import { TinyTowerFridaAgent } from "./base-frida-agent.js";
import { copyArrayToJs } from "../helpers/copy-array-to-js.js";

export class GetGameState extends TinyTowerFridaAgent<GetGameState> {
    public loadDependencies() {
        const csharpAssembly = Il2Cpp.domain.assembly("Assembly-CSharp");

        const AppUtilClass = csharpAssembly.image.class("AppUtil");
        const VGameClass = csharpAssembly.image.class("VGame");
        const VPlayerClass = csharpAssembly.image.class("VPlayer");
        const VBitizenListClass = csharpAssembly.image.class("VBitizenList");
        const VUpgradesMenuClass = csharpAssembly.image.class("VUpgradesMenu");
        const VCharacterListClass = csharpAssembly.image.class("VCharacterList");
        const VBBListClass = csharpAssembly.image.class("VBBList");
        const VOptionsPageClass = csharpAssembly.image.class("VOptionsPage");
        const VFriendsListClass = csharpAssembly.image.class("VFriendsList");
        const VSyncPageClass = csharpAssembly.image.class("VSyncPage");
        const VRebuildPageClass = csharpAssembly.image.class("VRebuildPage");
        const VRafflePageClass = csharpAssembly.image.class("VRafflePage");

        const BuxField = VPlayerClass.field<number>("bux");
        const CoinsField = VPlayerClass.field<number>("coins");
        const AllTimeGoldenTicketsField = VPlayerClass.field<number>("maxGold");
        const GoldenTicketsField = VPlayerClass.field<number>("gold");
        const elevatorSpeedField = VPlayerClass.field<number>("liftSpeed");
        const roofsArrayField = VPlayerClass.field<Il2Cpp.Array>("roofs").value;
        const floorsArrayField = VPlayerClass.field<Il2Cpp.Array>("floors").value;
        const lobbiesArrayField = VPlayerClass.field<Il2Cpp.Array>("lobbies").value;
        const elevatorsArrayField = VPlayerClass.field<Il2Cpp.Array>("lifts").value;
        const bitizensArrayField = VPlayerClass.field<Il2Cpp.Array>("Bitizens").value;
        const costumesArrayField = VPlayerClass.field<Il2Cpp.Array>("costumes").value;

        return {
            csharpAssembly,

            AppUtilClass,
            VGameClass,
            VPlayerClass,
            VBitizenListClass,
            VUpgradesMenuClass,
            VCharacterListClass,
            VBBListClass,
            VOptionsPageClass,
            VFriendsListClass,
            VSyncPageClass,
            VRebuildPageClass,
            VRafflePageClass,

            BuxField,
            CoinsField,
            AllTimeGoldenTicketsField,
            GoldenTicketsField,
            elevatorSpeedField,
            roofsArrayField,
            floorsArrayField,
            lobbiesArrayField,
            elevatorsArrayField,
            bitizensArrayField,
            costumesArrayField,
        };
    }

    public retrieveData() {
        const version = this.dependencies.AppUtilClass.method<Il2Cpp.String>("VersionString").invoke().content;
        const topPage = this.dependencies.VGameClass.method<Il2Cpp.Object>("TopPage").invoke();
        send(topPage.class.name);

        return {
            version: version || "unknown",
            bux: this.dependencies.BuxField.value,
            coins: this.dependencies.CoinsField.value,
            elevatorSpeed: this.dependencies.elevatorSpeedField.value,
            goldenTickets: this.dependencies.GoldenTicketsField.value,
            allTimeGoldenTickets: this.dependencies.AllTimeGoldenTicketsField.value,
            numberOfFloors: copyArrayToJs(this.dependencies.floorsArrayField).length,
            numberOfBitizens: copyArrayToJs(this.dependencies.bitizensArrayField).length,
            numberOfRoofsUnlocked: copyArrayToJs(this.dependencies.roofsArrayField).length,
            numberOfLobbiesUnlocked: copyArrayToJs(this.dependencies.lobbiesArrayField).length,
            numberOfCostumesUnlocked: copyArrayToJs(this.dependencies.costumesArrayField).length,
            numberOfElevatorsUnlocked: copyArrayToJs(this.dependencies.elevatorsArrayField).length,
            gameScreen: "Unknown" as Awaited<ReturnType<IGameStateAgentExports["main"]>>["gameScreen"],
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
