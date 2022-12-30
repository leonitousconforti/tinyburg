import type { IElevatorRiderAgentExports } from "../shared/elevator-rider.js";

import { TinyTowerFridaAgent } from "../shared/base-frida-agent.js";

export class AlertElevatorRide extends TinyTowerFridaAgent<AlertElevatorRide> {
    public loadDependencies() {
        return {};
    }

    public retrieveData() {
        return {};
    }
}

// Main entry point exported for when this file is compiled as a frida agent
const rpcExports: IElevatorRiderAgentExports = {
    main: async (callback) => {
        setInterval(async () => {
            await new AlertElevatorRide().start();
            callback("");
        }, 1000);
    },
};
rpc.exports = rpcExports as unknown as RpcExports;
