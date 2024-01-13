// Typescript type for a parsed floor
export interface IFloor {
    storyHeight: number;
    floorId: number;
    level: number;
    openDate: string;
    stockBaseTime: string;
    stockingTier: number;

    // TODO: rename to floorStockingTime
    stockingStartTime: string;

    stocks: number[];
    lastSaleTicks: number[];
    floorName: string;
    floorPaint: string;
}

// Blocks for parsing a floor
export const floorBlocks = {
    Fs: "storyHeight",
    Ff: "floorId",
    Fl: "level",
    Fod: "openDate",
    Fsbt: "stockBaseTime",
    Fsi: "stockingTier",

    // TODO: rename to floorStockingTime
    Fst: "stockingStartTime",

    Fstk: ["stocks", [undefined], ",", "array"],
    Flst: ["lastSaleTicks", [undefined], ",", "array"],
    Fn: "floorName",
    Fp: "floorPaint",

    // Type "metadata" for these blocks
    __type: (): IFloor => ({}) as IFloor,
} as const;
