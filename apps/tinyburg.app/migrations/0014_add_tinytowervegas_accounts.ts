import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql";

export default Effect.flatMap(
    SqlClient.SqlClient,
    (sql) => sql`
        -- Tiny Tower Vegas accounts, same shape as TinyTower's: a player id, an auth key
        -- that proves the tower is theirs, and the email its cloud save lives
        -- under. Its own tables rather than a game column, because a player id
        -- is unique per game, not across games.
        CREATE TABLE IF NOT EXISTS tinytowervegas_accounts (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            player_id TEXT NOT NULL UNIQUE,
            player_auth_key TEXT NOT NULL,
            player_email TEXT NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        -- Pending Tiny Tower Vegas link requests, with the burn bot that asked Nimblebit
        -- for the code, which is the one that has to present it.
        CREATE TABLE IF NOT EXISTS pending_tinytowervegas_accounts (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            player_id TEXT NOT NULL,
            player_email TEXT NOT NULL,
            burn_bot_player_id TEXT NOT NULL,
            burn_bot_auth_key TEXT NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '1 day'
        );

        CREATE INDEX IF NOT EXISTS idx_tinytowervegas_accounts_user_id ON tinytowervegas_accounts(user_id);
        CREATE INDEX IF NOT EXISTS idx_pending_tinytowervegas_accounts_user_id ON pending_tinytowervegas_accounts(user_id);
        CREATE INDEX IF NOT EXISTS idx_pending_tinytowervegas_accounts_expires_at ON pending_tinytowervegas_accounts(expires_at);

        -- Swept like the others, on its own minute.
        SELECT cron.schedule(
            'purge-expired-pending-tinytowervegas-accounts',
            '41 * * * *',
            $$DELETE FROM pending_tinytowervegas_accounts WHERE expires_at < NOW()$$
        );
    `
);
