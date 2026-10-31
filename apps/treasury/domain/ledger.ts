/**
 * The escrow ledger. Append and read, nothing else: the table's own rules
 * refuse updates and deletes, so this repository could not rewrite history
 * even if a bug asked it to.
 */

import type { SqlError } from "effect/unstable/sql";

import { Context, Effect, Layer, Schema } from "effect";
import { SqlClient, SqlSchema } from "effect/unstable/sql";

import { LedgerEvent } from "./model.ts";

const uuid = Schema.String.check(Schema.isUUID());

export class LedgerRepository extends Context.Service<LedgerRepository>()(
    "@tinyburg/treasury/domain/LedgerRepository",
    {
        make: Effect.gen(function* () {
            const sql = yield* SqlClient.SqlClient;

            const append = (options: {
                readonly tradeId?: string | undefined;
                readonly legId?: string | undefined;
                readonly event: string;
                readonly detail?: string | undefined;
            }): Effect.Effect<void, SqlError.SqlError, never> =>
                sql`
                INSERT INTO escrow_ledger (trade_id, leg_id, event, detail)
                VALUES (${options.tradeId ?? null}, ${options.legId ?? null}, ${options.event}, ${options.detail ?? null})
            `.pipe(Effect.asVoid);

            const forTrade = SqlSchema.findAll({
                Request: uuid,
                Result: LedgerEvent,
                execute: (tradeId) => sql`
                SELECT * FROM escrow_ledger WHERE trade_id = ${tradeId} ORDER BY id
            `,
            });

            /**
             * Whether an orphan gift was already recorded, so the reconciler logs
             * each unexpected arrival once rather than every fifteen minutes.
             */
            const hasOrphan = (giftId: number): Effect.Effect<boolean, SqlError.SqlError, never> =>
                Effect.map(
                    sql`
                    SELECT 1 FROM escrow_ledger
                    WHERE event = 'orphan_gift' AND detail = ${JSON.stringify({ giftId })}
                    LIMIT 1
                `,
                    (rows) => rows.length > 0
                );

            return { append, forTrade, hasOrphan };
        }),
    }
) {
    static readonly Default = Layer.effect(LedgerRepository, LedgerRepository.make);
}
