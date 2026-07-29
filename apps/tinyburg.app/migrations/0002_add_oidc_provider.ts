import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql";

export default Effect.flatMap(
    SqlClient.SqlClient,
    (sql) => sql`
        -- OAuth applications registered by developers
        CREATE TABLE IF NOT EXISTS oauth_clients (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            owner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            secret_hash TEXT NOT NULL,                          -- SHA-256 (base64url) of the client secret
            redirect_uris TEXT[] NOT NULL,                      -- Exact-match allow list
            scope TEXT NOT NULL DEFAULT 'openid profile',       -- Space-delimited scopes the client may request
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        -- Pending authorization requests and their (single-use) authorization codes
        CREATE TABLE IF NOT EXISTS oauth_authorization_requests (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            client_id UUID NOT NULL REFERENCES oauth_clients(id) ON DELETE CASCADE,
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            redirect_uri TEXT NOT NULL,
            scope TEXT NOT NULL,
            state TEXT NOT NULL,
            nonce TEXT,
            code_challenge TEXT NOT NULL,                       -- PKCE S256 challenge
            code_hash TEXT UNIQUE,                              -- SHA-256 (base64url) of the code, set on approval
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '10 minutes'
        );

        -- Remembered user approvals, so repeat sign-ins skip the consent screen
        CREATE TABLE IF NOT EXISTS oauth_consents (
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            client_id UUID NOT NULL REFERENCES oauth_clients(id) ON DELETE CASCADE,
            scope TEXT NOT NULL,                                -- Space-delimited scopes the user granted
            granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

            -- One consent record per user and client
            PRIMARY KEY (user_id, client_id)
        );

        -- Indexes for common query patterns
        CREATE INDEX IF NOT EXISTS idx_oauth_clients_owner_user_id ON oauth_clients(owner_user_id);
        CREATE INDEX IF NOT EXISTS idx_oauth_authorization_requests_expires_at ON oauth_authorization_requests(expires_at);
    `
);
