import * as Schema from "effect/Schema";
import * as internal from "./internal/nimblebitSchema.ts";

/**
 * @since 1.0.0
 * @category Types
 */
export type ValidateNimblebitItemSchema<S extends Schema.Schema.Any> =
    S extends Schema.Schema<infer _A, infer _I, infer _R>
        ? [_I] extends [string | Readonly<string>]
            ? {}
            : `Nimblebit ordered list items schemas must be encodeable to strings`
        : {};

/**
 * @since 1.0.0
 * @category Parsers
 */
export const parseNimblebitOrderedList: <
    const Items extends ReadonlyArray<{
        property: string | number | symbol;
        schema: Schema.Schema.Any;
    }>,
>(
    items: Items & ValidateNimblebitItemSchema<Items[number]["schema"]>,
    separator?: string | undefined
) => Schema.transformOrFail<
    typeof Schema.String,
    Schema.Struct<{
        [K in Items[number]["property"]]: Extract<
            Items[number],
            {
                property: K;
            }
        >["schema"];
    }>,
    Items[number]["schema"]["Context"]
> =
    // TODO: Fix this type issue
    internal.parseNimblebitOrderedList as any;

/**
 * @since 1.0.0
 * @category Parsers
 */
export const parseNimblebitObject: <Fields extends Schema.Struct.Fields>(
    struct: Schema.Struct<Fields>
) => Schema.transform<typeof Schema.String, Schema.Struct<Fields>> = internal.parseNimblebitObject;

