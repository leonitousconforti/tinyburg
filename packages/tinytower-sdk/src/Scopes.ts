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
 * and `Sync.read.pull_save.grants` is what goes on the endpoint.
 *
 * @since 1.0.0
 * @category Scopes
 */

import type * as ResourceServer from "effect-oidc/ResourceServer";

import { type Game, defineGame } from "@tinyburg/nimblebit-sdk/NimblebitScopes";

export {
    type Area,
    type Branch,
    type Game,
    type Leaf,
    defineArea,
    defineGame,
} from "@tinyburg/nimblebit-sdk/NimblebitScopes";

/**
 * @since 1.0.0
 * @category Games
 */
/**
 * The areas of the TinyTower api, as {@link defineGame} takes them. Exported
 * on their own because TinyTower Classic is the same api under another game
 * code, and its scope tree is these same areas under another name.
 *
 * @since 1.0.0
 * @category Games
 */
export const TinyTowerAreas = {
    device: {
        description: "Player accounts and their devices",
        read: {
            description: "Look up player accounts",
            leaves: {
                player_details: "Look up a player's public profile details",
            },
        },
        write: {
            description: "Change a player's account or devices",
            leaves: {
                register_email: "Attach an email address to a player",
                verify_device: "Complete a device verification code",
            },
        },
    },
    sync: {
        description: "Tower saves and cloud snapshots",
        read: {
            description: "Download saves and snapshots",
            leaves: {
                pull_save: "Download a tower's current save data",
                check_version: "Check the current version of a tower's save",
                pull_snapshot: "Download a specific cloud snapshot",
                list_snapshots: "List the cloud snapshots a tower has",
            },
        },
        write: {
            description: "Upload saves and snapshots",
            leaves: {
                push_save: "Upload save data to a tower",
                push_snapshot: "Upload a cloud snapshot",
            },
        },
    },
    raffle: {
        description: "The daily raffle",
        read: {
            description: "Check raffle entries",
            leaves: {
                check_entered: "Check whether a player entered the current raffle",
            },
        },
        write: {
            description: "Enter raffles",
            leaves: {
                enter: "Enter a player into the raffle",
                enter_multi: "Enter a player into multiple raffles",
            },
        },
    },
    social: {
        description: "Gifts, visits and friends",
        read: {
            description: "See gifts, visits and friends' towers",
            leaves: {
                get_gifts: "See the gifts waiting for a player",
                get_visits: "See who has visited a tower",
                pull_friend_meta: "Fetch metadata about a player's friends",
                pull_friend_tower: "Download a friend's tower data",
                list_friend_snapshots: "List the cloud snapshots a friend's tower has",
            },
        },
        write: {
            description: "Send and accept gifts and items",
            leaves: {
                send_item: "Send bitizens and items to another player",
                receive_gift: "Accept a gift on a player's behalf",
            },
        },
    },
} as const;

export const TinyTower = defineGame({
    name: "tinytower",
    description: "TinyTower",
    read: { description: "Everything in TinyTower that only looks" },
    write: { description: "Everything in TinyTower that changes a player's game" },
    areas: TinyTowerAreas,
});

/**
 * The game's areas, by name, for annotating endpoints:
 * `Sync.read.pull_save.grants`.
 *
 * @since 1.0.0
 * @category Areas
 */
export const { device: Device, raffle: Raffle, social: Social, sync: Sync } = TinyTower.areas;

/**
 * Every game, in the order a dashboard should list them.
 *
 * @since 1.0.0
 * @category Tree
 */
export const Games: ReadonlyArray<Game> = [TinyTower];

/**
 * Every scope in the tree: each game, its two branches, then each of its
 * areas with the area's branches and their leaves, in declaration order.
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
