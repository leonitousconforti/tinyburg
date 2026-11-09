/**
 * The scopes the LEGO Tower api is guarded by: `legotower` for the whole game,
 * `legotower:read` and `legotower:write` for every endpoint that only looks or
 * that changes a player's game, and one scope per endpoint, such as
 * `legotower:device:player_details`.
 *
 * Each endpoint accepts its own scope, its side's and the game's, narrowest
 * first: `{ anyOf: [DevicePlayerDetails, Read, LEGOTower] }`. An endpoint this
 * module has no scope for is left unscoped, and the authproxy guards it with
 * `legotower:read` or `legotower`.
 *
 * @since 1.0.0
 * @category Scopes
 */

import * as OAuthScope from "@yielded/auth/OAuthScope";

/**
 * @since 1.0.0
 * @category Game
 */
export const LEGOTower: OAuthScope.Described = {
    name: OAuthScope.make("legotower"),
    description: "LEGO Tower",
};

/**
 * @since 1.0.0
 * @category Game
 */
export const Read: OAuthScope.Described = {
    name: OAuthScope.make("legotower:read"),
    description: "Everything in LEGO Tower that only looks",
};

/**
 * @since 1.0.0
 * @category Game
 */
export const Write: OAuthScope.Described = {
    name: OAuthScope.make("legotower:write"),
    description: "Everything in LEGO Tower that changes a player's game",
};

/**
 * @since 1.0.0
 * @category Endpoints
 */
export const DevicePlayerDetails: OAuthScope.Described = {
    name: OAuthScope.make("legotower:device:player_details"),
    description: "Look up a player's public profile details",
};

/**
 * @since 1.0.0
 * @category Endpoints
 */
export const DeviceVerifyDevice: OAuthScope.Described = {
    name: OAuthScope.make("legotower:device:verify_device"),
    description: "Complete a device verification code",
};

/**
 * @since 1.0.0
 * @category Endpoints
 */
export const SocialGetItems: OAuthScope.Described = {
    name: OAuthScope.make("legotower:social:get_items"),
    description: "See the items waiting for a player",
};

/**
 * @since 1.0.0
 * @category Endpoints
 */
export const SocialGetVisits: OAuthScope.Described = {
    name: OAuthScope.make("legotower:social:get_visits"),
    description: "See who has visited a player",
};

/**
 * @since 1.0.0
 * @category Endpoints
 */
export const SocialPullFriendGame: OAuthScope.Described = {
    name: OAuthScope.make("legotower:social:pull_friend_game"),
    description: "Download a friend's game data",
};

/**
 * @since 1.0.0
 * @category Endpoints
 */
export const SocialPullFriendMeta: OAuthScope.Described = {
    name: OAuthScope.make("legotower:social:pull_friend_meta"),
    description: "Fetch metadata about a player's friends",
};

/**
 * @since 1.0.0
 * @category Endpoints
 */
export const SocialSendItem: OAuthScope.Described = {
    name: OAuthScope.make("legotower:social:send_item"),
    description: "Send items to another player",
};