/**
 * How to decode a Bitizen's attributes from Nimblebit's ordered list format.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const BitizenAttributes = parseNimblebitOrderedList([
    { property: "male", schema: Schema.transformLiterals(["0", false], ["1", true]) },
    { property: "firstNameIndex", schema: Schema.NumberFromString },
    { property: "lastNameIndex", schema: Schema.NumberFromString },
    { property: "birthMonth", schema: Schema.NumberFromString },
    { property: "birthDay", schema: Schema.NumberFromString },
    { property: "skinColorIndex", schema: Schema.NumberFromString },
    { property: "hairColorIndex", schema: Schema.NumberFromString },
    { property: "showColorIndex", schema: Schema.NumberFromString },
    { property: "pantColor", schema: Schema.String },
    { property: "shirtColor", schema: Schema.String },
    { property: "hasGlasses", schema: Schema.transformLiterals(["0", false], ["1", true]) },
    { property: "glasses", schema: Schema.NumberFromString },
    { property: "hasTie", schema: Schema.transformLiterals(["0", false], ["1", true]) },
    { property: "tieColor", schema: Schema.String },
    { property: "hasHairAcc", schema: Schema.transformLiterals(["0", false], ["1", true]) },
    { property: "hairAcc", schema: Schema.NumberFromString },
    { property: "hasBHat", schema: Schema.transformLiterals(["0", false], ["1", true]) },
    { property: "hasMHat", schema: Schema.transformLiterals(["0", false], ["1", true]) },
    { property: "hasFHat", schema: Schema.transformLiterals(["0", false], ["1", true]) },
    { property: "hat", schema: Schema.NumberFromString },
    { property: "hatColor", schema: Schema.String },
    { property: "hasEarrings", schema: Schema.transformLiterals(["0", false], ["1", true]) },
    { property: "EarringsColor", schema: Schema.String },
    { property: "skillFood", schema: Schema.NumberFromString },
    { property: "skillService", schema: Schema.NumberFromString },
    { property: "skillRecreation", schema: Schema.NumberFromString },
    { property: "skillRetail", schema: Schema.NumberFromString },
    { property: "skillCreative", schema: Schema.NumberFromString },
    // { property: "unknown1", schema: Schema.Unknown },
]);

/**
 * How to decode a Bitizen from Nimblebit's object format.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const Bitizen = parseNimblebitObject(
    Schema.Struct({
        homeIndex: Schema.NumberFromString.pipe(Schema.propertySignature, Schema.fromKey("h")),
        workIndex: Schema.NumberFromString.pipe(Schema.propertySignature, Schema.fromKey("w")),
        placedDreamJob: Schema.transformLiterals(["0", false], ["1", true]).pipe(
            Schema.propertySignature,
            Schema.fromKey("d")
        ),
        dreamJobIndex: Schema.NumberFromString.pipe(Schema.propertySignature, Schema.fromKey("j")),
        costume: Schema.String.pipe(Schema.propertySignature, Schema.fromKey("c")),
        vip: Schema.NumberFromString.pipe(Schema.propertySignature, Schema.fromKey("v")),
        attributes: BitizenAttributes.pipe(Schema.propertySignature, Schema.fromKey("BA")),
    })
);

/**
 * How to decode a Bitbook post from Nimblebit's object format.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const BitbookPost = parseNimblebitObject(
    Schema.Struct({
        _tid: Schema.String.pipe(Schema.propertySignature, Schema.fromKey("bb_tid")),
        bitizen: Bitizen.pipe(Schema.propertySignature, Schema.fromKey("bb_bzn")),
        source_name: Schema.String.pipe(Schema.propertySignature, Schema.fromKey("bb_sname")),
        // date: Schema.Date.pipe(Schema.propertySignature, Schema.fromKey("bb_date")),
        body: Schema.String.pipe(Schema.propertySignature, Schema.fromKey("bb_txt")),
        media_type: Schema.String.pipe(Schema.propertySignature, Schema.fromKey("bb_mt")),
        media_path: Schema.String.pipe(Schema.propertySignature, Schema.fromKey("bb_mp")),
        likes: Schema.NumberFromString.pipe(Schema.propertySignature, Schema.fromKey("bb_lks")),
    })
);

/**
 * How to decode a Floor from Nimblebit's object format.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const Floor = parseNimblebitObject(
    Schema.Struct({
        storyHeight: Schema.NumberFromString.pipe(Schema.propertySignature, Schema.fromKey("Fs")),
        floorId: Schema.NumberFromString.pipe(Schema.propertySignature, Schema.fromKey("Ff")),
        level: Schema.NumberFromString.pipe(Schema.propertySignature, Schema.fromKey("Fl")),
        openDate: Schema.String.pipe(Schema.propertySignature, Schema.fromKey("Fod")),
        stockBaseTime: Schema.String.pipe(Schema.propertySignature, Schema.fromKey("Fsbt")),
        stockingTier: Schema.NumberFromString.pipe(Schema.propertySignature, Schema.fromKey("Fsi")),
        stockingStartTime: Schema.String.pipe(Schema.propertySignature, Schema.fromKey("Fst")),
        stocks: parseNimblebitOrderedList([
            { property: "0", schema: Schema.NumberFromString },
            { property: "1", schema: Schema.NumberFromString },
            { property: "2", schema: Schema.NumberFromString },
        ])
            .pipe(Schema.propertySignature)
            .pipe(Schema.fromKey("Fstk")),
        lastSaleTicks: parseNimblebitOrderedList([
            { property: "0", schema: Schema.NumberFromString },
            { property: "1", schema: Schema.NumberFromString },
            { property: "2", schema: Schema.NumberFromString },
        ])
            .pipe(Schema.propertySignature)
            .pipe(Schema.fromKey("Flst")),
        floorName: Schema.String.pipe(Schema.propertySignature, Schema.fromKey("Fn")),
        floorPaint: Schema.String.pipe(Schema.optional, Schema.fromKey("Fp")),
    })
);

/**
 * How to decode a Mission from Nimblebit's object format.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const Mission = parseNimblebitObject(
    Schema.Struct({
        id: Schema.String.pipe(Schema.propertySignature, Schema.fromKey("m_id")),
        // type: Schema.NumberFromString.pipe(Schema.propertySignature, Schema.fromKey("m_type")),
        // character: Schema.String.pipe(Schema.propertySignature, Schema.fromKey("m_char")),
        // text: Schema.String.pipe(Schema.propertySignature, Schema.fromKey("m_txt")),
        // cnt: Schema.String.pipe(Schema.propertySignature, Schema.fromKey("m_cnt")),
        // ft: Schema.String.pipe(Schema.propertySignature, Schema.fromKey("m_ft")),
        // fid: Schema.String.pipe(Schema.propertySignature, Schema.fromKey("m_fid")),
        // pop: Schema.String.pipe(Schema.propertySignature, Schema.fromKey("m_pop")),
        // com: Schema.String.pipe(Schema.propertySignature, Schema.fromKey("m_com")),
    })
);

export const SaveData = parseNimblebitObject(
    Schema.Struct({
        coins: Schema.NumberFromString.pipe(Schema.propertySignature, Schema.fromKey("Pc")),
        bux: Schema.NumberFromString.pipe(Schema.propertySignature, Schema.fromKey("Pb")),
        Ppig: Schema.String.pipe(Schema.propertySignature, Schema.fromKey("Ppig")),
        Pplim: Schema.String.pipe(Schema.propertySignature, Schema.fromKey("Pplim")),
        maxGold: Schema.NumberFromString.pipe(Schema.propertySignature, Schema.fromKey("Pmg")),
        gold: Schema.NumberFromString.pipe(Schema.propertySignature, Schema.fromKey("Pg")),
        tip: Schema.NumberFromString.pipe(Schema.propertySignature, Schema.fromKey("Ptip")),
        needUpgrade: Schema.NumberFromString.pipe(Schema.propertySignature, Schema.fromKey("Pnu")),
        ver: Schema.String.pipe(Schema.propertySignature, Schema.fromKey("Pver")),
        roof: Schema.NumberFromString.pipe(Schema.propertySignature, Schema.fromKey("Pr")),
        lift: Schema.NumberFromString.pipe(Schema.propertySignature, Schema.fromKey("Pe")),
        lobby: Schema.NumberFromString.pipe(Schema.propertySignature, Schema.fromKey("Pl")),
        buxBought: Schema.NumberFromString.pipe(Schema.propertySignature, Schema.fromKey("Pbxb")),
        installTime: Schema.NumberFromString.pipe(Schema.propertySignature, Schema.fromKey("PiT")),
        lastSaleTick: Schema.NumberFromString.pipe(Schema.propertySignature, Schema.fromKey("PlST")),
        lobbyName: Schema.String.pipe(Schema.propertySignature, Schema.fromKey("Pln")),
        raffleID: Schema.NumberFromString.pipe(Schema.propertySignature, Schema.fromKey("Prf")),
        vipTrialEnd: Schema.NumberFromString.pipe(Schema.propertySignature, Schema.fromKey("Pvte")),
        costumes: Schema.split(",").pipe(Schema.propertySignature, Schema.fromKey("Pcos")),
        pets: Schema.split(",").pipe(Schema.propertySignature, Schema.fromKey("Ppets")),
        missionHist: Schema.split(",").pipe(Schema.propertySignature, Schema.fromKey("Pmhst")),
        bbHist: Schema.split(",").pipe(Schema.propertySignature, Schema.fromKey("Pbhst")),
        roofs: Schema.split(",").pipe(Schema.propertySignature, Schema.fromKey("Prfs")),
        lifts: Schema.split(",").pipe(Schema.propertySignature, Schema.fromKey("Plfs")),
        lobbies: Schema.split(",").pipe(Schema.propertySignature, Schema.fromKey("Plbs")),
        bannedFriends: Schema.split(",").pipe(Schema.optional, Schema.fromKey("Pbf")),
        liftSpeed: Schema.NumberFromString.pipe(Schema.propertySignature, Schema.fromKey("Pls")),
        totalPoints: Schema.NumberFromString.pipe(Schema.propertySignature, Schema.fromKey("Ptp")),
        lrc: Schema.String.pipe(Schema.propertySignature, Schema.fromKey("Plrc")),
        lfc: Schema.String.pipe(Schema.propertySignature, Schema.fromKey("Plfc")),
        cfd: Schema.String.pipe(Schema.propertySignature, Schema.fromKey("Pcfd")),
        lbc: Schema.String.pipe(Schema.propertySignature, Schema.fromKey("Plbc")),
        lbbcp: Schema.String.pipe(Schema.propertySignature, Schema.fromKey("Plbbcp")),
        lcmiss: Schema.String.pipe(Schema.propertySignature, Schema.fromKey("Plcmiss")),
        lcg: Schema.String.pipe(Schema.propertySignature, Schema.fromKey("Plcg")),
        sfx: Schema.NumberFromString.pipe(Schema.propertySignature, Schema.fromKey("Psfx")),
        mus: Schema.NumberFromString.pipe(Schema.propertySignature, Schema.fromKey("Pmus")),
        notes: Schema.NumberFromString.pipe(Schema.propertySignature, Schema.fromKey("Pnts")),
        autoLiftDisable: Schema.NumberFromString.pipe(Schema.propertySignature, Schema.fromKey("Pald")),
        videos: Schema.NumberFromString.pipe(Schema.propertySignature, Schema.fromKey("Pvds")),
        vidCheck: Schema.NumberFromString.pipe(Schema.propertySignature, Schema.fromKey("Pvdc")),
        bbnotes: Schema.NumberFromString.pipe(Schema.propertySignature, Schema.fromKey("Pbbn")),
        hidechat: Schema.NumberFromString.pipe(Schema.propertySignature, Schema.fromKey("Phchat")),
        tmi: Schema.String.pipe(Schema.propertySignature, Schema.fromKey("Ptmi")),
        PVF: Schema.String.pipe(Schema.propertySignature, Schema.fromKey("PVF")),
        PHP: Schema.String.pipe(Schema.propertySignature, Schema.fromKey("PHP")),
        mission: Mission.pipe(Schema.optional, Schema.fromKey("Pmiss")),
        doorman: Bitizen.pipe(Schema.propertySignature, Schema.fromKey("Pdrmn")),
        playerID: Schema.String.pipe(Schema.propertySignature, Schema.fromKey("Ppid")),
        playerRegistered: Schema.NumberFromString.pipe(Schema.propertySignature, Schema.fromKey("Preg")),
        bzns: Schema.compose(Schema.split("|"), Schema.Array(Bitizen)).pipe(
            Schema.propertySignature,
            Schema.fromKey("Pbits")
        ),
        stories: Schema.compose(Schema.split("|"), Schema.Array(Floor)).pipe(
            Schema.propertySignature,
            Schema.fromKey("Pstories")
        ),
        friends: Schema.String.pipe(Schema.propertySignature, Schema.fromKey("Pfrns")),
        bbPosts: Schema.compose(Schema.split("|"), Schema.Array(BitbookPost)).pipe(
            Schema.propertySignature,
            Schema.fromKey("PBB")
        ),
        bbpost: Schema.String.pipe(Schema.propertySignature, Schema.fromKey("Plp")),
    })
);
