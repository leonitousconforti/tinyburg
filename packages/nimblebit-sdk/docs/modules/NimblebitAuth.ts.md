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
  - [layerCustomHost](#layercustomhost)
  - [layerCustomHostConfig](#layercustomhostconfig)
  - [layerDirect](#layerdirect)
  - [layerDirectConfig](#layerdirectconfig)
  - [layerTinyburgAuthProxy](#layertinyburgauthproxy)
  - [layerTinyburgAuthProxyConfig](#layertinyburgauthproxyconfig)

---

# Auth

## NimblebitAuth (class)

**Signature**

```ts
declare class NimblebitAuth
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/nimblebit-sdk/src/NimblebitAuth.ts#L28)

Since v1.0.0

# Layer

## layerCustomHost

**Signature**

```ts
declare const layerCustomHost: (options: {
  host: string
  authKey: Redacted.Redacted
}) => Layer.Layer<NimblebitAuth, never, Crypto.Crypto>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/nimblebit-sdk/src/NimblebitAuth.ts#L246)

Since v1.0.0

## layerCustomHostConfig

**Signature**

```ts
declare const layerCustomHostConfig: (
  options: Config.Wrap<{ host: string; authKey: Redacted.Redacted }>
) => Layer.Layer<NimblebitAuth, Config.ConfigError, Crypto.Crypto>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/nimblebit-sdk/src/NimblebitAuth.ts#L255)

Since v1.0.0

## layerDirect

**Signature**

```ts
declare const layerDirect: (
  authKey: Schema.Schema.Type<typeof NimblebitConfig.NimblebitAuthKeySchema>
) => Layer.Layer<NimblebitAuth, never, Crypto.Crypto>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/nimblebit-sdk/src/NimblebitAuth.ts#L230)

Since v1.0.0

## layerDirectConfig

**Signature**

```ts
declare const layerDirectConfig: (
  config?: Config.Config<Schema.Schema.Type<typeof NimblebitConfig.NimblebitAuthKeySchema>>
) => Layer.Layer<NimblebitAuth, Config.ConfigError, Crypto.Crypto>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/nimblebit-sdk/src/NimblebitAuth.ts#L238)

Since v1.0.0

## layerTinyburgAuthProxy

**Signature**

```ts
declare const layerTinyburgAuthProxy: (options: {
  authKey: Redacted.Redacted
}) => Layer.Layer<NimblebitAuth, never, Crypto.Crypto>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/nimblebit-sdk/src/NimblebitAuth.ts#L266)

Since v1.0.0

## layerTinyburgAuthProxyConfig

**Signature**

```ts
declare const layerTinyburgAuthProxyConfig: (
  options: Config.Wrap<{ authKey: Redacted.Redacted }>
) => Layer.Layer<NimblebitAuth, Config.ConfigError, Crypto.Crypto>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/nimblebit-sdk/src/NimblebitAuth.ts#L274)

Since v1.0.0
