import {
    type IBitizen as _IBitizen,
    bitizenBlocks as _bitizenBlocks,
    bitizenAttributesBlocks as _bitizenAttributesBlocks,
} from "../v3.15.4/bitizen.js";

// Typescript type for a parsed bitizen
export interface IBitizen extends _IBitizen {
    unknown: number;
}

// New bitizen blocks type
// eslint-disable-next-line @typescript-eslint/naming-convention
export type BitizenBlocks4_0_0 = Omit<typeof _bitizenBlocks, "BA"> & {
    BA: ["attributes", typeof bitizenAttributesBlocks, ",", "object"];
};

// Update the blocks for parsing bitizen attributes
const bitizenAttributeBlocksWithIdk = [..._bitizenAttributesBlocks, "unknown"] as const;
export const bitizenAttributesBlocks = bitizenAttributeBlocksWithIdk;

// Update bitizen blocks (including type information)
(_bitizenBlocks.BA[1] as unknown as string[]).push("unknown");
(_bitizenBlocks.__type as unknown) = (): IBitizen => ({} as IBitizen);
const mutableBitizenBlocks = _bitizenBlocks as unknown as BitizenBlocks4_0_0;

// Export new blocks for parsing a bitizen as immutable
const immutableBlock: { [P in keyof typeof mutableBitizenBlocks]: (typeof mutableBitizenBlocks)[P] } =
    mutableBitizenBlocks;
export const bitizenBlocks = immutableBlock;
