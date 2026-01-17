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
  - [layerNodeTinyburgAuthProxyConfig](#layernodetinyburgauthproxyconfig)
  - [layerWebCustomHost](#layerwebcustomhost)
  - [layerWebDirect](#layerwebdirect)
  - [layerWebDirectConfig](#layerwebdirectconfig)
  - [layerWebTinyburgAuthProxy](#layerwebtinyburgauthproxy)
  - [layerWebTinyburgAuthProxyConfig](#layerwebtinyburgauthproxyconfig)

---

# Auth

## NimblebitAuth (class)

**Signature**

```ts
declare class NimblebitAuth
```

[Source](https://github.com/leonitousconforti/tinyburg/packages/nimblebit-sdk/blob/main/src/NimblebitAuth.ts#L26)

Since v1.0.0

# Layer

## layerNodeCustomHost

**Signature**

```ts
declare const layerNodeCustomHost: (options: {
  host: string
  authKey: Redacted.Redacted<string>
}) => Layer.Layer<NimblebitAuth, never, never>
```

[Source](https://github.com/leonitousconforti/tinyburg/packages/nimblebit-sdk/blob/main/src/NimblebitAuth.ts#L232)

Since v1.0.0

## layerNodeDirect

**Signature**

```ts
declare const layerNodeDirect: (
  authKey: Schema.Schema.Type<NimblebitConfig.NimblebitAuthKeySchema>
) => Layer.Layer<NimblebitAuth, never, never>
```

[Source](https://github.com/leonitousconforti/tinyburg/packages/nimblebit-sdk/blob/main/src/NimblebitAuth.ts#L200)

Since v1.0.0

## layerNodeDirectConfig

**Signature**

```ts
declare const layerNodeDirectConfig: (
  config?: Config.Config<Schema.Schema.Type<NimblebitConfig.NimblebitAuthKeySchema>> | undefined
) => Layer.Layer<NimblebitAuth, ConfigError.ConfigError, never>
```

[Source](https://github.com/leonitousconforti/tinyburg/packages/nimblebit-sdk/blob/main/src/NimblebitAuth.ts#L216)

Since v1.0.0

## layerNodeTinyburgAuthProxy

**Signature**

```ts
declare const layerNodeTinyburgAuthProxy: (options: {
  authKey: Redacted.Redacted<string>
}) => Layer.Layer<NimblebitAuth, never, never>
```

[Source](https://github.com/leonitousconforti/tinyburg/packages/nimblebit-sdk/blob/main/src/NimblebitAuth.ts#L250)

Since v1.0.0

## layerNodeTinyburgAuthProxyConfig

**Signature**

```ts
declare const layerNodeTinyburgAuthProxyConfig: (
  options: Config.Config.Wrap<Parameters<typeof NimblebitAuth.NodeTinyburgAuthProxy>[0]>
) => Layer.Layer<NimblebitAuth, ConfigError.ConfigError, never>
```

[Source](https://github.com/leonitousconforti/tinyburg/packages/nimblebit-sdk/blob/main/src/NimblebitAuth.ts#L266)

Since v1.0.0

## layerWebCustomHost

**Signature**

```ts
declare const layerWebCustomHost: (options: {
  host: string
  authKey: Redacted.Redacted<string>
}) => Layer.Layer<NimblebitAuth, never, never>
```

[Source](https://github.com/leonitousconforti/tinyburg/packages/nimblebit-sdk/blob/main/src/NimblebitAuth.ts#L241)

Since v1.0.0

## layerWebDirect

**Signature**

```ts
declare const layerWebDirect: (
  authKey: Schema.Schema.Type<NimblebitConfig.NimblebitAuthKeySchema>
) => Layer.Layer<NimblebitAuth, never, never>
```

[Source](https://github.com/leonitousconforti/tinyburg/packages/nimblebit-sdk/blob/main/src/NimblebitAuth.ts#L208)

Since v1.0.0

## layerWebDirectConfig

**Signature**

```ts
declare const layerWebDirectConfig: (
  config?: Config.Config<Schema.Schema.Type<NimblebitConfig.NimblebitAuthKeySchema>> | undefined
) => Layer.Layer<NimblebitAuth, ConfigError.ConfigError, never>
```

[Source](https://github.com/leonitousconforti/tinyburg/packages/nimblebit-sdk/blob/main/src/NimblebitAuth.ts#L224)

Since v1.0.0

## layerWebTinyburgAuthProxy

**Signature**

```ts
declare const layerWebTinyburgAuthProxy: (options: {
  authKey: Redacted.Redacted<string>
}) => Layer.Layer<NimblebitAuth, never, never>
```

[Source](https://github.com/leonitousconforti/tinyburg/packages/nimblebit-sdk/blob/main/src/NimblebitAuth.ts#L258)

Since v1.0.0

## layerWebTinyburgAuthProxyConfig

**Signature**

```ts
declare const layerWebTinyburgAuthProxyConfig: (
  options: Config.Config.Wrap<Parameters<typeof NimblebitAuth.WebTinyburgAuthProxy>[0]>
) => Layer.Layer<NimblebitAuth, ConfigError.ConfigError, never>
```

[Source](https://github.com/leonitousconforti/tinyburg/packages/nimblebit-sdk/blob/main/src/NimblebitAuth.ts#L274)

Since v1.0.0
