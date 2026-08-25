import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql";

export default Effect.flatMap(
    SqlClient.SqlClient,
    (sql) => sql`
        -- An expired session is already refused on presentation, so this keeps
        -- the table bounded rather than deciding anything. Scheduled inside the
        -- database rather than from a fiber in the study.
        --
        -- Only the session sweep moves here. The crawl dispatch and the view
        -- refresh stay on ClusterCron: they run application code, not a
        -- statement, and the cluster is what gives them exactly-once
        -- scheduling.
        CREATE EXTENSION IF NOT EXISTS pg_cron;

        SELECT cron.schedule(
            'purge-expired-sessions',
            '37 * * * *',
            $$DELETE FROM sessions WHERE expires_at < NOW()$$
        );
    `
);
