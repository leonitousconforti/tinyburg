# @tinyburg/social-circles

An opt-in study of the TinyTower friend network.

Your data is not analyzed unless you explicitly grant permission, and you can withdraw and have everything erased at any time.

## How consent works

Participation runs through **sign in with Tinyburg**. You sign in at tinyburg.app, link your TinyTower account there (which proves you control it, via a verification code Nimblebit emails to the address on the account), and then grant this study permission to read that tower's friends list.

That indirection is the point. The study never sees your Nimblebit auth key, only a scoped OAuth grant against tinyburg.app that you can revoke at any time from your Tinyburg account. It also means the study does not need to be your in-game friend, so "Only Friend Visits" can stay on and there is no friend-list cap on how many people can take part.

Two rules follow from this and are enforced in the schema, not left to good intentions:

1. **An edge needs both endpoints.** A friendship is recorded only when _both_ players have live consent. If you take part and your friend does not, that connection is never stored.
2. **Revocation is authenticated.** Only the Tinyburg account that granted consent for a player can withdraw it. A friend code by itself does nothing.

## Deleting your data

Withdraw consent from the study's dashboard. That starts a purge that removes every event, edge, and aggregate that mentions you, refreshes the published views so you disappear from exports, and drops the stored grant. It runs as a durable workflow, so it finishes even if the process restarts partway, and it writes a receipt recording that it completed.

## What the dataset actually is

Worth being honest about, for anyone doing analysis on this: because edges exist only between consenting players, the graph is an **induced subgraph over a self-selected population**, not a sample of the TinyTower network. Degree distributions and clustering coefficients computed on it directly will be biased.

To make that correctable rather than invisible, each crawl records how many friends a player had in total against how many were in the study. Those are counts only, never identities, and they are what lets an analysis estimate the sampling rate.

## Architecture

One process runs everything, on a single-node Effect cluster backed by the same Postgres the study already uses.

| Piece                   | What it does                                                                       |
| ----------------------- | ---------------------------------------------------------------------------------- |
| `workflows/consent.ts`  | Durable enrollment: verify ownership upstream, record consent, schedule the crawl  |
| `workflows/purge.ts`    | Durable erasure saga, ending in an auditable receipt                               |
| `cluster/crawler.ts`    | One entity per player (serializes and isolates crawls) plus the crons that feed it |
| `services/crawl.ts`     | Pull, diff, write. A short idempotent task, deliberately _not_ a workflow          |
| `services/ratelimit.ts` | The single global pacer for everything that reaches Nimblebit                      |
| `services/towers.ts`    | The OAuth client against tinyburg.app's `towers` API                               |
| `routes/oauth.ts`       | The sign-in round trip, and where the two tokens get stored                        |
| `routes/selfservice.ts` | The dashboard's cookie-session api                                                 |
| `client/`               | The foldkit dashboard: your towers, your circle, and leaving                       |
| `domain/`               | Consent, graph, grants, crawl state, sessions, purge                               |

### Running it

There is no vite dev server. The Effect http server serves `dist/client` in
development exactly as in production, so build the SPA first:

```sh
pnpm --filter @tinyburg/social-circles build
node --env-file=.env index.ts
```

`SingleRunner` is a deliberate choice rather than a stepping stone. The bottleneck is Nimblebit's rate limit, not compute, so sharding across runners would buy parallelism the pacer forbids us from using while turning the global token bucket into a distributed problem. See the comment in `cluster/runtime.ts`.

### Configuration

| Env var                         | Meaning                                                       |
| ------------------------------- | ------------------------------------------------------------- |
| `DATABASE_URL`                  | Postgres connection string (required)                         |
| `GRANT_SEALING_KEY`             | Encrypts stored access and refresh tokens (required)          |
| `NODE_ENV`                      | Set `development` for plain http cookies; otherwise `__Host-` |
| `PORT`/`HOST`                   | Listen address, default `3002`/`0.0.0.0`                      |
| `TINYBURG_ISSUER`               | The OIDC provider, default `https://tinyburg.app`             |
| `TINYBURG_CLIENT_ID`            | The oauth client registered at the provider                   |
| `TINYBURG_CLIENT_SECRET`        | Optional; omit for a public client (PKCE only)                |
| `TINYBURG_REDIRECT_URI`         | `<this host>/auth/callback`                                   |
| `CRAWL_INTERVAL_MINUTES`        | Routine gap between crawls of the same player, default `360`  |
| `NIMBLEBIT_MIN_INTERVAL_MILLIS` | Minimum spacing between Nimblebit-bound calls, default `2000` |

## Status

The dashboard, the sign-in round trip, the workflows, and the cluster all run. What is not yet possible is **unattended crawling**, and it is blocked on two things at tinyburg.app:

1. **`offline_access` / refresh tokens.** The provider's token endpoint rejects the `refresh_token` grant and access tokens live 900 seconds. The interactive dashboard works anyway, because a signed-in visitor's session carries a live access token, but a crawl running hours after they closed the tab cannot get one. `services/towers.ts` is written against the intended shape and surfaces the gap as `TowerGrantUnusable` rather than papering over it.
2. **Scope granularity.** The `towers` scope currently covers pushing saves and entering raffles as well as reading. A study should not hold write access to anyone's tower; this needs splitting, ideally into a scope that returns a friends list rather than a whole save, since the study has no business reading anyone's bitizens.

Until (1) lands, enrolling works and the first crawl runs while the visitor is present, but the scheduled passes will report that the grant is unusable.

## Datasets

Snapshots will be published periodically once there is meaningful data. In the meantime, if there is an analysis you want to run on this, regardless of expertise, reach out and we can work to get it integrated with the live dataset.
