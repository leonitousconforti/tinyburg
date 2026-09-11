import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql";

export default Effect.flatMap(
    SqlClient.SqlClient,
    (sql) => sql`
        -- Expired rows are already invisible to every read path, which filters
        -- on expires_at, so purging them is only about keeping the tables
        -- bounded. pg_cron does that on a schedule inside the database rather
        -- than from a fiber in the application, which means it keeps running
        -- whatever the app is doing and does not double up when there is more
        -- than one replica of it.
        --
        -- Each table is indexed on expires_at, so the deletes stay cheap as
        -- they grow, and the times are staggered so the five never contend
        -- with each other.
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
        -- runs on a much tighter loop than the others.
        SELECT cron.schedule(
            'purge-expired-authorization-requests',
            '*/15 * * * *',
            $$DELETE FROM oauth_authorization_requests WHERE expires_at < NOW()$$
        );

        -- Refresh tokens are kept a while past expiry: a replayed token is only
        -- recognisable as reuse while its row still exists, so deleting on the
        -- stroke of expiry would turn a detectable attack into a silent
        -- "unknown token".
        SELECT cron.schedule(
            'purge-expired-refresh-tokens',
            '47 3 * * *',
            $$DELETE FROM refresh_tokens WHERE expires_at < NOW() - INTERVAL '30 days'$$
        );
    `
);
