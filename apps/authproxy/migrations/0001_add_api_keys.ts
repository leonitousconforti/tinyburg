import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql";

import { NONE_API_KEY, READONLY_API_KEY } from "../domain/model.ts";
import { READONLY_KEY_SCOPES } from "../domain/scopes.ts";

/**
 * The readonly key carries one `:read` branch per area, which grants every
 * read leaf beneath it. Rendered as a literal rather than bound: a
 * multi-statement migration cannot take bind parameters, and the names are
 * `[a-z_:]` by construction, so there is nothing to escape.
 */
const readonlyScopes = READONLY_KEY_SCOPES.map((name) => `'${name}'`).join(", ");

export default Effect.flatMap(
    SqlClient.SqlClient,
    (sql) => sql`
        CREATE TABLE IF NOT EXISTS api_keys (
            id SERIAL PRIMARY KEY,                                  -- Auto incrementing ID
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),          -- Timestamp of creation
            last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),        -- Timestamp of last use
            key UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),     -- Unique API key
            revoked BOOLEAN NOT NULL DEFAULT FALSE,                 -- Revocation status
            scopes TEXT[] NOT NULL,                                 -- Permitted scopes, by name (see domain/scopes.ts)
            rate_limit_limit INT NOT NULL,                          -- Rate limit count
            rate_limit_window BIGINT NOT NULL,                      -- Rate limit time window in milliseconds
            description TEXT                                        -- Optional description
        );

        -- Create an index on the key column for faster lookups
        CREATE INDEX IF NOT EXISTS idx_api_keys_key ON api_keys(key);

        -- "None" API key with no permitted scopes
        INSERT INTO api_keys (key, description, rate_limit_limit, rate_limit_window, scopes)
        VALUES (${sql.literal(`'${NONE_API_KEY}'`)}, 'Default None Key', 3, (EXTRACT(EPOCH FROM INTERVAL '1 minute') * 1000)::BIGINT, ARRAY[]::TEXT[])
        ON CONFLICT (key) DO NOTHING;

        -- "Default" API key with read-only scopes
        INSERT INTO api_keys (key, description, rate_limit_limit, rate_limit_window, scopes)
        VALUES (${sql.literal(`'${READONLY_API_KEY}'`)}, 'Default Readonly Key', 3, (EXTRACT(EPOCH FROM INTERVAL '1 minute') * 1000)::BIGINT, ARRAY[${sql.literal(readonlyScopes)}]::TEXT[])
        ON CONFLICT (key) DO NOTHING;
    `
);
