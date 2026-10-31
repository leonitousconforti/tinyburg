import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql";

/**
 * Refresh tokens for the tinyburg.app grant a trader gives the treasury. The
 * escrow legs run long after the visitor has closed the tab - the
 * counterparty may accept hours later - so a user-present access token is
 * not enough. Tokens are stored encrypted; this table holds ciphertext only.
 */
export default Effect.flatMap(
    SqlClient.SqlClient,
    (sql) => sql`
        CREATE TABLE IF NOT EXISTS grants (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tinyburg_user_id UUID NOT NULL UNIQUE,
            refresh_token_ciphertext TEXT NOT NULL,
            scope TEXT NOT NULL,
            issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            -- Set when the provider rejects the token, so the sagas stop
            -- retrying a grant the user revoked upstream.
            invalidated_at TIMESTAMPTZ
        );
    `
);
