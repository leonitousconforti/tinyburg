import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql";

export default Effect.flatMap(
    SqlClient.SqlClient,
    (sql) => sql`
        -- A pending link is a /link that was started and never finished: the
        -- row holds the PKCE verifier and the interaction token the callback
        -- would have used. Nothing reads one past its expiry, so removing them
        -- is housekeeping, but leaving them is a slow leak of unused secrets.
        --
        -- Scheduled inside the database rather than from a fiber in the bot,
        -- which matters more here than elsewhere: the bot is off by default in
        -- development and its gateway half can be down for other reasons.
        CREATE EXTENSION IF NOT EXISTS pg_cron;

        SELECT cron.schedule(
            'purge-expired-pending-links',
            '17 * * * *',
            $$DELETE FROM discord_pending_links WHERE expires_at < NOW()$$
        );
    `
);
