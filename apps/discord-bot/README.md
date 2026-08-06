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

No gateway websocket. Discord POSTs signed interaction payloads to
`/discord/interactions` and the bot answers in the response body, so this is
an ordinary Effect `HttpRouter` app with no persistent connection to hold
open. Follow-up edits go out over plain REST.

One consequence worth knowing: **the interactions server never needs the bot
token.** Inbound requests authenticate by Ed25519 signature, and follow-up
edits authenticate with the interaction token from the request body. The bot
token appears only in `scripts/registerCommands.ts`, so it does not belong in
the server's environment.

```
routes/interactions.ts   verify signature -> decode -> dispatch command
routes/oauth.ts          the /discord/callback the browser returns to
domain/links.ts          discord_links, and the in-flight discord_pending_links
discord/verify.ts        Ed25519 verification over the raw body
discord/commands.ts      the command list, as Discord needs it declared
```

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

The server needs:

| Variable                 | Notes                                          |
| ------------------------ | ---------------------------------------------- |
| `DATABASE_URL`           | Postgres; migrations run at boot               |
| `DISCORD_APPLICATION_ID` | From the Discord developer portal              |
| `DISCORD_PUBLIC_KEY`     | Ed25519 public key, hex, from the same portal  |
| `TINYBURG_ISSUER`        | Defaults to `https://tinyburg.app`             |
| `TINYBURG_CLIENT_ID`     | The bot's OAuth client at tinyburg.app         |
| `TINYBURG_CLIENT_SECRET` | The bot is a confidential client               |
| `TINYBURG_REDIRECT_URI`  | Must exactly match the registered redirect URI |
| `PORT`                   | Defaults to 3001                               |

`scripts/registerCommands.ts` additionally needs `DISCORD_BOT_TOKEN`.

Two registrations have to happen before any of this works:

1. **At Discord**, set the interactions endpoint to
   `https://<host>/discord/interactions`. Discord probes it with a signed
   PING and a deliberately bad signature, and will not accept an endpoint
   that answers anything but 401 to the latter.
2. **At tinyburg.app**, register an OAuth client whose redirect URI is
   `https://<host>/discord/callback` and whose scope is `openid profile`.

Then publish the command list once:

```sh
DISCORD_APPLICATION_ID=... DISCORD_BOT_TOKEN=... node scripts/registerCommands.ts
```

That is a global PUT that replaces the whole command set, so run it by hand
after changing `discord/commands.ts`, not on every deploy.

## Testing locally

You do not need a registered Discord application to exercise the endpoint,
only a keypair to sign with. Mint one, run the bot with its public half, and
POST payloads signed with the private half:

```js
// keys.mjs: print the public key the way the portal would
import * as crypto from "node:crypto";
import * as fs from "node:fs";
const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
fs.writeFileSync("private.pem", privateKey.export({ type: "pkcs8", format: "pem" }));
console.log(Buffer.from(publicKey.export({ format: "jwk" }).x, "base64url").toString("hex"));
```

```js
// send.mjs: sign timestamp || body, exactly as Discord does
const timestamp = String(Math.floor(Date.now() / 1000));
const signature = crypto.sign(null, Buffer.from(timestamp + body, "utf8"), privateKey);
await fetch("http://localhost:3001/discord/interactions", {
    method: "POST",
    headers: {
        "content-type": "application/json",
        "x-signature-ed25519": signature.toString("hex"),
        "x-signature-timestamp": timestamp,
    },
    body,
});
```

A guild invocation looks like
`{"type":2,"token":"t","data":{"name":"whois"},"member":{"user":{"id":"1","username":"you"}}}`;
in a DM the user is at the top level as `user` instead of under `member`.

The `/link` happy path is the one thing this cannot cover, because the token
exchange needs a client actually registered at tinyburg.app. Everything up to
it can be checked: the callback will get as far as "token exchange failed" in
the log, which confirms the state was minted, matched, and consumed.

Note that `sub` is checked as a real UUID, so a hand-seeded row full of
repeating digits will fail to decode. Use `gen_random_uuid()`.

## Not this, yet

Deliberately out of scope for this slice, in rough order of what would come
next: verified friend codes and `/friends find`, the DM notification spine,
game reference commands, and marketplace surfacing once escrow exists.

Nothing in this bot should ever mutate a tower save. Escrow deposits, splices,
and doorman-style automation belong behind an explicit confirmation in the web
app, not behind a chat command.
