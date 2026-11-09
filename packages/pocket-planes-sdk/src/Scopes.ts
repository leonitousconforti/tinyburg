/**
 * The scopes the Pocket Planes api is guarded by: `pocketplanes` for the whole
 * game, `pocketplanes:read` and `pocketplanes:write` for every endpoint that
 * only looks or that changes a player's game, a `:read` and a `:write` scope
 * for each area of the api, such as `pocketplanes:device:read`, and one scope
 * per endpoint, such as `pocketplanes:device:player_details`.
 *
 * Each endpoint accepts its own scope, its area's side, the game's side and the
 * game, narrowest first:
 * `{ anyOf: [DevicePlayerDetails, DeviceRead, Read, PocketPlanes] }`. An
 * endpoint this module has no scope for is left unscoped, and the authproxy
 * guards it with `pocketplanes:read` or `pocketplanes`.
 *
 * @since 1.0.0
 * @category Scopes
 */

import * as OAuthScope from "@yielded/auth/OAuthScope";

/**
 * @since 1.0.0
 * @category Game
 */
export const PocketPlanes: OAuthScope.Described = {
    name: OAuthScope.make("pocketplanes"),
    description: "Pocket Planes",
};

/**
 * @since 1.0.0
 * @category Game
 */
export const Read: OAuthScope.Described = {
    name: OAuthScope.make("pocketplanes:read"),
    description: "Everything in Pocket Planes that only looks",
};

/**
 * @since 1.0.0
 * @category Game
 */
export const Write: OAuthScope.Described = {
    name: OAuthScope.make("pocketplanes:write"),
    description: "Everything in Pocket Planes that changes a player's game",
};

/**
 * @since 1.0.0
 * @category Device
 */
export const DeviceRead: OAuthScope.Described = {
    name: OAuthScope.make("pocketplanes:device:read"),
    description: "Look up player accounts",
};

/**
 * @since 1.0.0
 * @category Device
 */
export const DeviceWrite: OAuthScope.Described = {
    name: OAuthScope.make("pocketplanes:device:write"),
    description: "Change a player's account or devices",
};

/**
 * @since 1.0.0
 * @category Device
 */
export const DevicePlayerDetails: OAuthScope.Described = {
    name: OAuthScope.make("pocketplanes:device:player_details"),
    description: "Look up a player's public profile details",
};

/**
 * @since 1.0.0
 * @category Device
 */
export const DeviceRegisterEmail: OAuthScope.Described = {
    name: OAuthScope.make("pocketplanes:device:register_email"),
    description: "Attach an email address to a player",
};

/**
 * @since 1.0.0
 * @category Device
 */
export const DeviceVerifyDevice: OAuthScope.Described = {
    name: OAuthScope.make("pocketplanes:device:verify_device"),
    description: "Complete a device verification code",
};

/**
 * @since 1.0.0
 * @category Social
 */
export const SocialRead: OAuthScope.Described = {
    name: OAuthScope.make("pocketplanes:social:read"),
    description: "See gifts, visits, item requests and friends' games",
};

/**
 * @since 1.0.0
 * @category Social
 */
export const SocialWrite: OAuthScope.Described = {
    name: OAuthScope.make("pocketplanes:social:write"),
    description: "Send and accept items",
};

/**
 * @since 1.0.0
 * @category Social
 */
export const SocialGetVisits: OAuthScope.Described = {
    name: OAuthScope.make("pocketplanes:social:get_visits"),
    description: "See who has visited a player",
};

/**
 * @since 1.0.0
 * @category Social
 */
export const SocialGetGifts: OAuthScope.Described = {
    name: OAuthScope.make("pocketplanes:social:get_gifts"),
    description: "See the gifts waiting for a player",
};

/**
 * @since 1.0.0
 * @category Social
 */
export const SocialRequestItems: OAuthScope.Described = {
    name: OAuthScope.make("pocketplanes:social:request_items"),
    description: "See the item requests waiting for a player",
};

/**
 * @since 1.0.0
 * @category Social
 */
export const SocialPullFriendMeta: OAuthScope.Described = {
    name: OAuthScope.make("pocketplanes:social:pull_friend_meta"),
    description: "Fetch metadata about a player's friends",
};

/**
 * @since 1.0.0
 * @category Social
 */
export const SocialPullFriendGame: OAuthScope.Described = {
    name: OAuthScope.make("pocketplanes:social:pull_friend_game"),
    description: "Download a friend's game data",
};

/**
 * @since 1.0.0
 * @category Social
 */
export const SocialSendItem: OAuthScope.Described = {
    name: OAuthScope.make("pocketplanes:social:send_item"),
    description: "Send items to another player",
};

/**
 * @since 1.0.0
 * @category Social
 */
export const SocialReceiveItem: OAuthScope.Described = {
    name: OAuthScope.make("pocketplanes:social:receive_item"),
    description: "Accept an item on a player's behalf",
};
