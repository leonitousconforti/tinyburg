/**
 * What a game is, in terms both the server and the browser can hold.
 *
 * Split out from `domain/games.ts` deliberately. That module knows how to
 * decode each game's save, which means it pulls in `@tinyburg/tinytower-sdk`
 * and the trading api's scope tree; none of that belongs in a browser bundle
 * whose only need is to render a name and colour a node. Everything here is
 * strings and schemas.
 *
 * @since 1.0.0
 */

import { Schema as S } from "effect";

/**
 * Every game the study knows about, in the order the dashboard lists them.
 *
 * These are the trading api's own area names, so a scope for a game can be
 * built by concatenation. `domain/games.ts` checks that against the api's tree
 * at boot.
 *
 * @since 1.0.0
 * @category Games
 */
export const GameIds = [
    "tinytower",
    "tinytowerclassic",
    "pocketplanes",
    "pockettrains",
    "legotower",
    "discozoo",
    "bitcity",
    "tinytowervegas",
] as const;

/**
 * @since 1.0.0
 * @category Games
 */
export const GameId = S.Literals(GameIds);

/**
 * @since 1.0.0
 * @category Games
 */
export type GameId = typeof GameId.Type;

/**
 * A game as the dashboard needs it: what to call it, and whether the study can
 * read it yet.
 *
 * `readable` is served rather than assumed, because it is a fact about what the
 * server can currently decode and the browser has no way to know it. A dormant
 * game still appears, carrying the reason, so the page can say why a game is
 * listed but cannot be joined.
 *
 * @since 1.0.0
 * @category Games
 */
export const GameCatalogEntry = S.Struct({
    id: GameId,
    name: S.String,
    readable: S.Boolean,
    reason: S.OptionFromNullishOr(S.String, { onNoneEncoding: null }),
});

/**
 * @since 1.0.0
 * @category Games
 */
export type GameCatalogEntry = typeof GameCatalogEntry.Type;

/**
 * A stable key for one player of one game, for the places that need a single
 * string: cluster entity ids, and the node ids the graph view draws.
 *
 * @since 1.0.0
 * @category Games
 */
export const gamePlayerKey = (tower: { readonly game: GameId; readonly playerId: string }): string =>
    `${tower.game}:${tower.playerId}`;
