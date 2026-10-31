import { Effect } from "effect";
import { SqlClient } from "effect/sql";

/**
 * The provider's grants move to `@yielded/auth`'s OAuth server.
 *
 * One row per grant now carries everything the provider kept across three
 * tables and a session column: the pending authorization, its code, and the
 * refresh family it became. Access and refresh tokens are no longer stored at
 * all; they are sealed credentials naming a grant and its current version, so
 * revoking or rotating the grant is what ends them.
 *
 * The two tables are `@yielded/auth-persistence@0.1.0-beta.47`'s, copied
 * rather than read from `OAuthServerPersistence.migrations` at run time, so
 * that an applied migration never changes underneath the database.
 *
 * Everything the old provider stored goes in the same step. Its tokens mean
 * nothing to the new server, so every grant ends here and every client signs
 * its users in again.
 */
export default Effect.flatMap(SqlClient.SqlClient, (sql) =>
    Effect.all(
        [
            sql`
        CREATE TABLE yielded_oauth_server (
          namespace TEXT NOT NULL,
          grant_id TEXT NOT NULL,
          version TEXT NOT NULL,
          revoked INTEGER NOT NULL DEFAULT 0,
          expires_at_millis BIGINT NOT NULL,
          payload TEXT NOT NULL,
          PRIMARY KEY (namespace, grant_id)
        );
        `,
            sql`
        CREATE TABLE yielded_oauth_client_assertion (
          namespace TEXT NOT NULL,
          assertion_id TEXT NOT NULL,
          expires_at_millis BIGINT NOT NULL,
          PRIMARY KEY (namespace, assertion_id)
        );
        `,
            sql`
        -- Swept like everything else that expires (0006): an expired grant is
        -- already refused on read, and the library allows deleting a row
        -- once its expiry has passed, so this only keeps the tables bounded.
        CREATE INDEX IF NOT EXISTS idx_yielded_oauth_server_expires_at
            ON yielded_oauth_server(expires_at_millis);
        `,
            sql`
        CREATE INDEX IF NOT EXISTS idx_yielded_oauth_client_assertion_expires_at
            ON yielded_oauth_client_assertion(expires_at_millis);
        `,
            sql`
        SELECT cron.schedule(
            'purge-expired-oauth-grants',
            '37 * * * *',
            $$DELETE FROM yielded_oauth_server WHERE expires_at_millis <= (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT$$
        );
        `,
            sql`
        SELECT cron.schedule(
            'purge-expired-oauth-client-assertions',
            '43 * * * *',
            $$DELETE FROM yielded_oauth_client_assertion WHERE expires_at_millis <= (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT$$
        );
        `,
            sql`
        -- The old provider's storage: authorization requests and their codes,
        -- refresh token families, the revoked access token list, and the
        -- access token each session minted for the first-party app, which now
        -- calls the api with its session cookie instead.
        SELECT cron.unschedule('purge-expired-revoked-tokens');
        `,
            sql`
        SELECT cron.unschedule('purge-expired-authorization-requests');
        `,
            sql`
        SELECT cron.unschedule('purge-expired-refresh-tokens');
        `,
            sql`
        DROP TABLE IF EXISTS refresh_tokens, oauth_authorization_requests, revoked_tokens;
        `,
            sql`
        ALTER TABLE sessions
            DROP COLUMN IF EXISTS access_token,
            DROP COLUMN IF EXISTS access_token_expires_at,
            DROP COLUMN IF EXISTS access_token_jti;
        `,
        ],
        { discard: true }
    )
);
