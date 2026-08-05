import type { SqlError } from "effect/unstable/sql";

import { Context, Effect, Layer, Schedule, Schema } from "effect";
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

            const unlink = (options: {
                readonly userId: string;
                readonly playerId: string;
            }): Effect.Effect<void, SqlError.SqlError, never> =>
                sql`
                    DELETE FROM tinytower_accounts
                    WHERE user_id = ${options.userId} AND player_id = ${options.playerId}
                `.pipe(Effect.asVoid);

            yield* sql`DELETE FROM pending_tinytower_accounts WHERE expires_at < NOW()`.pipe(
                Effect.catchCause((cause) =>
                    Effect.logWarning(`failed to purge expired pending tinytower accounts`, cause)
                ),
                Effect.schedule(Schedule.cron("41 * * * *")),
                Effect.forkScoped,
                Effect.asVoid
            );

            return {
                listForUser,
                unlink,
            };
        }),
    }
) {
    static readonly Default = Layer.effect(this, TinyTowerAccountsRepository.make);
}
