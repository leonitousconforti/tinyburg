import { Effect } from "effect";
import { SqlClient } from "effect/sql";

export default Effect.flatMap(SqlClient.SqlClient, (sql) =>
    Effect.all(
        [
            sql`
        -- The OpenID nonce of a '/link' in flight, which the id token has to
        -- carry back for the callback to accept it. Kept here for the same
        -- reason the PKCE verifier is: the browser that comes back carries no
        -- cookie of ours to hold it.
        --
        -- Links already in flight were started against the provider's old
        -- endpoints and could not finish anyway, so they are dropped rather
        -- than given a placeholder.
        DELETE FROM discord_pending_links;
        `,
            sql`
        ALTER TABLE discord_pending_links ADD COLUMN nonce TEXT NOT NULL;
        `,
        ],
        { discard: true }
    )
);
