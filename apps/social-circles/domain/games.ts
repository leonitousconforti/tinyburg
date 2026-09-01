/**
 * The games the study can hold a circle for.
 *
 * Every Nimblebit game keeps its own player namespace, so a friend code is only
 * an identity once you say which game it belongs to. That is the rule this
 * module exists to state: nothing downstream names a player without also naming
 * a game, and the pair is what the schema, the crawler and the graph are keyed
 * by.
 *
 * A game is listed here whether or not the study can currently read it. The six
 * beyond TinyTower and its Classic re-issue are {@link Dormant}: their sdks
 * return a save as raw bytes with no schema to decode it, so there is no way to
 * get a friends list out. Listing them anyway is deliberate. It keeps the one
 * place that has to change when a decoder lands down to a single entry here,
 * and it lets the dashboard say "not readable yet, and here is why" rather than
 * quietly pretending the game does not exist.
 */

import { Effect, Option, Schema as S } from "effect";

import type { GameCatalogEntry, GameId } from "../shared/games.ts";
import type { PlayerIdSchema } from "@tinyburg/nimblebit-sdk/NimblebitConfig";

import { TinyTower } from "@tinyburg/tinytower-sdk";
import * as Scopes from "@tinyburg/trading-sdk/Scopes";

import { GameIds } from "../shared/games.ts";

/** A friend code, before a game says who it belongs to. */
type PlayerId = typeof PlayerIdSchema.Type;

/**
 * How the study gets a friends list out of a game.
 *
 * `Save` is the only mechanism there is: pull the player's save through
 * tinyburg.app and read the friends off it. `Dormant` is every game where that
 * cannot be done yet, carrying the reason so the dashboard and the logs can say
 * something truer than "no data".
 *
 * @since 1.0.0
 * @category Games
 */
export type Reader =
    | {
          readonly _tag: "Save";
          readonly friendsOf: (save: string) => Effect.Effect<ReadonlyArray<PlayerId>, S.SchemaError>;
      }
    | { readonly _tag: "Dormant"; readonly reason: string };

/**
 * @since 1.0.0
 * @category Games
 */
export interface GameInfo {
    readonly id: GameId;
    /** How the game is named to a person. */
    readonly name: string;
    readonly reader: Reader;
}

/**
 * TinyTower's save keeps its friends list under `Pfrns`, as `name|id` or
 * `name|id|date` entries. TinyTower Classic is the same game re-issued under a
 * different game code, and its save decodes with the same schema.
 *
 * An empty list encodes as `""` rather than as an empty array, which is why
 * this cannot just map over the field.
 */
const fromTinyTowerSave = (save: string): Effect.Effect<ReadonlyArray<PlayerId>, S.SchemaError> =>
    Effect.map(S.decodeEffect(TinyTower.SaveData)(save), (decoded) =>
        decoded.friends === undefined || decoded.friends === "" ? [] : decoded.friends.map(({ friendId }) => friendId)
    );

const savesDecodeAs = (friendsOf: (save: string) => Effect.Effect<ReadonlyArray<PlayerId>, S.SchemaError>): Reader => ({
    _tag: "Save",
    friendsOf,
});

/**
 * Why a game cannot be read yet.
 *
 * Two distinct walls, and it is worth keeping them apart: a game with no save
 * schema could not be read even if the study could reach it, while a game that
 * merely has no trading api group is one decoder away from working.
 */
const noSaveSchema = (sdk: string): Reader => ({
    _tag: "Dormant",
    reason:
        `${sdk} returns a save as raw bytes with no schema to decode it, so there is no friends list to read. ` +
        `Adding a SaveData schema for the game, and its accounts group to the trading api, is all this entry needs.`,
});

/**
 * The catalog itself.
 *
 * Written as a record keyed by game so `satisfies` makes it a compile error to
 * add an id without an entry, or an entry for an id that does not exist. The
 * ordered list below is derived from it rather than maintained beside it.
 */
const CATALOG = {
    tinytower: { name: "TinyTower", reader: savesDecodeAs(fromTinyTowerSave) },
    tinytowerclassic: { name: "TinyTower Classic", reader: savesDecodeAs(fromTinyTowerSave) },
    pocketplanes: { name: "Pocket Planes", reader: noSaveSchema("@tinyburg/pocket-planes-sdk") },
    pockettrains: { name: "Pocket Trains", reader: noSaveSchema("@tinyburg/pocket-trains-sdk") },
    legotower: { name: "LEGO Tower", reader: noSaveSchema("@tinyburg/lego-tower-sdk") },
    discozoo: { name: "Disco Zoo", reader: noSaveSchema("@tinyburg/disco-zoo-sdk") },
    bitcity: { name: "Bit City", reader: noSaveSchema("@tinyburg/bitcity-sdk") },
    tinytowervegas: { name: "Tiny Tower Vegas", reader: noSaveSchema("@tinyburg/tinytower-vegas-sdk") },
} satisfies Record<GameId, Omit<GameInfo, "id">>;

