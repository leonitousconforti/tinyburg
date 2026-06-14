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

[Source](https://github.com/leonitousconforti/tinyburg/packages/insight/blob/main/src/index.ts#L58)

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

[Source](https://github.com/leonitousconforti/tinyburg/packages/insight/blob/main/src/index.ts#L64)

Since v1.0.0

# Frida

## DeviceLive

**Signature**

```ts
declare const DeviceLive: Layer.Layer<
  FridaDevice.FridaDevice,
  | Config.ConfigError
  | FridaDeviceAcquisitionError.FridaDeviceAcquisitionError
  | HttpClientError.HttpClientError
  | Schema.SchemaError
  | PlatformError.PlatformError
  | Cause.NoSuchElementError,
  | FileSystem.FileSystem
  | ChildProcessSpawner.ChildProcessSpawner
  | Path.Path
  | HttpClient.HttpClient
  | GooglePlayApi.AndroidDeviceService
  | Crypto.Crypto
>
```

[Source](https://github.com/leonitousconforti/tinyburg/packages/insight/blob/main/src/index.ts#L83)

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

[Source](https://github.com/leonitousconforti/tinyburg/packages/insight/blob/main/src/index.ts#L47)

Since v1.0.0

## SessionLive

**Signature**

```ts
declare const SessionLive: Layer.Layer<
  FridaSession.FridaSession,
  FridaSessionError.FridaSessionError,
  FridaDevice.FridaDevice
>
```

[Source](https://github.com/leonitousconforti/tinyburg/packages/insight/blob/main/src/index.ts#L41)

Since v1.0.0
