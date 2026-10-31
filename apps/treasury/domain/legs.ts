/**
 * The legs of gift trades: one row per item on its way through the vault.
 *
 * The same guarded-UPDATE discipline as the trades table, plus one extra
 * invariant the schema owns outright: `vault_gift_id` is unique, so a gift
 * sitting in the vault's queue can be claimed by exactly one leg, however
 * many verifiers and reconcilers are looking at it.
 */

import type { SqlError } from "effect/sql";

import { Context, Effect, Layer, Schema } from "effect";
import { SqlClient, SqlSchema } from "effect/sql";

import type { SyncItemType } from "@tinyburg/tinytower-sdk/SyncItemType";
import type { LegState, TradeState } from "@tinyburg/treasury-sdk/Sdk";

import { TradeLeg } from "./model.ts";

type LegStateValue = typeof LegState.Type;
type TradeStateValue = typeof TradeState.Type;
type SyncItemTypeValue = (typeof SyncItemType)[keyof typeof SyncItemType];

const uuid = Schema.String.check(Schema.isUUID());

/**
 * The vault gifts that could be this leg's deposit: sender, type and contents
 * exactly as agreed, and not already claimed by some other leg. A trader may
 * offer the same item in two live trades, so several gifts can match; the
 * caller tries them in order until one verifies.
 */
export const depositCandidates = <
    Gift extends { readonly id: number; readonly from: string; readonly type: string; readonly contents: string },
>(
    gifts: ReadonlyArray<Gift>,
    leg: Pick<TradeLeg, "fromPlayerId" | "itemType" | "itemStr">,
    claimed: ReadonlySet<number>
): ReadonlyArray<Gift> =>
    gifts.filter(
        (gift) =>
            !claimed.has(gift.id) &&
            gift.from === leg.fromPlayerId &&
            gift.type === leg.itemType &&
            gift.contents === leg.itemStr
    );

