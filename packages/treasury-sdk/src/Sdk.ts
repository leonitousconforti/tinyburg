/**
 * The api the treasury serves: player-to-player trades, escrowed.
 *
 * Nimblebit has no hold primitive, so the treasury makes one out of the gift
 * channel: each side's item is sent to a treasury-owned vault tower, where it
 * sits as an *unreceived* gift - a native escrow slot - until both deposits
 * are verified, and only then is each item forwarded to the other side. A
 * save-splice trade instead rewrites both saves directly, which is why it
 * requires an explicit confirmation from both parties before anything runs.
 *
 * Every endpoint is bearer authenticated with a token minted by the Tinyburg
 * OIDC provider and guarded by a leaf of the `treasury` scope area. The
 * browser never calls this api cross-origin: tinyburg.app reverse-proxies
 * `/v1/treasury/*` to the treasury with the visitor's session bearer
 * attached, so the paths here are the same paths the SPA requests.
 *
 * A `403` from any trade endpoint means the treasury holds no usable grant
 * for the caller's towers; `GrantStatus` says so explicitly and carries the
 * url that starts the connect flow.
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
 * How a trade moves its items. `gift` rides Nimblebit's gift channel through
 * the vault; `splice` rewrites both saves and can carry what the gift channel
 * cannot (costumes, pets, coins, bux).
 *
 * @since 1.0.0
 * @category Schemas
 */
export const TradeMechanism = Schema.Literals(["gift", "splice"]);

/**
 * The games the treasury trades in. TinyTower only, until the trading api
 * serves more.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const TradeGame = Schema.Literals(["tinytower"]);

/**
 * Where a trade is in its life. The happy path is `proposed` → `accepted` →
 * (`awaiting_confirmation`, splice only) → `escrowing` → `escrowed` →
 * `releasing` (gift) or `executing` (splice) → `settled`; everything else is
 * one of the ways out.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const TradeState = Schema.Literals([
    "proposed",
    "accepted",
    "awaiting_confirmation",
    "escrowing",
    "escrowed",
    "releasing",
    "executing",
    "settled",
    "cancelled",
    "refunding",
    "refunded",
    "expired",
    "failed",
]);

/**
 * One side of a gift trade's journey through the vault: `pending` → `sent`
 * (deposit dispatched) → `verified` (seen in the vault's gift queue) →
 * `released` (forwarded to the counterparty) → `settled` (vault slot
 * claimed); refunds run `refund_sent` → `refunded`, and `lost` is a deposit
 * that never arrived.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const LegState = Schema.Literals([
    "pending",
    "sent",
    "verified",
    "released",
    "settled",
    "refund_sent",
    "refunded",
    "lost",
]);

/**
 * @since 1.0.0
 * @category Schemas
 */
export const TradeRole = Schema.Literals(["proposer", "counterparty"]);

/**
 * One item offered over the gift channel, in the encoded form the game
 * exchanges items in - the same string `SendItem` carries.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const GiftItem = Schema.Struct({
    _tag: Schema.tag("GiftItem"),
    itemType: Schema.Enum(SyncItemType.SyncItemType),
    item: Schema.String,
});

/**
 * One item offered by splice. Bitizens, costumes and pets carry the encoded
 * string a save stores them as; coins and bux carry an amount instead.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const SpliceItem = Schema.Struct({
    kind: Schema.Literals(["bitizen", "costume", "pet", "coins", "bux"]),
    item: Schema.optional(Schema.String),
    amount: Schema.optional(Schema.Int),
});

/**
 * @since 1.0.0
 * @category Schemas
 */
export const SpliceItems = Schema.Struct({
    _tag: Schema.tag("SpliceItems"),
    items: Schema.Array(SpliceItem),
});

