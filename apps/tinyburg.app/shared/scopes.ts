import type * as OAuthScope from "@yielded/auth/OAuthScope";

import * as TinyburgScopes from "@tinyburg/tinyburg-sdk/Scopes";
import * as TreasuryScopes from "@tinyburg/treasury-sdk/Scopes";

/** The games whose tinyburg api this server serves, at `/v1/<game>`. */
export const SERVED_GAMES: ReadonlyArray<TinyburgScopes.GameScopes> = [
    TinyburgScopes.TinyTower,
    TinyburgScopes.TinyTowerClassic,
];

/**
 * Every scope of the apis behind `/v1`: each served game's (the game, then
 * its read scope and the read endpoints', then its write scope and the write
 * endpoints') from `@tinyburg/tinyburg-sdk`, then the treasury's from
 * `@tinyburg/treasury-sdk`. Read off the sdks rather than listed again, so the
 * OAuth server declares, and the developers page lists, exactly the scopes
 * the endpoints accept.
 *
 * The other games' scopes stay in the sdks, and in the authproxy, which keys
 * them separately: they have no api here, and the OAuth server could not
 * declare them all and still issue JWT access tokens.
 */
export const API_SCOPES: ReadonlyArray<OAuthScope.Described> = [
    ...SERVED_GAMES.flatMap((game) => TinyburgScopes.all(game)),
    ...TreasuryScopes.all(),
];
