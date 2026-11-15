# @tinyburg/insight

provides information into and about TinyTower using frida.

## Running it

insight drives TinyTower on an Android emulator: an x86_64 Android 16 image,
where the game's ARM-only libraries run through Android's ARM translation and
the agent attaches in Frida's emulated realm. The emulator refuses arm64
images on an x86_64 host, and Android 14's translator kills the game on
instructions it does not support.

1. Enter the Android shell from the repository root: `nix develop .#android`.
   It carries the SDK, the emulator and the system image, and sets
   `ANDROID_HOME`.
2. The emulator needs `/dev/kvm`. In a Proxmox container, pass it through on
   the host with `pct set <id> --dev0 /dev/kvm,mode=0666` and restart the
   container.
3. Once: `packages/insight/scripts/setup-avd.sh` creates the `Small_Phone`
   AVD with 4 GB of RAM and puts a `frida-server` matching the `frida`
   package at `/data/local/tmp/frida-server`, then saves a snapshot that
   insight boots from. Rerun it after updating the flake: a new emulator or
   system image makes the snapshot unusable, and insight falls back to a full
   boot. Rerun it after updating `frida` too, so the server matches.

`layerDevice(bundleIdentifier)` (from `@tinyburg/insight/node`) then boots
`Small_Phone` read-only, installs the game from Google Play and starts
`frida-server`, restarting it (at most 5 times) if it exits. Sessions on a
crashed server detach, and `pnpm generate` then retries with a new session.

## A game's own agent

Each game SDK keeps what runs against its game in a `frida` folder:

- `Rpcs.ts`: the RPCs its agent serves, insight's own (`Version` and
  `SetFps`, from `@tinyburg/insight/shared/Rpcs`) merged with the game's.
- `Agent.ts`: the agent, built from `@tinyburg/insight/frida/Agent`, which
  has the handlers for insight's own RPCs, helpers for reading a Nimblebit
  game's il2cpp data, and `serve`.
- `Generate.ts` (`pnpm generate`): regenerates some of the SDK's source files
  from what the agent reads, with `@tinyburg/insight/node/Generate`. It skips
  a game whose files are from its current version on Google Play, unless run
  with `--force`.
- `tsconfig.json`: for Frida's compiler only. TypeScript emits nothing for a
  `.ts` file it reached through `node_modules`, so it maps
  `@tinyburg/insight/*` to insight's sources.

Every game SDK with an Android build has one: tinytower-sdk, pocket-planes-sdk,
pocket-trains-sdk, lego-tower-sdk, disco-zoo-sdk, bitcity-sdk and
tinytower-vegas-sdk. tinytower-classic-sdk has none, because Google Play's
anonymous accounts cannot download the paid game.

## Probing any Nimblebit game

`@tinyburg/insight/node/NBSync` runs any of Nimblebit's Unity games (Pocket
Planes, Pocket Trains, LEGO Tower, Disco Zoo, Bit City, Tiny Tower Vegas and
TinyTower itself) under a game-agnostic agent and records what the game says
to Nimblebit's sync server:

- `layerDevice(bundleIdentifier)` (from `@tinyburg/insight/node`) boots
  `Small_Phone` and installs the game.
- `NBSync.layerAgent(bundleIdentifier)` spawns it suspended, loads the agent
  and only then lets it run. The agent hooks UnityWebRequest, WWW, WWWForm,
  HashAlgorithm.ComputeHash and every method of the game's NBSync classes from
  inside `il2cpp_init`, so it sees the game's first request.
- `NBSync.probe(bundleIdentifier)` lets the game start up, then calls each of
  its read-only NBSync methods once (save checks, friend saves and meta,
  player details, items, visits, mailbox, snapshots) and returns every
  request, response and hashed preimage it saw. With `classes: true` it also
  describes the game's network and sync classes, which is slow on a large game
  (18 minutes for LEGO Tower).

A run contains the game's signing secrets and the throwaway player's key, so
keep raw runs to yourself.

Two things about the ARM translation shape the agent. A JS thread left
attached to il2cpp crashed the probed games at their next garbage collection,
so every call from the JS thread detaches afterwards. And a managed exception
thrown into Frida aborts the game, so driven methods get real callbacks and
third-party login flows (LEGO Life, Facebook, Game Center, Play Games) are
never driven.

`@tinyburg/insight/node/Metadata` reads the URL paths compiled into a game
from its APK, including the ones a run never exercises.

Save uploads are not covered: the games hand them to a Java plugin
(`com.nimblebit.nbsync.SyncPush`) outside the il2cpp code the agent hooks.
