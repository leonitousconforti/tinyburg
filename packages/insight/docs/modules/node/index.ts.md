---
title: index.ts
nav_order: 1
parent: Modules
---

## index.ts overview

---

## Exports Grouped by Category

- [Agent](#agent)
  - [AgentLive](#agentlive)
  - [AgentWatched](#agentwatched)
- [Frida](#frida)
  - [DeviceLive](#devicelive)
  - [ScriptLive](#scriptlive)
  - [SessionLive](#sessionlive)

---

# Agent

## AgentLive

**Signature**

```ts
declare const AgentLive: Layer.Layer<
  RpcClient.Protocol | FridaScript.FridaScript | FridaSession.FridaSession,
  FridaSessionError.FridaSessionError,
  FridaDevice.FridaDevice
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/insight/src/index.ts#L70)

Since v1.0.0

## AgentWatched

**Signature**

```ts
declare const AgentWatched: <A, E, R>(
  effect: Effect.Effect<A, E, R>
) => Stream.Stream<
  Exit.Exit<A, E | FridaSessionError.FridaSessionError>,
  FridaSessionError.FridaSessionError,
  | FridaDevice.FridaDevice
  | FileSystem.FileSystem
  | Exclude<Exclude<Exclude<R, RpcClient.Protocol>, FridaScript.FridaScript>, FridaSession.FridaSession>
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/insight/src/index.ts#L80)

Since v1.0.0

# Frida

## DeviceLive

**Signature**

```ts
declare const DeviceLive: Layer.Layer<
  FridaDevice.FridaDevice,
  | Config.ConfigError
  | EncodingError.EncodingError
  | FridaDeviceAcquisitionError.FridaDeviceAcquisitionError
  | HttpClientError.HttpClientError
  | Schema.SchemaError
  | PlatformError.PlatformError
  | Cause.NoSuchElementError
  | PlayAccount.PlayAccountError,
  | FileSystem.FileSystem
  | ChildProcessSpawner.ChildProcessSpawner
  | Path.Path
  | HttpClient.HttpClient
  | AndroidDevice.AndroidDeviceService
  | PlayAccount.PlayAccount
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/insight/src/index.ts#L102)

Since v1.0.0

## ScriptLive

**Signature**

```ts
declare const ScriptLive: Layer.Layer<
  FridaScript.FridaScript | FridaSession.FridaSession,
  FridaSessionError.FridaSessionError,
  FridaDevice.FridaDevice
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/insight/src/index.ts#L55)

Since v1.0.0

## SessionLive

TinyTower ships only ARM libraries, which the x86_64 emulator runs through
Android's ARM translation. The agent attaches in the emulated realm, where
that ARM code (libil2cpp.so among it) lives.

**Signature**

```ts
declare const SessionLive: Layer.Layer<
  FridaSession.FridaSession,
  FridaSessionError.FridaSessionError,
  FridaDevice.FridaDevice
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/insight/src/index.ts#L45)

Since v1.0.0
