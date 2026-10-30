# tinyburg.app

A [foldkit](https://foldkit.dev) single-page app served by an Effect http server.

- `client/` is the foldkit SPA: one Model, one update function, routes parsed with `Route` combinators, and side effects as Commands. Data comes from the server through an `HttpApiClient` derived from the shared api spec.
- `server/` is the Effect http server: OAuth login/callback routes for Google and Discord (the app's own sign-in), the "Sign in with Tinyburg" OIDC provider built on [`@yielded/auth`](https://yielded.dev/auth/)'s OAuth server, session cookies backed by Postgres, the `TinyburgApi` HttpApi implementation, and static serving of the built client with an SPA fallback.
- `domain/` and `migrations/` are the repositories, models, and Postgres migrations.

## The OIDC provider

The protocol is `@yielded/auth`'s OpenID OAuth server, declared in
`server/oauthServer.ts` and wired to this app in `server/oauthLive.ts`: the
visitor is whoever the provider session cookie says, clients are the rows of
`oauth_clients`, and grants live in the two `yielded_oauth_*` tables. The
routes in `server/routes/oidc.ts` hand every request to it.

| Endpoint      | Path                                   |
| ------------- | -------------------------------------- |
| Discovery     | `/.well-known/openid-configuration`    |
| Authorization | `/oauth/tinyburg/authorize`            |
| Token         | `/oauth/tinyburg/token`                |
| Userinfo      | `/oauth/tinyburg/userinfo`             |
| Revocation    | `/oauth/tinyburg/revoke`               |
| JWKS          | `/oauth/tinyburg/jwks`                 |
| Registration  | `/oauth/register`, where it is offered |

Grants: `authorization_code` (PKCE required, S256 only) and `refresh_token`.
Public clients register no secret; the code challenge carries the proof.
Access tokens are opaque and last ten minutes; ID tokens are RS256 and last
five.

### Scopes

| Scope                                            | Grants                                                                                         |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| `openid`                                         | The user's Tinyburg id                                                                         |
| `profile`                                        | Display name                                                                                   |
| `offline_access`                                 | A refresh token, so the client keeps working once the browser is closed                        |
| `tinytower`                                      | Everything below                                                                               |
| `tinytower:read`                                 | Every read: list linked accounts, pull saves and snapshots, gifts, visits, friends' towers     |
| `tinytower:write`                                | Every write: link and unlink accounts, push saves and snapshots, raffles, gifts, items, visits |
| `tinytower:<leaf>`                               | One endpoint, e.g. `tinytower:pull_save`, `tinytower:list_accounts`                            |
| `tinytowerclassic`, `tinytowerclassic:read`, ... | The same tree for TinyTower Classic, at `/v1/tinytowerclassic/...`                             |

The game scopes are a tree declared once in `@tinyburg/trading-sdk`'s `Scopes`
module, one area per game with a leaf per endpoint of the trading api: each
endpoint is annotated with `OAuthScope.Required`, accepting its leaf, its
`:read`/`:write` branch, and the game, and the consent screen, the developers
page and discovery all read the same tree. A client may only request scopes
it is registered for: anything else is refused with an error page before
consent, and the token endpoint grants only registered scopes again on every
refresh.

The first-party SPA holds no token. It calls `/v1` with its session cookie,
and is held to `openid profile tinytower tinytowerclassic`.

### Consent

Every third party is asked on every authorization; consent is never
remembered. The first party is never asked. A visitor who is not signed in, or
whose sign in is older than the client accepts, or who chooses "use another
account", goes through `/oauth/login`, which signs them out and back in and
returns them to the pending authorization.

### Refresh tokens

Issued to clients whose registered scope includes `offline_access`, and
rotated: every refresh returns a replacement and invalidates the previous
access token, so clients must store the pair from every refresh. Presenting a
refresh token that was already spent revokes the whole grant, because there is
no way to tell a client replaying its own token from a thief spending a stolen
one. A grant lasts at most thirty days from its first code exchange, and never
past the expiry of the session it was given in; refreshing does not extend it.

Revoking either token revokes the whole grant. No token is stored: each is a
sealed credential naming a grant and its current version.

## Scheduled sweeps

The tables that hold rows that expire - sessions, OAuth grants, client
assertion receipts, and pending game account links - are each swept on their
own staggered schedule by `pg_cron`, registered by the migration that created
the table (`migrations/0006_add_cleanup_jobs.ts` for the first ones).

The schedule lives in the database rather than in the application, which is the
whole point: it keeps running whatever the server is doing, it does not double
up when there is more than one replica, and there is no fiber whose lifetime it
depends on. Each table is indexed on its expiry, so the deletes stay cheap as
they grow, and the times are staggered so the sweeps never contend.

Expired rows are invisible to every read path already, which checks the
expiry, so this is about keeping the tables bounded rather than about
correctness.

Deploying this needs a Postgres with `pg_cron` in `shared_preload_libraries`
and `cron.database_name` pointed at the provider's database, or the migration
fails on `CREATE EXTENSION`. The dev stack configures both in `nix/dev.nix`.

## The consent screen

`/oauth/tinyburg/authorize` renders `server/pages/consent.ts`, a Foldkit view
rendered to a string on the server, through the OAuth server's
`ConsentRenderer`. It has to be server-rendered rather than a SPA
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
