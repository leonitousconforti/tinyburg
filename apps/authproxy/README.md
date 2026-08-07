# @tinyburg/authproxy

This authproxy service will authenticate your requests before forwarding them to Nimblebit's servers.

## Public API keys

Two keys are provided to the public for testing:

1. `00000000-0000-0000-0000-000000000001` is a none account and will permit no scopes
2. `00000000-0000-0000-0000-000000000002` is a readonly account and will permit access to all readonly scopes

If you would like access to other scopes, don't hesitate to reach out for a personal api key.

## Rate Limiting

Default rate limit is 3 requests within 1 minute. The public API keys above are rate limited by ip address, all other authenticated requests are rate limited by api key. If you find that you need an increased rate limit, don't hesitate to reach out for a personal API key.

## Self Service

The proxy serves a self-service dashboard (a foldkit SPA in `client/`, built to `dist/client` and served by the same Effect http server). Visitors "sign in with Tinyburg": the proxy is an OIDC relying party of tinyburg.app's provider, using the authorization code flow with PKCE as a public client. Signed-in users can provision keys over the read-only scope catalog (`shared/scopes.ts`), see the keys they hold, rotate a key in place, revoke/re-enable, and delete. Self-service keys start at 10 requests a minute and are capped at 5 keys per account; write scopes stay hand-granted through the admin API.

Build the SPA before starting the server:

```sh
pnpm --filter @tinyburg/authproxy build
node index.ts
```

### Configuration

| Env var                           | Meaning                                                                                       |
| --------------------------------- | --------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                    | Postgres connection string (required)                                                         |
| `ADMIN_USERNAME`/`ADMIN_PASSWORD` | Basic-auth credentials for the admin accounts API (required)                                  |
| `NODE_ENV`                        | Set `development` for plain http cookies; anything else means Secure + `__Host-`              |
| `TINYBURG_ISSUER`                 | The OIDC provider, default `https://tinyburg.app`                                             |
| `TINYBURG_CLIENT_ID`              | The oauth client registered at the provider (default `unconfigured`, boots but sign-in fails) |
| `TINYBURG_CLIENT_SECRET`          | Optional; set it when the client is registered confidential                                   |
| `TINYBURG_REDIRECT_URI`           | `<this host>/auth/callback`, default `http://localhost:3000/auth/callback`                    |
| `ADMIN_PLAYER_IDS`                | Comma-separated TinyTower player ids whose owners may step up to admin                        |
| `PORT`/`HOST`                     | Listen address, default `3000`/`0.0.0.0`                                                      |

### Registering the client at tinyburg.app

The provider stores oauth clients in its `oauth_clients` table and has no registration API yet, so registering the authproxy is one insert against the tinyburg.app database. `towers:read` is what lets the elevation round trip ask - with the visitor's consent - which towers they have linked. Confidential is recommended: `secret_hash` is the SHA-256 of the secret, base64url encoded; leave it NULL for a public client (PKCE carries the proof either way, and redirect uris are exact-match):

```sql
INSERT INTO oauth_clients (name, secret_hash, scope, redirect_uris)
VALUES ('Authproxy Self Service', '<base64url-sha256-of-secret>', 'openid profile towers:read', ARRAY['https://<authproxy-host>/auth/callback'])
RETURNING id;   -- becomes TINYBURG_CLIENT_ID
```

For local development add `'http://localhost:<port>/auth/callback'` to `redirect_uris` (localhost is the only non-https redirect the provider accepts).

### Admin

`/admin` in the dashboard manages every key the proxy has issued: grant write scopes, adjust rate limits, revoke or delete any key. Getting in takes step-up authentication on top of a signed-in session:

1. The visitor enters `ADMIN_PASSWORD`. The verdict is recorded server-side on the session, and the browser is sent to re-authorize at tinyburg.app either way, so nothing reveals whether the password matched.
2. The re-authorization asks for `towers:read`; the callback verifies the account that consented is the account this session belongs to, then asks the trading api - as the visitor, with their fresh 15-minute token - which towers they have linked. One of them must be in `ADMIN_PLAYER_IDS`. Nothing is stored: no refresh tokens, no snapshots, so unlinking a tower revokes eligibility immediately.

Elevation lasts one hour, is stored on the session (`sessions.admin_until`), dies with the session, and refusals are uniform: `/admin?error=elevation_failed` never says which factor failed. Password attempts are rate limited to 5 per 5 minutes per session.
