# The local development stack

One command brings up every service and the Postgres each one owns:

```sh
nix run .#dev
```

Run it from the repository root. Postgres keeps its data in `.dev/`, which is
relative to the working directory, and the app processes are started by path.

Inside the process-compose TUI, `r` restarts the selected process, `s` stops it,
and `F5`/`F6` scroll its log.

## Running it on a remote box

The stack listens on `127.0.0.1` only, and every OAuth url in it is
`http://localhost:<port>`: Google accepts plain http redirects only for
localhost, and the OAuth server and its clients accept an http issuer only on a
loopback address. Binding to the box's LAN or VPN address would serve the pages
but break every sign in. Forward the ports instead, so they are localhost on
your machine too:

```sh
ssh -N -L 3000:localhost:3000 -L 3001:localhost:3001 -L 3002:localhost:3002 -L 3003:localhost:3003 <user>@<dev box>
```

Or once in `~/.ssh/config` on your machine, after which a plain `ssh <dev box>`
forwards them:

```
Host <dev box>
    LocalForward 3000 localhost:3000
    LocalForward 3001 localhost:3001
    LocalForward 3002 localhost:3002
    LocalForward 3003 localhost:3003
```

Then open http://localhost:3000 (tinyburg.app), http://localhost:3001
(authproxy), http://localhost:3002 (social-circles) and http://localhost:3003
(discord-bot) in your own browser.
