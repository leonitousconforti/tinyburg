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

| Scope                                            | Grants                                                                                         |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| `openid`                                         | The user's Tinyburg id                                                                         |
| `profile`                                        | Display name and avatar                                                                        |
| `offline_access`                                 | A refresh token, so the client keeps working once the browser is closed                        |
| `tinytower`                                      | Everything below                                                                               |
| `tinytower:read`                                 | Every read: list linked accounts, pull saves and snapshots, gifts, visits, friends' towers     |
| `tinytower:write`                                | Every write: link and unlink accounts, push saves and snapshots, raffles, gifts, items, visits |
| `tinytower:<leaf>`                               | One endpoint, e.g. `tinytower:pull_save`, `tinytower:list_accounts`                            |
| `tinytowerclassic`, `tinytowerclassic:read`, ... | The same tree for TinyTower Classic, at `/v1/tinytowerclassic/...`                             |

The game scopes are a tree declared once in `@tinyburg/trading-sdk`'s `Scopes`
module, one area per game with a leaf per endpoint of the trading api: the endpoint accepts its
leaf, its `:read`/`:write` branch, and the game, by plain equality, and the
consent screen, the developers page and discovery all read the same tree. A
client may only request scopes it is registered for, and a token needs _one
of_ an endpoint's accepted scopes.

### Refresh tokens

Rotated, with reuse detection. Every exchange consumes the presented token and
returns a replacement in the same family. Presenting a token that was already
spent revokes the entire family, because there is no way to tell a client
replaying its own token from a thief spending a stolen one. Clients must
therefore store the replacement from every refresh; dropping it loses the grant.

Only the hash is stored, so a copy of `refresh_tokens` grants nothing.

## Scheduled sweeps

Five tables hold rows that expire: revoked tokens, refresh tokens,
authorization requests, sessions, and pending TinyTower links. Each is swept on
its own staggered schedule by `pg_cron`, registered in
`migrations/0006_add_cleanup_jobs.ts`.

The schedule lives in the database rather than in the application, which is the
whole point: it keeps running whatever the server is doing, it does not double
up when there is more than one replica, and there is no fiber whose lifetime it
depends on. Each table is indexed on `expires_at`, so the deletes stay cheap as
they grow, and the times are staggered so the five never contend.

Expired rows are invisible to every read path already, which filters on
`expires_at`, so this is about keeping the tables bounded rather than about
correctness.

Deploying this needs a Postgres with `pg_cron` in `shared_preload_libraries`
and `cron.database_name` pointed at the provider's database, or the migration
fails on `CREATE EXTENSION`. The dev stack configures both in `nix/dev.nix`.

## The consent screen

`/oauth/authorize` renders `server/pages/consent.ts`, a Foldkit view rendered
to a string on the server. It has to be server-rendered rather than a SPA
route, because during a third-party authorization the browser holds no access
token for the SPA to authenticate with - only the provider session cookie the
page runs on.

It is rendered statically (`isHydratable: false`): approving is a plain
`<form method="post">` with two submit buttons, so the page ships no
JavaScript, no hydration stamp and no client bundle, and works identically with
scripting off. The reason it is a view rather than a template string is
escaping - the page prints a client name and a redirect host that whoever
registered the client chose, to a visitor who is one click from granting a
token.
