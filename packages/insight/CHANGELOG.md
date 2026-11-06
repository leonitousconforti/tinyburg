# @tinyburg/insight

## 0.3.0

### Minor Changes

- d5bfdc9: Run against an x86_64 emulator: the session attaches in Frida's emulated realm (TinyTower ships only ARM libraries, which run through Android's ARM translation there), the emulator starts `/data/local/tmp/frida-server` instead of a versioned arm64 build, and the SDK is found through `ANDROID_HOME` (as `@efffrida/frida-tools` does) instead of `ANDROID_SDK`.

### Patch Changes

- b3011f7: Update the `@efffrida/*` dependencies to the releases built for effect 4.1.1.
- aad505b: Update `frida` to 17.26.0 and the `@efffrida/*` dependencies to the releases built against it. 17.25.0 and 17.25.1 crashed Unity games on attach on Android, and 17.26.0 resolves exports of the game's own libraries in the emulated realm.
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
