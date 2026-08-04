import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql";

export default Effect.flatMap(
    SqlClient.SqlClient,
    (sql) => sql`
        -- Users table for storing user accounts
        CREATE TABLE IF NOT EXISTS users (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            last_login_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            display_name TEXT NOT NULL,
            avatar_url TEXT
        );

        -- Browser sessions for the first-party app. The cookie holds the id and
        -- nothing else, so signing out is a delete rather than a token expiry.
        CREATE TABLE IF NOT EXISTS sessions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            expires_at TIMESTAMPTZ NOT NULL,

            -- The access token this session presents to the bearer-only api,
            -- minted on demand and reused until it expires. Server side only.
            access_token TEXT,
            access_token_expires_at TIMESTAMPTZ
        );

        -- OAuth accounts table for linking OAuth providers to users
        CREATE TABLE IF NOT EXISTS oauth_accounts (
            user_id UUID NOT NULL REFERENCES users(id),
            provider TEXT NOT NULL CHECK (provider IN ('google', 'discord')),
            provider_account_id TEXT NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

            -- Each provider account can only be linked once
            PRIMARY KEY (provider, provider_account_id)
        );

        -- Revoked tokens table for storing JWT IDs of revoked tokens
        CREATE TABLE IF NOT EXISTS revoked_tokens (
            jti TEXT PRIMARY KEY,
            expires_at TIMESTAMPTZ NOT NULL
        );

        -- TinyTower accounts linked to users
        CREATE TABLE IF NOT EXISTS tinytower_accounts (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            player_id TEXT NOT NULL UNIQUE,
            player_auth_key TEXT NOT NULL,
            player_email TEXT NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        -- Helper function to add one day interval because generated columns need to be immutable
        CREATE OR REPLACE FUNCTION add_one_day(ts TIMESTAMPTZ)
        RETURNS TIMESTAMPTZ AS $$
            SELECT ts + INTERVAL '1 day'
        $$ LANGUAGE SQL IMMUTABLE;

        -- Pending TinyTower link requests
        CREATE TABLE IF NOT EXISTS pending_tinytower_accounts (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            player_id TEXT NOT NULL,
            player_email TEXT NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            expires_at TIMESTAMPTZ NOT NULL GENERATED ALWAYS AS (add_one_day(created_at)) STORED
        );

        -- Indexes for common query patterns
        CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
        CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
        CREATE INDEX IF NOT EXISTS idx_oauth_accounts_user_id ON oauth_accounts(user_id);
        CREATE INDEX IF NOT EXISTS idx_oauth_accounts_provider ON oauth_accounts(provider);
        CREATE INDEX IF NOT EXISTS idx_revoked_tokens_expires_at ON revoked_tokens(expires_at);
        CREATE INDEX IF NOT EXISTS idx_tinytower_accounts_user_id ON tinytower_accounts(user_id);
        CREATE INDEX IF NOT EXISTS idx_tinytower_accounts_player_id ON tinytower_accounts(player_id);
        CREATE INDEX IF NOT EXISTS idx_pending_tinytower_accounts_user_id ON pending_tinytower_accounts(user_id);
    `
);