/**
 * @since 1.0.0
 * @category Games
 */
export const gameInfo: Record<GameId, GameInfo> = {
    tinytower: { id: "tinytower", ...CATALOG.tinytower },
    tinytowerclassic: { id: "tinytowerclassic", ...CATALOG.tinytowerclassic },
    pocketplanes: { id: "pocketplanes", ...CATALOG.pocketplanes },
    pockettrains: { id: "pockettrains", ...CATALOG.pockettrains },
    legotower: { id: "legotower", ...CATALOG.legotower },
    discozoo: { id: "discozoo", ...CATALOG.discozoo },
    bitcity: { id: "bitcity", ...CATALOG.bitcity },
    tinytowervegas: { id: "tinytowervegas", ...CATALOG.tinytowervegas },
};

/**
 * Every game, in the order the dashboard lists them.
 *
 * @since 1.0.0
 * @category Games
 */
export const GAMES: ReadonlyArray<GameInfo> = GameIds.map((id) => gameInfo[id]);

/**
 * The catalog as the dashboard receives it: names, and whether each game can be
 * joined. Served rather than bundled, so the browser carries a list of strings
 * instead of the sdks those strings were read from.
 *
 * @since 1.0.0
 * @category Games
 */
export const catalogForClient = (): ReadonlyArray<GameCatalogEntry> =>
    GAMES.map((game) => ({
        id: game.id,
        name: game.name,
        readable: game.reader._tag === "Save",
        reason: game.reader._tag === "Dormant" ? Option.some(game.reader.reason) : Option.none(),
    }));

/**
 * The games the study can actually crawl today.
 *
 * Everything scheduled, enrolled or asked for in a scope is driven off this
 * rather than off {@link GAMES}, so a dormant game costs nothing at runtime: no
 * crawl is scheduled for it, and no scope is requested for it.
 *
 * @since 1.0.0
 * @category Games
 */
export const READABLE_GAMES: ReadonlyArray<GameInfo> = GAMES.filter((game) => game.reader._tag === "Save");

/**
 * @since 1.0.0
 * @category Games
 */
export const isReadable = (id: GameId): boolean => gameInfo[id].reader._tag === "Save";

/**
 * The scope the study asks for: `list_accounts` and `pull_save` on each game it
 * can read, and nothing on the games it cannot.
 *
 * Two leaves per game rather than the game's whole `:read` branch, because the
 * study has no business with that game's snapshots, gifts or visits. Asking for
 * a dormant game's scopes would be asking a participant to grant something that
 * would never be used, and the consent screen would name a game the study
 * cannot read.
 *
 * @since 1.0.0
 * @category Games
 */
export const REQUIRED_SCOPES: ReadonlyArray<string> = [
    "openid",
    "profile",
    ...READABLE_GAMES.flatMap((game) => [`${game.id}:list_accounts`, `${game.id}:pull_save`]),
    "offline_access",
];

/**
 * {@link REQUIRED_SCOPES} as the space-separated string the token endpoint and
 * the stored grant use.
 *
 * @since 1.0.0
 * @category Games
 */
export const REQUIRED_SCOPE: string = REQUIRED_SCOPES.join(" ");

// This catalog and the trading api's scope tree name the same games. A game
// here that the api does not serve would produce scopes no provider grants;
// a game there that is missing here would be silently unreachable. Neither is
// visible at the point it goes wrong, so it is checked at boot.
{
    const declared = new Set<string>(GameIds);
    const served = new Set(Scopes.Areas.map((area) => area.name));
    const missing = Array.from(served).filter((name) => !declared.has(name));
    const extra = Array.from(declared).filter((name) => !served.has(name));
    if (missing.length > 0 || extra.length > 0) {
        throw new Error(
            `[social-circles] game catalog and the trading api disagree: ` +
                `served by the api but not listed here [${missing.join(", ")}], ` +
                `listed here but not served by the api [${extra.join(", ")}]`
        );
    }
}

export { GameId, GameIds, gamePlayerKey } from "../shared/games.ts";
