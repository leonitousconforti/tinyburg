import { Schema as S } from "effect";

/**
 * The games a signed-in player may link a cloud save from, in the order the
 * account page lists them. A game appears here once its accounts group is
 * added to the trading api (`@tinyburg/trading-sdk`'s `Api`); the rest of the
 * client reads this list rather than naming a game, so a new game is one
 * entry here plus its group on the api.
 *
 * @since 1.0.0
 * @category Models
 */
export const LINKABLE_GAME_IDS = ["tinytower", "tinytowerclassic"] as const;

/**
 * A linked game's id, as it appears in the `/towers/@link/:game` url and on
 * the trading api group that serves it.
 *
 * @since 1.0.0
 * @category Models
 */
export const LinkableGame = S.Literals(LINKABLE_GAME_IDS);

/**
 * @since 1.0.0
 * @category Models
 */
export type LinkableGame = (typeof LINKABLE_GAME_IDS)[number];

/**
 * What the client needs to know about a linkable game that the api does not
 * say: its human name. Friend-code shape is not here because every Nimblebit
 * game shares one `PlayerId` format (`@tinyburg/nimblebit-sdk`), so the wizard
 * validates every game the same way.
 *
 * @since 1.0.0
 * @category Models
 */
export interface LinkableGameInfo {
    readonly id: LinkableGame;
    readonly name: string;
}

/**
 * @since 1.0.0
 * @category Catalog
 */
export const linkableGameInfo: Record<LinkableGame, LinkableGameInfo> = {
    tinytower: { id: "tinytower", name: "TinyTower" },
    tinytowerclassic: { id: "tinytowerclassic", name: "TinyTower Classic" },
};

/**
 * Every linkable game as a list, in declaration order, for menus that offer
 * one link per game.
 *
 * @since 1.0.0
 * @category Catalog
 */
export const linkableGames: ReadonlyArray<LinkableGameInfo> = LINKABLE_GAME_IDS.map((id) => linkableGameInfo[id]);
