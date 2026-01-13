---
title: NimblebitAuth.ts
nav_order: 2
parent: Modules
---

## NimblebitAuth.ts overview

Authentication providers for connecting to Nimblebit's servers.

Since v1.0.0

---

## Exports Grouped by Category

- [Auth](#auth)
  - [NimblebitAuth (class)](#nimblebitauth-class)
- [Layer](#layer)
  - [layerNodeCustomHost](#layernodecustomhost)
  - [layerNodeDirect](#layernodedirect)
  - [layerNodeDirectConfig](#layernodedirectconfig)
  - [layerNodeTinyburgAuthProxy](#layernodetinyburgauthproxy)
  - [layerWebCustomHost](#layerwebcustomhost)
  - [layerWebDirect](#layerwebdirect)
  - [layerWebDirectConfig](#layerwebdirectconfig)
  - [layerWebTinyburgAuthProxy](#layerwebtinyburgauthproxy)

---

# Auth

## NimblebitAuth (class)

**Signature**

```ts
declare class NimblebitAuth
```

[Source](https://github.com/leonitousconforti/tinyburg/packages/nimblebit-sdk/blob/main/src/NimblebitAuth.ts#L25)

Since v1.0.0

# Layer

## layerNodeCustomHost

**Signature**

```ts
declare const layerNodeCustomHost: ({
  authKey,
  host
}: {
  host: string
  authKey: Redacted.Redacted<string>
}) => Layer.Layer<NimblebitAuth, never, never>
```

[Source](https://github.com/leonitousconforti/tinyburg/packages/nimblebit-sdk/blob/main/src/NimblebitAuth.ts#L225)

Since v1.0.0

## layerNodeDirect

**Signature**

```ts
declare const layerNodeDirect: ({
  authKey
}: {
  authKey: Schema.Schema.Type<NimblebitConfig.NimblebitAuthKeySchema>
}) => Layer.Layer<NimblebitAuth, never, never>
```

[Source](https://github.com/leonitousconforti/tinyburg/packages/nimblebit-sdk/blob/main/src/NimblebitAuth.ts#L189)

Since v1.0.0

## layerNodeDirectConfig

**Signature**

```ts
declare const layerNodeDirectConfig: (
  config: Config.Config<Schema.Schema.Type<NimblebitConfig.NimblebitAuthKeySchema>>
) => Layer.Layer<NimblebitAuth, ConfigError.ConfigError, never>
```

[Source](https://github.com/leonitousconforti/tinyburg/packages/nimblebit-sdk/blob/main/src/NimblebitAuth.ts#L209)

Since v1.0.0

## layerNodeTinyburgAuthProxy

**Signature**

```ts
declare const layerNodeTinyburgAuthProxy: ({
  authKey
}: {
  authKey: Redacted.Redacted<string>
}) => Layer.Layer<NimblebitAuth, never, never>
```

[Source](https://github.com/leonitousconforti/tinyburg/packages/nimblebit-sdk/blob/main/src/NimblebitAuth.ts#L249)

Since v1.0.0

## layerWebCustomHost

**Signature**

```ts
declare const layerWebCustomHost: ({
  authKey,
  host
}: {
  host: string
  authKey: Redacted.Redacted<string>
}) => Layer.Layer<NimblebitAuth, never, never>
```

[Source](https://github.com/leonitousconforti/tinyburg/packages/nimblebit-sdk/blob/main/src/NimblebitAuth.ts#L237)

Since v1.0.0

## layerWebDirect

**Signature**

```ts
declare const layerWebDirect: ({
  authKey
}: {
  authKey: Schema.Schema.Type<NimblebitConfig.NimblebitAuthKeySchema>
}) => Layer.Layer<NimblebitAuth, never, never>
```

[Source](https://github.com/leonitousconforti/tinyburg/packages/nimblebit-sdk/blob/main/src/NimblebitAuth.ts#L199)

Since v1.0.0

## layerWebDirectConfig

**Signature**

```ts
declare const layerWebDirectConfig: (
  config: Config.Config<Schema.Schema.Type<NimblebitConfig.NimblebitAuthKeySchema>>
) => Layer.Layer<NimblebitAuth, ConfigError.ConfigError, never>
```

[Source](https://github.com/leonitousconforti/tinyburg/packages/nimblebit-sdk/blob/main/src/NimblebitAuth.ts#L217)

Since v1.0.0

## layerWebTinyburgAuthProxy

**Signature**

```ts
declare const layerWebTinyburgAuthProxy: ({
  authKey
}: {
  authKey: Redacted.Redacted<string>
}) => Layer.Layer<NimblebitAuth, never, never>
```

[Source](https://github.com/leonitousconforti/tinyburg/packages/nimblebit-sdk/blob/main/src/NimblebitAuth.ts#L259)

Since v1.0.0
