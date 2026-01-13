---
title: index.ts
nav_order: 1
parent: "@tinyburg/insight"
---

## index.ts overview

---

## Exports Grouped by Category

- [Agent](#agent)
  - [AgentLive](#agentlive)
  - [AgentWatched](#agentwatched)
- [Frida](#frida)
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

[Source](https://github.com/leonitousconforti/tinyburg/packages/insight/blob/main/src/index.ts#L32)

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

[Source](https://github.com/leonitousconforti/tinyburg/packages/insight/blob/main/src/index.ts#L38)

Since v1.0.0

# Frida

## ScriptLive

**Signature**

```ts
declare const ScriptLive: Layer.Layer<
  FridaScript.FridaScript | FridaSession.FridaSession,
  FridaSessionError.FridaSessionError,
  FridaDevice.FridaDevice
>
```

[Source](https://github.com/leonitousconforti/tinyburg/packages/insight/blob/main/src/index.ts#L21)

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

[Source](https://github.com/leonitousconforti/tinyburg/packages/insight/blob/main/src/index.ts#L15)

Since v1.0.0
