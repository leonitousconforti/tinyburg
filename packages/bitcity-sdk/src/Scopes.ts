/**
 * The scopes the Bit City api is guarded by: `bitcity` for the whole game,
 * `bitcity:read` and `bitcity:write` for every endpoint that only looks or that
 * changes a player's game, and one scope per endpoint, such as
 * `bitcity:device:player_details`.
 *
 * Each endpoint accepts its own scope, its side's and the game's, narrowest
 * first: `{ anyOf: [DevicePlayerDetails, Read, BitCity] }`. An endpoint this
 * module has no scope for is left unscoped, and the authproxy guards it with
 * `bitcity:read` or `bitcity`.
 *
 * @since 1.0.0
 * @category Scopes
 */

import * as OAuthScope from "@yielded/auth/OAuthScope";

/**
 * @since 1.0.0
 * @category Game
 */
export const BitCity: OAuthScope.Described = {
    name: OAuthScope.make("bitcity"),
    description: "Bit City",
};

/**
 * @since 1.0.0
 * @category Game
 */
export const Read: OAuthScope.Described = {
    name: OAuthScope.make("bitcity:read"),
    description: "Everything in Bit City that only looks",
};

/**
 * @since 1.0.0
 * @category Game
 */
export const Write: OAuthScope.Described = {
    name: OAuthScope.make("bitcity:write"),
    description: "Everything in Bit City that changes a player's game",
};

/**
 * @since 1.0.0
 * @category Endpoints
 */
export const DevicePlayerDetails: OAuthScope.Described = {
    name: OAuthScope.make("bitcity:device:player_details"),
    description: "Look up a player's public profile details",
};

/**
 * @since 1.0.0
 * @category Endpoints
 */
export const DeviceVerifyDevice: OAuthScope.Described = {
    name: OAuthScope.make("bitcity:device:verify_device"),
    description: "Complete a device verification code",
};

/**
 * @since 1.0.0
 * @category Endpoints
 */
export const SocialGetItems: OAuthScope.Described = {
    name: OAuthScope.make("bitcity:social:get_items"),
    description: "See the items waiting for a player",
};

/**
 * @since 1.0.0
 * @category Endpoints
 */
export const SocialPullFriendGame: OAuthScope.Described = {
    name: OAuthScope.make("bitcity:social:pull_friend_game"),
    description: "Download a friend's game data",
};

/**
 * @since 1.0.0
 * @category Endpoints
 */
export const SocialPullFriendMeta: OAuthScope.Described = {
    name: OAuthScope.make("bitcity:social:pull_friend_meta"),
    description: "Fetch metadata about a player's friends",
};

/**
 * @since 1.0.0
 * @category Endpoints
 */
export const SocialSendItem: OAuthScope.Described = {
    name: OAuthScope.make("bitcity:social:send_item"),
    description: "Send items to another player",
};
