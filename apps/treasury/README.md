# Treasury

The escrow behind every trade: "the treasury that escrows every trade" from
the sponsors page, made real. Players propose and accept trades on
tinyburg.app's `/trades` page; this service holds the items in the middle and
sees each trade through, however long the two sides take.

## How a trade works

Nimblebit has no hold primitive, so the treasury makes one out of the gift
channel: **an unreceived gift is a native escrow slot.** The treasury owns a
vault tower, and a gift trade runs

1. **Deposit** - each side's item is sent to the vault via the trading api,
   using the OAuth grant the trader gave on the consent screen
   (`/auth/connect`). The item sits in the vault's gift queue, unclaimed.
2. **Verify** - the vault's queue is polled until both deposits appear,
   matched against the agreed contents _exactly_ (sender, type, and the item
   string verbatim - the bait-and-switch check).
3. **Release** - only with both sides verified, the vault forwards each item
   to the other trader, then claims its own slot to settle the leg.

A **save-splice** trade instead pulls both saves, moves the agreed items
(bitizens, costumes, pets, coins, bux - things the gift channel cannot debit
or carry), and pushes both back. It only runs after _both_ parties confirm on
the web app, cloud snapshots of both originals are pushed first, and each
push is guarded by a version check so a player who kept playing aborts the
splice rather than losing progress.

Everything runs as durable workflows (`workflows/`) on a single-node cluster
backed by this service's own Postgres, so a deploy mid-trade resumes rather
than stranding an item in the vault. The `escrow_ledger` is the append-only
account of every step.

### The one invariant

**The vault's gift queue _is_ the escrow. Never claim a gift outside a
workflow.** `receive_gift` removes a gift from the queue whether or not it
went anywhere; claiming out of order is how an item disappears. The same
reasoning is why the treasury never requests `tinytower:receive_gift` on a
_trader's_ grant - claiming via api on a player's own tower destroys the item
(the game never applies it).

### Known caveat

An api-sent gift is not debited from the sender's save, so a gift trade
duplicates both items; this is inherent to the channel and the UI says so.
Splice trades are the non-duplicating path.

## Pieces

| Where                   | What                                                                       |
| ----------------------- | -------------------------------------------------------------------------- |
| `packages/treasury-sdk` | The api spec and the `treasury` scope area, shared with tinyburg.app       |
| `routes/access.ts`      | Bearer JWT verification and the per-endpoint scope check (`RequireAccess`) |
| `routes/api.ts`         | Handlers, acting as the token's subject                                    |
| `routes/oauth.ts`       | The connect flow (authorization code + PKCE + `offline_access`)            |
| `services/provider.ts`  | Boot-time RFC 7591 registration at tinyburg.app, and the OAuth client      |
| `services/tinyburg.ts`  | Acting on traders' towers through the trading api, grants + rotation       |
| `services/vault.ts`     | The vault tower, reached with its own Nimblebit credentials                |
| `workflows/`            | GiftEscrow, Refund, Splice - the durable sagas                             |
| `cluster/crons.ts`      | Expiry (deposited trades → refund) and the reconciler (queue vs book)      |

### Who calls it, with what

The api lives at `<site>/v1/treasury/*`: tinyburg.app reverse-proxies that
path here verbatim (`apps/tinyburg.app/server/routes/treasury.ts`), the
caller's `Authorization: Bearer <JWT>` included. The token is one
tinyburg.app issued for the Tinyburg api (`<site>/v1`): the first-party app
gets it from tinyburg.app's `/auth/token`, any other application uses its
own. The treasury verifies it locally against tinyburg.app's published keys
and checks the endpoint's `treasury` scope; it keeps no sessions. A revoked
grant's token keeps working here until it expires (ten minutes at most),
which is accepted because everything the treasury then does to a tower goes
through tinyburg.app's `/v1`, where revocation is immediate.

The one thing the browser reaches directly is the connect flow at
`PUBLIC_URL`, which sends the trader to tinyburg.app's consent screen and back.

## Configuration (`TREASURY_*`)

Read from the environment as given, and from `.env` under the `TREASURY_`
prefix.

