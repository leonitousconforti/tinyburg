/**
 * Schemas and parsers for decoding Nimblebit's custom data formats.
 *
 * @since 1.0.0
 * @category Schemas
 */

import * as Schema from "effect/Schema";

import * as NimblebitConfig from "./NimblebitConfig.ts";
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
    Schema.extend<
        Schema.Struct<{
            [K in Items[number]["property"]]: Extract<
                Items[number],
                {
                    property: K;
                }
            >["schema"];
        }>,
        Schema.Struct<{
            $unknown: Schema.Array$<typeof Schema.String>;
        }>
    >,
    Items[number]["schema"]["Context"]
> = internal.parseNimblebitOrderedList as any;

/**
 * @since 1.0.0
 * @category Parsers
 */
export const parseNimblebitObject: <Fields extends Schema.Struct.Fields>(
    struct: Schema.Struct<Fields>
) => Schema.transformOrFail<
    typeof Schema.String,
    Schema.extend<
        Schema.Struct<Fields>,
        Schema.Struct<{
            $unknown: Schema.Record$<
                typeof Schema.String,
                Schema.Struct<{
                    value: typeof Schema.String;
                    $locationMetadata: Schema.Struct<{
                        after: Schema.NullishOr<typeof Schema.String>;
                    }>;
                }>
            >;
        }>
    >,
    never
> = internal.parseNimblebitObject;

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
        date: Schema.transform(
            Schema.BigInt,
            Schema.Union(
                Schema.DateFromSelf,
                Schema.Struct({
                    date: Schema.DateFromSelf,
                    extraTicks: Schema.BigIntFromSelf,
                })
            ),
            {
                encode: (input) => {
                    const date = "date" in input ? input.date : input;
                    const extraTicks = "extraTicks" in input ? input.extraTicks : 0n;
                    return BigInt(date.getTime()) * 10_000n + 621_355_968_000_000_000n + extraTicks;
                },
                decode: (cSharpTicks) => {
                    const ms = (cSharpTicks - 621_355_968_000_000_000n) / 10_000n;
                    return { date: new Date(Number(ms)), extraTicks: cSharpTicks % 10_000n } as const;
                },
            }
        ).pipe(Schema.propertySignature, Schema.fromKey("bb_date")),
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
        stocks: Schema.compose(Schema.split(","), Schema.Array(Schema.BigInt))
            .pipe(Schema.itemsCount(3))
            .pipe(Schema.propertySignature)
            .pipe(Schema.fromKey("Fstk")),
        lastSaleTicks: Schema.compose(Schema.split(","), Schema.Array(Schema.BigInt))
            .pipe(Schema.itemsCount(3))
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

