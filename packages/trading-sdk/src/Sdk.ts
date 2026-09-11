/**
 * The api an application calls to act on a player's games, with the player's
 * consent.
 *
 * This is the OAuth side of Tinyburg. The authproxy authenticates requests a
 * caller makes with a player id and password of their own; this api is for a
 * caller who holds neither, only an access token a player granted them on the
 * consent screen. tinyburg.app holds the game credentials for every account a
 * player has linked, so an application names which linked account it is
 * acting as (`:playerId`) and tinyburg.app makes the call to Nimblebit on the
 * player's behalf - if, and only if, the token carries a scope the endpoint
 * accepts. The scopes are the tree in `Scopes`, and every endpoint here is
 * annotated with the leaf that guards it.
 *
 * Every endpoint is bearer authenticated: callers present an access token
 * minted by the Tinyburg OIDC provider, whether that is the first-party app,
 * a third-party application, or a long-lived api key.
 *
 * Saves travel as the text Nimblebit stores, exactly as the TinyTower sdk's
 * `sync_pullSave` returns them; a client that wants structure decodes with
 * `TinyTower.SaveData`. The smaller things - snapshot lists, gifts, visits, a
 * friend's metadata - are plain JSON.
 *
 * @since 1.0.0
 */

import * as Schema from "effect/Schema";
import * as HttpApi from "effect/unstable/httpapi/HttpApi";
import * as HttpApiEndpoint from "effect/unstable/httpapi/HttpApiEndpoint";
import * as HttpApiError from "effect/unstable/httpapi/HttpApiError";
import * as HttpApiGroup from "effect/unstable/httpapi/HttpApiGroup";

import * as NimblebitConfig from "@tinyburg/nimblebit-sdk/NimblebitConfig";
import * as SyncItemType from "@tinyburg/tinytower-sdk/SyncItemType";
import { ResourceServer } from "effect-oidc";

import * as Scopes from "./Scopes.ts";

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

/**
 * A TinyTower account a player has proven they own.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const LinkedAccount = Schema.Struct({
    playerId: NimblebitConfig.PlayerIdSchema,
    createdAt: Schema.DateTimeUtcFromString,
});

/**
 * A save as Nimblebit stores it: the text, and the version it was stored as.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const Save = Schema.Struct({
    saveId: Schema.Number,
    data: Schema.String,
});

/**
 * A save to upload. The text is decoded with `TinyTower.SaveData` on the way
 * in, so a save that does not parse is refused with `400` rather than sent on.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const SaveUpload = Schema.Struct({
    data: Schema.String,
});

/**
 * @since 1.0.0
 * @category Schemas
 */
export const SaveVersion = Schema.Struct({
    saveId: Schema.Number,
});

/**
 * What Nimblebit says about a tower without handing over its save: the shape
 * of it, and the doorman in the encoded form the game exchanges bitizens in.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const TowerMeta = Schema.Struct({
    stories: Schema.Int,
    maxGold: Schema.Int,
    requestedFloorId: Schema.Int,
    vip: Schema.Boolean,
    doorman: Schema.String,
});

/**
 * One of a tower's own cloud snapshots. The timestamp is Nimblebit's, a
 * 64-bit tick count, carried as a string so nothing rounds it.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const Snapshot = Schema.Struct({
    id: Schema.Int,
    timestamp: Schema.String,
    meta: TowerMeta,
});

/**
 * @since 1.0.0
 * @category Schemas
 */
export const SnapshotData = Schema.Struct({
    snapshotId: Schema.Number,
    data: Schema.String,
});

/**
 * One of a friend's cloud snapshots, which Nimblebit describes more briefly
 * than a tower's own.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const FriendSnapshot = Schema.Struct({
    snapshotId: Schema.Int,
    created: Schema.DateTimeUtcFromString,
});

/**
 * @since 1.0.0
 * @category Schemas
 */
export const RaffleStatus = Schema.Struct({
    entered: Schema.Boolean,
});

/**
 * @since 1.0.0
 * @category Schemas
 */
export const PlayerDetails = Schema.Struct({
    playerId: NimblebitConfig.PlayerIdSchema,
    playerEmail: Schema.String,
    registered: Schema.Boolean,
    blacklisted: Schema.Boolean,
});

/**
 * A gift or a visit waiting for a tower.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const Gift = Schema.Struct({
    id: Schema.Number,
    from: NimblebitConfig.PlayerIdSchema,
    to: NimblebitConfig.PlayerIdSchema,
    type: Schema.Enum(SyncItemType.SyncItemType),
    contents: Schema.String,
});

/**
 * @since 1.0.0
 * @category Schemas
 */
export const Gifts = Schema.Struct({
    total: Schema.Int,
    gifts: Schema.Array(Gift),
});

