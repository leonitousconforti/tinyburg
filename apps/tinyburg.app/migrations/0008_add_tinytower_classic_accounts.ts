import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql";

export default Effect.flatMap(
    SqlClient.SqlClient,
    (sql) => sql`
        -- TinyTower Classic is a second game with the same shape as TinyTower:
        -- a player id, an auth key that proves the tower is theirs, and the
        -- email its cloud save lives under. Its own tables rather than a game
        -- column, because a player id is unique per game, not across games,
        -- and the two are linked, listed and swept independently.
        CREATE TABLE IF NOT EXISTS tinytower_classic_accounts (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            player_id TEXT NOT NULL UNIQUE,
            player_auth_key TEXT NOT NULL,
            player_email TEXT NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        -- Pending TinyTower Classic link requests, with the burn bot that
        -- asked Nimblebit for the code, which is the one that has to present it.
        CREATE TABLE IF NOT EXISTS pending_tinytower_classic_accounts (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            player_id TEXT NOT NULL,
            player_email TEXT NOT NULL,
            burn_bot_player_id TEXT NOT NULL,
            burn_bot_auth_key TEXT NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '1 day'
        );

        CREATE INDEX IF NOT EXISTS idx_tinytower_classic_accounts_user_id ON tinytower_classic_accounts(user_id);
        CREATE INDEX IF NOT EXISTS idx_pending_tinytower_classic_accounts_user_id ON pending_tinytower_classic_accounts(user_id);
        CREATE INDEX IF NOT EXISTS idx_pending_tinytower_classic_accounts_expires_at ON pending_tinytower_classic_accounts(expires_at);

        -- Swept like the TinyTower one (0006), on its own minute.
        SELECT cron.schedule(
            'purge-expired-pending-tinytower-classic-accounts',
            '53 * * * *',
            $$DELETE FROM pending_tinytower_classic_accounts WHERE expires_at < NOW()$$
        );
    `
);
