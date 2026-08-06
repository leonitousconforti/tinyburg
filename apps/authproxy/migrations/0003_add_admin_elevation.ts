import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql";

export default Effect.flatMap(
    SqlClient.SqlClient,
    (sql) => sql`
        -- Step-up admin elevation: a session becomes admin until this moment
        -- after presenting the admin password while holding an allowlisted
        -- tower. NULL means never elevated.
        ALTER TABLE sessions ADD COLUMN IF NOT EXISTS admin_until TIMESTAMPTZ;
    `
);