/**
 * Something to send to another player: a bitizen, a visit, a gift, in the
 * encoded form the game exchanges them in.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const ItemToSend = Schema.Struct({
    itemType: Schema.Enum(SyncItemType.SyncItemType),
    item: Schema.String,
});

// ---------------------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------------------

const playerId = NimblebitConfig.PlayerIdSchema;

/**
 * What every call on a linked account can fail with: the account is not one
 * the caller has linked (`404`), or Nimblebit could not be reached or did not
 * answer as expected (`503`).
 */
const TowerErrors = [HttpApiError.NotFound, HttpApiError.ServiceUnavailable] as const;

/**
 * The two groups of one game: the accounts a player has linked and linking
 * more, and everything a linked account can do in the game acting as that
 * account. Every game gets the same pair, at `/v1/<game>/...`, guarded by
 * that game's own area of the scope tree, so a client written for one game
 * is a client for every game, and a scope granted for one game grants
 * nothing in another.
 *
 * The group annotation is the floor for anything added later without its
 * own: an unannotated endpoint accepts only the whole-game scope, so a new
 * endpoint cannot accidentally default to a weaker permission.
 */
const gameGroups = <const Id extends string, const Path extends string>(id: Id, path: Path, game: Scopes.GameArea) => {
    const ListAccounts = HttpApiEndpoint.get("ListAccounts", `/v1/${path}/accounts`, {
        success: Schema.Array(LinkedAccount),
    }).annotate(ResourceServer.OIDCScopes, game.read.list_accounts.grants);

    /**
     * Starts linking: Nimblebit emails a verification code to the address the
     * account's cloud save lives under. `409` if the account is already linked,
     * to anyone.
     */
    const LinkAccount = HttpApiEndpoint.post("LinkAccount", `/v1/${path}/accounts`, {
        payload: Schema.Struct({
            playerId,
            email: NimblebitConfig.PlayerEmailSchema,
        }),
        error: [HttpApiError.BadRequest, HttpApiError.Conflict, HttpApiError.ServiceUnavailable],
        success: Schema.Void,
    }).annotate(ResourceServer.OIDCScopes, game.write.link_account.grants);

    /**
     * Finishes linking with the emailed code. `400` for a code that is wrong,
     * expired, or for an account nobody asked to link.
     */
    const VerifyAccount = HttpApiEndpoint.post("VerifyAccount", `/v1/${path}/accounts/:playerId/verify`, {
        params: { playerId },
        payload: Schema.Struct({
            verificationCode: Schema.String,
        }),
        error: [HttpApiError.BadRequest, HttpApiError.Conflict, HttpApiError.ServiceUnavailable],
        success: Schema.Void,
    }).annotate(ResourceServer.OIDCScopes, game.write.link_account.grants);

    const UnlinkAccount = HttpApiEndpoint.delete("UnlinkAccount", `/v1/${path}/accounts/:playerId`, {
        params: { playerId },
        error: HttpApiError.NotFound,
        success: Schema.Void,
    }).annotate(ResourceServer.OIDCScopes, game.write.unlink_account.grants);

    const PullSave = HttpApiEndpoint.get("PullSave", `/v1/${path}/:playerId/save`, {
        params: { playerId },
        error: TowerErrors,
        success: Save,
    }).annotate(ResourceServer.OIDCScopes, game.read.pull_save.grants);

    const PushSave = HttpApiEndpoint.put("PushSave", `/v1/${path}/:playerId/save`, {
        params: { playerId },
        payload: SaveUpload,
        error: [...TowerErrors, HttpApiError.BadRequest],
        success: Schema.Void,
    }).annotate(ResourceServer.OIDCScopes, game.write.push_save.grants);

    const CheckVersion = HttpApiEndpoint.get("CheckVersion", `/v1/${path}/:playerId/save/version`, {
        params: { playerId },
        error: TowerErrors,
        success: SaveVersion,
    }).annotate(ResourceServer.OIDCScopes, game.read.check_version.grants);

    const ListSnapshots = HttpApiEndpoint.get("ListSnapshots", `/v1/${path}/:playerId/snapshots`, {
        params: { playerId },
        error: TowerErrors,
        success: Schema.Array(Snapshot),
    }).annotate(ResourceServer.OIDCScopes, game.read.list_snapshots.grants);

    const PushSnapshot = HttpApiEndpoint.post("PushSnapshot", `/v1/${path}/:playerId/snapshots`, {
        params: { playerId },
        payload: SaveUpload,
        error: [...TowerErrors, HttpApiError.BadRequest],
        success: Schema.Void,
    }).annotate(ResourceServer.OIDCScopes, game.write.push_snapshot.grants);

    const PullSnapshot = HttpApiEndpoint.get("PullSnapshot", `/v1/${path}/:playerId/snapshots/:snapshotId`, {
        params: { playerId, snapshotId: Schema.Int },
        error: TowerErrors,
        success: SnapshotData,
    }).annotate(ResourceServer.OIDCScopes, game.read.pull_snapshot.grants);

    const CheckRaffle = HttpApiEndpoint.get("CheckRaffle", `/v1/${path}/:playerId/raffle`, {
        params: { playerId },
        error: TowerErrors,
        success: RaffleStatus,
    }).annotate(ResourceServer.OIDCScopes, game.read.check_raffle.grants);

    const EnterRaffle = HttpApiEndpoint.post("EnterRaffle", `/v1/${path}/:playerId/raffle/enter`, {
        params: { playerId },
        error: TowerErrors,
        success: Schema.Void,
    }).annotate(ResourceServer.OIDCScopes, game.write.enter_raffle.grants);

    const EnterMultiRaffle = HttpApiEndpoint.post("EnterMultiRaffle", `/v1/${path}/:playerId/raffle/enter-multi`, {
        params: { playerId },
        error: TowerErrors,
        success: Schema.Void,
    }).annotate(ResourceServer.OIDCScopes, game.write.enter_multi_raffle.grants);

    const GetPlayerDetails = HttpApiEndpoint.get("PlayerDetails", `/v1/${path}/:playerId/details`, {
        params: { playerId },
        error: TowerErrors,
        success: PlayerDetails,
    }).annotate(ResourceServer.OIDCScopes, game.read.player_details.grants);

    const ListGifts = HttpApiEndpoint.get("ListGifts", `/v1/${path}/:playerId/gifts`, {
        params: { playerId },
        error: TowerErrors,
        success: Gifts,
    }).annotate(ResourceServer.OIDCScopes, game.read.list_gifts.grants);

    const ReceiveGift = HttpApiEndpoint.post("ReceiveGift", `/v1/${path}/:playerId/gifts/:giftId/receive`, {
        params: { playerId, giftId: Schema.Int },
        error: TowerErrors,
        success: Schema.Void,
    }).annotate(ResourceServer.OIDCScopes, game.write.receive_gift.grants);

    const ListVisits = HttpApiEndpoint.get("ListVisits", `/v1/${path}/:playerId/visits`, {
        params: { playerId },
        error: TowerErrors,
        success: Gifts,
    }).annotate(ResourceServer.OIDCScopes, game.read.list_visits.grants);

    const SendItem = HttpApiEndpoint.post("SendItem", `/v1/${path}/:playerId/friends/:friendId/items`, {
        params: { playerId, friendId: playerId },
        payload: ItemToSend,
        error: TowerErrors,
        success: Schema.Void,
    }).annotate(ResourceServer.OIDCScopes, game.write.send_item.grants);

    const Visit = HttpApiEndpoint.post("Visit", `/v1/${path}/:playerId/friends/:friendId/visit`, {
        params: { playerId, friendId: playerId },
        error: TowerErrors,
        success: Schema.Void,
    }).annotate(ResourceServer.OIDCScopes, game.write.visit.grants);

    const FriendMeta = HttpApiEndpoint.get("FriendMeta", `/v1/${path}/:playerId/friends/:friendId/meta`, {
        params: { playerId, friendId: playerId },
        error: TowerErrors,
        success: TowerMeta,
    }).annotate(ResourceServer.OIDCScopes, game.read.friend_meta.grants);

    const FriendSave = HttpApiEndpoint.get("FriendSave", `/v1/${path}/:playerId/friends/:friendId/save`, {
        params: { playerId, friendId: playerId },
        error: TowerErrors,
        success: Save,
    }).annotate(ResourceServer.OIDCScopes, game.read.friend_save.grants);

    const FriendSnapshots = HttpApiEndpoint.get(
        "FriendSnapshots",
        `/v1/${path}/:playerId/friends/:friendId/snapshots`,
        {
            params: { playerId, friendId: playerId },
            error: TowerErrors,
            success: Schema.Array(FriendSnapshot),
        }
    ).annotate(ResourceServer.OIDCScopes, game.read.friend_snapshots.grants);

    const accounts = HttpApiGroup.make(`${id}AccountsGroup`)
        .add(ListAccounts)
        .add(LinkAccount)
        .add(VerifyAccount)
        .add(UnlinkAccount)
        .annotate(ResourceServer.OIDCScopes, [game])
        .middleware(ResourceServer.Authorization);

    const tower = HttpApiGroup.make(`${id}Group`)
        .add(PullSave)
        .add(PushSave)
        .add(CheckVersion)
        .add(ListSnapshots)
        .add(PushSnapshot)
        .add(PullSnapshot)
        .add(CheckRaffle)
        .add(EnterRaffle)
        .add(EnterMultiRaffle)
        .add(GetPlayerDetails)
        .add(ListGifts)
        .add(ReceiveGift)
        .add(ListVisits)
        .add(SendItem)
        .add(Visit)
        .add(FriendMeta)
        .add(FriendSave)
        .add(FriendSnapshots)
        .annotate(ResourceServer.OIDCScopes, [game])
        .middleware(ResourceServer.Authorization);

    return { accounts, tower };
};

