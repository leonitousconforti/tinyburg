import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql";

export default Effect.flatMap(
    SqlClient.SqlClient,
    (sql) => sql`
        -- Public clients (SPAs, native apps) register without a secret and
        -- authenticate with PKCE alone; a NULL secret_hash marks them.
        ALTER TABLE oauth_clients ALTER COLUMN secret_hash DROP NOT NULL;

        -- RFC 7009 revocation denylist: a revoked token's jti is held until
        -- the token would have expired anyway, keeping the table bounded.
        CREATE TABLE IF NOT EXISTS revoked_tokens (
            jti TEXT PRIMARY KEY,
            expires_at TIMESTAMPTZ NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_revoked_tokens_expires_at ON revoked_tokens(expires_at);
    `
);
