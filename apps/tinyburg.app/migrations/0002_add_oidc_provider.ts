import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql";

export default Effect.flatMap(
    SqlClient.SqlClient,
    (sql) => sql`
        -- OAuth applications registered by developers. The first party has no
        -- owner to speak of, so the column is nullable and only a developer's
        -- own apps go when their account does.
        CREATE TABLE IF NOT EXISTS oauth_clients (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            owner_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            secret_hash TEXT,                                   -- SHA-256 (base64url) of the client secret
            scope TEXT NOT NULL DEFAULT 'openid profile',       -- Space-delimited scopes the client may request
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

            -- Exact-match allow list. A client with an empty one could never
            -- complete an authorization, so it is refused at registration
            -- rather than left to fail on every attempt.
            redirect_uris TEXT[] NOT NULL CHECK (cardinality(redirect_uris) > 0)
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

        -- Indexes for common query patterns
        CREATE INDEX IF NOT EXISTS idx_oauth_clients_owner_user_id ON oauth_clients(owner_user_id);
        CREATE INDEX IF NOT EXISTS idx_oauth_authorization_requests_expires_at ON oauth_authorization_requests(expires_at);
    `
);
