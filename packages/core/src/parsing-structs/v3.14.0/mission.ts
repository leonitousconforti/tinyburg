// Typescript type for a parsed mission
export interface IMission {
    id: string;
    type: number;
    character: string;
    text: string;
    cnt: string;
    ft: string;
    fid: string;
    pop: string;
    com: string;
}

// Blocks for parsing a mission
export const missionBlocks = {
    m_id: "id",
    m_type: "type",
    m_char: "character",
    m_txt: "text",
    m_cnt: "cnt",
    m_ft: "ft",
    m_fid: "fid",
    m_pop: "pop",
    m_com: "com",

    // Type "metadata" for these blocks
    __type: (): IMission => ({} as IMission),
} as const;
