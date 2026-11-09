/**
 * The scopes the Tiny Tower Vegas api is guarded by: `tinytowervegas` for the
 * whole game, `tinytowervegas:read` and `tinytowervegas:write` for every
 * endpoint that only looks or that changes a player's game, and one scope per
 * endpoint, such as `tinytowervegas:device:player_details`.
 *
 * Each endpoint accepts its own scope, its side's and the game's, narrowest
 * first: `{ anyOf: [DevicePlayerDetails, Read, TinyTowerVegas] }`. An endpoint
 * this module has no scope for is left unscoped, and the authproxy guards it
 * with `tinytowervegas:read` or `tinytowervegas`.
 *
 * @since 1.0.0
 * @category Scopes
 */

import * as OAuthScope from "@yielded/auth/OAuthScope";

/**
 * @since 1.0.0
 * @category Game
 */
export const TinyTowerVegas: OAuthScope.Described = {
    name: OAuthScope.make("tinytowervegas"),
    description: "Tiny Tower Vegas",
};

/**
 * @since 1.0.0
 * @category Game
 */
export const Read: OAuthScope.Described = {
    name: OAuthScope.make("tinytowervegas:read"),
    description: "Everything in Tiny Tower Vegas that only looks",
};

/**
 * @since 1.0.0
 * @category Game
 */
export const Write: OAuthScope.Described = {
    name: OAuthScope.make("tinytowervegas:write"),
    description: "Everything in Tiny Tower Vegas that changes a player's game",
};

/**
 * @since 1.0.0
 * @category Endpoints
 */
export const DevicePlayerDetails: OAuthScope.Described = {
    name: OAuthScope.make("tinytowervegas:device:player_details"),
    description: "Look up a player's public profile details",
};

/**
 * @since 1.0.0
 * @category Endpoints
 */
export const DeviceVerifyDevice: OAuthScope.Described = {
    name: OAuthScope.make("tinytowervegas:device:verify_device"),
    description: "Complete a device verification code",
};

/**
 * @since 1.0.0
 * @category Endpoints
 */
export const SocialGetItems: OAuthScope.Described = {
    name: OAuthScope.make("tinytowervegas:social:get_items"),
    description: "See the items waiting for a player",
};

/**
 * @since 1.0.0
 * @category Endpoints
 */
export const SocialGetVisits: OAuthScope.Described = {
    name: OAuthScope.make("tinytowervegas:social:get_visits"),
    description: "See who has visited a player",
};

/**
 * @since 1.0.0
 * @category Endpoints
 */
export const SocialPullFriendGame: OAuthScope.Described = {
    name: OAuthScope.make("tinytowervegas:social:pull_friend_game"),
    description: "Download a friend's game data",
};

/**
 * @since 1.0.0
 * @category Endpoints
 */
export const SocialPullFriendMeta: OAuthScope.Described = {
    name: OAuthScope.make("tinytowervegas:social:pull_friend_meta"),
    description: "Fetch metadata about a player's friends",
};

/**
 * @since 1.0.0
 * @category Endpoints
 */
export const SocialSendItem: OAuthScope.Described = {
    name: OAuthScope.make("tinytowervegas:social:send_item"),
    description: "Send items to another player",
};

/**
 * @since 1.0.0
 * @category Endpoints
 */
export const SocialReceiveItem: OAuthScope.Described = {
    name: OAuthScope.make("tinytowervegas:social:receive_item"),
    description: "Accept an item on a player's behalf",
};
