/**
 * Storage for the splice side of a trade: the saves as pulled, and as
 * spliced. Originals are the restore point if the second push fails, so they
 * are written before anything else happens and never overwritten.
 */

import type { SqlError } from "effect/unstable/sql";

import { Context, Effect, Layer, Schema } from "effect";
import { SqlClient, SqlSchema } from "effect/unstable/sql";

import { SplicePlan } from "./model.ts";

const uuid = Schema.String.check(Schema.isUUID());

export class SpliceRepository extends Context.Service<SpliceRepository>()(
    "@tinyburg/treasury/domain/SpliceRepository",
    {
        make: Effect.gen(function* () {
            const sql = yield* SqlClient.SqlClient;

            /**
             * Records the pulled saves. `DO NOTHING` on conflict: a replayed pull
             * must not replace the originals the first attempt captured, because
             * those are what a restore would push back.
             */
            const recordPull = (options: {
                readonly tradeId: string;
                readonly proposerSaveId: number;
                readonly counterpartySaveId: number;
                readonly proposerOriginal: string;
                readonly counterpartyOriginal: string;
            }): Effect.Effect<void, SqlError.SqlError, never> =>
                sql`
                INSERT INTO splice_plans (
                    trade_id, proposer_save_id, counterparty_save_id,
                    proposer_original, counterparty_original
                )
                VALUES (
                    ${options.tradeId}, ${options.proposerSaveId}, ${options.counterpartySaveId},
                    ${options.proposerOriginal}, ${options.counterpartyOriginal}
                )
                ON CONFLICT (trade_id) DO NOTHING
            `.pipe(Effect.asVoid);

            const recordSpliced = (options: {
                readonly tradeId: string;
                readonly proposerSpliced: string;
                readonly counterpartySpliced: string;
            }): Effect.Effect<void, SqlError.SqlError, never> =>
                sql`
                UPDATE splice_plans
                SET proposer_spliced = ${options.proposerSpliced},
                    counterparty_spliced = ${options.counterpartySpliced}
                WHERE trade_id = ${options.tradeId}
            `.pipe(Effect.asVoid);

            const byTrade = SqlSchema.findOneOption({
                Request: uuid,
                Result: SplicePlan,
                execute: (tradeId) => sql`SELECT * FROM splice_plans WHERE trade_id = ${tradeId}`,
            });

            return { recordPull, recordSpliced, byTrade };
        }),
    }
) {
    static readonly Default = Layer.effect(SpliceRepository, SpliceRepository.make);
}
