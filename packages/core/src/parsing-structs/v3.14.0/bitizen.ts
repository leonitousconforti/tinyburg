// Typescript type for a parsed bitizen.
export interface IBitizen {
    homeIndex: number;
    workIndex: number;
    placedDreamJob: boolean;
    dreamJobIndex: number;
    costume: string;
    vip: boolean;
    attributes: IBitizenAttributes;
}

// Typescript type for a parsed bitizen's attributes.
export interface IBitizenAttributes {
    male: number;
    firstNameIndex: number;
    lastNameIndex: number;
    birthMonth: number;
    birthDay: number;
    skinColorIndex: number;
    hairColorIndex: number;
    showColorIndex: number;
    pantColor: number;
    shirtColor: number;
    hasGlasses: boolean;
    glasses: number;
    hasTie: boolean;
    tieColor: number;
    hasHairAcc: boolean;
    hairAcc: number;
    hasBHat: boolean;
    hasMHat: boolean;
    hasFHat: boolean;
    hat: number;
    hatColor: number;
    hasEarrings: boolean;
    EarringsColor: number;
    skillFood: number;
    skillService: number;
    skillRecreation: number;
    skillRetail: number;
    skillCreative: number;
}

// Blocks for parsing bitizen attributes.
export const bitizenAttributesBlocks = [
    "male",
    "firstNameIndex",
    "lastNameIndex",
    "birthMonth",
    "birthDay",
    "skinColorIndex",
    "hairColorIndex",
    "showColorIndex",
    "pantColor",
    "shirtColor",
    "hasGlasses",
    "glasses",
    "hasTie",
    "tieColor",
    "hasHairAcc",
    "hairAcc",
    "hasBHat",
    "hasMHat",
    "hasFHat",
    "hat",
    "hatColor",
    "hasEarrings",
    "EarringsColor",
    "skillFood",
    "skillService",
    "skillRecreation",
    "skillRetail",
    "skillCreative",
] as const;

// Blocks for parsing a bitizen.
export const bitizenBlocks = {
    h: "homeIndex",
    w: "workIndex",
    d: "placedDreamJob",
    j: "dreamJobIndex",
    c: "costume",
    v: "vip",
    BA: ["attributes", bitizenAttributesBlocks, ",", "object"],

    // Type "metadata" for these blocks
    __type: (): IBitizen => ({} as IBitizen),
} as const;
