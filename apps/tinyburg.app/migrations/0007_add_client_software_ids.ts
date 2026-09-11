import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql";

export default Effect.flatMap(
    SqlClient.SqlClient,
    (sql) => sql`
        -- What makes dynamic client registration (RFC 7591) idempotent.
        --
        -- \`software_id\` is the RFC's identifier for a piece of software rather
        -- than one installation of it: a constant in the client's source, the
        -- same in every deployment of it. Registering twice under one is an
        -- update rather than a second client, so a service can register itself
        -- on every boot and be handed the same \`client_id\` back, and needs to
        -- remember nothing between runs.
        --
        -- Unique so that identity cannot fork, and nullable because a client
        -- registered by hand or created by migration has no software behind it
        -- to name.
        ALTER TABLE oauth_clients ADD COLUMN IF NOT EXISTS software_id TEXT;

        CREATE UNIQUE INDEX IF NOT EXISTS idx_oauth_clients_software_id
            ON oauth_clients(software_id) WHERE software_id IS NOT NULL;
    `
);