| Variable                             | Meaning                                                                                                                     |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`, `PORT`, `HOST`       | Set by the dev stack                                                                                                        |
| `NODE_ENV`                           | `development` relaxes cookies to plain http names and makes the registration token optional                                 |
| `GRANT_SEALING_KEY`                  | AES key for stored refresh tokens                                                                                           |
| `VAULT_PLAYER_ID` / `VAULT_AUTH_KEY` | The vault tower's own credentials                                                                                           |
| `NIMBLEBIT_HOST`                     | Where the vault's calls go; default `https://sync.nimblebit.com`, point at the authproxy for its auditing or a fake for dev |
| `NIMBLEBIT_AUTH_KEY`                 | The shared secret (direct host) or bearer key (custom host)                                                                 |
| `NIMBLEBIT_MIN_INTERVAL_MILLIS`      | The pacer's minimum gap between Nimblebit-bound calls; default 2000                                                         |
| `TINYBURG_ISSUER`                    | tinyburg.app's origin: the issuer, and `<issuer>/v1` is the resource incoming tokens must be for                            |
| `TINYBURG_REDIRECT_URI`              | The connect flow's callback, as registered                                                                                  |
| `PUBLIC_URL`                         | Where the browser reaches the connect flow                                                                                  |
| `TINYBURG_OAUTH_REGISTRATION_TOKEN`  | Required outside development for RFC 7591 boot registration                                                                 |

## Ops

- **Provisioning the vault:** register a dedicated TinyTower account
  out-of-band (burn-bot registration through the authproxy tooling), put its
  player id and auth key in the environment. Keep it out of anyone's game
  client.
- **Rotating the vault key:** drain first - `SELECT * FROM trade_legs WHERE
  state IN ('sent','verified','released','refund_sent')` must be empty - then
  swap credentials and restart.
- **Where is my item:** `SELECT * FROM escrow_ledger WHERE trade_id = ...
  ORDER BY id`. The ledger refuses updates and deletes at the table level.
- **Orphans and losses:** the reconciler logs `orphan_gift` for vault gifts
  no trade accounts for and turns long-unseen deposits into `lost` legs; both
  are ops signals, not automatic actions.

## Dev walkthrough

The full trade loop, clickable, without touching Nimblebit:

1. **Fake mode.** Uncomment the "fake Nimblebit mode" block in `.env`
   (`.env.example` has it), then start the dev stack and enable the
   `fake-nimblebit` and `treasury-backend` processes in process-compose.
2. **Seed.** `node apps/treasury/test/seed-dev.ts` - creates Alice and Bob
   with sessions and linked towers (`ALICE`, `BOBBY`), and pushes a real
   save from the sdk's snapshot corpus to the fake for both. It prints the
   two session cookies; paste one into each of two browser profiles (dev
   cookies are unprefixed, host `localhost:3000`).
3. **Connect.** In each profile open `http://localhost:3000/trades` and
   click Connect - the real consent screen, served by the local provider
   against the seeded session; approve it. The page comes back with the
   treasury connected.
4. **Gift trade.** As Alice: New Trade → pick `ALICE` → pick a bitizen chip
   (the inventory comes from the seeded save) → set Bob's `BOBBY` as the
   counterparty (or leave open) → propose. As Bob: open the trade → Accept.
   Watch the detail page's legs run `sent → verified → released → settled` -
   the fake delivers instantly, so the first verify pass lands - and the
   fake's log print each gift moving through the vault.
5. **Splice trade.** Same, with the save-splice mechanism and, say, a
   costume for coins. Both sides must press the confirm button; the ledger
   then shows `splice_pulled`, `splice_snapshot` and both pushes, and the
   towers' saves in the fake have actually swapped the items.
6. **The book.** `psql` into the treasury database and read
   `escrow_ledger` for the audit trail, or hit `/v1/treasury/stats` to see
   the home page counters move.

## Not yet verified against production Nimblebit

Gift-queue slot limits, server-side gift expiry, whether `send_item` needs an
existing friend relationship, and whether the wire `gift_str` round-trips
exactly what `SendItem` submitted. Probe these with the real vault account
before opening trades to anyone.
