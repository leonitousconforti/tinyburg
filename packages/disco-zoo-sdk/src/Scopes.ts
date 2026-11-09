/**
 * The scopes the Disco Zoo api is guarded by: `discozoo` for the whole game,
 * `discozoo:read` and `discozoo:write` for every endpoint that only looks or
 * that changes a player's game, and one scope per endpoint, such as
 * `discozoo:device:player_details`.
 *
 * Each endpoint accepts its own scope, its side's and the game's, narrowest
 * first: `{ anyOf: [DevicePlayerDetails, Read, DiscoZoo] }`. An endpoint this
 * module has no scope for is left unscoped, and the authproxy guards it with
 * `discozoo:read` or `discozoo`.
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
 * @category Endpoints
 */
export const DevicePlayerDetails: OAuthScope.Described = {
    name: OAuthScope.make("discozoo:device:player_details"),
    description: "Look up a player's public profile details",
};

/**
 * @since 1.0.0
 * @category Endpoints
 */
export const DeviceVerifyDevice: OAuthScope.Described = {
    name: OAuthScope.make("discozoo:device:verify_device"),
    description: "Complete a device verification code",
};

/**
 * @since 1.0.0
 * @category Endpoints
 */
export const SocialGetItems: OAuthScope.Described = {
    name: OAuthScope.make("discozoo:social:get_items"),
    description: "See the items waiting for a player",
};

/**
 * @since 1.0.0
 * @category Endpoints
 */
export const SocialGetVisits: OAuthScope.Described = {
    name: OAuthScope.make("discozoo:social:get_visits"),
    description: "See who has visited a player",
};

/**
 * @since 1.0.0
 * @category Endpoints
 */
export const SocialPullFriendGame: OAuthScope.Described = {
    name: OAuthScope.make("discozoo:social:pull_friend_game"),
    description: "Download a friend's game data",
};

/**
 * @since 1.0.0
 * @category Endpoints
 */
export const SocialPullFriendMeta: OAuthScope.Described = {
    name: OAuthScope.make("discozoo:social:pull_friend_meta"),
    description: "Fetch metadata about a player's friends",
};

/**
 * @since 1.0.0
 * @category Endpoints
 */
export const SocialSendItem: OAuthScope.Described = {
    name: OAuthScope.make("discozoo:social:send_item"),
    description: "Send items to another player",
};

/**
 * @since 1.0.0
 * @category Endpoints
 */
export const SocialReceiveItem: OAuthScope.Described = {
    name: OAuthScope.make("discozoo:social:receive_item"),
    description: "Accept an item on a player's behalf",
};
