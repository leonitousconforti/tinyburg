/**
 * Schemas and parsers for decoding Nimblebit's custom data formats.
 *
 * @since 1.0.0
 * @category Schemas
 */

import type * as Effect from "effect/Effect";
import type * as SchemaAST from "effect/SchemaAST";

import * as Array from "effect/Array";
import * as Either from "effect/Either";
import * as Function from "effect/Function";
import * as Option from "effect/Option";
import * as ParseResult from "effect/ParseResult";
import * as Record from "effect/Record";
import * as Schema from "effect/Schema";

import * as NimblebitConfig from "./NimblebitConfig.ts";
import * as internal from "./internal/nimblebitSchema.ts";
import * as internalBitizen from "./internal/tinytowerBitizens.ts";
import * as internalCostume from "./internal/tinytowerCostumes.ts";
import * as internalPet from "./internal/tinytowerPets.ts";
import * as internalSyncItem from "./internal/tinytowerSyncItemType.ts";

/**
 * @since 1.0.0
 * @category Types
 */
export type ValidateNimblebitItemSchema<
    Items extends ReadonlyArray<{
        property: PropertyKey;
        schema: Schema.Schema.Any;
    }>,
> = {
    [K in keyof Items]: Items[K] extends {
        property: infer P;
        schema: Schema.Schema<infer _A, infer _I, infer _R>;
    }
        ? [_I] extends [string | Readonly<string>]
            ? { property: P; schema: Items[K]["schema"] }
            : { property: P; schema: `Nimblebit ordered list items schemas must be encodeable to strings` }
        : Items[K];
};

/**
 * @since 1.0.0
 * @category Parsers
 */
export const parseNimblebitOrderedList: <
    const Items extends ReadonlyArray<{
        property: PropertyKey;
        schema: Schema.Schema.Any;
    }>,
