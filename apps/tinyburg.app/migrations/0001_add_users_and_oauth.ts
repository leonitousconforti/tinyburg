import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql";

export default Effect.flatMap(
    SqlClient.SqlClient,
    (sql) => sql`
        -- Users table for storing user accounts. The display name and avatar
        -- are seeded from whichever provider created the account and are the
        -- user's from then on, so linking a second provider later cannot
        -- rename them.
        CREATE TABLE IF NOT EXISTS users (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            last_login_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            display_name TEXT NOT NULL,
            avatar_url TEXT
        );

        -- Browser sessions for the first-party app. The cookie carries a secret
        -- the database never stores, only its hash, so a copy of this table
        -- impersonates nobody. The id is the public handle instead: it is what
        -- the session list renders and what signing out one session names.
        CREATE TABLE IF NOT EXISTS sessions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            token_hash TEXT NOT NULL UNIQUE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            expires_at TIMESTAMPTZ NOT NULL,

            -- What the session list shows, so a visitor can tell one row from
            -- another before ending it.
            last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            user_agent TEXT,
            ip INET,

            -- The access token this session presents to the bearer-only api,
            -- minted on demand and reused until it expires. Server side only.
            -- Its jti rides along so ending a session can revoke the token the
            -- session already handed out instead of waiting for it to lapse.
            access_token TEXT,
            access_token_expires_at TIMESTAMPTZ,
            access_token_jti TEXT
        );

        -- OAuth accounts linked to users. A user may link as many as they like;
        -- the primary key only stops one provider account from being claimed by
        -- two users.
        CREATE TABLE IF NOT EXISTS oauth_accounts (
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            provider TEXT NOT NULL CHECK (provider IN ('google', 'discord')),
            provider_account_id TEXT NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            last_login_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

            -- The provider's view of the account. It lives here rather than on
            -- users because each linked provider has its own, and the connected
            -- accounts screen names them one by one.
            email TEXT,
            display_name TEXT,
            avatar_url TEXT,

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

        -- Pending TinyTower link requests
        CREATE TABLE IF NOT EXISTS pending_tinytower_accounts (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            player_id TEXT NOT NULL,
            player_email TEXT NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '1 day'
        );

        -- Indexes for common query patterns. Unique constraints already carry
        -- an index of their own, so sessions(token_hash), oauth_accounts'
        -- primary key and tinytower_accounts(player_id) need no help here.
        CREATE INDEX IF NOT EXISTS idx_sessions_user_id_last_seen_at ON sessions(user_id, last_seen_at DESC);
        CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
        CREATE INDEX IF NOT EXISTS idx_oauth_accounts_user_id ON oauth_accounts(user_id);
        CREATE INDEX IF NOT EXISTS idx_revoked_tokens_expires_at ON revoked_tokens(expires_at);
        CREATE INDEX IF NOT EXISTS idx_tinytower_accounts_user_id ON tinytower_accounts(user_id);
        CREATE INDEX IF NOT EXISTS idx_pending_tinytower_accounts_user_id ON pending_tinytower_accounts(user_id);
        CREATE INDEX IF NOT EXISTS idx_pending_tinytower_accounts_expires_at ON pending_tinytower_accounts(expires_at);
    `
);
