/**
 * The scopes the Pocket Planes api is guarded by, as a game-rooted tree, built with
 * `@tinyburg/nimblebit-sdk`'s `defineGame`. Only the endpoints this sdk defines
 * are covered; areas without both a read and a write side are left out until
 * their endpoints exist.
 *
 * @since 1.0.0
 * @category Scopes
 */

import type * as ResourceServer from "effect-oidc/ResourceServer";

import { type Game, defineGame } from "@tinyburg/nimblebit-sdk/NimblebitScopes";

/**
 * @since 1.0.0
 * @category Games
 */
export const PocketPlanes = defineGame({
    name: "pocketplanes",
    description: "Pocket Planes",
    read: { description: "Everything in Pocket Planes that only looks" },
    write: { description: "Everything in Pocket Planes that changes a player's game" },
    areas: {
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
        social: {
            description: "Gifts, visits and friends",
            read: {
                description: "See gifts, visits and friends' games",
                leaves: {
                    get_visits: "See who has visited a player",
                    get_gifts: "See the gifts waiting for a player",
                    request_items: "See the item requests waiting for a player",
                    pull_friend_meta: "Fetch metadata about a player's friends",
                    pull_friend_game: "Download a friend's game data",
                },
            },
            write: {
                description: "Send and accept gifts and items",
                leaves: {
                    send_item: "Send items to another player",
                    receive_item: "Accept an item on a player's behalf",
                },
            },
        },
    },
});

/**
 * The game's areas, by name, for annotating endpoints.
 *
 * @since 1.0.0
 * @category Areas
 */
export const { device: Device, social: Social } = PocketPlanes.areas;

/**
 * @since 1.0.0
 * @category Tree
 */
export const Games: ReadonlyArray<Game> = [PocketPlanes];

/**
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
