import { SqlClient } from "@effect/sql";
import { Effect } from "effect";

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

        -- OAuth accounts table for linking OAuth providers to users
        CREATE TABLE IF NOT EXISTS oauth_accounts (
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            provider TEXT NOT NULL CHECK (provider IN ('google', 'discord')),
            provider_account_id TEXT NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

            -- Each provider account can only be linked once
            PRIMARY KEY (provider, provider_account_id)
        );

        -- Sessions table for managing user sessions
        CREATE TABLE IF NOT EXISTS sessions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            expires_at TIMESTAMPTZ NOT NULL
        );

        -- Indexes for common query patterns
        CREATE INDEX IF NOT EXISTS idx_oauth_accounts_user_id ON oauth_accounts(user_id);
        CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
    `
);