// ---------------------------------------------------------------------------
// Groups
// ---------------------------------------------------------------------------

const tinyTower = gameGroups("TinyTower", "tinytower", Scopes.TinyTower);
const tinyTowerClassic = gameGroups("TinyTowerClassic", "tinytowerclassic", Scopes.TinyTowerClassic);
const pocketPlanes = gameGroups("PocketPlanes", "pocketplanes", Scopes.PocketPlanes);
const pocketTrains = gameGroups("PocketTrains", "pockettrains", Scopes.PocketTrains);
const legoTower = gameGroups("LegoTower", "legotower", Scopes.LegoTower);
const discoZoo = gameGroups("DiscoZoo", "discozoo", Scopes.DiscoZoo);
const bitCity = gameGroups("BitCity", "bitcity", Scopes.BitCity);
const tinyTowerVegas = gameGroups("TinyTowerVegas", "tinytowervegas", Scopes.TinyTowerVegas);

/**
 * The TinyTower accounts a player has linked, and linking more.
 *
 * @since 1.0.0
 * @category Groups
 */
export const TinyTowerAccountsGroup = tinyTower.accounts;

/**
 * Everything a linked TinyTower account can do in the game, acting as that
 * account.
 *
 * @since 1.0.0
 * @category Groups
 */
export const TinyTowerGroup = tinyTower.tower;

