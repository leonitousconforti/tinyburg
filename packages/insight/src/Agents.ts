/**
 * Built-in agents that can be used in the game.
 *
 * @since 1.0.0
 */

import * as url from "node:url";

import type { IAgent } from "./internal/shared/agent-main-export.js";
import type { IBadAgentExports } from "./internal/shared/bad-agent-exports.js";
import type { IBitbookAgentExports } from "./internal/shared/bitbook-agent-exports.js";
import type { IBitizenAgentExports } from "./internal/shared/bitizen-agent-exports.js";
import type { ICostumeAgentExports } from "./internal/shared/costume-agent-exports.js";
import type { IElevatorAgentExports } from "./internal/shared/elevator-agent-exports.js";
import type { IElevatorRiderAgentExports } from "./internal/shared/elevator-rider.js";
import type { IFloorAgentExports } from "./internal/shared/floor-agent-exports.js";
import type { IGameStateAgentExports } from "./internal/shared/game-state-exports.js";
import type { IGoodAgentExports } from "./internal/shared/good-agent-exports.js";
import type { IMissionAgentExports } from "./internal/shared/mission-agent-exports.js";
import type { IPetAgentExports } from "./internal/shared/pet-agent-exports.js";
import type { IRoofAgentExports } from "./internal/shared/roof-agent-exports.js";
import type { ITargetFpsAgentExports } from "./internal/shared/target-fps-agent-exports.js";
import type {
    IGetTowerCredentialsAgentExports,
    ISetTowerCredentialsAgentExports,
} from "./internal/shared/tower-credentials-agent-exports.js";

/**
 * @since 1.0.0
 * @category Agents
 */
export const GetterAgents = {
    BitbookAgent: {
        agentFile: url.fileURLToPath(new URL("agents/get-bitbook-data.js", import.meta.url)),
        rpcTypes: {} as unknown as IBitbookAgentExports,
    } satisfies IAgent,
    BitizenAgent: {
        agentFile: url.fileURLToPath(new URL("agents/get-bitizen-data.js", import.meta.url)),
        rpcTypes: {} as unknown as IBitizenAgentExports,
    } satisfies IAgent,
    CostumeAgent: {
        agentFile: url.fileURLToPath(new URL("agents/get-costume-data.js", import.meta.url)),
        rpcTypes: {} as unknown as ICostumeAgentExports,
    } satisfies IAgent,
    ElevatorAgent: {
        agentFile: url.fileURLToPath(new URL("agents/get-elevator-data.js", import.meta.url)),
        rpcTypes: {} as unknown as IElevatorAgentExports,
    } satisfies IAgent,
    FloorAgent: {
        agentFile: url.fileURLToPath(new URL("agents/get-floor-data.js", import.meta.url)),
        rpcTypes: {} as unknown as IFloorAgentExports,
    } satisfies IAgent,
    MissionAgent: {
        agentFile: url.fileURLToPath(new URL("agents/get-mission-data.js", import.meta.url)),
        rpcTypes: {} as unknown as IMissionAgentExports,
    } satisfies IAgent,
    PetAgent: {
        agentFile: url.fileURLToPath(new URL("agents/get-pet-data.js", import.meta.url)),
        rpcTypes: {} as unknown as IPetAgentExports,
    } satisfies IAgent,
    RoofAgent: {
        agentFile: url.fileURLToPath(new URL("agents/get-roof-data.js", import.meta.url)),
        rpcTypes: {} as unknown as IRoofAgentExports,
    } satisfies IAgent,
    GetTowerCredentialsAgent: {
        agentFile: url.fileURLToPath(new URL("agents/get-tower-credentials.js", import.meta.url)),
        rpcTypes: {} as unknown as IGetTowerCredentialsAgentExports,
    } satisfies IAgent,
    GetGameStateAgent: {
        agentFile: url.fileURLToPath(new URL("agents/get-game-state.js", import.meta.url)),
        rpcTypes: {} as unknown as IGameStateAgentExports,
    } satisfies IAgent,
} as const;

/**
 * @since 1.0.0
 * @category Agents
 */
export const SetterAgents = {
    SetFpsAgent: {
        agentFile: url.fileURLToPath(new URL("agents/set-target-fps.js", import.meta.url)),
        rpcTypes: {} as unknown as ITargetFpsAgentExports,
    } satisfies IAgent,
    SetTowerCredentialsAgent: {
        agentFile: url.fileURLToPath(new URL("agents/set-tower-credentials.js", import.meta.url)),
        rpcTypes: {} as unknown as ISetTowerCredentialsAgentExports,
    } satisfies IAgent,
} as const;

/**
 * @since 1.0.0
 * @category Agents
 */
export const AlertAgents = {
    ElevatorRider: {
        agentFile: url.fileURLToPath(new URL("agents/alert-elevator-rider.js", import.meta.url)),
        rpcTypes: {} as unknown as IElevatorRiderAgentExports,
    } satisfies IAgent,
};

/**
 * @since 1.0.0
 * @category Agents
 */
export const TestingAgents = {
    BadAgent: {
        agentFile: url.fileURLToPath(new URL("agents/bad-agent.js", import.meta.url)),
        rpcTypes: {} as unknown as IBadAgentExports,
    } satisfies IAgent,
    GoodAgent: {
        agentFile: url.fileURLToPath(new URL("agents/good-agent.js", import.meta.url)),
        rpcTypes: {} as unknown as IGoodAgentExports,
    } satisfies IAgent,
};

/**
 * @since 1.0.0
 * @category Agents
 */
export const AllAgents = {
    ...GetterAgents,
    ...SetterAgents,
    ...AlertAgents,
    ...TestingAgents,
} as const;
