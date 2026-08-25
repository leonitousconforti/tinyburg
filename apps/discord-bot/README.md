# @tinyburg/discord-bot

The Tinyburg bot for Discord. Right now it does exactly one thing: bind a
Discord account to a Tinyburg account, so later features have something
trustworthy to key off.

## What it does

| Command   | What it does                                                   |
| --------- | -------------------------------------------------------------- |
| `/link`   | Sends you to tinyburg.app to sign in, then records the binding |
| `/whois`  | Shows which Tinyburg account a Discord user has linked         |
| `/unlink` | Removes the binding                                            |

`/link` asks tinyburg.app for `openid profile` and nothing else. The bot can
confirm who you are; it cannot see your towers. Reading a tower needs
`towers:read`, which is a separate consent this slice deliberately does not
request, and the access token from the link round trip is discarded rather
than stored.

## Shape

Built on [dfx](https://github.com/tim-smart/dfx), the same library the Effect
community's own bot uses. Commands arrive over the Discord **gateway**, which
dfx holds open, and which also syncs the command list on connect, so there is
no separate registration step to remember.

The OAuth callback is a browser redirect, so it still needs a real HTTP
server. The bot therefore runs two things at once and `/link` is the seam
between them:

```
interactions.ts       Ix.global command definitions, registered with InteractionsRegistry
routes/oauth.ts       the /discord/callback the browser returns to
domain/links.ts       discord_links, and the in-flight discord_pending_links
index.ts              merges the gateway layer with the http server
```

Commands are declared and handled in one place. `Ix.global(definition,
handler)` co-locates them, so adding a command is one edit rather than three
kept in sync by hand.

### How `/link` is anchored

A browser coming back from tinyburg.app carries no cookie of ours, and may
not even be the same device that ran the command. The `state` parameter is
therefore the entire binding between the callback and the Discord user who
started it. So it is 384 bits, stored only as a SHA-256 hash, claimed with a
single `DELETE ... RETURNING` so it cannot be replayed, and dead after ten
minutes.

The consequence to be clear-eyed about: whoever completes that URL gets bound
to the Discord account that asked for it. That is inherent to linking an
account from a chat client. The mitigation is that `/link` replies
ephemerally, so the URL is never posted anywhere another person can take it.

## Configuration

| Variable                      | Notes                                                                                                       |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                | Postgres; migrations run at boot                                                                            |
| `TOKEN`                       | The gateway connection authenticates with it (`DISCORDBOT_TOKEN` in `.env`)                                 |
| `APPLICATION_ID`              | Used to address the follow-up reply edit                                                                    |
| `TINYBURG_ISSUER`             | Defaults to `https://tinyburg.app`                                                                          |
| `TINYBURG_CLIENT_ID`          | The bot's OAuth client at tinyburg.app; required unless the bot may register itself, see below              |
| `TINYBURG_CLIENT_SECRET`      | The bot is a confidential client                                                                            |
| `TINYBURG_REGISTRATION_TOKEN` | Optional; the provider's initial access token, lets an unconfigured bot register itself outside development |
| `TINYBURG_REDIRECT_URI`       | Must exactly match the registered redirect URI                                                              |
| `NODE_ENV`                    | `development` permits self-registration without a token                                                     |
| `PORT`                        | Defaults to 3003, for the OAuth callback only                                                               |

In development `nix run .#dev` supplies all of these except the two Discord
ones. It runs a Postgres of the bot's own, `discord-bot-postgres` on port 54323,
holding nothing but `discord_bot`; points the bot at the local provider rather
than the deployed one; and leaves `TINYBURG_CLIENT_ID` unset with
`NODE_ENV=development`, so the bot registers itself there at boot (RFC 7591,
which the provider offers openly in development) and is issued its client id
and secret rather than being told them. Registration is idempotent, keyed by
the `software_id` the bot sends (`tinyburg-discord-bot`), so it happens on
every boot, returns the same client, and leaves the bot nothing to store; the
secret it is issued is fresh each run and lives only in memory. Nothing has to
be registered by hand, and the machine-wide Postgres on 5432 is left alone.

Outside development an unset client id is a missing required setting, unless
`TINYBURG_REGISTRATION_TOKEN` holds the initial access token the provider was
configured with (`TINYBURGAPP_REGISTRATION_TOKEN`); then the bot registers
itself the same way on first boot, presenting the token.

The process is **off by default** in that stack, because starting it opens a
real gateway connection. Put `DISCORDBOT_TOKEN` and `DISCORDBOT_APPLICATION_ID`
in `.env`, then start `discord-bot` from the process-compose TUI.

Port 3003 because the dev stack already hands 3000 to tinyburg.app, 3001 to
authproxy, and 3002 to social-circles. Note that a second process binding
`0.0.0.0` on a port something else holds on `127.0.0.1` will start and log
"Listening" without ever receiving a request, so a mysteriously 404ing route
is worth an `lsof -i :<port>` before it is worth debugging.

Deployed, one registration has to happen first, either by hand at tinyburg.app
(an OAuth client whose redirect URI is `https://<host>/discord/callback` and
whose scope is `openid profile`, then `TINYBURG_CLIENT_ID` and
`TINYBURG_CLIENT_SECRET`) or by the bot itself with a registration token. The
Discord side needs only a bot token; dfx syncs the commands itself.

## Testing locally

The gateway path cannot be exercised without a real bot token, so commands
are the one part that needs a live Discord application to try. With a bogus
token the registry logs a 401 and the rest of the process carries on, which
is at least a useful check that a bad token does not take the bot down.

Everything on the OAuth side can be driven directly. Insert a pending link
with a known state and hit the callback:

```sh
DB="postgres://postgres@127.0.0.1:54323/discord_bot"
STATE=whatever
HASH=$(node -e "console.log(require('node:crypto').createHash('sha256').update('$STATE').digest('base64url'))")
psql "$DB" -c "INSERT INTO discord_pending_links (state_hash, code_verifier, discord_user_id, interaction_token)
               VALUES ('$HASH','verifier','555000111','tok')"
curl -s "http://localhost:3003/discord/callback?code=fake&state=$STATE"
```

The first call gets as far as `token exchange failed` in the log, which
confirms the state was minted, matched, and consumed; a second call with the
same state reports `no pending link for this state`, which is the single-use
claim working.

Note that `sub` is checked as a real UUID, so a hand-seeded row full of
repeating digits will fail to decode. Use `gen_random_uuid()`.

## Not this, yet

Deliberately out of scope for this slice, in rough order of what would come
next: verified friend codes and `/friends find`, the DM notification spine,
game reference commands, and marketplace surfacing once escrow exists.

Nothing in this bot should ever mutate a tower save. Escrow deposits, splices,
and doorman-style automation belong behind an explicit confirmation in the web
app, not behind a chat command.

## Scheduled sweeps

A pending link is a `/link` that was started and never finished; the row holds
a PKCE verifier and an interaction token. They are swept hourly by
`cluster/sweepers.ts`.

It was previously a fiber forked inside the links repository, which is correct
only while exactly one process is running - which is also the only way this bot
can run, since a second instance sharing the token fights the first over the
global command list. `ClusterCron` states that constraint rather than relying
on it, so the day a second replica does come up the sweep does not double-run
while the gateway question is dealt with separately. The `SingleRunner` in
`cluster/runtime.ts` creates its own `cluster_*` tables on first boot.

## The callback page

The page the browser lands on after `/link` is `pages/result.ts`, a Foldkit
view rendered statically on the server - no script, nothing to hydrate. It
names a Tinyburg display name, which its owner chose, so the escaping is the
point: interpolating that into markup by hand is a decision that has to be got
right every time it is written, and letting the serializer decide is one got
right once.
