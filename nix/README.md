# The local development stack

One command brings up Postgres and every service that talks to it:

```sh
nix run .#dev
```

Run it from the repository root. Postgres keeps its data in `.dev/`, which is
relative to the working directory, and the app processes are started by path.

Inside the process-compose TUI, `r` restarts the selected process, `s` stops it,
and `F5`/`F6` scroll its log. Everything is grouped into namespaces (`infra`,
`apps`, `workers`, `setup`) so the tree stays readable as services are added.

To run a subset:

```sh
nix run .#dev -- tinyburg-app authproxy
```

Starting over is `rm -rf .dev`. There are no containers or volumes to prune.

## First run

Copy `.env.dev.example` to `.env.dev` and fill in the OAuth credentials from the
development apps registered at Google and Discord. Everything else, ports,
connection strings, issuer urls, redirect uris, is set by `nix/dev.nix` and
deliberately overrides `.env.dev`, so the wiring between services cannot drift
from the stack that runs them. `.env.dev` is for secrets only.

Redirect uris to register at the providers:

```
http://localhost:3000/auth/google/callback
http://localhost:3000/auth/discord/callback
```

Nothing else is required. The databases are created on first start, each service
runs its own migrations as part of its layer stack, the provider's signing key is
generated into `.dev/oidc.jwk`, and the seed runs once the services are up.

An empty root `.env` is created if one is missing. That file is gitignored and
unrelated to `.env.dev`, but `ConfigProvider.fromDotEnv()` dies with ENOENT
rather than treating an absent file as empty, so a checkout without one cannot
boot tinyburg.app at all.

## What runs

| Process              | Port  | Notes                                              |
| -------------------- | ----- | -------------------------------------------------- |
| `pg`                 | 54320 | Three databases: `tinyburg_app`, `authproxy`, `social_circles`. Not 5432, so a machine-wide Postgres is left alone. |
| `tinyburg-app`       | 3000  | Also the OIDC provider the other services sign in against |
| `tinyburg-app-client`| .     | `vite build --watch` into `dist/client`            |
| `authproxy`          | 3001  | A relying party of `tinyburg-app`, not of production |
| `authproxy-client`   | .     | `vite build --watch` into `dist/client`            |
| `social-circles`     | 3002  | Plus the cluster, crons and workflows               |
| `heartbeat-sink`     | 3999  | Stands in for the uptime monitor                    |
| `auto-gold-bits`     | .     | Disabled by default, see below                      |
| `doorman-clone`      | .     | Disabled by default, see below                      |

Services are `node --watch`, so saving a file restarts only that service. Saving
a file in `packages/` restarts whichever services import it.

## What the seed does

`scripts/seed.sh` is idempotent and re-runs on every start. It exists mostly
to remove a manual step: registering the authproxy as an OAuth client at
tinyburg.app is otherwise a hand-run `INSERT ... RETURNING id` whose generated id
has to be pasted into the proxy's configuration. Seeding it under a fixed id lets
`TINYBURG_CLIENT_ID` be a constant that survives every database reset.

It also adds the local origin to the first-party client's redirect list (exact
match, so the production entry stays), creates a dev user, and adds an authproxy
key `00000000-0000-0000-0000-0000000000ff` with the read-only scopes at 1000
requests a minute, because the two public keys are capped at 3 and you hit that
wall immediately while iterating.

It is SQL rather than TypeScript on purpose: it touches only `oauth_clients`,
`users` and `accounts`, and staying out of the app's own repository code means it
does not break when those are refactored.

## Known edges

- **The workers reach production.** `auto-gold-bits` and `doorman-clone` build
  their client with `NimblebitAuth.layerTinyburgAuthProxyConfig`, whose host is
  the deployed proxy, so a run here does not touch the local one. They are
  disabled by default for that reason. Pointing them at `localhost:3001` is a
  swap to `NimblebitAuth.layerCustomHostConfig`, which already exists.
- **Nimblebit is real.** Nothing here fakes `sync.nimblebit.com`, so anything
  that syncs uses real accounts and real rate limit budget.
- **No object storage.** `archivist` is the only service that wants any, and it
  names the DigitalOcean Spaces endpoint inline, so a local MinIO would sit
  unreachable. Making that endpoint a config with its present value as the
  default is what would earn it a place in the tree.
- **New files must be `git add`ed.** Nix only sees tracked files, so a brand new
  file under `nix/` or `scripts/` is invisible to `nix run` until at least
  `git add -N` has been run on it.