/**
 * What one side of a trade puts in: a gift-channel item or a list of splice
 * items, matching the trade's mechanism.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const ItemSpec = Schema.Union([GiftItem, SpliceItems]);

/**
 * A trade as the api describes it. `gives` and `wants` are always from the
 * proposer's point of view; `role` is which side the caller is on, absent for
 * an open offer the caller could accept.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const Trade = Schema.Struct({
    id: Schema.String,
    mechanism: TradeMechanism,
    game: TradeGame,
    state: TradeState,
    proposerPlayerId: NimblebitConfig.PlayerIdSchema,
    counterpartyPlayerId: Schema.optional(NimblebitConfig.PlayerIdSchema),
    gives: ItemSpec,
    wants: ItemSpec,
    role: Schema.optional(TradeRole),
    proposerConfirmedAt: Schema.optional(Schema.DateTimeUtcFromString),
    counterpartyConfirmedAt: Schema.optional(Schema.DateTimeUtcFromString),
    createdAt: Schema.DateTimeUtcFromString,
    expiresAt: Schema.DateTimeUtcFromString,
    failureReason: Schema.optional(Schema.String),
});

/**
 * @since 1.0.0
 * @category Schemas
 */
export const TradeLeg = Schema.Struct({
    role: TradeRole,
    fromPlayerId: NimblebitConfig.PlayerIdSchema,
    toPlayerId: NimblebitConfig.PlayerIdSchema,
    state: LegState,
    itemType: Schema.Enum(SyncItemType.SyncItemType),
    item: Schema.String,
});

/**
 * One entry of a trade's append-only history, as shown on its timeline.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const LedgerEvent = Schema.Struct({
    event: Schema.String,
    at: Schema.DateTimeUtcFromString,
});

/**
 * A trade with its legs and its history, for the participants only.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const TradeDetail = Schema.Struct({
    trade: Trade,
    legs: Schema.Array(TradeLeg),
    ledger: Schema.Array(LedgerEvent),
});

/**
 * Whether the treasury can currently act on the caller's towers, and where
 * to go to make it so. The url is built server-side so the browser stays
 * configuration-free.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const GrantStatus = Schema.Struct({
    connected: Schema.Boolean,
    scope: Schema.optional(Schema.String),
    connectUrl: Schema.String,
});

/**
 * What a tower could put into a trade, read out of its save. Bitizens are the
 * encoded strings the gift channel carries; costumes and pets are the strings
 * the save stores.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const Inventory = Schema.Struct({
    playerId: NimblebitConfig.PlayerIdSchema,
    bitizens: Schema.Array(Schema.String),
    costumes: Schema.Array(Schema.String),
    pets: Schema.Array(Schema.String),
    coins: Schema.Int,
    bux: Schema.Int,
});

/**
 * The treasury's public counters, for the home page's stat tiles. Counts
 * only, cached server-side, and deliberately free of anything per-user.
 *
 * @since 1.0.0
 * @category Schemas
 */
export const TreasuryStats = Schema.Struct({
    activeTraders: Schema.Int,
    settledTrades: Schema.Int,
    itemsMoved: Schema.Int,
});

/**
 * @since 1.0.0
 * @category Schemas
 */
export const TradeProposal = Schema.Struct({
    mechanism: TradeMechanism,
    game: TradeGame,
    proposerPlayerId: NimblebitConfig.PlayerIdSchema,
    /** Absent for an open offer, which whoever accepts first gets. */
    counterpartyPlayerId: Schema.optional(NimblebitConfig.PlayerIdSchema),
    gives: ItemSpec,
    wants: ItemSpec,
    ttlHours: Schema.Int.check(Schema.isBetween({ minimum: 1, maximum: 168 })),
});

// ---------------------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------------------

const tradeId = Schema.String;
const playerId = NimblebitConfig.PlayerIdSchema;

/**
 * What acting on a trade can fail with: it does not exist or the caller is
 * not a participant (`404`, and the api never confirms a trade exists to a
 * stranger), it is not in a state the action applies to (`409`), the
 * treasury holds no usable grant for the caller (`403`), or the world
 * beyond - tinyburg.app, Nimblebit - did not cooperate (`503`).
 */
const TradeErrors = [
    HttpApiError.NotFound,
    HttpApiError.Conflict,
    HttpApiError.Forbidden,
    HttpApiError.ServiceUnavailable,
] as const;

