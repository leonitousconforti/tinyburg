import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql";

export default Effect.flatMap(
    SqlClient.SqlClient,
    (sql) => sql`
        ALTER TABLE pending_tinytower_accounts
        ADD COLUMN burn_bot_player_id TEXT NOT NULL,
        ADD COLUMN burn_bot_auth_key TEXT NOT NULL;
    `
);
