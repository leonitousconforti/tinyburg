/**
 * @since 1.0.0
 */

/**
 * Authentication providers for connecting to Nimblebit's servers.
 *
 * @since 1.0.0
 * @category Auth
 */
export * as NimblebitAuth from "./NimblebitAuth.ts"

/**
 * Configuration and schemas for authenticating with Nimblebit's cloud sync
 * service.
 *
 * @since 1.0.0
 * @category Config
 */
export * as NimblebitConfig from "./NimblebitConfig.ts"

/**
 * Nimblebit error schemas.
 *
 * @since 1.0.0
 * @category Errors
 */
export * as NimblebitError from "./NimblebitError.ts"

/**
 * Every Nimblebit game with a cloud sync service, and the several names each
 * one goes by.
 *
 * @since 1.0.0
 * @category Games
 */
export * as NimblebitGame from "./NimblebitGame.ts"

/**
 * Schemas and parsers for decoding Nimblebit's custom data formats.
 *
 * @since 1.0.0
 * @category Schemas
 */
export * as NimblebitSchema from "./NimblebitSchema.ts"

/**
 * The scope tree every Nimblebit game's api is guarded by.
 *
 * A game sits at the top and splits into a `:read` and a `:write` branch that
 * span the whole game. Beneath it, each area of the api (`sync`, `social`,
 * ...) splits into a `:read` and a `:write` branch of its own, with a leaf
 * per endpoint under those. A scope grants everything beneath it, so
 * `<game>:read` grants every read in the game, `<game>:sync:read` every
 * read in one area, and `<game>:sync:pull_save` one endpoint. That reaches
 * enforcement without any prefix matching: a leaf carries the list an
 * endpoint accepts - itself, its area's branch, its area, the game's branch,
 * the game - and a key holding any one of them matches by plain equality.
 *
 * A leaf exists only as part of an area, and an area only as part of a game,
 * both made by {@link defineGame} from the spec that names them, so nothing
 * can be outside the tree and no name can disagree with its place in it.
 * `Sync.read.pull_save` is the leaf named `<game>:sync:pull_save`, and
 * `Sync.read.pull_save.grants` is what goes on the endpoint. {@link defineArea}
 * makes a standalone area for an api whose scopes need no game above them.
 *
 * This lives here rather than in one game's sdk because every game builds the
 * same shape: a sdk that only needs to declare its scopes should not have to
 * depend on TinyTower to do it.
 *
 * `import type` keeps this module free of runtime imports.
 *
 * @since 1.0.0
 * @category Scopes
 */
export * as NimblebitScopes from "./NimblebitScopes.ts"
