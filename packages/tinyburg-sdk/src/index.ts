/**
 * @since 1.0.0
 */

/**
 * The scopes an application can be granted over a player's games.
 *
 * Each game has a scope for all of it, one for everything that only looks and
 * one for everything that changes something, and one per endpoint, so a
 * player can grant exactly as much as an application asks for: `tinytower`
 * for all of it, `tinytower:read` for everything that only looks,
 * `tinytower:pull_save` for one thing. An endpoint accepts its own scope, its
 * side's and the game's, narrowest first:
 * `{ anyOf: [TinyTower.PullSave, TinyTower.Read, TinyTower.Game] }`.
 *
 * These are OAuth scopes: a player approves them on the consent screen, and an
 * application then acts on the player's linked accounts through tinyburg.app,
 * which holds the game credentials. Nothing here is a key to Nimblebit.
 *
 * @since 1.0.0
 * @category Scopes
 */
export * as Scopes from "./Scopes.ts"

/**
 * The api an application calls to act on a player's games, with the player's
 * consent.
 *
 * This is the OAuth side of Tinyburg. The authproxy authenticates requests a
 * caller makes with a player id and password of their own; this api is for a
 * caller who holds neither, only an access token a player granted them on the
 * consent screen. tinyburg.app holds the game credentials for every account a
 * player has linked, so an application names which linked account it is
 * acting as (`:playerId`) and tinyburg.app makes the call to Nimblebit on the
 * player's behalf - if, and only if, the token carries a scope the endpoint
 * accepts. The scopes are in `Scopes`, and every endpoint here accepts its
 * own scope, the game's `:read` or `:write` scope, and the whole game's.
 *
 * Every endpoint is bearer authenticated: an application presents the JWT
 * access token the Tinyburg OAuth server issued it for `<site>/v1`, checked
 * against the grant behind it on every call. The first-party app is the one
 * caller without a token: it calls with the player's session cookie, and is
 * held to the scopes tinyburg.app grants itself.
 *
 * Saves travel as the text Nimblebit stores, exactly as the TinyTower sdk's
 * `sync_pullSave` returns them; a client that wants structure decodes with
 * `TinyTower.SaveData`. The smaller things - snapshot lists, gifts, visits, a
 * friend's metadata - are plain JSON.
 *
 * @since 1.0.0
 */
export * as Sdk from "./Sdk.ts"
