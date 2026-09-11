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

import type * as ResourceServer from "effect-oidc/ResourceServer";

import { defineArea } from "@tinyburg/nimblebit-sdk/NimblebitScopes";

/**
 * The leaves every game's area carries: one per trading endpoint. The same
 * for every game because the trading api is the same for every game; only
 * the name and the words differ.
 */
const areaFor = (name: string, title: string) =>
    defineArea({
        name,
        description: `The ${title} accounts you have linked`,
        read: {
            description: `See your linked ${title} accounts and their towers, without changing anything`,
            leaves: {
                list_accounts: `See which ${title} accounts you have linked`,
                pull_save: "Download a tower's current save",
                check_version: "Check the current version of a tower's save",
                list_snapshots: "List the cloud snapshots a tower has",
                pull_snapshot: "Download a specific cloud snapshot",
                check_raffle: "Check whether a tower has entered the current raffle",
                player_details: "See a linked account's registration details",
                list_gifts: "See the gifts waiting for a tower",
                list_visits: "See who has visited a tower",
                friend_meta: "Look up a friend's tower metadata",
                friend_save: "Download a friend's tower",
                friend_snapshots: "List the cloud snapshots a friend's tower has",
            },
        },
        write: {
            description: `Change your linked ${title} accounts and their towers, including uploading saves`,
            leaves: {
                link_account: `Link a ${title} account to your Tinyburg account`,
                unlink_account: `Unlink a ${title} account from your Tinyburg account`,
                push_save: "Upload a save to a tower",
                push_snapshot: "Upload a cloud snapshot",
                enter_raffle: "Enter a tower into the raffle",
                enter_multi_raffle: "Enter a tower into the next several raffles",
                receive_gift: "Accept a gift on a tower's behalf",
                send_item: "Send bitizens and items to another player",
                visit: "Visit another player's tower",
            },
        },
    });

/**
 * @since 1.0.0
 * @category Areas
 */
export const TinyTower = areaFor("tinytower", "TinyTower");

/**
 * @since 1.0.0
 * @category Areas
 */
export const TinyTowerClassic = areaFor("tinytowerclassic", "TinyTower Classic");

/**
 * @since 1.0.0
 * @category Areas
 */
export const PocketPlanes = areaFor("pocketplanes", "Pocket Planes");

/**
 * @since 1.0.0
 * @category Areas
 */
export const PocketTrains = areaFor("pockettrains", "Pocket Trains");

/**
 * @since 1.0.0
 * @category Areas
 */
export const LegoTower = areaFor("legotower", "LEGO Tower");

/**
 * @since 1.0.0
 * @category Areas
 */
export const DiscoZoo = areaFor("discozoo", "Disco Zoo");

/**
 * @since 1.0.0
 * @category Areas
 */
export const BitCity = areaFor("bitcity", "Bit City");

/**
 * @since 1.0.0
 * @category Areas
 */
export const TinyTowerVegas = areaFor("tinytowervegas", "Tiny Tower Vegas");

/**
 * The shape every game's area has, for code that serves any of them.
 *
 * @since 1.0.0
 * @category Areas
 */
export type GameArea = typeof TinyTower;

/**
 * Every game, in the order a consent screen or a developer page lists them.
 *
 * @since 1.0.0
 * @category Tree
 */
export const Areas: ReadonlyArray<GameArea> = [
    TinyTower,
    TinyTowerClassic,
    PocketPlanes,
    PocketTrains,
    LegoTower,
    DiscoZoo,
    BitCity,
    TinyTowerVegas,
];

/**
 * Every scope in the tree, areas first, then each area's branches, then
 * their leaves.
 *
 * @since 1.0.0
 * @category Tree
 */
export const all = (): ReadonlyArray<ResourceServer.ScopeDescription> =>
    Areas.flatMap((area) => [area, area.read, ...area.read.children, area.write, ...area.write.children]);
