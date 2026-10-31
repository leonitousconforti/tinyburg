/**
 * The legs of gift trades: one row per item on its way through the vault.
 *
 * The same guarded-UPDATE discipline as the trades table, plus one extra
 * invariant the schema owns outright: `vault_gift_id` is unique, so a gift
 * sitting in the vault's queue can be claimed by exactly one leg, however
 * many verifiers and reconcilers are looking at it.
 */

import type { SqlError } from "effect/unstable/sql";

import { Context, Effect, Layer, Schema } from "effect";
import { SqlClient, SqlSchema } from "effect/unstable/sql";

import type { SyncItemType } from "@tinyburg/tinytower-sdk/SyncItemType";
import type { LegState } from "@tinyburg/treasury-sdk/Sdk";

import { TradeLeg } from "./model.ts";

type LegStateValue = typeof LegState.Type;
type SyncItemTypeValue = (typeof SyncItemType)[keyof typeof SyncItemType];

const uuid = Schema.String.check(Schema.isUUID());

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
         * Claims a vault gift for a leg. The NOT EXISTS keeps the claim
         * honest before the unique constraint has to say so with an error:
         * a gift another leg already claimed simply does not verify this one.
         */
        const verify = (options: {
            readonly legId: string;
            readonly vaultGiftId: number;
        }): Effect.Effect<boolean, SqlError.SqlError, never> =>
            Effect.map(
                sql`
                    UPDATE trade_legs SET state = 'verified', vault_gift_id = ${options.vaultGiftId}, updated_at = NOW()
                    WHERE id = ${options.legId} AND state = 'sent' AND vault_gift_id IS NULL
                      AND NOT EXISTS (
                          SELECT 1 FROM trade_legs claimed WHERE claimed.vault_gift_id = ${options.vaultGiftId}
                      )
                    RETURNING id
                `,
                (rows) => rows.length > 0
            );

        /**
         * Deposits that were dispatched but never showed up in the vault's
         * queue. The reconciler turns these into `lost` after the verify
         * window has long passed.
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

        return { createForTrade, forTrade, transition, verify, staleSent, claimedGiftIds };
    }),
}) {
    static readonly Default = Layer.effect(LegsRepository, LegsRepository.make);
}
