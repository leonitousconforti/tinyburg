/**
 * The scopes the Pocket Trains api is guarded by: `pockettrains` for the whole
 * game, `pockettrains:read` and `pockettrains:write` for every endpoint that
 * only looks or that changes a player's game, a `:read` and a `:write` scope
 * for each area of the api, such as `pockettrains:device:read`, and one scope
 * per endpoint, such as `pockettrains:device:player_details`.
 *
 * Each endpoint accepts its own scope, its area's side, the game's side and the
 * game, narrowest first:
 * `{ anyOf: [DevicePlayerDetails, DeviceRead, Read, PocketTrains] }`. An
 * endpoint this module has no scope for is left unscoped, and the authproxy
 * guards it with `pockettrains:read` or `pockettrains`.
 *
 * @since 1.0.0
 * @category Scopes
 */

import * as OAuthScope from "@yielded/auth/OAuthScope";

/**
 * @since 1.0.0
 * @category Game
 */
export const PocketTrains: OAuthScope.Described = {
    name: OAuthScope.make("pockettrains"),
    description: "Pocket Trains",
};

/**
 * @since 1.0.0
 * @category Game
 */
export const Read: OAuthScope.Described = {
    name: OAuthScope.make("pockettrains:read"),
    description: "Everything in Pocket Trains that only looks",
};

/**
 * @since 1.0.0
 * @category Game
 */
export const Write: OAuthScope.Described = {
    name: OAuthScope.make("pockettrains:write"),
    description: "Everything in Pocket Trains that changes a player's game",
};

/**
 * @since 1.0.0
 * @category Device
 */
export const DeviceRead: OAuthScope.Described = {
    name: OAuthScope.make("pockettrains:device:read"),
    description: "Look up player accounts",
};

/**
 * @since 1.0.0
 * @category Device
 */
export const DeviceWrite: OAuthScope.Described = {
    name: OAuthScope.make("pockettrains:device:write"),
    description: "Change a player's account or devices",
};

/**
 * @since 1.0.0
 * @category Device
 */
export const DevicePlayerDetails: OAuthScope.Described = {
    name: OAuthScope.make("pockettrains:device:player_details"),
    description: "Look up a player's public profile details",
};

/**
 * @since 1.0.0
 * @category Device
 */
export const DeviceVerifyDevice: OAuthScope.Described = {
    name: OAuthScope.make("pockettrains:device:verify_device"),
    description: "Complete a device verification code",
};

/**
 * @since 1.0.0
 * @category Social
 */
export const SocialRead: OAuthScope.Described = {
    name: OAuthScope.make("pockettrains:social:read"),
    description: "See items, gifts and friends' games",
};

/**
 * @since 1.0.0
 * @category Social
 */
export const SocialWrite: OAuthScope.Described = {
    name: OAuthScope.make("pockettrains:social:write"),
    description: "Send items to other players",
};

/**
 * @since 1.0.0
 * @category Social
 */
export const SocialGetItems: OAuthScope.Described = {
    name: OAuthScope.make("pockettrains:social:get_items"),
    description: "See the items waiting for a player",
};

/**
 * @since 1.0.0
 * @category Social
 */
export const SocialGetGiftsPt: OAuthScope.Described = {
    name: OAuthScope.make("pockettrains:social:get_gifts_pt"),
    description: "See the gifts waiting for a player",
};

/**
 * @since 1.0.0
 * @category Social
 */
export const SocialPullFriendGame: OAuthScope.Described = {
    name: OAuthScope.make("pockettrains:social:pull_friend_game"),
    description: "Download a friend's game data",
};

/**
 * @since 1.0.0
 * @category Social
 */
export const SocialPullFriendMeta: OAuthScope.Described = {
    name: OAuthScope.make("pockettrains:social:pull_friend_meta"),
    description: "Fetch metadata about a player's friends",
};

/**
 * @since 1.0.0
 * @category Social
 */
export const SocialSendItem: OAuthScope.Described = {
    name: OAuthScope.make("pockettrains:social:send_item"),
    description: "Send items to another player",
};