const GetGrantStatus = HttpApiEndpoint.get("GrantStatus", "/v1/treasury/grant", {
    success: GrantStatus,
}).annotate(ResourceServer.OIDCScopes, Scopes.Treasury.read.grant_status.grants);

const ListTrades = HttpApiEndpoint.get("ListTrades", "/v1/treasury/trades", {
    success: Schema.Array(Trade),
}).annotate(ResourceServer.OIDCScopes, Scopes.Treasury.read.list_trades.grants);

const GetTrade = HttpApiEndpoint.get("GetTrade", "/v1/treasury/trades/:tradeId", {
    params: { tradeId },
    error: HttpApiError.NotFound,
    success: TradeDetail,
}).annotate(ResourceServer.OIDCScopes, Scopes.Treasury.read.get_trade.grants);

const ProposeTrade = HttpApiEndpoint.post("ProposeTrade", "/v1/treasury/trades", {
    payload: TradeProposal,
    error: [HttpApiError.BadRequest, HttpApiError.Forbidden, HttpApiError.ServiceUnavailable],
    success: Trade,
}).annotate(ResourceServer.OIDCScopes, Scopes.Treasury.write.propose.grants);

const AcceptTrade = HttpApiEndpoint.post("AcceptTrade", "/v1/treasury/trades/:tradeId/accept", {
    params: { tradeId },
    payload: Schema.Struct({ playerId }),
    error: TradeErrors,
    success: Trade,
}).annotate(ResourceServer.OIDCScopes, Scopes.Treasury.write.accept.grants);

const CancelTrade = HttpApiEndpoint.post("CancelTrade", "/v1/treasury/trades/:tradeId/cancel", {
    params: { tradeId },
    error: [HttpApiError.NotFound, HttpApiError.Conflict],
    success: Trade,
}).annotate(ResourceServer.OIDCScopes, Scopes.Treasury.write.cancel.grants);

const ConfirmSplice = HttpApiEndpoint.post("ConfirmSplice", "/v1/treasury/trades/:tradeId/confirm", {
    params: { tradeId },
    error: [HttpApiError.NotFound, HttpApiError.Conflict],
    success: Trade,
}).annotate(ResourceServer.OIDCScopes, Scopes.Treasury.write.confirm_splice.grants);

const ListInventory = HttpApiEndpoint.get("ListInventory", "/v1/treasury/inventory/:playerId", {
    params: { playerId },
    error: [HttpApiError.NotFound, HttpApiError.Forbidden, HttpApiError.ServiceUnavailable],
    success: Inventory,
}).annotate(ResourceServer.OIDCScopes, Scopes.Treasury.read.list_inventory.grants);

const GetStats = HttpApiEndpoint.get("Stats", "/v1/treasury/stats", {
    success: TreasuryStats,
});

// ---------------------------------------------------------------------------
// Groups
// ---------------------------------------------------------------------------

/**
 * Everything the treasury serves. The group annotation is the floor: an
 * endpoint added later without its own leaf accepts only the whole
 * `treasury` scope, so nothing defaults to a weaker permission.
 *
 * @since 1.0.0
 * @category Groups
 */
export const TreasuryGroup = HttpApiGroup.make("TreasuryGroup")
    .add(GetGrantStatus)
    .add(ListTrades)
    .add(GetTrade)
    .add(ProposeTrade)
    .add(AcceptTrade)
    .add(CancelTrade)
    .add(ConfirmSplice)
    .add(ListInventory)
    .annotate(ResourceServer.OIDCScopes, [Scopes.Treasury])
    .middleware(ResourceServer.Authorization);

/**
 * What the treasury tells anyone at all: the stat counters the home page
 * shows. The one group without the Authorization middleware, and it must
 * stay that way - the home page is public, so this rides tinyburg.app's
 * proxy without a session behind it.
 *
 * @since 1.0.0
 * @category Groups
 */
export const TreasuryPublicGroup = HttpApiGroup.make("TreasuryPublicGroup").add(GetStats);

/**
 * @since 1.0.0
 * @category Api
 */
export const Api = HttpApi.make("TreasurySdk").add(TreasuryGroup).add(TreasuryPublicGroup);
