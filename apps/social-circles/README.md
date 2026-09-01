# @tinyburg/social-circles

An opt-in study of the Nimblebit friend network, across every game the study can read.

Your data is not analyzed unless you explicitly grant permission, and you can withdraw and have everything erased at any time.

## How consent works

Participation runs through **sign in with Tinyburg**. You sign in at tinyburg.app, link a game account there (which proves you control it, via a verification code Nimblebit emails to the address on the account), and then grant this study permission to read that tower's friends list.

That indirection is the point. The study never sees your Nimblebit auth key, only a scoped OAuth grant against tinyburg.app that you can revoke at any time from your Tinyburg account. It also means the study does not need to be your in-game friend, so "Only Friend Visits" can stay on and there is no friend-list cap on how many people can take part.

Two rules follow from this and are enforced in the schema, not left to good intentions:

1. **An edge needs both endpoints.** A friendship is recorded only when _both_ players have live consent. If you take part and your friend does not, that connection is never stored.
2. **Revocation is authenticated.** Only the Tinyburg account that granted consent for a player can withdraw it. A friend code by itself does nothing.
3. **A player is a game and a code, never a code alone.** Nimblebit numbers players per game, so the same five characters are two different people in two different games. Identity, the unique indexes, the crawl scheduler and the foreign keys are all keyed by the pair, and `friendship_events` ties both endpoints to the edge's own game by composite foreign key, so a cross-game edge is not something the database will hold.

## Deleting your data

Withdraw consent from the study's dashboard. That starts a purge that removes every event, edge, and aggregate that mentions you, refreshes the published views so you disappear from exports, and drops the stored grant. It runs as a durable workflow, so it finishes even if the process restarts partway, and it writes a receipt recording that it completed.

## What the dataset actually is

Worth being honest about, for anyone doing analysis on this: because edges exist only between consenting players, the graph is an **induced subgraph over a self-selected population**, not a sample of any game's real network. Degree distributions and clustering coefficients computed on it directly will be biased.

To make that correctable rather than invisible, each crawl records how many friends a player had in total against how many were in the study. Those are counts only, never identities, and they are what lets an analysis estimate the sampling rate.

## Architecture

One process runs everything, on a single-node Effect cluster backed by the same Postgres the study already uses.

| Piece                     | What it does                                                                       |
| ------------------------- | ---------------------------------------------------------------------------------- |
| `workflows/consent.ts`    | Durable enrollment: verify ownership upstream, record consent, schedule the crawl  |
| `workflows/purge.ts`      | Durable erasure saga, ending in an auditable receipt                               |
| `cluster/crawler.ts`      | One entity per player (serializes and isolates crawls) plus the crons that feed it |
| `services/crawl.ts`       | Pull, diff, write. A short idempotent task, deliberately _not_ a workflow          |
| `services/ratelimit.ts`   | The single global pacer for everything that reaches Nimblebit                      |
| `services/towers.ts`      | The OAuth client against tinyburg.app's `towers` API                               |
| `routes/oauth.ts`         | The sign-in round trip, and where the two tokens get stored                        |
| `routes/selfservice.ts`   | The dashboard's cookie-session api                                                 |
| `domain/games.ts`         | Which games exist, and how (or whether) each one's friends list can be read        |
| `shared/games.ts`         | The game vocabulary both the server and the browser hold: ids, names, keys         |
| `client/ui/forceGraph.ts` | The circle as a force-directed graph, laid out once as a pure function             |
| `client/`                 | The foldkit dashboard: your towers, your circle drawn, and leaving                 |
| `domain/`                 | Consent, graph, grants, crawl state, sessions, purge                               |

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

The dashboard, the sign-in round trip, the workflows, the cluster, and unattended crawling all work. tinyburg.app now issues refresh tokens for the `offline_access` scope, so a scheduled crawl can act for a participant who is not at the keyboard.

### Which games actually work

The study is keyed by game throughout, and `domain/games.ts` lists all eight of Nimblebit's cloud-sync games. Only two of them produce data:

| Game                                                                            | State                                                                                                                                                                          |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| TinyTower                                                                       | Readable. Friends live under `Pfrns` in the save.                                                                                                                              |
| TinyTower Classic                                                               | Readable. Same save format, re-issued under game code `ttc`.                                                                                                                   |
| Pocket Planes, Pocket Trains, LEGO Tower, Disco Zoo, Bit City, Tiny Tower Vegas | Dormant. Their sdks return a save as raw bytes with no schema to decode, so there is no friends list to read. Their accounts groups are also not yet added to the trading api. |

A dormant game costs nothing at runtime: no scope is requested for it, no crawl is scheduled for it, and the dashboard says why it is listed but cannot be joined. Lighting one up is one entry in `domain/games.ts` once its `SaveData` schema and its trading api group exist; nothing else in this app changes.

The scope the study asks for is derived from that list rather than written out, so the consent screen can never name a game the crawler cannot read. Today that is:

```
openid profile
tinytower:list_accounts tinytower:pull_save
tinytowerclassic:list_accounts tinytowerclassic:pull_save
offline_access
```

Two leaves per game rather than the whole `<game>:read` branch, so a research project can see which towers a participant linked and read their saves, and nothing else.

Refresh tokens are **rotated** at the provider, with reuse detection: each one is good for exactly one exchange, and presenting a spent token revokes the whole family. `services/towers.ts` therefore stores the replacement on every refresh, and marks the grant invalid if it cannot, since a lost replacement is an unrecoverable grant.

What is still worth narrowing is upstream: `<game>:pull_save` returns a whole save when the study only ever wants the friends list. A `<game>:friends` leaf would be the honest grant to ask for.

## The picture

The dashboard draws a participant's whole circle as one force-directed graph: their towers, everyone mutually friended with them, and the mutual friendships among that set.

The layout is a pure function run once when the data arrives, with the result kept in the model, rather than a simulation ticking in a subscription. Same input, same picture, no frame loop, and nothing calls `Math.random`. Because a friendship cannot span games, the graph is always at least one component per game, so each game gets an anchor and a gentle pull toward it: the components become one labelled constellation per game instead of drifting wherever repulsion happens to push them.

Colour carries the game in fixed catalog order, never cycled, and position plus a direct label on each cluster carry it too, so the picture survives more games than a palette can hold apart on colour alone.

One thing worth being explicit about, because it goes a step past the per-tower circle list: **the graph shows edges between two of your friends**, not just edges involving you. Everyone drawn has consented and is already listed in your circle, but neither of them was asked specifically about this. The privacy page says so in as many words.

### Registering the client at tinyburg.app

```sql
INSERT INTO oauth_clients (name, secret_hash, scope, redirect_uris)
VALUES (
    'Social Circles',
    NULL,                                                   -- public client, PKCE carries the proof
    'openid profile tinytower:list_accounts tinytower:pull_save tinytowerclassic:list_accounts tinytowerclassic:pull_save offline_access',
    ARRAY['https://<social-circles-host>/auth/callback']
)
RETURNING id;   -- becomes TINYBURG_CLIENT_ID
```

A client may only request scopes it is registered for, so `offline_access` has to appear here or no refresh token is ever issued.

## Datasets

Exports are node-labelled `game:playerId` for the same reason the schema is keyed that way: a graph keyed on the friend code alone would merge two people into one node and invent edges between them.

Snapshots will be published periodically once there is meaningful data. In the meantime, if there is an analysis you want to run on this, regardless of expertise, reach out and we can work to get it integrated with the live dataset.
