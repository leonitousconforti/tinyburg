import type { Mutable } from "../mutable.js";
import type { IBitbookPost as _IBitbookPost } from "../v3.15.4/bitbook-posts.js";

import { bitizenBlocks, type IBitizen } from "./bitizen.js";
import { bitbookPostBlocks as _bitbookPostBlocks } from "../v3.15.4/bitbook-posts.js";

// Typescript type for a parsed bitbook post
export interface IBitbookPost extends Omit<_IBitbookPost, "bitizen"> {
    bitizen: IBitizen;
}

// New bitbook post blocks type
// eslint-disable-next-line @typescript-eslint/naming-convention
export type BitbookPostBlocks4_0_0 = Omit<typeof mutableBitizenBlocks, "bb_bzn"> & {
    bb_bzn: ["bitizen", typeof bitizenBlocks, undefined, "object"];
};

// Update the blocks for parsing a bitbook post
const mutableBitizenBlocks = _bitbookPostBlocks as Mutable<typeof _bitbookPostBlocks>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
mutableBitizenBlocks.bb_bzn = ["bitizen", bitizenBlocks, undefined, "object"] as any;
mutableBitizenBlocks.__type = (): IBitbookPost => ({}) as IBitbookPost;

// Update type information for blocks
const mutableBitizenBlocksTyped = mutableBitizenBlocks as unknown as BitbookPostBlocks4_0_0;

// Export new blocks for parsing a bitbook post immutable
const immutableBlock: { [P in keyof typeof mutableBitizenBlocksTyped]: (typeof mutableBitizenBlocksTyped)[P] } =
    mutableBitizenBlocksTyped;
export const bitbookPostBlocks = immutableBlock;