>(
    items: ValidateNimblebitItemSchema<Items>,
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
> = internal.parseNimblebitOrderedList;

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
export const BitizenAttributes = Schema.suspend(() => {
    class Skill extends Function.pipe(Schema.Int, Schema.between(0, 9)) {}
    class BirthDay extends Function.pipe(Schema.Int, Schema.between(1, 31)) {}
    class BirthMonth extends Function.pipe(Schema.Int, Schema.between(1, 31)) {}
    class BooleanFromOneOrZero extends Schema.transformLiterals(["0", false], ["1", true]) {}
    class IndexFromString extends Schema.compose(Schema.NumberFromString, Schema.NonNegativeInt) {}

    const to = Schema.Struct({
        $unknown: Schema.Array(Schema.String),
        gender: Schema.Literal("female", "male"),
        name: Schema.String,
        birthday: Schema.Tuple(BirthMonth, BirthDay),
        designColors: Schema.Struct({
            pantColor: internal.unityColor,
            shirtColor: internal.unityColor,
            skinColorIndex: Schema.NonNegativeInt,
            hairColorIndex: Schema.NonNegativeInt,
            shoeColorIndex: Schema.NonNegativeInt,
        }),
        accessories: Schema.Struct({
            tie: Schema.EitherFromSelf({ left: internal.unityColor, right: internal.unityColor }),
            earrings: Schema.EitherFromSelf({ left: internal.unityColor, right: internal.unityColor }),
            glasses: Schema.EitherFromSelf({ left: Schema.NonNegativeInt, right: Schema.NonNegativeInt }),
            hairAccessory: Schema.EitherFromSelf({ left: Schema.NonNegativeInt, right: Schema.NonNegativeInt }),
            hat: Schema.EitherFromSelf({
                left: Schema.Struct({
                    color: internal.unityColor,
                    index: Schema.NonNegativeInt,
                }),
                right: Schema.Struct({
                    color: internal.unityColor,
                    index: Schema.NonNegativeInt,
                    gender: Schema.Literal("female", "male", "unisex"),
                }),
            }),
        }),
        skills: Schema.Struct({
            food: Skill,
            retail: Skill,
            service: Skill,
            creative: Skill,
            recreation: Skill,
        }),
    });

    const from = parseNimblebitOrderedList([
        { property: "male", schema: BooleanFromOneOrZero },
        { property: "firstNameIndex", schema: IndexFromString },
        { property: "lastNameIndex", schema: IndexFromString },
        { property: "birthMonth", schema: Schema.compose(Schema.NumberFromString, BirthMonth) },
        { property: "birthDay", schema: Schema.compose(Schema.NumberFromString, BirthDay) },
        { property: "skinColorIndex", schema: IndexFromString }, // TODO: What do these index?
        { property: "hairColorIndex", schema: IndexFromString }, // TODO: What do these index?
        { property: "shoeColorIndex", schema: IndexFromString }, // TODO: What do these index?
        { property: "pantColor", schema: internal.unityColorFromString },
        { property: "shirtColor", schema: internal.unityColorFromString },
        { property: "hasGlasses", schema: BooleanFromOneOrZero },
        { property: "glassesIndex", schema: IndexFromString }, // TODO: What does this index
        { property: "hasTie", schema: BooleanFromOneOrZero },
        { property: "tieColor", schema: internal.unityColorFromString },
        { property: "hasHairAccessory", schema: BooleanFromOneOrZero },
        { property: "hairAccessoryIndex", schema: IndexFromString }, // TODO: What does this index
        { property: "hasBiHat", schema: BooleanFromOneOrZero },
        { property: "hasMaleHat", schema: BooleanFromOneOrZero },
        { property: "hasFemaleHat", schema: BooleanFromOneOrZero },
        { property: "hatIndex", schema: IndexFromString }, // TODO: What does this index
        { property: "hatColor", schema: internal.unityColorFromString },
        { property: "hasEarrings", schema: BooleanFromOneOrZero },
        { property: "earringsColor", schema: internal.unityColorFromString },
        { property: "skillFood", schema: Schema.compose(Schema.NumberFromString, Skill) },
        { property: "skillService", schema: Schema.compose(Schema.NumberFromString, Skill) },
        { property: "skillRecreation", schema: Schema.compose(Schema.NumberFromString, Skill) },
        { property: "skillRetail", schema: Schema.compose(Schema.NumberFromString, Skill) },
        { property: "skillCreative", schema: Schema.compose(Schema.NumberFromString, Skill) },
    ]);

    return Schema.transformOrFail(from, to, {
        encode: (
            custom: Schema.Schema.Encoded<typeof to>,
            _options: SchemaAST.ParseOptions,
            ast: SchemaAST.AST,
            toA: Schema.Schema.Type<typeof to>
        ): Effect.Effect<Schema.Schema.Type<typeof from>, ParseResult.ParseIssue, never> => {
            const isMale = custom.gender === "male";
            const [firstName, lastName] = custom.name.split(" ");

            const firstNameIndex = Function.pipe(
                isMale ? internalBitizen.maleNames : internalBitizen.femaleNames,
                Array.fromIterable,
                Array.findFirstIndex((name) => name === firstName)
            );

            const lastNameIndex = Function.pipe(
                isMale ? internalBitizen.maleLastNames : internalBitizen.femaleLastNames,
                Array.fromIterable,
                Array.findFirstIndex((name) => name === lastName)
            );

            if (Option.isNone(firstNameIndex) || Option.isNone(lastNameIndex)) {
                return ParseResult.fail(
                    new ParseResult.Type(
                        ast,
                        custom.name,
                        `Bitizen name ${custom.name} not found in internal lists, cannot encode`
                    )
                );
            }

            return ParseResult.succeed({
                male: isMale,
                firstNameIndex: firstNameIndex.value,
                lastNameIndex: lastNameIndex.value,
                birthMonth: custom.birthday[0],
                birthDay: custom.birthday[1],
                skinColorIndex: custom.designColors.skinColorIndex,
                hairColorIndex: custom.designColors.hairColorIndex,
                shoeColorIndex: custom.designColors.shoeColorIndex,
                pantColor: toA.designColors.pantColor,
                shirtColor: toA.designColors.shirtColor,
                hasGlasses: Either.isRight(custom.accessories.glasses),
                glassesIndex: Either.merge(custom.accessories.glasses),
                hasTie: Either.isRight(custom.accessories.tie),
                tieColor: Either.merge(toA.accessories.tie),
                hasHairAccessory: Either.isRight(custom.accessories.hairAccessory),
                hairAccessoryIndex: Either.merge(custom.accessories.hairAccessory),
                hasBiHat: Either.getOrElse(
                    Either.map(custom.accessories.hat, ({ gender }) => gender === "unisex"),
                    Function.constFalse
                ),
                hasMaleHat: Either.getOrElse(
                    Either.map(custom.accessories.hat, ({ gender }) => gender === "male"),
                    Function.constFalse
                ),
                hasFemaleHat: Either.getOrElse(
                    Either.map(custom.accessories.hat, ({ gender }) => gender === "female"),
                    Function.constFalse
                ),
                hatIndex: Either.merge(custom.accessories.hat).index,
                hatColor: Either.merge(toA.accessories.hat).color,
                hasEarrings: Either.isRight(custom.accessories.earrings),
                earringsColor: Either.merge(toA.accessories.earrings),
                skillFood: custom.skills.food,
                skillService: custom.skills.service,
                skillRecreation: custom.skills.recreation,
                skillRetail: custom.skills.retail,
                skillCreative: custom.skills.creative,
                $unknown: custom.$unknown,
            });
        },
        decode: (
            nimblebit: Schema.Schema.Type<typeof from>,
            _options: SchemaAST.ParseOptions,
            _ast: SchemaAST.AST
        ): Effect.Effect<Schema.Schema.Encoded<typeof to>, ParseResult.ParseIssue, never> => {
            const gender = nimblebit.male ? "male" : "female";

            const firstName = Function.pipe(
                gender === "female" ? internalBitizen.femaleNames : internalBitizen.maleNames,
                Array.fromIterable,
                Array.get(nimblebit.firstNameIndex)
            );

            const lastName = Function.pipe(
                gender === "female" ? internalBitizen.femaleLastNames : internalBitizen.maleLastNames,
                Array.fromIterable,
                Array.get(nimblebit.lastNameIndex)
            );

            if (Option.isNone(firstName) || Option.isNone(lastName)) {
                return ParseResult.fail(
                    new ParseResult.Type(
                        _ast,
                        nimblebit,
                        `Bitizen name indexes ${nimblebit.firstNameIndex},${nimblebit.lastNameIndex} not found in internal lists, cannot decode`
                    )
                );
            }

            const tie = nimblebit.hasTie ? Either.right(nimblebit.tieColor) : Either.left(nimblebit.tieColor);
            const glasses = nimblebit.hasGlasses
                ? Either.right(nimblebit.glassesIndex)
                : Either.left(nimblebit.glassesIndex);
            const hairAccessory = nimblebit.hasHairAccessory
                ? Either.right(nimblebit.hairAccessoryIndex)
                : Either.left(nimblebit.hairAccessoryIndex);
            const earrings = nimblebit.hasEarrings
                ? Either.right(nimblebit.earringsColor)
                : Either.left(nimblebit.earringsColor);
            const hat =
                nimblebit.hasBiHat || nimblebit.hasMaleHat || nimblebit.hasFemaleHat
                    ? Either.right({
                          index: nimblebit.hatIndex,
                          color: nimblebit.hatColor,
                          gender: nimblebit.hasBiHat ? "unisex" : nimblebit.hasMaleHat ? "male" : "female",
                      } as const)
                    : Either.left({
                          index: nimblebit.hatIndex,
                          color: nimblebit.hatColor,
                      } as const);

            return ParseResult.succeed({
                $unknown: nimblebit.$unknown,
                gender,
                name: `${firstName.value} ${lastName.value}`,
                birthday: [nimblebit.birthMonth, nimblebit.birthDay],
                designColors: {
                    skinColorIndex: nimblebit.skinColorIndex,
                    hairColorIndex: nimblebit.hairColorIndex,
                    shoeColorIndex: nimblebit.shoeColorIndex,
                    pantColor: nimblebit.pantColor,
                    shirtColor: nimblebit.shirtColor,
                },
                accessories: {
                    tie,
                    glasses,
                    hairAccessory,
                    earrings,
                    hat,
                },
                skills: {
                    food: nimblebit.skillFood,
                    service: nimblebit.skillService,
                    recreation: nimblebit.skillRecreation,
                    retail: nimblebit.skillRetail,
                    creative: nimblebit.skillCreative,
                },
            });
        },
    });
});

/**
 * How to decode a Bitizen from Nimblebit's object format.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const Bitizen = parseNimblebitObject(
    Schema.Struct({
        homeIndex: Schema.NumberFromString.pipe(
            Schema.compose(Schema.Int),
            Schema.propertySignature,
            Schema.fromKey("h")
        ),
        workIndex: Schema.NumberFromString.pipe(
            Schema.compose(Schema.Int),
            Schema.propertySignature,
            Schema.fromKey("w")
        ),
        placedDreamJob: Schema.transformLiterals(["0", false], ["1", true]).pipe(
            Schema.propertySignature,
            Schema.fromKey("d")
        ),
        dreamJobIndex: Schema.NumberFromString.pipe(
            Schema.compose(Schema.Int),
            Schema.propertySignature,
            Schema.fromKey("j")
        ),
        costume: Schema.requiredToOptional(
            Schema.Union(Schema.Literal(""), Schema.Literal(...Record.keys(internalCostume.costumes)), Schema.String),
            Schema.Union(Schema.Literal(...Record.keys(internalCostume.costumes)), Schema.String),
            {
                encode: Option.getOrElse(() => "" as const),
                decode: (costume) => (costume === "" ? Option.none() : Option.some(costume)),
            }
        ).pipe(Schema.fromKey("c")),
        vip: Schema.Union(
            Schema.transformLiterals(
                ["0", "None"],
                ["1", "Engineer"],
                ["2", "TravelAgent"],
                ["3", "Deliveryman"],
                ["4", "BigSpender"],
                ["5", "Celebrity"],
                ["6", "GiftBit"]
            ),
            Schema.compose(Schema.NumberFromString, Schema.Int)
        ).pipe(Schema.propertySignature, Schema.fromKey("v")),
        customName: Schema.String.pipe(Schema.optional, Schema.fromKey("cn")),
        pet: Schema.Literal(...Record.keys(internalPet.pets)).pipe(Schema.optional, Schema.fromKey("p")),
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
        date: internal.csharpDate.pipe(Schema.propertySignature, Schema.fromKey("bb_date")),
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
        openDate: internal.csharpDate.pipe(Schema.propertySignature, Schema.fromKey("Fod")),
        stockBaseTime: Schema.String.pipe(Schema.propertySignature, Schema.fromKey("Fsbt")),
        stockingTier: Schema.NumberFromString.pipe(Schema.propertySignature, Schema.fromKey("Fsi")),
        stockingStartTime: internal.csharpDate.pipe(Schema.propertySignature, Schema.fromKey("Fst")),
        stocks: Schema.compose(Schema.split(","), Schema.Array(Schema.BigInt))
            .pipe(Schema.itemsCount(3))
            .pipe(Schema.propertySignature)
            .pipe(Schema.fromKey("Fstk")),
        lastSaleTicks: Schema.compose(Schema.split(","), Schema.Array(internal.csharpDate))
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
    type: Schema.Enums(internalSyncItem.SyncItemType).pipe(Schema.propertySignature, Schema.fromKey("gift_type")),

    /** The contents of the gift. */
    contents: Schema.String.pipe(Schema.propertySignature, Schema.fromKey("gift_str")),

    /** Validation hash for the gift, unsure how to compute. */
    checksum: Schema.String.pipe(Schema.propertySignature, Schema.fromKey("h")),

    /** Not sure. */
    c: Schema.String.pipe(Schema.propertySignature, Schema.fromKey("c")),
});

/**
 * Sync item types.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const SyncItemType = internalSyncItem.SyncItemType;
