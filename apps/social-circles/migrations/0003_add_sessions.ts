import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql";

/**
 * Browser sessions for the self-service dashboard.
 *
 * The study is an OIDC relying party of tinyburg.app, so a session is the
 * result of a completed sign-in round trip. It carries the provider's access
 * token because the dashboard has to ask tinyburg.app which TinyTower accounts
 * the visitor has linked, and that question can only be answered on the
 * visitor's behalf.
 *
 * The token is stored encrypted, and it is short-lived; the long-lived
 * `tower_grants` row is what the background crawl uses. See `services/towers.ts`
 * for why the two are separate.
 */
export default Effect.flatMap(
    SqlClient.SqlClient,
    (sql) => sql`
        CREATE TABLE IF NOT EXISTS sessions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            -- Only ever the hash. A leaked table is not a set of live cookies.
            token_hash TEXT NOT NULL UNIQUE,
            -- The Tinyburg user id from the id token.
            sub UUID NOT NULL,
            display_name TEXT,
            avatar_url TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            expires_at TIMESTAMPTZ NOT NULL,
            access_token_ciphertext TEXT,
            access_token_expires_at TIMESTAMPTZ
        );

        CREATE INDEX IF NOT EXISTS idx_sessions_sub ON sessions(sub);
        CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
    `
);
