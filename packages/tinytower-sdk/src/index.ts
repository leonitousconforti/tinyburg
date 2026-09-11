/**
 * @since 1.0.0
 */

/**
 * @since 1.0.0
 * @category Bitbook Posts
 */
export * as BitbookPosts from "./BitbookPosts.ts"

/**
 * @since 1.0.0
 * @category Bitizens
 */
export * as Bitizens from "./Bitizens.ts"

/**
 * @since 1.0.0
 * @category Costumes
 */
export * as Costumes from "./Costumes.ts"

/**
 * @since 1.0.0
 * @category Elevators
 */
export * as Elevators from "./Elevators.ts"

/**
 * @since 1.0.0
 * @category Endpoints
 */
export * as Endpoints from "./Endpoints.ts"

/**
 * @since 1.0.0
 * @category Floors
 */
export * as Floors from "./Floors.ts"

/**
 * @since 1.0.0
 * @category Gifts
 */
export * as Gift from "./Gift.ts"

/**
 * @since 1.0.0
 * @category Missions
 */
export * as Missions from "./Missions.ts"

/**
 * @since 1.0.0
 * @category Pets
 */
export * as Pets from "./Pets.ts"

/**
 * @since 1.0.0
 * @category Roofs
 */
export * as Roofs from "./Roofs.ts"

/**
 * The scopes the TinyTower api is guarded by, as a tree.
 *
 * A game sits at the top and splits into a `:read` and a `:write` branch that
 * span the whole game. Beneath it, each area of the api (`sync`, `social`,
 * ...) splits into a `:read` and a `:write` branch of its own, with a leaf
 * per endpoint under those. A scope grants everything beneath it, so
 * `tinytower:read` grants every read in the game, `tinytower:sync:read` every
 * read in one area, and `tinytower:sync:pull_save` one endpoint. That reaches
 * enforcement without any prefix matching: a leaf carries the list an
 * endpoint accepts - itself, its area's branch, its area, the game's branch,
 * the game - and a key holding any one of them matches by plain equality.
 *
 * A leaf exists only as part of an area, and an area only as part of a game,
 * both made by {@link defineGame} from the spec that names them, so nothing
 * can be outside the tree and no name can disagree with its place in it.
 * `Sync.read.pull_save` is the leaf named `tinytower:sync:pull_save`, and
 * `Sync.read.pull_save.grants` is what goes on the endpoint. {@link defineArea}
 * makes a standalone area for an api whose scopes need no game above them.
 *
 * `import type` keeps this module free of runtime imports.
 *
 * @since 1.0.0
 * @category Scopes
 */
export * as Scopes from "./Scopes.ts"

/**
 * The type of sync item.
 *
 * @since 1.0.0
 * @category SyncItem
 */
export * as SyncItemType from "./SyncItemType.ts"

/**
 * Tiny Tower SDK for interacting with Nimblebit's cloud services.
 *
 * @since 1.0.0
 * @category SDK
 */
export * as TinyTower from "./TinyTower.ts"
