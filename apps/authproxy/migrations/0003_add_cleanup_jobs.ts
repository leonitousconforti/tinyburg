import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql";

export default Effect.flatMap(
    SqlClient.SqlClient,
    (sql) => sql`
        -- An expired session is already refused on presentation, so this is
        -- about keeping the table bounded rather than about correctness. It
        -- still matters: the row holds the hash of a bearer token and, once
        -- elevation has run, the verdict of an admin password check.
        --
        -- Scheduled inside the database rather than from a fiber in the proxy,
        -- so it keeps running whatever the proxy is doing.
        CREATE EXTENSION IF NOT EXISTS pg_cron;

        SELECT cron.schedule(
            'purge-expired-sessions',
            '43 * * * *',
            $$DELETE FROM sessions WHERE expires_at < NOW()$$
        );
    `
);
