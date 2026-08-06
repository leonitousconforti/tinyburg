# tinyburg.app

A [foldkit](https://foldkit.dev) single-page app served by an Effect http server.

- `client/` is the foldkit SPA: one Model, one update function, routes parsed with `Route` combinators, and side effects as Commands. Data comes from the server through an `HttpApiClient` derived from the shared api spec.
- `server/` is the Effect http server: OAuth login/callback routes for Google and Discord (the app's own sign-in), the "Sign in with Tinyburg" OIDC provider built on [effect-oidc](https://github.com/leonitousconforti/effect-oidc), session cookies backed by Postgres, the `TinyburgApi` HttpApi implementation, and static serving of the built client with an SPA fallback.
- `domain/` and `migrations/` are the repositories, models, and Postgres migrations.

## The OIDC provider

Grants: `authorization_code` (PKCE required, S256 only), `refresh_token`, and
`client_credentials`. Public clients register no secret; the code challenge
carries the proof.

### Scopes

| Scope            | Grants                                                                  |
| ---------------- | ----------------------------------------------------------------------- |
| `openid`         | The user's Tinyburg id                                                  |
| `profile`        | Display name and avatar                                                 |
| `towers:read`    | Read linked TinyTower saves: pull a save, list linked accounts          |
| `towers:write`   | Change them: push a save, enter raffles, link and unlink accounts       |
| `towers`         | Both halves. Superseded by the two above, still accepted                |
| `offline_access` | A refresh token, so the client keeps working once the browser is closed |
| `towers:lookup`  | Machine-to-machine lookup by user id. `client_credentials` only         |

A client may only request scopes it is registered for, and a token needs _one
of_ an endpoint's accepted scopes, which is why `towers` still opens everything
it used to.

### Refresh tokens

Rotated, with reuse detection. Every exchange consumes the presented token and
returns a replacement in the same family. Presenting a token that was already
spent revokes the entire family, because there is no way to tell a client
replaying its own token from a thief spending a stolen one. Clients must
therefore store the replacement from every refresh; dropping it loses the grant.

Only the hash is stored, so a copy of `refresh_tokens` grants nothing.
