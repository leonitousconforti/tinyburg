import { floorBlocks, IFloor } from "./floor.js";
import { IMission, missionBlocks } from "./mission.js";
import { bitizenBlocks, IBitizen } from "./bitizen.js";
import { bitbookPostBlocks, IBitbookPost } from "./bitbook-posts.js";

// Typescript type for a parsed nimblebit save
export interface INimblebitJsonSave {
    coins: number;
    bux: number;

    /**
     * Goes up by the number of floors that you have delivered bitizens from the
     * elevator
     *
     * I.e you deliver a bitizen to floor 7, goes up by +7
     */
    Ppig: string;
    Pplim: string;
    maxGold: number;
    gold: number;
    tip: number;
    needUpgrade: number;
    ver: string;
    roof: number;
    lift: number;
    lobby: number;
    buxBought: number;
    installTime: number;
    lastSaleTick: number;
    lobbyName: string;
    raffleID: number;
    vipTrialEnd: number;
    costumes: string[];
    bbHist: string[];
    missionHist: number[];
    roofs: number[];
    lifts: number[];
    lobbies: number[];
    bannedFriends: string[];
    liftSpeed: number;
    totalPoints: number;

    // lastRentDay
    lrc: string;

    // lastFireworkDay
    lfc: string;

    // consecFireworkDays
    cfd: string;

    // lastBdayCheckDay
    lbc: string;

    // lastBBCloudPostID
    lbbcp: string;

    // lastCloudMissionID
    lcmiss: string;

    // lastCloudGiftID
    lcg: string;
    sfx: number;
    mus: number;
    notes: number;
    autoLiftDisable: number;
    videos: number;
    vidCheck: number;
    bbnotes: number;
    hidechat: number;

    // tutMissionId
    tmi: string;

    PVF: string;
    PHP: string;
    doorman: IBitizen;
    playerID: string;
    playerRegistered: number;
    nFreeBux: string;
    padNCT: string;
    padCC: string;
    padCRI: string;
    ale: string;
    bzns: IBitizen[];
    stories: IFloor[];
    friends: string;
    bbPosts: IBitbookPost[];
    bbpost: string;
    mission?: IMission;
    pets: string[];
}

// Lookup table for the meaning of all the save data blocks
export const blocks = {
    Pc: "coins",
    Pb: "bux",
    Ppig: "Ppig",
    Pplim: "Pplim",
    Pmg: "maxGold",
    Pg: "gold",
    Ptip: "tip",
    Pnu: "needUpgrade",
    Pver: "ver",
    Pr: "roof",
    Pe: "lift",
    Pl: "lobby",
    Pbxb: "buxBought",
    PiT: "installTime",
    PlST: "lastSaleTick",
    Pln: "lobbyName",
    Prf: "raffleID",
    Pvte: "vipTrialEnd",
    Pcos: ["costumes", [undefined], ",", "array"],
    Ppets: ["pets", [undefined], ",", "array"],
    Pmhst: ["missionHist", [undefined], ",", "array"],
    Pbhst: ["bbHist", [undefined], ",", "array"],
    Prfs: ["roofs", [undefined], ",", "array"],
    Plfs: ["lifts", [undefined], ",", "array"],
    Plbs: ["lobbies", [undefined], ",", "array"],
    Pbf: ["bannedFriends", [undefined], ",", "array"],
    Pls: "liftSpeed",
    Ptp: "totalPoints",
    Plrc: "lrc",
    Plfc: "lfc",
    Pcfd: "cfd",
    Plbc: "lbc",
    Plbbcp: "lbbcp",
    Plcmiss: "lcmiss",
    Plcg: "lcg",
    Psfx: "sfx",
    Pmus: "mus",
    Pnts: "notes",
    Pald: "autoLiftDisable",
    Pvds: "videos",
    Pvdc: "vidCheck",
    Pbbn: "bbnotes",
    Phchat: "hidechat",
    Ptmi: "tmi",
    PVF: "PVF",
    PHP: "PHP",
    Pmiss: ["mission", missionBlocks, undefined, "object"],
    Pdrmn: ["doorman", bitizenBlocks, undefined, "object"],
    Ppid: "playerID",
    Preg: "playerRegistered",
    Pbits: ["bzns", bitizenBlocks, "|", "array"],
    Pstories: ["stories", floorBlocks, "|", "array"],
    Pfrns: "friends",
    PBB: ["bbPosts", bitbookPostBlocks, "|", "array"],
    Plp: "bbpost",
    nFreeBux: "nFreeBux",
    padNCT: "padNCT",
    padCC: "padCC",
    padCRI: "padCRI",
    ale: "ale",

    // Type "metadata" for these blocks
    __type: (): INimblebitJsonSave => ({} as INimblebitJsonSave),
} as const;
