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

## Staging

`nix run .#staging` is the same stack for https://staging.tinyburg.app and its
`authproxy.`, `socialcircles.`, `treasury.` and `discord.` siblings. A proxy
terminates TLS and reaches the apps over the LAN, so they listen on `0.0.0.0`
with `NODE_ENV=production`: Secure `__Host-` cookies, and dynamic client
registration only with `TINYBURGAPP_REGISTRATION_TOKEN`, which the authproxy,
treasury and discord-bot present as their `*_TINYBURG_OAUTH_REGISTRATION_TOKEN`.
Postgres and SeaweedFS stay on loopback.

Every push to main that passes CI deploys it (`.github/workflows/staging.yml`),
on the self-hosted runner labelled `staging`, which is the staging box itself.
The job keeps a checkout of its own in `~/tinyburg-staging`, outside the
runner's workspace, so `.env`, `node_modules` and the Postgres data in `.dev`
survive between deploys. It checks out the commit if it is on main and
newer than the one deployed, decrypts that commit's `secrets/staging.env` into
`.env`, runs `pnpm install --frozen-lockfile` (the stack does not
install dependencies) and restarts the stack, a systemd user service it
installs as `tinyburg-staging`. Run the workflow by hand to redeploy without a
new commit. Logs are in `journalctl --user -u tinyburg-staging`.

The runner must run as an ordinary user, since Postgres refuses to run as root
(`sudo ./svc.sh install <user>` in the runner's directory), and that user needs
lingering so its services run without a login: `sudo loginctl enable-linger <user>`.

## Secrets

`secrets/staging.env` and `secrets/production.env` are the deployed `.env`
files, encrypted with [sops](https://github.com/getsops/sops): the variable
names stay readable and every value is encrypted. `.sops.yaml` says who can
decrypt each one, the maintainer's age key and the key of the GitHub
environment that deploys it, which is that environment's `SOPS_AGE_KEY` secret.
Each has its own signing keys, sealing keys, admin password and registration
token, never the dev ones.

Edit one with `sops secrets/staging.env` from the dev shell; sops finds the
maintainer key in `~/.config/sops/age/keys.txt`. After adding or replacing a
key in `.sops.yaml`, run `sops updatekeys secrets/<name>.env`. If a key leaks,
replace it and also change the values it could read: the old files stay in git
history.

Social Circles does not register itself, so after a first deploy register it
once with the registration token (the same call as in `.env.example`, with the
deployed redirect uri and an `Authorization: Bearer` header), then add its
client id and secret to the file.

## The Android shell

`nix develop .#android` is the default shell plus the Android SDK: platform
tools, the emulator, and Android 16 Google APIs system images for x86_64 and
arm64. It sets `ANDROID_HOME`. The first entry downloads about 4.2 GB. The
SDK is unfree and its license is accepted in `flake.nix`, for this shell's
nixpkgs only. See `packages/insight/README.md` for running insight on it.