export class LegsRepository extends Context.Service<LegsRepository>()("@tinyburg/treasury/domain/LegsRepository", {
    make: Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;

        /**
         * Creates both legs of a gift trade, idempotently: the workflow that
         * calls this may be replayed, and `ON CONFLICT DO NOTHING` on
         * `(trade_id, role)` makes the second attempt a no-op.
         */
        const createForTrade = (options: {
            readonly tradeId: string;
            readonly vaultPlayerId: string;
            readonly proposer: { readonly userId: string; readonly playerId: string };
            readonly counterparty: { readonly userId: string; readonly playerId: string };
            readonly gives: { readonly itemType: SyncItemTypeValue; readonly item: string };
            readonly wants: { readonly itemType: SyncItemTypeValue; readonly item: string };
        }): Effect.Effect<void, SqlError.SqlError, never> =>
            sql`
                INSERT INTO trade_legs (
                    trade_id, role, depositor_user_id, from_player_id, to_player_id,
                    vault_player_id, item_type, item_str
                )
                VALUES
                    (${options.tradeId}, 'proposer', ${options.proposer.userId},
                     ${options.proposer.playerId}, ${options.counterparty.playerId},
                     ${options.vaultPlayerId}, ${options.gives.itemType}, ${options.gives.item}),
                    (${options.tradeId}, 'counterparty', ${options.counterparty.userId},
                     ${options.counterparty.playerId}, ${options.proposer.playerId},
                     ${options.vaultPlayerId}, ${options.wants.itemType}, ${options.wants.item})
                ON CONFLICT (trade_id, role) DO NOTHING
            `.pipe(Effect.asVoid);

        const forTrade = SqlSchema.findAll({
            Request: uuid,
            Result: TradeLeg,
            execute: (tradeId) => sql`
                SELECT * FROM trade_legs WHERE trade_id = ${tradeId} ORDER BY role
            `,
        });

        const transition = (options: {
            readonly legId: string;
            readonly from: ReadonlyArray<LegStateValue>;
            readonly to: LegStateValue;
        }): Effect.Effect<boolean, SqlError.SqlError, never> =>
            Effect.map(
                sql`
                    UPDATE trade_legs SET state = ${options.to}, updated_at = NOW()
                    WHERE id = ${options.legId} AND ${sql.in("state", options.from)}
                    RETURNING id
                `,
                (rows) => rows.length > 0
            );

        /**
         * Runs a leg update only while the leg's trade is in one of `states`,
         * holding a share lock on the trade row for the length of it. A trade
         * transition (a cancel's or an expiry's claim for refunding) waits
         * for the lock, so the two cannot interleave: either the leg moved
         * first and the refund sees it, or the trade moved first and the leg
         * stays put.
         */
        const whileTradeIn = (
            legId: string,
            states: ReadonlyArray<TradeStateValue>,
            update: Effect.Effect<ReadonlyArray<unknown>, SqlError.SqlError, never>
        ): Effect.Effect<boolean, SqlError.SqlError, never> =>
            sql.withTransaction(
                Effect.gen(function* () {
                    const live = yield* sql`
                        SELECT trades.id FROM trades
                        JOIN trade_legs ON trade_legs.trade_id = trades.id
                        WHERE trade_legs.id = ${legId} AND ${sql.in("trades.state", states)}
                        FOR SHARE OF trades
                    `;
                    if (live.length === 0) return false;
                    const rows = yield* update;
                    return rows.length > 0;
                })
            );

        /**
         * Marks a deposit as dispatched *before* it is sent, and only while
         * the trade is still escrowing. Reserving first is what lets a refund
         * see every deposit that may be on its way: once the trade has left
         * `escrowing`, no pending leg can start moving.
         */
        const reserveDeposit = (legId: string): Effect.Effect<boolean, SqlError.SqlError, never> =>
            whileTradeIn(
                legId,
                ["escrowing"],
                sql`
                    UPDATE trade_legs SET state = 'sent', updated_at = NOW()
                    WHERE id = ${legId} AND state = 'pending'
                    RETURNING id
                `
            );

        /**
         * Claims a vault gift for a leg, while its trade is still escrowing
         * or refunding (the two sagas that wait for deposits). The NOT EXISTS
         * keeps the claim honest before the unique constraint has to say so,
         * and when two verifiers race for one gift the constraint's refusal
         * is the same answer: a gift another leg already claimed simply does
         * not verify this one.
         */
        const verify = (options: {
            readonly legId: string;
            readonly vaultGiftId: number;
        }): Effect.Effect<boolean, SqlError.SqlError, never> =>
            whileTradeIn(
                options.legId,
                ["escrowing", "refunding"],
                sql`
                    UPDATE trade_legs SET state = 'verified', vault_gift_id = ${options.vaultGiftId}, updated_at = NOW()
                    WHERE id = ${options.legId} AND state = 'sent' AND vault_gift_id IS NULL
                      AND NOT EXISTS (
                          SELECT 1 FROM trade_legs claimed WHERE claimed.vault_gift_id = ${options.vaultGiftId}
                      )
                    RETURNING id
                `
            ).pipe(
                Effect.catchIf(
                    (error) => error.reason._tag === "UniqueViolation",
                    () => Effect.succeed(false)
                )
            );

        /**
         * Deposits that were dispatched but have not shown up in the vault's
         * queue yet. The sagas waiting on them decide when one is lost; the
         * reconciler only reports the ones that have waited far too long.
         */
        const staleSent = SqlSchema.findAll({
            Request: Schema.Int,
            Result: TradeLeg,
            execute: (olderThanMinutes) => sql`
                SELECT * FROM trade_legs
                WHERE state = 'sent'
                  AND updated_at < NOW() - make_interval(mins => ${olderThanMinutes})
            `,
        });

        /** Every vault gift id a live leg has claimed, for the reconciler. */
        const claimedGiftIds = Effect.map(
            sql`SELECT vault_gift_id FROM trade_legs WHERE vault_gift_id IS NOT NULL`,
            (rows) => new Set(rows.map((row) => Number(row["vaultGiftId"])))
        );

        return { createForTrade, forTrade, transition, reserveDeposit, verify, staleSent, claimedGiftIds };
    }),
}) {
    static readonly Default = Layer.effect(LegsRepository, LegsRepository.make);
}
