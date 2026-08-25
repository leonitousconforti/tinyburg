import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql";

export default Effect.flatMap(
    SqlClient.SqlClient,
    (sql) => sql`
        -- Which Tinyburg account (the OIDC subject) provisioned a key through
        -- the self-service dashboard. NULL for keys handed out by the admin.
        ALTER TABLE accounts ADD COLUMN IF NOT EXISTS owner_sub UUID;
        CREATE INDEX IF NOT EXISTS idx_accounts_owner_sub ON accounts(owner_sub) WHERE owner_sub IS NOT NULL;

        -- Self-service dashboard sessions, created by "sign in with Tinyburg".
        -- Only a hash of the cookie value is stored.
        CREATE TABLE IF NOT EXISTS sessions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            token_hash TEXT UNIQUE NOT NULL,
            sub UUID NOT NULL,
            display_name TEXT,
            avatar_url TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            expires_at TIMESTAMPTZ NOT NULL,
            admin_until TIMESTAMPTZ,
            elevation_password_ok BOOLEAN,
            elevation_requested_at TIMESTAMPTZ
        );
    `
);
