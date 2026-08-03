import { Config, Effect } from "effect";
import { SqlClient } from "effect/unstable/sql";

import { FIRST_PARTY_CLIENT_ID, FIRST_PARTY_REDIRECT_PATH } from "../firstParty.ts";

/** Registers the first-party SPA as a public OAuth client: no secret, PKCE only. */

export default Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    const site = yield* Config.string("SITE_URL").pipe(
        Config.withDefault("https://tinyburg.app"),
        Config.map((url) => url.replace(/\/$/, ""))
    );

    // Localhost is registered alongside the deployed origin so the same row
    // serves development; exact matching still applies at authorize time.
    const redirectUris = [
        `${site}${FIRST_PARTY_REDIRECT_PATH}`,
        `http://localhost:3000${FIRST_PARTY_REDIRECT_PATH}`,
        `http://localhost:5173${FIRST_PARTY_REDIRECT_PATH}`,
    ];

    // First-party clients belong to the platform rather than to a developer.
    yield* sql`ALTER TABLE oauth_clients ALTER COLUMN owner_user_id DROP NOT NULL`;

    yield* sql`
        INSERT INTO oauth_clients (id, owner_user_id, name, secret_hash, redirect_uris, scope)
        VALUES (${FIRST_PARTY_CLIENT_ID}, NULL, 'Tinyburg', NULL, ${redirectUris}, 'openid profile towers')
        ON CONFLICT (id) DO UPDATE SET redirect_uris = EXCLUDED.redirect_uris, scope = EXCLUDED.scope
    `;
});
