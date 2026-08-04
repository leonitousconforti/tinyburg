import { Context, Effect, Layer, Schema } from "effect";
import { SqlClient, SqlSchema } from "effect/unstable/sql";

import { TinyTowerAccount } from "./models.ts";

export class TinyTowerAccountsRepository extends Context.Service<TinyTowerAccountsRepository>()(
    "@tinyburg/tinyburg.app/domain/TinyTowerAccountsRepository",
    {
        make: Effect.gen(function* () {
            const sql = yield* SqlClient.SqlClient;

            const listForUser = SqlSchema.findAll({
                Request: Schema.String.check(Schema.isUUID()),
                Result: TinyTowerAccount,
                execute: (userId) => sql`
                    SELECT * FROM tinytower_accounts
                    WHERE user_id = ${userId}
                    ORDER BY created_at DESC
                `,
            });

            const unlink = (options: { userId: string; playerId: string }) =>
                sql`
                    DELETE FROM tinytower_accounts
                    WHERE user_id = ${options.userId} AND player_id = ${options.playerId}
                `.pipe(Effect.asVoid);

            return {
                listForUser,
                unlink,
            };
        }),
    }
) {
    static readonly Default = Layer.effect(this, TinyTowerAccountsRepository.make);
}
