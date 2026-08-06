#!/usr/bin/env bash
#
# Seeds the local databases with the rows that make the services able to talk to
# each other. Runs after the services have booted, because each of them creates
# its own tables as part of its layer stack, so there is nothing to seed into
# until they have.
#
# Every statement is idempotent. Re-running this is free, and it is the fastest
# way to repair a database somebody poked at by hand.

set -euo pipefail

: "${AUTHPROXY_CLIENT_ID:?}"
: "${AUTHPROXY_REDIRECT_URI:?}"
: "${SITE_ORIGIN:?}"

# The id is fixed in migration 0003 so that the code can recognize the SPA it
# serves; the seed only widens its redirect list to include the local origin.
FIRST_PARTY_CLIENT_ID="0868602a-9bf8-4e6e-ba20-ccd2b3acc832"

echo "seeding tinyburg_app"
psql --dbname tinyburg_app --quiet --no-psqlrc --set ON_ERROR_STOP=1 \
    --set client_id="$AUTHPROXY_CLIENT_ID" \
    --set redirect_uri="$AUTHPROXY_REDIRECT_URI" \
    --set first_party_id="$FIRST_PARTY_CLIENT_ID" \
    --set site_origin="$SITE_ORIGIN" <<'SQL'
-- Registering the authproxy at the provider is otherwise a hand-run INSERT
-- whose generated id has to be pasted into the proxy's configuration. Seeding
-- it under an id the dev stack already knows removes that step entirely.
--
-- Public client: no secret, PKCE carries the proof, exactly as the deployed
-- proxy is registered.
INSERT INTO oauth_clients (id, owner_user_id, name, secret_hash, scope, redirect_uris)
VALUES (
    :'client_id'::uuid,
    NULL,
    'Authproxy Self Service (local)',
    NULL,
    'openid profile',
    ARRAY[:'redirect_uri']
)
ON CONFLICT (id) DO UPDATE
    SET redirect_uris = EXCLUDED.redirect_uris,
        name = EXCLUDED.name;

-- The first party ships with the production origin only, and redirect uris are
-- exact match, so the local SPA needs its own entry added rather than replaced.
UPDATE oauth_clients
SET redirect_uris = array_append(redirect_uris, :'site_origin')
WHERE id = :'first_party_id'::uuid
  AND NOT (:'site_origin' = ANY (redirect_uris));

-- A user to hang local data off. Signing in with a real provider account
-- creates its own; this one exists so that seeded towers and keys have an
-- owner before anyone has logged in.
INSERT INTO users (id, display_name)
VALUES ('00000000-0000-4000-8000-000000000001'::uuid, 'Dev User')
ON CONFLICT (id) DO NOTHING;
SQL

echo "seeding authproxy"
psql --dbname authproxy --quiet --no-psqlrc --set ON_ERROR_STOP=1 <<'SQL'
-- The two public keys are already seeded by migration 0001, but both are rate
-- limited to 3 requests a minute, which is a wall you hit immediately when
-- iterating. This one carries the same readonly scopes with a limit nobody
-- trips by accident.
INSERT INTO accounts (key, description, rate_limit_limit, rate_limit_window, scopes)
VALUES (
    '00000000-0000-0000-0000-0000000000ff',
    'Local development',
    1000,
    (EXTRACT(EPOCH FROM INTERVAL '1 minute') * 1000)::BIGINT,
    ARRAY[
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
    ]::TEXT[]
)
ON CONFLICT (key) DO UPDATE
    SET scopes = EXCLUDED.scopes,
        rate_limit_limit = EXCLUDED.rate_limit_limit,
        revoked = FALSE;
SQL

echo "seed complete"
