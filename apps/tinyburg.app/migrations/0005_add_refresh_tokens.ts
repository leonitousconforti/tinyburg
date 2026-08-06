import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql";

/**
 * Refresh tokens, so an application can act for a user who is no longer at the
 * keyboard.
 *
 * Until now the provider only issued 15 minute access tokens, which is fine for
 * anything a visitor is watching happen and useless for anything scheduled. A
 * client that wants this asks for the `offline_access` scope and the user
 * approves it on the consent screen like any other.
 *
 * The design is rotation with reuse detection, which is what public clients
 * need: they cannot keep a secret, so a stolen refresh token is otherwise a
 * permanent, silent grant. Every exchange consumes the presented token and
 * issues a replacement in the same `family_id`. If a token that was already
 * consumed shows up again, either the legitimate client replayed it or an
 * attacker did, and there is no way to tell which, so the whole family is
 * revoked and the user has to sign in again. Losing a session beats leaving a
 * thief with an unbounded one.
 */
export default Effect.flatMap(
    SqlClient.SqlClient,
    (sql) => sql`
        CREATE TABLE IF NOT EXISTS refresh_tokens (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

            -- Only ever the hash, matching how authorization codes and session
            -- cookies are stored: a copy of this table grants nothing.
            token_hash TEXT NOT NULL UNIQUE,

            client_id UUID NOT NULL REFERENCES oauth_clients(id) ON DELETE CASCADE,
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

            -- The scopes this token may mint access tokens for. A refresh may
            -- narrow this but never widen it.
            scope TEXT NOT NULL,

            -- Every token descended from one authorization shares a family.
            -- Reuse of any member revokes all of them.
            family_id UUID NOT NULL,

            issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            expires_at TIMESTAMPTZ NOT NULL,

            -- Set when exchanged. A second presentation of a consumed token is
            -- the reuse signal.
            consumed_at TIMESTAMPTZ,

            -- Set when the family was torn down, by reuse detection or by an
            -- explicit revocation.
            revoked_at TIMESTAMPTZ
        );

        CREATE INDEX IF NOT EXISTS idx_refresh_tokens_family ON refresh_tokens(family_id);
        CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
        CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
    `
);
