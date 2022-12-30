import { IMission, missionBlocks } from "./mission.js";
import { insertIntoBlocks } from "../insert-into-blocks.js";
import { bitizenBlocks, IBitizen, BitizenBlocks4_0_0 } from "./bitizen.js";
import { INimblebitJsonSave as _INimblebitJsonSave, blocks as _blocks } from "../v3.15.4/blocks.js";

// Typescript type for a parsed nimblebit save
export interface INimblebitJsonSave extends _INimblebitJsonSave {
    // New definitions
    ex: number;
    air: string;
    house: string;

    // Updated definitions
    mission: IMission;

    // Modified definitions
    doorman: IBitizen;
    bzns: IBitizen[];
}

// New blocks type
export type Blocks4_0_0 = Omit<typeof _blocks, "Pdrmn" | "Pbits" | "Pmiss"> & {
    Pdrmn: ["doorman", BitizenBlocks4_0_0, undefined, "object"];
    Pbits: ["bzns", BitizenBlocks4_0_0, "|", "array"];
    Pmiss: ["mission", typeof missionBlocks, undefined, "object"];
};

// We also modified the mission blocks in v4.0.0, however, the core blocks are not aware of that.
// So we will go ahead and update the core blocks here as well
const mutableBlocks = _blocks as unknown as Blocks4_0_0;
mutableBlocks.Pmiss = ["mission", missionBlocks, undefined, "object"];
mutableBlocks.Pdrmn = ["doorman", bitizenBlocks, undefined, "object"];
mutableBlocks.Pbits = ["bzns", bitizenBlocks, "|", "array"];

// Start by adding the Pex block
const PexBlocks = { Pex: "ex" } as const;
const blocksWithPex = insertIntoBlocks(mutableBlocks, "Pmiss", PexBlocks);

// Add the Pair block
const PairBlocks = { PAir: "air" } as const;
const blocksWithPAir = insertIntoBlocks(blocksWithPex, undefined, PairBlocks);

// Add the PHouse block
const PHouseBlocks = { PHouse: "house" } as const;
const blocksWithHouse = insertIntoBlocks(blocksWithPAir, "PAir", PHouseBlocks);

// Add the mission history blocks
const PMissionHistoryBlocks = { __type: (): INimblebitJsonSave => ({} as INimblebitJsonSave) } as const;
const blocksWithMissionHistory = insertIntoBlocks(blocksWithHouse, "Pbhst", PMissionHistoryBlocks);

// Export the new blocks as immutable
const immutableBlock: { [P in keyof typeof blocksWithMissionHistory]: typeof blocksWithMissionHistory[P] } = blocksWithMissionHistory;
export const blocks = immutableBlock;
