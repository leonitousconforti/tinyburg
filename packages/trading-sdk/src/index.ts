/**
 * @since 1.0.0
 */

/**
 * The scopes an application can be granted over a player's games, as a tree.
 *
 * One area per game. Each splits into a `:read` and a `:write` branch with a
 * leaf per endpoint beneath, so a player can grant exactly as much as an
 * application asks for: `tinytower:read` for everything that only looks,
 * `tinytower:pull_save` for one thing, `tinytower` for all of it. The tree is
 * built with the same `defineArea` the TinyTower sdk uses for the authproxy's
 * keys, so both catalogs have one shape and one set of rules.
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
 * accepts. The scopes are the tree in `Scopes`, and every endpoint here is
 * annotated with the leaf that guards it.
 *
 * Every endpoint is bearer authenticated: callers present an access token
 * minted by the Tinyburg OIDC provider, whether that is the first-party app,
 * a third-party application, or a long-lived api key.
 *
 * Saves travel as the text Nimblebit stores, exactly as the TinyTower sdk's
 * `sync_pullSave` returns them; a client that wants structure decodes with
 * `TinyTower.SaveData`. The smaller things - snapshot lists, gifts, visits, a
 * friend's metadata - are plain JSON.
 *
 * @since 1.0.0
 */
export * as Sdk from "./Sdk.ts"
