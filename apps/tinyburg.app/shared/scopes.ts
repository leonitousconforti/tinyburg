import type { ScopeDescription } from "@tinyburg/nimblebit-sdk/NimblebitScopes";

import * as TradingScopes from "@tinyburg/trading-sdk/Scopes";
import * as TreasuryScopes from "@tinyburg/treasury-sdk/Scopes";

/** The games whose trading api this server serves, at `/v1/<game>`. */
export const SERVED_GAMES: ReadonlyArray<TradingScopes.GameArea> = [
    TradingScopes.TinyTower,
    TradingScopes.TinyTowerClassic,
];

/**
 * Every scope of the apis behind `/v1`: each served game's tree (the area,
 * then each branch followed by its leaves) from `@tinyburg/trading-sdk`, then
 * the treasury's area from `@tinyburg/treasury-sdk`. Read off the sdks rather
 * than listed again, so the OAuth server declares, and the developers page
 * lists, exactly the scopes the endpoints accept.
 *
 * The other games' trees stay in the sdks, and in the authproxy, which keys
 * them separately: they have no api here, and the OAuth server could not
 * declare them all and still issue JWT access tokens.
 */
export const API_SCOPES: ReadonlyArray<ScopeDescription> = [
    ...SERVED_GAMES.flatMap((area) => [area, area.read, ...area.read.children, area.write, ...area.write.children]),
    ...TreasuryScopes.all(),
];
