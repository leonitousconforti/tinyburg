import { fileURLToPath } from "node:url";

import type { IAgent } from "./shared/agent-main-export.js";
import type { IBitbookAgentExports } from "./shared/bitbook-agent-exports.js";
import type { IBitizenAgentExports } from "./shared/bitizen-agent-exports";
import type { ICostumeAgentExports } from "./shared/costume-agent-exports";
import type { IElevatorAgentExports } from "./shared/elevator-agent-exports";
import type { IElevatorRiderAgentExports } from "./shared/elevator-rider.js";
import type { IFloorAgentExports } from "./shared/floor-agent-exports";
import type { IMissionAgentExports } from "./shared/mission-agent-exports";
import type { IPetAgentExports } from "./shared/pet-agent-exports";
import type { IRoofAgentExports } from "./shared/roof-agent-exports";
import type { ITargetFpsAgentExports } from "./shared/target-fps-agent-exports";
import type { ITowerCredentialsAgentExports } from "./shared/tower-credentials-agent-exports";

// eslint-disable-next-line @rushstack/typedef-var
export const GetterAgents = {
    BitbookAgent: {
        agentFile: fileURLToPath(new URL("agents/get-bitbook-data.ts", import.meta.url)),
        rpcTypes: {} as unknown as IBitbookAgentExports,
    } satisfies IAgent,
    BitizenAgent: {
        agentFile: fileURLToPath(new URL("agents/get-bitizen-data.ts", import.meta.url)),
        rpcTypes: {} as unknown as IBitizenAgentExports,
    } satisfies IAgent,
    CostumeAgent: {
        agentFile: fileURLToPath(new URL("agents/get-costume-data.ts", import.meta.url)),
        rpcTypes: {} as unknown as ICostumeAgentExports,
    } satisfies IAgent,
    ElevatorAgent: {
        agentFile: fileURLToPath(new URL("agents/get-elevator-data.ts", import.meta.url)),
        rpcTypes: {} as unknown as IElevatorAgentExports,
    } satisfies IAgent,
    FloorAgent: {
        agentFile: fileURLToPath(new URL("agents/get-floor-data.ts", import.meta.url)),
        rpcTypes: {} as unknown as IFloorAgentExports,
    } satisfies IAgent,
    MissionAgent: {
        agentFile: fileURLToPath(new URL("agents/get-mission-data.ts", import.meta.url)),
        rpcTypes: {} as unknown as IMissionAgentExports,
    } satisfies IAgent,
    PetAgent: {
        agentFile: fileURLToPath(new URL("agents/get-pet-data.ts", import.meta.url)),
        rpcTypes: {} as unknown as IPetAgentExports,
    } satisfies IAgent,
    RoofAgent: {
        agentFile: fileURLToPath(new URL("agents/get-roof-data.ts", import.meta.url)),
        rpcTypes: {} as unknown as IRoofAgentExports,
    } satisfies IAgent,
} as const;

// eslint-disable-next-line @rushstack/typedef-var
export const SetterAgents = {
    SetFpsAgent: {
        agentFile: fileURLToPath(new URL("agents/set-target-fps.ts", import.meta.url)),
        rpcTypes: {} as unknown as ITargetFpsAgentExports,
    } satisfies IAgent,
    SetTowerCredentialsAgent: {
        agentFile: fileURLToPath(new URL("agents/set-tower-credentials.ts", import.meta.url)),
        rpcTypes: {} as unknown as ITowerCredentialsAgentExports,
    } satisfies IAgent,
} as const;

// eslint-disable-next-line @rushstack/typedef-var
export const AlertAgents = {
    ElevatorRider: {
        agentFile: fileURLToPath(new URL("agents/alert-elevator-ride.ts")),
        rpcTypes: {} as unknown as IElevatorRiderAgentExports,
    } satisfies IAgent,
};

// eslint-disable-next-line @rushstack/typedef-var
export const AllAgents = { ...GetterAgents, ...SetterAgents } as const;

export {
    bootstrapAgent,
    cleanupAgent,
    bootstrapAgentOnRemote,
    bootstrapAgentOverUsb,
    bootstrapAgent as default,
} from "./bootstrap-agent.js";
