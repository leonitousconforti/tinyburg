import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql";

import { DevelopersRepository } from "../domain/developers.ts";

export default Effect.flatMap(
    SqlClient.SqlClient,
    (sql) => sql`
        -- The first party is the SPA this site serves. It is an oauth client
        -- like any other so the tokens it holds carry a real client_id, but
        -- the code has to recognize it (/oauth/authorize skips the consent
        -- screen for it, and the session middleware mints access tokens in its
        -- name), so the row is seeded under the fixed id interpolated from
        -- DevelopersRepository.FIRST_PARTY_CLIENT_ID rather than generated.
        --
        -- No owner, because the first party belongs to the site and must not
        -- vanish with any account. No secret, because it lives in browsers,
        -- which keep nothing safe: it is a public client and authenticates
        -- with PKCE alone. The redirect list refuses to be empty, so it
        -- carries the site origin, though the app's own sign-in rides the
        -- provider session cookie rather than this flow.
        INSERT INTO oauth_clients (id, owner_user_id, name, secret_hash, scope, redirect_uris)
        VALUES (
            ${DevelopersRepository.FIRST_PARTY_CLIENT_ID},
            NULL,
            'Tinyburg',
            NULL,
            'openid profile tinytower tinytowerclassic',
            ARRAY['https://tinyburg.app/']
        )
        ON CONFLICT (id) DO NOTHING
    `
);
