/**
 * The scopes the Disco Zoo api is guarded by: `discozoo` for the whole game,
 * `discozoo:read` and `discozoo:write` for every endpoint that only looks or
 * that changes a player's game, a `:read` and a `:write` scope for each area of
 * the api, such as `discozoo:device:read`, and one scope per endpoint, such as
 * `discozoo:device:player_details`.
 *
 * Each endpoint accepts its own scope, its area's side, the game's side and the
 * game, narrowest first:
 * `{ anyOf: [DevicePlayerDetails, DeviceRead, Read, DiscoZoo] }`. An endpoint
 * this module has no scope for is left unscoped, and the authproxy guards it
 * with `discozoo:read` or `discozoo`.
 *
 * @since 1.0.0
 * @category Scopes
 */

import * as OAuthScope from "@yielded/auth/OAuthScope";

/**
 * @since 1.0.0
 * @category Game
 */
export const DiscoZoo: OAuthScope.Described = {
    name: OAuthScope.make("discozoo"),
    description: "Disco Zoo",
};

/**
 * @since 1.0.0
 * @category Game
 */
export const Read: OAuthScope.Described = {
    name: OAuthScope.make("discozoo:read"),
    description: "Everything in Disco Zoo that only looks",
};

/**
 * @since 1.0.0
 * @category Game
 */
export const Write: OAuthScope.Described = {
    name: OAuthScope.make("discozoo:write"),
    description: "Everything in Disco Zoo that changes a player's game",
};

/**
 * @since 1.0.0
 * @category Device
 */
export const DeviceRead: OAuthScope.Described = {
    name: OAuthScope.make("discozoo:device:read"),
    description: "Look up player accounts",
};

/**
 * @since 1.0.0
 * @category Device
 */
export const DeviceWrite: OAuthScope.Described = {
    name: OAuthScope.make("discozoo:device:write"),
    description: "Change a player's account or devices",
};

/**
 * @since 1.0.0
 * @category Device
 */
export const DevicePlayerDetails: OAuthScope.Described = {
    name: OAuthScope.make("discozoo:device:player_details"),
    description: "Look up a player's public profile details",
};

/**
 * @since 1.0.0
 * @category Device
 */
export const DeviceVerifyDevice: OAuthScope.Described = {
    name: OAuthScope.make("discozoo:device:verify_device"),
    description: "Complete a device verification code",
};

/**
 * @since 1.0.0
 * @category Social
 */
export const SocialRead: OAuthScope.Described = {
    name: OAuthScope.make("discozoo:social:read"),
    description: "See items, visits and friends' games",
};

/**
 * @since 1.0.0
 * @category Social
 */
export const SocialWrite: OAuthScope.Described = {
    name: OAuthScope.make("discozoo:social:write"),
    description: "Send and accept items",
};

/**
 * @since 1.0.0
 * @category Social
 */
export const SocialGetItems: OAuthScope.Described = {
    name: OAuthScope.make("discozoo:social:get_items"),
    description: "See the items waiting for a player",
};

/**
 * @since 1.0.0
 * @category Social
 */
export const SocialGetVisits: OAuthScope.Described = {
    name: OAuthScope.make("discozoo:social:get_visits"),
    description: "See who has visited a player",
};

/**
 * @since 1.0.0
 * @category Social
 */
export const SocialPullFriendGame: OAuthScope.Described = {
    name: OAuthScope.make("discozoo:social:pull_friend_game"),
    description: "Download a friend's game data",
};

/**
 * @since 1.0.0
 * @category Social
 */
export const SocialPullFriendMeta: OAuthScope.Described = {
    name: OAuthScope.make("discozoo:social:pull_friend_meta"),
    description: "Fetch metadata about a player's friends",
};

/**
 * @since 1.0.0
 * @category Social
 */
export const SocialSendItem: OAuthScope.Described = {
    name: OAuthScope.make("discozoo:social:send_item"),
    description: "Send items to another player",
};

/**
 * @since 1.0.0
 * @category Social
 */
export const SocialReceiveItem: OAuthScope.Described = {
    name: OAuthScope.make("discozoo:social:receive_item"),
    description: "Accept an item on a player's behalf",
};
