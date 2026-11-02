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
ssh -N -L 3000:localhost:3000 -L 3001:localhost:3001 -L 3002:localhost:3002 -L 3003:localhost:3003 -L 3004:localhost:3004 <user>@<dev box>
```

Or once in `~/.ssh/config` on your machine, after which a plain `ssh <dev box>`
forwards them:

```
Host <dev box>
    LocalForward 3000 localhost:3000
    LocalForward 3001 localhost:3001
    LocalForward 3002 localhost:3002
    LocalForward 3003 localhost:3003
    LocalForward 3004 localhost:3004
```

Then open http://localhost:3000 (tinyburg.app), http://localhost:3001
(authproxy), http://localhost:3002 (social-circles) and http://localhost:3003
(discord-bot) in your own browser. The treasury's api is reached through
tinyburg.app at `/v1/treasury`, but its connect flow runs in the browser at
http://localhost:3004, so forward that port too.

## The Android shell

`nix develop .#android` is the default shell plus the Android SDK: platform
tools, the emulator, and Android 14 Google APIs system images for x86_64 and
arm64. It sets `ANDROID_HOME`. The first entry downloads about 3.6 GB. The
SDK is unfree and its license is accepted in `flake.nix`, for this shell's
nixpkgs only. See `packages/insight/README.md` for running insight on it.
