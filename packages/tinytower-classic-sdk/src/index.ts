/**
 * @since 1.0.0
 */

/**
 * TinyTower's endpoints, re-issued for TinyTower Classic: the same shapes,
 * with the Classic game code in every path and the Classic scope tree on
 * every endpoint. Kept as a transformed copy of `@tinyburg/tinytower-sdk`'s
 * `Endpoints` rather than derived at runtime, because an `HttpApiEndpoint`
 * does not expose its schemas to be re-pathed; the shared schemas it is built
 * from are imported, not copied.
 *
 * @since 1.0.0
 * @category Endpoints
 */
export * as Endpoints from "./Endpoints.ts";

/**
 * What tells Nimblebit this is TinyTower Classic rather than TinyTower: the
 * game code in every path and every signed string.
 *
 * PLACEHOLDER. `ttc` is a guess pending confirmation against Nimblebit's
 * servers; nothing has been observed on the wire yet. Every path in
 * `Endpoints` and every hash in `TinyTowerClassic` derives from this one
 * constant, so correcting it is a one-line change.
 *
 * @since 1.0.0
 * @category Game
 */
export * as Game from "./Game.ts";

/**
 * The scopes the TinyTower Classic api is guarded by: the same areas as
 * TinyTower, under the `tinytowerclassic` game, so `tinytowerclassic:read`
 * grants every read in Classic and `tinytowerclassic:sync:pull_save` one
 * endpoint. The tree is built by `@tinyburg/tinytower-sdk`'s `defineGame`
 * from TinyTower's own area spec, so the two games cannot drift apart in
 * shape, only in name.
 *
 * @since 1.0.0
 * @category Scopes
 */
export * as Scopes from "./Scopes.ts";

/**
 * TinyTower Classic SDK for interacting with Nimblebit's cloud services.
 *
 * TinyTower's client, re-issued for Classic: every call signs and addresses
 * with the Classic game code instead of TinyTower's, and everything else -
 * save data, bitizens, gifts - is the same and imported from
 * `@tinyburg/tinytower-sdk`. A transformed copy rather than a wrapper,
 * because the game code is baked into each signed string.
 *
 * @since 1.0.0
 * @category SDK
 */
export * as TinyTowerClassic from "./TinyTowerClassic.ts";
