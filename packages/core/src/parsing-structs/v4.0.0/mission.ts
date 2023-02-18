import { bitizenBlocks, IBitizen } from "./bitizen.js";
import { insertIntoBlocks } from "../insert-into-blocks.js";
import { IMission as _IMission, missionBlocks as _missionBlocks } from "../v3.15.4/mission.js";

// Typescript type for a parsed mission
export interface IMission extends _IMission {
    bitizen: IBitizen;
}

// Blocks for parsing a mission
const bitizenMissionBlock = {
    m_bzn: ["bitizen", bitizenBlocks, undefined, "object"],
    __type: (): IMission => ({} as IMission),
} as const;
export const missionBlocks = insertIntoBlocks(_missionBlocks, undefined, bitizenMissionBlock);
