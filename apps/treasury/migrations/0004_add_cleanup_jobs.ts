import { Effect } from "effect";
import { SqlClient } from "effect/sql";

export default Effect.flatMap(SqlClient.SqlClient, (sql) =>
    Effect.all(
        [
            sql`
        -- Only the no-deposit expiry moves here: it is a single statement, and
        -- a trade nothing has been deposited into needs no compensation. A
        -- trade with a deposit needs application code (a refund saga), so its
        -- expiry stays on ClusterCron.
        CREATE EXTENSION IF NOT EXISTS pg_cron;
        `,
            sql`
        SELECT cron.schedule(
            'expire-untouched-trades',
            '13 * * * *',
            $$
            UPDATE trades SET state = 'expired', updated_at = NOW()
            WHERE expires_at < NOW()
              AND state IN ('proposed', 'accepted', 'awaiting_confirmation')
              AND NOT EXISTS (
                  SELECT 1 FROM trade_legs
                  WHERE trade_legs.trade_id = trades.id AND trade_legs.state <> 'pending'
              )
            $$
        );
        `,
        ],
        { discard: true }
    )
);
