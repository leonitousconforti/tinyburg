/**
 * The scopes the TinyTower Classic api is guarded by: the same areas as
 * TinyTower, under the `tinytowerclassic` game, so `tinytowerclassic:read`
 * grants every read in Classic and `tinytowerclassic:sync:pull_save` one
 * endpoint. The tree is built by `@tinyburg/nimblebit-sdk`'s `defineGame`
 * from TinyTower's own area spec, so the two games cannot drift apart in
 * shape, only in name.
 *
 * @since 1.0.0
 * @category Scopes
 */

import type * as ResourceServer from "effect-oidc/ResourceServer";

import { type Game, defineGame } from "@tinyburg/nimblebit-sdk/NimblebitScopes";
import { TinyTowerAreas } from "@tinyburg/tinytower-sdk/Scopes";

/**
 * @since 1.0.0
 * @category Games
 */
export const TinyTowerClassic = defineGame({
    name: "tinytowerclassic",
    description: "TinyTower Classic",
    read: { description: "Everything in TinyTower Classic that only looks" },
    write: { description: "Everything in TinyTower Classic that changes a player's game" },
    areas: TinyTowerAreas,
});

/**
 * The game's areas, by name, for annotating endpoints:
 * `Sync.read.pull_save.grants`.
 *
 * @since 1.0.0
 * @category Areas
 */
export const { device: Device, raffle: Raffle, social: Social, sync: Sync } = TinyTowerClassic.areas;

/**
 * Every game this package declares.
 *
 * @since 1.0.0
 * @category Tree
 */
export const Games: ReadonlyArray<Game> = [TinyTowerClassic];

/**
 * Every scope in the tree, in declaration order.
 *
 * @since 1.0.0
 * @category Tree
 */
export const all = (): ReadonlyArray<ResourceServer.ScopeDescription> =>
    Games.flatMap((game) => [
        game,
        game.read,
        game.write,
        ...Object.values(game.areas).flatMap((area) => [
            area,
            area.read,
            ...area.read.children,
            area.write,
            ...area.write.children,
        ]),
    ]);
