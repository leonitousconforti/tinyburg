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
 * The machinery that builds the tree - {@link defineGame}, {@link defineArea}
 * and the {@link Leaf}/{@link Branch}/{@link Area}/{@link Game} types - lives in
 * `@tinyburg/nimblebit-sdk/NimblebitScopes`, because every game's sdk builds the
 * same shape and none of them should need TinyTower to do it. It is re-exported
 * here so this module stays the one place a TinyTower consumer has to look.
 *
 * What is TinyTower's own is below: the areas of its api, and the game built
 * from them. `Sync.read.pull_save` is the leaf named `tinytower:sync:pull_save`,
 * and `Sync.read.pull_save.required` is what goes on the endpoint.
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
