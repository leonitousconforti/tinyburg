---
title: NBSync.ts
nav_order: 5
parent: Modules
---

## NBSync.ts overview

Runs any Nimblebit Unity game under a generic NBSync agent and records what
it says to Nimblebit's sync server: every web request with its response,
every hash it computes (so the signed preimages), every call into its
NBSync classes, and the shape of those classes.

The run contains secrets: the game's signing secrets (in `statics` and in
the hashed inputs among `events`) and the throwaway player's auth key. Keep
raw runs out of anything shared; `Conformance` redacts them.

Since v1.0.0

---

## Exports Grouped by Category

- [Frida](#frida)
  - [layerAgent](#layeragent)
- [Models](#models)
  - [ProbeOptions (interface)](#probeoptions-interface)
  - [ProbeRun (class)](#proberun-class)
- [Probe](#probe)
  - [probe](#probe-1)

---

# Frida

## layerAgent

Spawns the game suspended, attaches in the emulated realm (the games ship
only ARM libraries), loads the NBSync agent and only then lets the game run,
so the agent's hooks are in before the game's first request.

**Signature**

```ts
declare const layerAgent: (
  bundleIdentifier: string
) => Layer.Layer<
  FridaScript.FridaScript | FridaSession.FridaSession | RpcClient.Protocol,
  FridaSessionError.FridaSessionError,
  FridaDevice.FridaDevice
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/insight/src/NBSync.ts#L51)

Since v1.0.0

# Models

## ProbeOptions (interface)

**Signature**

```ts
export interface ProbeOptions {
  /** How long the game runs on its own before anything is driven. */
  readonly settle?: Duration.Input | undefined
  /** Whether to call the game's read-only NBSync methods. */
  readonly drive?: boolean | undefined
  /**
   * Whether to also describe the game's network and sync classes (fields
   * and methods). Off by default: on a large game it is slow under the ARM
   * translator (18 minutes for LEGO Tower).
   */
  readonly classes?: boolean | undefined
  /** How long each driven call gets for its requests before the next. */
  readonly driveInterval?: Duration.Input | undefined
}
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/insight/src/NBSync.ts#L89)

Since v1.0.0

## ProbeRun (class)

Everything one run of a game recorded.

**Signature**

```ts
declare class ProbeRun
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/insight/src/NBSync.ts#L32)

Since v1.0.0

# Probe

## probe

Records one run of the game the agent is loaded into: its launch traffic,
then (unless disabled) each read-only NBSync method it has, called once with
the game's own player.

A failing driven call (the game crashing, say) ends the driving early; the
run keeps what was recorded until then.

**Signature**

```ts
declare const probe: (
  bundleIdentifier: string,
  options?: ProbeOptions | undefined
) => Effect.Effect<ProbeRun, Schema.SchemaError | RpcClientError.RpcClientError, RpcClient.Protocol | Scope.Scope>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/insight/src/NBSync.ts#L115)

Since v1.0.0
