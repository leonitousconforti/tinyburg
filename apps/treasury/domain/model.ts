/**
 * Schemas for the treasury.
 *
 * The one rule everything here serves: an item is never in two places at
 * once. A trade's legs say where each item is on its way through the vault,
 * the ledger says how it got there, and every transition between those
 * states is a guarded SQL update, so two racing writers cannot both think
 * they moved it.
 */

import { Schema } from "effect";
import { Model } from "effect/unstable/schema";

import { PlayerIdSchema } from "@tinyburg/nimblebit-sdk/NimblebitConfig";
import { SyncItemType } from "@tinyburg/tinytower-sdk/SyncItemType";
import { LegState, TradeGame, TradeMechanism, TradeRole, TradeState } from "@tinyburg/treasury-sdk/Sdk";

/** A BIGINT column: the driver hands it over as a string, small values as a number. */
const int8 = Schema.Union([Schema.Finite, Schema.FiniteFromString]);

/**
 * A stored towers grant, letting the escrow sagas act for a trader who is no
 * longer at the keyboard. Only ciphertext is persisted, and the refresh token
 * never leaves the server.
 *
 * @since 1.0.0
 * @category Model
 */
export class TreasuryGrant extends Model.Class<TreasuryGrant>("TreasuryGrant")({
    id: Schema.String.check(Schema.isUUID()).pipe(Model.FieldExcept(["insert"])),
    tinyburgUserId: Schema.String.check(Schema.isUUID()),
    refreshTokenCiphertext: Schema.String.pipe(Model.FieldOnly(["select", "insert", "update"])),
    scope: Schema.String,
    issuedAt: Model.DateTimeInsertFromDate,
    invalidatedAt: Schema.OptionFromNullishOr(Schema.DateTimeUtcFromDate, { onNoneEncoding: null }),
}) {}

/**
 * One trade. `gives` and `wants` are the agreed offer from the proposer's
 * point of view, stored as the JSON text of the sdk's `ItemSpec` so the row
 * carries exactly what both parties saw.
 *
 * @since 1.0.0
 * @category Model
 */
export class Trade extends Model.Class<Trade>("Trade")({
    id: Schema.String.check(Schema.isUUID()).pipe(Model.FieldExcept(["insert"])),
    mechanism: TradeMechanism,
    game: TradeGame,
    state: TradeState,
    proposerUserId: Schema.String.check(Schema.isUUID()),
    proposerPlayerId: PlayerIdSchema,
    counterpartyUserId: Schema.OptionFromNullishOr(Schema.String.check(Schema.isUUID()), { onNoneEncoding: null }),
    counterpartyPlayerId: Schema.OptionFromNullishOr(PlayerIdSchema, { onNoneEncoding: null }),
    gives: Schema.String,
    wants: Schema.String,
    proposerConfirmedAt: Schema.OptionFromNullishOr(Schema.DateTimeUtcFromDate, { onNoneEncoding: null }),
    counterpartyConfirmedAt: Schema.OptionFromNullishOr(Schema.DateTimeUtcFromDate, { onNoneEncoding: null }),
    expiresAt: Schema.DateTimeUtcFromDate,
    failureReason: Schema.OptionFromNullishOr(Schema.String, { onNoneEncoding: null }),
    createdAt: Model.DateTimeInsertFromDate,
    updatedAt: Model.DateTimeInsertFromDate,
}) {}

/**
 * One side of a gift trade's journey through the vault. The vault's gift id
 * is recorded at `verified` and is unique, so one escrow slot can never back
 * two legs.
 *
 * @since 1.0.0
 * @category Model
 */
export class TradeLeg extends Model.Class<TradeLeg>("TradeLeg")({
    id: Schema.String.check(Schema.isUUID()).pipe(Model.FieldExcept(["insert"])),
    tradeId: Schema.String.check(Schema.isUUID()),
    role: TradeRole,
    depositorUserId: Schema.String.check(Schema.isUUID()),
    fromPlayerId: PlayerIdSchema,
    toPlayerId: PlayerIdSchema,
    vaultPlayerId: PlayerIdSchema,
    itemType: Schema.Enum(SyncItemType),
    itemStr: Schema.String,
    state: LegState,
    vaultGiftId: Schema.OptionFromNullishOr(int8, { onNoneEncoding: null }),
    createdAt: Model.DateTimeInsertFromDate,
    updatedAt: Model.DateTimeInsertFromDate,
}) {}

/**
 * The splice side of a trade: the plan both parties confirmed, the saves as
 * they were pulled, and what was pushed back. The originals are kept so a
 * failed second push can restore the first side.
 *
 * @since 1.0.0
 * @category Model
 */
export class SplicePlan extends Model.Class<SplicePlan>("SplicePlan")({
    tradeId: Schema.String.check(Schema.isUUID()),
    proposerSaveId: Schema.OptionFromNullishOr(Schema.Finite, { onNoneEncoding: null }),
    counterpartySaveId: Schema.OptionFromNullishOr(Schema.Finite, { onNoneEncoding: null }),
    proposerOriginal: Schema.OptionFromNullishOr(Schema.String, { onNoneEncoding: null }),
    counterpartyOriginal: Schema.OptionFromNullishOr(Schema.String, { onNoneEncoding: null }),
    proposerSpliced: Schema.OptionFromNullishOr(Schema.String, { onNoneEncoding: null }),
    counterpartySpliced: Schema.OptionFromNullishOr(Schema.String, { onNoneEncoding: null }),
}) {}

/**
 * One entry of the append-only escrow ledger. `tradeId` is nullable because
 * the reconciler also records gifts that arrived at the vault matching no
 * trade at all.
 *
 * @since 1.0.0
 * @category Model
 */
export class LedgerEvent extends Model.Class<LedgerEvent>("LedgerEvent")({
    id: Model.GeneratedByDb(int8),
    tradeId: Schema.OptionFromNullishOr(Schema.String.check(Schema.isUUID()), { onNoneEncoding: null }),
    legId: Schema.OptionFromNullishOr(Schema.String.check(Schema.isUUID()), { onNoneEncoding: null }),
    event: Schema.String,
    detail: Schema.OptionFromNullishOr(Schema.String, { onNoneEncoding: null }),
    createdAt: Model.DateTimeInsertFromDate,
}) {}