/**
 * How to decode a SaveData from Nimblebit's object format.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const SaveData = Schema.transform(
    Schema.String,
    parseNimblebitObject(
        Schema.Struct({
            coins: Schema.NumberFromString.pipe(Schema.propertySignature, Schema.fromKey("Pc")),
            bux: Schema.NumberFromString.pipe(Schema.propertySignature, Schema.fromKey("Pb")),
            Ppig: Schema.String.pipe(Schema.optional, Schema.fromKey("Ppig")),
            Pplim: Schema.String.pipe(Schema.optional, Schema.fromKey("Pplim")),
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
            vipTrialEnd: Schema.BigInt.pipe(Schema.propertySignature, Schema.fromKey("Pvte")),
            costumes: Schema.split(",").pipe(Schema.propertySignature, Schema.fromKey("Pcos")),
            pets: Schema.split(",").pipe(Schema.optional, Schema.fromKey("Ppets")),
            missionHist: Schema.split(",").pipe(Schema.optional, Schema.fromKey("Pmhst")),
            bbHist: Schema.split(",").pipe(Schema.propertySignature, Schema.fromKey("Pbhst")),
            roofs: Schema.split(",").pipe(Schema.propertySignature, Schema.fromKey("Prfs")),
            lifts: Schema.split(",").pipe(Schema.propertySignature, Schema.fromKey("Plfs")),
            lobbies: Schema.split(",").pipe(Schema.propertySignature, Schema.fromKey("Plbs")),
            bannedFriends: Schema.split(",").pipe(Schema.optional, Schema.fromKey("Pbf")),
            liftSpeed: Schema.NumberFromString.pipe(Schema.optional, Schema.fromKey("Pls")),
            totalPoints: Schema.BigInt.pipe(Schema.propertySignature, Schema.fromKey("Ptp")),
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
            PVF: Schema.String.pipe(Schema.optional, Schema.fromKey("PVF")),
            PHP: Schema.String.pipe(Schema.optional, Schema.fromKey("PHP")),
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
    ),
    {
        encode: (input) => `[_save]${input}[_save]`,
        decode: (input) => (input.startsWith('"') ? input.slice(8, -8) : input.slice(7, -7)),
    }
);

/**
 * Player metadata associated with save data and snapshots.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const PlayerMetaData = Schema.Struct({
    /**
     * Number of stories/floors, counted the same as they are on the elevator
     * shaft.
     */
    stories: Schema.compose(Schema.NumberFromString, Schema.Int).pipe(
        Schema.propertySignature,
        Schema.fromKey("level")
    ),

    /**
     * Doorman bitizen, shows as avatar in friend list. Can be any valid
     * bitizen.
     */
    doorman: Bitizen.pipe(Schema.propertySignature, Schema.fromKey("avatar")),

    /** All time number of golden tickets they have. */
    maxGold: Schema.compose(Schema.NumberFromString, Schema.Int).pipe(Schema.propertySignature, Schema.fromKey("mg")),

    /**
     * If they are requesting bitizen for a particular floor, this is that floor
     * id. You can lookup the name of the floor using the floor blocks.
     */
    requestedFloorId: Schema.compose(Schema.NumberFromString, Schema.Int).pipe(
        Schema.propertySignature,
        Schema.fromKey("reqFID")
    ),

    /** Bitbook post? not 100% sure */
    bitbook: Schema.String.pipe(Schema.optional, Schema.fromKey("bb")),

    /** Unknown */
    ts: Schema.String,

    /** Indicates that they are vip. */
    vip: Schema.compose(Schema.NumberFromString, Schema.BooleanFromUnknown),
});

/**
 * Types of sync items.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const SyncItemType = Schema.Enums({
    /** Unused? */
    None: "None",

    /** This is the type for when someone sends you a bitizen, short for player? */
    Play: "Play",

    /** Not sure, haven't seen used. */
    Gift: "Gift",

    /**
     * Sometimes there might be gifts that come out of thin air, like nimblebit
     * might do a giveaway or something.
     */
    Cloud: "Cloud",

    /** A raffle gift. */
    Raffle: "Raffle",

    /** A visit from a friend. */
    Visit: "Visit",
} as const);

/**
 * Gift schema.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const Gift = Schema.Struct({
    /** Unique id for the gift. */
    id: Schema.NumberFromString.pipe(Schema.propertySignature, Schema.fromKey("gift_id")),

    /** Who the gift was sent to (should be you!). */
    to: NimblebitConfig.PlayerIdSchema.pipe(Schema.propertySignature, Schema.fromKey("gift_to")),

    /** Who the gift was sent from. */
    from: NimblebitConfig.PlayerIdSchema.pipe(Schema.propertySignature, Schema.fromKey("gift_from")),

    /** The type of the gift. */
    type: SyncItemType.pipe(Schema.propertySignature, Schema.fromKey("gift_type")),

    /** The contents of the gift. */
    contents: Schema.String.pipe(Schema.propertySignature, Schema.fromKey("gift_str")),

    /** Validation hash for the gift, unsure how to compute. */
    checksum: Schema.String.pipe(Schema.propertySignature, Schema.fromKey("h")),

    /** Not sure. */
    c: Schema.String.pipe(Schema.propertySignature, Schema.fromKey("c")),
});
