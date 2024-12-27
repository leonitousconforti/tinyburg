import { bitizenBlocks, type IBitizen } from "./bitizen.js";

// Typescript type for a parsed bitbook post.
export interface IBitbookPost {
    _tid: string;
    bitizen: IBitizen;
    source_name: string;
    date: bigint;
    body: string;
    media_type: string;
    media_path: string;
    likes: number;
}

// Blocks for parsing a bitbook post.
export const bitbookPostBlocks = {
    bb_tid: "_tid",
    bb_bzn: ["bitizen", bitizenBlocks, undefined, "object"],
    bb_sname: "source_name",
    bb_date: "date",
    bb_txt: "body",
    bb_mt: "media_type",
    bb_mp: "media_path",
    bb_lks: "likes",

    // Type "metadata" for these blocks
    __type: (): IBitbookPost => ({}) as IBitbookPost,
} as const;
