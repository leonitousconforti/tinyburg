# @tinyburg/insight

## 0.4.0

### Minor Changes

- fd20e33: Each game SDK now keeps its agent and the scripts that load it in a `frida` folder, and insight keeps what they share. `shared/Rpcs` is now only `Version` (read from Unity's `Application.version`) and `SetFps`; `frida/Agent` has their handlers, helpers for reading il2cpp data and `serve`; and the new `node/Generate` has the helpers for an SDK's `pnpm generate`. Tiny Tower's own RPCs and agent move to tinytower-sdk. `DeviceLive`, `SessionLive`, `ScriptLive`, `AgentLive` and `AgentWatched` give way to `layerDevice(bundleIdentifier)`, which installs any game, `layerAgent(bundleIdentifier, agent)` and `watchAgent(bundleIdentifier, agent, effect)`, and `layerPlay` provides Google Play with an anonymous Aurora Store account.

### Patch Changes

- aa8a0e7: `waitForInstance` now waits for a static field that holds an array or a string, not only an object, and waits for il2cpp to initialize the class that declares the field before reading it, which would otherwise crash the game. It also returns the field's value.

## 0.3.0

### Minor Changes

- d5bfdc9: Run against an x86_64 emulator: the session attaches in Frida's emulated realm (TinyTower ships only ARM libraries, which run through Android's ARM translation there), the emulator starts `/data/local/tmp/frida-server` instead of a versioned arm64 build, and the SDK is found through `ANDROID_HOME` (as `@efffrida/frida-tools` does) instead of `ANDROID_SDK`.

### Patch Changes

- 8c5f5bd: Drop the direct `@bufbuild/protobuf` dependency. `@efffrida/gplayapi` depends on it itself.
- 2ec1bdc: Update `effect` to 4.1.2 and the `@efffrida/*` dependencies to the releases built for it. `DeviceLive` now restarts `frida-server` when it exits, at most 5 times, and sessions on the old server detach.
- aad505b: Update `frida` to 17.26.2 and the `@efffrida/*` dependencies to the releases built against it. 17.25.0 and 17.25.1 crashed Unity games on attach on Android, and 17.26.0 resolves exports of the game's own libraries in the emulated realm.
- d51822d: Export the node entry point as `@tinyburg/insight/node`, like `@efffrida/rpc/node`. The `@tinyburg/insight/node/index` path is no longer exported.

## 0.2.1

### Patch Changes

- 9b20bdc: Republish from the Release workflow to verify npm trusted publishing. No code changes.

## 0.2.0

### Minor Changes

- Move to Effect 4.1 and the latest `@efffrida` packages. BEHAVIOR CHANGE: `effect` 4.1.1 is now the peer dependency.

## 0.1.0

### Minor Changes

- b9b405a: New releases with new structures

## 0.0.1

### Patch Changes

- a766e8a: Bump tinytower version and regenerate data
