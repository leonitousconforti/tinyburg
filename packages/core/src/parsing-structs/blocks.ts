import { type INimblebitJsonSave as _INimblebitJsonSave, blocks as _blocks } from "./v4.0.0/blocks.js";

// Typescript type for a parsed nimblebit save
export interface INimblebitJsonSave extends _INimblebitJsonSave {}

// Lookup table for the meaning of all the save data blocks
export const blocks = _blocks;

// More types
export type ParsingBlocksType = typeof blocks;
export type ParsingBlocksKey = keyof ParsingBlocksType;
export type ParsingBlocksValue = ParsingBlocksType[ParsingBlocksKey];

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type GenericBlocks = {
    [k: string]:
        | string
        | (() => unknown)
        | readonly [string, readonly unknown[] | GenericBlocks, "|" | "," | undefined, "object" | "array"];
};
export type GenericJsonSave<T extends GenericBlocks> = T["__type"] extends () => unknown
    ? ReturnType<T["__type"]>
    : unknown;
