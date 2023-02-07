import type { IElevatorRiderAgentExports } from "../shared/elevator-rider.js";

import { TinyTowerFridaAgent } from "./base-frida-agent.js";

export class AlertElevatorRide extends TinyTowerFridaAgent<AlertElevatorRide> {
    public loadDependencies() {
        const csharpAssembly = Il2Cpp.Domain.assembly("Assembly-CSharp");
        return { csharpAssembly };
    }

    public retrieveData() {
        return {};
    }
}

// Main entry point exported for when this file is compiled as a frida agent
const rpcExports: IElevatorRiderAgentExports = {
    main: async (callback) => {
        const instance = await new AlertElevatorRide().start();

        setInterval(() => {
            const data = instance.retrieveData();
            if (data) {
                callback("");
            }
        }, 1000);
    },
};
rpc.exports = rpcExports as unknown as RpcExports;
