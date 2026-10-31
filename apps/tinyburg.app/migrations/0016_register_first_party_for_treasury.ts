import { Effect } from "effect";
import { SqlClient } from "effect/sql";

import { DevelopersRepository } from "../domain/developers.ts";

export default Effect.flatMap(
    SqlClient.SqlClient,
    (sql) => sql`
        -- The first party now holds access tokens of its own, minted by
        -- /auth/token for the treasury behind /v1/treasury, which reads no
        -- session cookie. The token endpoint grants a client only what it is
        -- registered for, so the first party is registered for the treasury's
        -- scope area too.
        --
        -- Its redirect uri is the one /auth/token matches, and is never
        -- visited. The server derives it from SITE_URL instead of reading it
        -- from here (server/oauthLive.ts), so that every deployment matches its
        -- own origin; the row records production's.
        UPDATE oauth_clients
        SET scope = 'openid profile tinytower tinytowerclassic treasury',
            redirect_uris = ARRAY['https://tinyburg.app/auth/token']
        WHERE id = ${DevelopersRepository.FIRST_PARTY_CLIENT_ID}
    `
);
