import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql";

export default Effect.flatMap(
    SqlClient.SqlClient,
    (sql) => sql`
        -- Expired rows are already invisible to every read path, which filters
        -- on expires_at, so purging them is only about keeping the tables
        -- bounded. pg_cron does that on a schedule inside the database rather
        -- than riding along on a request. Each table is indexed on expires_at,
        -- so the deletes stay cheap as they grow, and the times are staggered
        -- so the four never contend with each other.
        CREATE EXTENSION IF NOT EXISTS pg_cron;

        SELECT cron.schedule(
            'purge-expired-sessions',
            '17 * * * *',
            $$DELETE FROM sessions WHERE expires_at < NOW()$$
        );

        SELECT cron.schedule(
            'purge-expired-revoked-tokens',
            '23 * * * *',
            $$DELETE FROM revoked_tokens WHERE expires_at < NOW()$$
        );

        SELECT cron.schedule(
            'purge-expired-pending-tinytower-accounts',
            '41 * * * *',
            $$DELETE FROM pending_tinytower_accounts WHERE expires_at < NOW()$$
        );

        -- Authorization requests live ten minutes and codes five, so this one
        -- runs on a much tighter loop than the other three.
        SELECT cron.schedule(
            'purge-expired-authorization-requests',
            '*/15 * * * *',
            $$DELETE FROM oauth_authorization_requests WHERE expires_at < NOW()$$
        );
    `
);
