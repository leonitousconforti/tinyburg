import { Effect } from "effect";
import { SqlClient } from "effect/sql";

/**
 * When each splice push was first attempted. A push whose answer was lost
 * (a timeout, a crash before the journal entry) may or may not have landed,
 * and a moved save version cannot tell the treasury's own push apart from
 * the player syncing. The marker is written before the push goes out, so a
 * moved version with no marker is a plain conflict (nothing of the
 * treasury's landed), while a moved version with one is a trade for manual
 * review rather than an automatic restore.
 */
export default Effect.flatMap(SqlClient.SqlClient, (sql) =>
    Effect.all(
        [
            sql`
        ALTER TABLE splice_plans
            ADD COLUMN IF NOT EXISTS proposer_push_started_at TIMESTAMPTZ,
            ADD COLUMN IF NOT EXISTS counterparty_push_started_at TIMESTAMPTZ;
        `,
        ],
        { discard: true }
    )
);