/**
 * The TinyTower Classic accounts a player has linked, and linking more.
 *
 * @since 1.0.0
 * @category Groups
 */
export const TinyTowerClassicAccountsGroup = tinyTowerClassic.accounts;

/**
 * Everything a linked TinyTower Classic account can do in the game, acting
 * as that account.
 *
 * @since 1.0.0
 * @category Groups
 */
export const TinyTowerClassicGroup = tinyTowerClassic.tower;


/**
 * The PocketPlanes accounts a player has linked, and linking more. (The act-on-behalf
 * tower api is not exposed for this game yet.)
 *
 * @since 1.0.0
 * @category Groups
 */
export const PocketPlanesAccountsGroup = pocketPlanes.accounts;

/**
 * The PocketTrains accounts a player has linked, and linking more. (The act-on-behalf
 * tower api is not exposed for this game yet.)
 *
 * @since 1.0.0
 * @category Groups
 */
export const PocketTrainsAccountsGroup = pocketTrains.accounts;

/**
 * The LegoTower accounts a player has linked, and linking more. (The act-on-behalf
 * tower api is not exposed for this game yet.)
 *
 * @since 1.0.0
 * @category Groups
 */
export const LegoTowerAccountsGroup = legoTower.accounts;

/**
 * The DiscoZoo accounts a player has linked, and linking more. (The act-on-behalf
 * tower api is not exposed for this game yet.)
 *
 * @since 1.0.0
 * @category Groups
 */
export const DiscoZooAccountsGroup = discoZoo.accounts;

/**
 * The BitCity accounts a player has linked, and linking more. (The act-on-behalf
 * tower api is not exposed for this game yet.)
 *
 * @since 1.0.0
 * @category Groups
 */
export const BitCityAccountsGroup = bitCity.accounts;

/**
 * The TinyTowerVegas accounts a player has linked, and linking more. (The act-on-behalf
 * tower api is not exposed for this game yet.)
 *
 * @since 1.0.0
 * @category Groups
 */
export const TinyTowerVegasAccountsGroup = tinyTowerVegas.accounts;

/**
 * NOTE: the Pocket Planes / Pocket Trains / LEGO Tower / Disco Zoo / Bit City /
 * Tiny Tower Vegas accounts groups are defined and exported above but not yet
 * added here. Adding them requires the tinyburg.app server to implement their
 * link handlers, which run through NimblebitAuth's per-game burn bots - wired
 * once that game-aware `burnbot(game)` refactor lands. `.add(...)` them then.
 *
 * @since 1.0.0
 * @category Api
 */
export const Api = HttpApi.make("TradingSdk")
    .add(TinyTowerAccountsGroup)
    .add(TinyTowerGroup)
    .add(TinyTowerClassicAccountsGroup)
    .add(TinyTowerClassicGroup);
