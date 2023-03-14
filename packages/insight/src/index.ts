import { fileURLToPath } from "node:url";

import type { IAgent } from "./shared/agent-main-export.js";
import type { IBitbookAgentExports } from "./shared/bitbook-agent-exports.js";
import type { IBitizenAgentExports } from "./shared/bitizen-agent-exports.js";
import type { ICostumeAgentExports } from "./shared/costume-agent-exports.js";
import type { IElevatorAgentExports } from "./shared/elevator-agent-exports.js";
import type { IElevatorRiderAgentExports } from "./shared/elevator-rider.js";
import type { IFloorAgentExports } from "./shared/floor-agent-exports.js";
import type { IMissionAgentExports } from "./shared/mission-agent-exports.js";
import type { IPetAgentExports } from "./shared/pet-agent-exports.js";
import type { IRoofAgentExports } from "./shared/roof-agent-exports.js";
import type { ITargetFpsAgentExports } from "./shared/target-fps-agent-exports.js";
import type { ITowerCredentialsAgentExports } from "./shared/tower-credentials-agent-exports.js";

// eslint-disable-next-line @rushstack/typedef-var
export const GetterAgents = {
    BitbookAgent: {
        agentFile: fileURLToPath(new URL("agents/get-bitbook-data.js", import.meta.url)),
        rpcTypes: {} as unknown as IBitbookAgentExports,
    } satisfies IAgent,
    BitizenAgent: {
        agentFile: fileURLToPath(new URL("agents/get-bitizen-data.js", import.meta.url)),
        rpcTypes: {} as unknown as IBitizenAgentExports,
    } satisfies IAgent,
    CostumeAgent: {
        agentFile: fileURLToPath(new URL("agents/get-costume-data.js", import.meta.url)),
        rpcTypes: {} as unknown as ICostumeAgentExports,
    } satisfies IAgent,
    ElevatorAgent: {
        agentFile: fileURLToPath(new URL("agents/get-elevator-data.js", import.meta.url)),
        rpcTypes: {} as unknown as IElevatorAgentExports,
    } satisfies IAgent,
    FloorAgent: {
        agentFile: fileURLToPath(new URL("agents/get-floor-data.js", import.meta.url)),
        rpcTypes: {} as unknown as IFloorAgentExports,
    } satisfies IAgent,
    MissionAgent: {
        agentFile: fileURLToPath(new URL("agents/get-mission-data.js", import.meta.url)),
        rpcTypes: {} as unknown as IMissionAgentExports,
    } satisfies IAgent,
    PetAgent: {
        agentFile: fileURLToPath(new URL("agents/get-pet-data.js", import.meta.url)),
        rpcTypes: {} as unknown as IPetAgentExports,
    } satisfies IAgent,
    RoofAgent: {
        agentFile: fileURLToPath(new URL("agents/get-roof-data.js", import.meta.url)),
        rpcTypes: {} as unknown as IRoofAgentExports,
    } satisfies IAgent,
} as const;

// eslint-disable-next-line @rushstack/typedef-var
export const SetterAgents = {
    SetFpsAgent: {
        agentFile: fileURLToPath(new URL("agents/set-target-fps.js", import.meta.url)),
        rpcTypes: {} as unknown as ITargetFpsAgentExports,
    } satisfies IAgent,
    SetTowerCredentialsAgent: {
        agentFile: fileURLToPath(new URL("agents/set-tower-credentials.js", import.meta.url)),
        rpcTypes: {} as unknown as ITowerCredentialsAgentExports,
    } satisfies IAgent,
} as const;

// eslint-disable-next-line @rushstack/typedef-var
export const AlertAgents = {
    ElevatorRider: {
        agentFile: fileURLToPath(new URL("agents/alert-elevator-rider.js", import.meta.url)),
        rpcTypes: {} as unknown as IElevatorRiderAgentExports,
    } satisfies IAgent,
};

// eslint-disable-next-line @rushstack/typedef-var
export const AllAgents = { ...GetterAgents, ...SetterAgents, ...AlertAgents } as const;

export {
    cleanupAgent,
    bootstrapAgent,
    bootstrapAgentOverUsb,
    bootstrapAgentOnRemote,
    bootstrapAgent as default,
} from "./bootstrap-agent.js";
