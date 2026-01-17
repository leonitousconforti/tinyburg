import { SqlClient } from "@effect/sql";
import { Effect } from "effect";

export default Effect.flatMap(
    SqlClient.SqlClient,
    (sql) => sql`
        CREATE TABLE IF NOT EXISTS accounts (
            id SERIAL PRIMARY KEY,                                  -- Auto incrementing ID
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),          -- Timestamp of creation
            last_used_at TIMESTAMPTZ NOT NULL,                      -- Timestamp of last use
            key UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),     -- Unique account key
            revoked BOOLEAN NOT NULL DEFAULT FALSE,                 -- Revocation status
            scopes TEXT[] NOT NULL,                                 -- Permitted scopes
            rate_limit_limit INT NOT NULL,                          -- Rate limit count
            rate_limit_window BIGINT NOT NULL,                      -- Rate limit time window in milliseconds
            description TEXT                                        -- Optional description
        );

        -- "None" account with no permitted scopes
        INSERT INTO accounts (key, description, rate_limit_limit, rate_limit_window, scopes)
        VALUES ('00000000-0000-0000-0000-000000000001', 'Default None Account', 3, (EXTRACT(EPOCH FROM INTERVAL '1 minute') * 1000)::BIGINT, ARRAY[]::TEXT[])
        ON CONFLICT (key) DO NOTHING;

        -- "Default" account with read-only scopes
        INSERT INTO accounts (key, description, rate_limit_limit, rate_limit_window, scopes)
        VALUES ('00000000-0000-0000-0000-000000000002', 'Default Readonly Account', 3, (EXTRACT(EPOCH FROM INTERVAL '1 minute') * 1000)::BIGINT, ARRAY[
            '/player_details/tt/',
            '/sync/pull/tt/',
            '/sync/current_version/tt/',
            '/sync/pull_snapshot/tt/',
            '/sync/current_snapshots/tt/',
            '/raffle/entered_current/tt/',
            '/get_gifts/tt/',
            '/friend/pull_meta/tt/',
            '/friend/pull_game/tt/',
            '/sync/current_player_snapshots/tt/',
            '/get_visits/tt/'
        ]::TEXT[])
        ON CONFLICT (key) DO NOTHING;
    `
);
