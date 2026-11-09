/**
 * The scopes an application can be granted over a player's games.
 *
 * Each game has a scope for all of it, one for everything that only looks and
 * one for everything that changes something, and one per endpoint, so a
 * player can grant exactly as much as an application asks for: `tinytower`
 * for all of it, `tinytower:read` for everything that only looks,
 * `tinytower:pull_save` for one thing. An endpoint accepts its own scope, its
 * side's and the game's, narrowest first:
 * `{ anyOf: [TinyTower.PullSave, TinyTower.Read, TinyTower.Game] }`.
 *
 * These are OAuth scopes: a player approves them on the consent screen, and an
 * application then acts on the player's linked accounts through tinyburg.app,
 * which holds the game credentials. Nothing here is a key to Nimblebit.
 *
 * @since 1.0.0
 * @category Scopes
 */

import * as OAuthScope from "@yielded/auth/OAuthScope";

/**
 * Every scope of one game, in the order a consent screen lists them: the
 * game, its read scope and one per read endpoint, then its write scope and
 * one per write endpoint. The same for every game because the tinyburg api is
 * the same for every game; only the name and the words differ.
 */
const make = (game: string, title: string) => {
    const scope = (name: string, description: string): OAuthScope.Described => ({
        name: OAuthScope.make(`${game}:${name}`),
        description,
    });

    const whole: OAuthScope.Described = {
        name: OAuthScope.make(game),
        description: `The ${title} accounts you have linked`,
    };

    return {
        Game: whole,
        Read: scope("read", `See your linked ${title} accounts and their towers, without changing anything`),
        ListAccounts: scope("list_accounts", `See which ${title} accounts you have linked`),
        PullSave: scope("pull_save", "Download a tower's current save"),
        CheckVersion: scope("check_version", "Check the current version of a tower's save"),
        ListSnapshots: scope("list_snapshots", "List the cloud snapshots a tower has"),
        PullSnapshot: scope("pull_snapshot", "Download a specific cloud snapshot"),
        CheckRaffle: scope("check_raffle", "Check whether a tower has entered the current raffle"),
        PlayerDetails: scope("player_details", "See a linked account's registration details"),
        ListGifts: scope("list_gifts", "See the gifts waiting for a tower"),
        ListVisits: scope("list_visits", "See who has visited a tower"),
        FriendMeta: scope("friend_meta", "Look up a friend's tower metadata"),
        FriendSave: scope("friend_save", "Download a friend's tower"),
        FriendSnapshots: scope("friend_snapshots", "List the cloud snapshots a friend's tower has"),
        Write: scope("write", `Change your linked ${title} accounts and their towers, including uploading saves`),
        LinkAccount: scope("link_account", `Link a ${title} account to your Tinyburg account`),
        UnlinkAccount: scope("unlink_account", `Unlink a ${title} account from your Tinyburg account`),
        PushSave: scope("push_save", "Upload a save to a tower"),
        PushSnapshot: scope("push_snapshot", "Upload a cloud snapshot"),
        EnterRaffle: scope("enter_raffle", "Enter a tower into the raffle"),
        EnterMultiRaffle: scope("enter_multi_raffle", "Enter a tower into the next several raffles"),
        ReceiveGift: scope("receive_gift", "Accept a gift on a tower's behalf"),
        SendItem: scope("send_item", "Send bitizens and items to another player"),
        Visit: scope("visit", "Visit another player's tower"),
    };
};

/**
 * The scopes every game has, for code that serves any of them.
 *
 * @since 1.0.0
 * @category Games
 */
export type GameScopes = ReturnType<typeof make>;

/**
 * @since 1.0.0
 * @category Games
 */
export const TinyTower: GameScopes = make("tinytower", "TinyTower");

/**
 * @since 1.0.0
 * @category Games
 */
export const TinyTowerClassic: GameScopes = make("tinytowerclassic", "TinyTower Classic");

/**
 * @since 1.0.0
 * @category Games
 */
export const PocketPlanes: GameScopes = make("pocketplanes", "Pocket Planes");

/**
 * @since 1.0.0
 * @category Games
 */
export const PocketTrains: GameScopes = make("pockettrains", "Pocket Trains");

/**
 * @since 1.0.0
 * @category Games
 */
export const LegoTower: GameScopes = make("legotower", "LEGO Tower");

/**
 * @since 1.0.0
 * @category Games
 */
export const DiscoZoo: GameScopes = make("discozoo", "Disco Zoo");

/**
 * @since 1.0.0
 * @category Games
 */
export const BitCity: GameScopes = make("bitcity", "Bit City");

/**
 * @since 1.0.0
 * @category Games
 */
export const TinyTowerVegas: GameScopes = make("tinytowervegas", "Tiny Tower Vegas");

/**
 * Every game, in the order a consent screen or a developer page lists them.
 *
 * @since 1.0.0
 * @category Games
 */
export const Games: ReadonlyArray<GameScopes> = [
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
 * Every scope of one game, in the order a consent screen lists them: the
 * game, its read scope and the read endpoints' scopes, then its write scope
 * and the write endpoints'.
 *
 * @since 1.0.0
 * @category Games
 */
export const all = (game: GameScopes): ReadonlyArray<OAuthScope.Described> => Object.values(game);
