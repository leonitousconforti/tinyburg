/**
 * Every Nimblebit game with a cloud sync service, and the several names each
 * one goes by.
 *
 * @since 1.0.0
 * @category Games
 */

import * as Schema from "effect/Schema";

/**
 * @since 1.0.0
 * @category Schemas
 */
export const NimblebitGameSchema = Schema.Literals([
    "tinytower",
    "tinytowerclassic",
    "pocketplanes",
    "pockettrains",
    "legotower",
    "discozoo",
    "bitcity",
    "tinytowervegas",
]);

/**
 * @since 1.0.0
 * @category Games
 */
export type NimblebitGame = (typeof NimblebitGameSchema.literals)[number];

/**
 * @since 1.0.0
 * @category Models
 */
export interface NimblebitGameInfo {
    readonly name: string;
    readonly code: string;
    readonly bundleId?: string | undefined;
    readonly sdk: string;
}

/**
 * @since 1.0.0
 * @category Games
 */
export const NimblebitGames = {
    tinytower: {
        name: "TinyTower",
        code: "tt",
        bundleId: "com.nimblebit.tinytower",
        sdk: "@tinyburg/tinytower-sdk",
    },
    tinytowerclassic: {
        name: "TinyTower Classic",
        code: "ttc",
        sdk: "@tinyburg/tinytower-classic-sdk",
    },
    pocketplanes: {
        name: "Pocket Planes",
        code: "pp",
        bundleId: "com.nimblebit.pocketplanes",
        sdk: "@tinyburg/pocket-planes-sdk",
    },
    pockettrains: {
        name: "Pocket Trains",
        code: "pt",
        bundleId: "com.nimblebit.pockettrains",
        sdk: "@tinyburg/pocket-trains-sdk",
    },
    legotower: {
        name: "LEGO Tower",
        code: "lt",
        bundleId: "com.nimblebit.legotower",
        sdk: "@tinyburg/lego-tower-sdk",
    },
    discozoo: {
        name: "Disco Zoo",
        code: "dz",
        bundleId: "com.nimblebit.discozoo",
        sdk: "@tinyburg/disco-zoo-sdk",
    },
    bitcity: {
        name: "Bit City",
        code: "bc",
        bundleId: "com.nimblebit.bitcity",
        sdk: "@tinyburg/bitcity-sdk",
    },
    tinytowervegas: {
        name: "Tiny Tower Vegas",
        code: "vegas",
        bundleId: "com.nimblebit.vegas",
        sdk: "@tinyburg/tinytower-vegas-sdk",
    },
} as const satisfies Record<NimblebitGame, NimblebitGameInfo>;

/**
 * @since 1.0.0
 * @category Accessors
 */
export const codeOf = <G extends NimblebitGame>(game: G): (typeof NimblebitGames)[G]["code"] =>
    NimblebitGames[game].code;

/**
 * @since 1.0.0
 * @category Accessors
 */
export const fromCode = (code: (typeof NimblebitGames)[keyof typeof NimblebitGames]["code"]): NimblebitGameInfo =>
    Object.values(NimblebitGames).find((game) => game.code === code)!;
