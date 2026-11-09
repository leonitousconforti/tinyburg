/**
 * The scopes the TinyTower api is guarded by: `tinytower` for the whole game,
 * `tinytower:read` and `tinytower:write` for every endpoint that only looks or
 * that changes a player's game, a `:read` and a `:write` scope for each area of
 * the api, such as `tinytower:device:read`, and one scope per endpoint, such as
 * `tinytower:device:player_details`.
 *
 * Each endpoint accepts its own scope, its area's side, the game's side and the
 * game, narrowest first:
 * `{ anyOf: [DevicePlayerDetails, DeviceRead, Read, TinyTower] }`.
 *
 * @since 1.0.0
 * @category Scopes
 */

import * as OAuthScope from "@yielded/auth/OAuthScope";

/**
 * @since 1.0.0
 * @category Game
 */
export const TinyTower: OAuthScope.Described = {
    name: OAuthScope.make("tinytower"),
    description: "TinyTower",
};

/**
 * @since 1.0.0
 * @category Game
 */
export const Read: OAuthScope.Described = {
    name: OAuthScope.make("tinytower:read"),
    description: "Everything in TinyTower that only looks",
};

/**
 * @since 1.0.0
 * @category Game
 */
export const Write: OAuthScope.Described = {
    name: OAuthScope.make("tinytower:write"),
    description: "Everything in TinyTower that changes a player's game",
};

/**
 * @since 1.0.0
 * @category Device
 */
export const DeviceRead: OAuthScope.Described = {
    name: OAuthScope.make("tinytower:device:read"),
    description: "Look up player accounts",
};

/**
 * @since 1.0.0
 * @category Device
 */
export const DeviceWrite: OAuthScope.Described = {
    name: OAuthScope.make("tinytower:device:write"),
    description: "Change a player's account or devices",
};

/**
 * @since 1.0.0
 * @category Device
 */
export const DevicePlayerDetails: OAuthScope.Described = {
    name: OAuthScope.make("tinytower:device:player_details"),
    description: "Look up a player's public profile details",
};

/**
 * @since 1.0.0
 * @category Device
 */
export const DeviceRegisterEmail: OAuthScope.Described = {
    name: OAuthScope.make("tinytower:device:register_email"),
    description: "Attach an email address to a player",
};

/**
 * @since 1.0.0
 * @category Device
 */
export const DeviceVerifyDevice: OAuthScope.Described = {
    name: OAuthScope.make("tinytower:device:verify_device"),
    description: "Complete a device verification code",
};

/**
 * @since 1.0.0
 * @category Sync
 */
export const SyncRead: OAuthScope.Described = {
    name: OAuthScope.make("tinytower:sync:read"),
    description: "Download saves and snapshots",
};

/**
 * @since 1.0.0
 * @category Sync
 */
export const SyncWrite: OAuthScope.Described = {
    name: OAuthScope.make("tinytower:sync:write"),
    description: "Upload saves and snapshots",
};

/**
 * @since 1.0.0
 * @category Sync
 */
export const SyncPullSave: OAuthScope.Described = {
    name: OAuthScope.make("tinytower:sync:pull_save"),
    description: "Download a tower's current save data",
};

/**
 * @since 1.0.0
 * @category Sync
 */
export const SyncCheckVersion: OAuthScope.Described = {
    name: OAuthScope.make("tinytower:sync:check_version"),
    description: "Check the current version of a tower's save",
};

/**
 * @since 1.0.0
 * @category Sync
 */
export const SyncPullSnapshot: OAuthScope.Described = {
    name: OAuthScope.make("tinytower:sync:pull_snapshot"),
    description: "Download a specific cloud snapshot",
};

/**
 * @since 1.0.0
 * @category Sync
 */
export const SyncListSnapshots: OAuthScope.Described = {
    name: OAuthScope.make("tinytower:sync:list_snapshots"),
    description: "List the cloud snapshots a tower has",
};

/**
 * @since 1.0.0
 * @category Sync
 */
export const SyncPushSave: OAuthScope.Described = {
    name: OAuthScope.make("tinytower:sync:push_save"),
    description: "Upload save data to a tower",
};

/**
 * @since 1.0.0
 * @category Sync
 */
export const SyncPushSnapshot: OAuthScope.Described = {
    name: OAuthScope.make("tinytower:sync:push_snapshot"),
    description: "Upload a cloud snapshot",
};

/**
 * @since 1.0.0
 * @category Raffle
 */
export const RaffleRead: OAuthScope.Described = {
    name: OAuthScope.make("tinytower:raffle:read"),
    description: "Check raffle entries",
};

/**
 * @since 1.0.0
 * @category Raffle
 */
export const RaffleWrite: OAuthScope.Described = {
    name: OAuthScope.make("tinytower:raffle:write"),
    description: "Enter raffles",
};

/**
 * @since 1.0.0
 * @category Raffle
 */
export const RaffleCheckEntered: OAuthScope.Described = {
    name: OAuthScope.make("tinytower:raffle:check_entered"),
    description: "Check whether a player entered the current raffle",
};

/**
 * @since 1.0.0
 * @category Raffle
 */
export const RaffleEnter: OAuthScope.Described = {
    name: OAuthScope.make("tinytower:raffle:enter"),
    description: "Enter a player into the raffle",
};

/**
 * @since 1.0.0
 * @category Raffle
 */
export const RaffleEnterMulti: OAuthScope.Described = {
    name: OAuthScope.make("tinytower:raffle:enter_multi"),
    description: "Enter a player into multiple raffles",
};

/**
 * @since 1.0.0
 * @category Social
 */
export const SocialRead: OAuthScope.Described = {
    name: OAuthScope.make("tinytower:social:read"),
    description: "See gifts, visits and friends' towers",
};

/**
 * @since 1.0.0
 * @category Social
 */
export const SocialWrite: OAuthScope.Described = {
    name: OAuthScope.make("tinytower:social:write"),
    description: "Send and accept gifts and items",
};

/**
 * @since 1.0.0
 * @category Social
 */
export const SocialGetGifts: OAuthScope.Described = {
    name: OAuthScope.make("tinytower:social:get_gifts"),
    description: "See the gifts waiting for a player",
};

/**
 * @since 1.0.0
 * @category Social
 */
export const SocialGetVisits: OAuthScope.Described = {
    name: OAuthScope.make("tinytower:social:get_visits"),
    description: "See who has visited a tower",
};

/**
 * @since 1.0.0
 * @category Social
 */
export const SocialPullFriendMeta: OAuthScope.Described = {
    name: OAuthScope.make("tinytower:social:pull_friend_meta"),
    description: "Fetch metadata about a player's friends",
};

/**
 * @since 1.0.0
 * @category Social
 */
export const SocialPullFriendTower: OAuthScope.Described = {
    name: OAuthScope.make("tinytower:social:pull_friend_tower"),
    description: "Download a friend's tower data",
};

/**
 * @since 1.0.0
 * @category Social
 */
export const SocialListFriendSnapshots: OAuthScope.Described = {
    name: OAuthScope.make("tinytower:social:list_friend_snapshots"),
    description: "List the cloud snapshots a friend's tower has",
};

/**
 * @since 1.0.0
 * @category Social
 */
export const SocialSendItem: OAuthScope.Described = {
    name: OAuthScope.make("tinytower:social:send_item"),
    description: "Send bitizens and items to another player",
};

/**
 * @since 1.0.0
 * @category Social
 */
export const SocialReceiveGift: OAuthScope.Described = {
    name: OAuthScope.make("tinytower:social:receive_gift"),
    description: "Accept a gift on a player's behalf",
};
