---
title: index.ts
nav_order: 2
parent: "@tinyburg/insight"
---

## index.ts overview

---

## Exports Grouped by Category

- [Agent](#agent)
  - [layerAgent](#layeragent)
  - [watchAgent](#watchagent)
- [Frida](#frida)
  - [layerDevice](#layerdevice)
  - [layerPlay](#layerplay)

---

# Agent

## layerAgent

Starts the game and loads `agent` into it, with an RPC protocol to call the
agent over. The games ship only ARM libraries, which the x86_64 emulator
runs through Android's ARM translation, so the agent attaches in the
emulated realm, where that ARM code (libil2cpp.so among it) lives.

**Signature**

```ts
declare const layerAgent: (
  bundleIdentifier: string,
  agent: URL
) => Layer.Layer<
  FridaScript.FridaScript | FridaSession.FridaSession | RpcClient.Protocol,
  FridaSessionError.FridaSessionError,
  FridaDevice.FridaDevice
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/insight/src/index.ts#L45)

Since v1.0.0

## watchAgent

Like `layerAgent`, but reloads `agent` and reruns `effect` each time
the agent's source changes.

**Signature**

```ts
declare const watchAgent: <A, E, R>(
  bundleIdentifier: string,
  agent: URL,
  effect: Effect.Effect<A, E, R>
) => Stream.Stream<
  Exit.Exit<A, E | FridaSessionError.FridaSessionError>,
  FridaSessionError.FridaSessionError,
  | FridaDevice.FridaDevice
  | FileSystem.FileSystem
  | Exclude<Exclude<Exclude<R, RpcClient.Protocol>, FridaScript.FridaScript>, FridaSession.FridaSession>
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/insight/src/index.ts#L68)

Since v1.0.0

# Frida

## layerDevice

Boots the `Small_Phone` emulator and installs the given game on it, from
Google Play or from APK files already downloaded.

**Signature**

```ts
declare const layerDevice: (
  bundleIdentifier: string,
  options?: { readonly apks?: ReadonlyArray<string> | undefined }
) => Layer.Layer<
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

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/insight/src/index.ts#L115)

Since v1.0.0

## layerPlay

What `layerDevice` needs to download a game from Google Play: an
anonymous account from Aurora Store's dispenser, so no Google credentials
are needed. The hosted dispenser refuses datacenter ip ranges.

**Signature**

```ts
declare const layerPlay: Layer.Layer<
  HttpClient.HttpClient | AndroidDevice.AndroidDeviceService | PlayAccount.PlayAccount,
  Schema.SchemaError | PlatformError.PlatformError | PlatformError.BadArgument,
  FileSystem.FileSystem | Path.Path
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/insight/src/index.ts#L98)

Since v1.0.0
