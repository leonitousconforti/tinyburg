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

[Source](https://github.com/leonitousconforti/tinyburg/packages/nimblebit-sdk/blob/main/src/NimblebitAuth.ts#L26)

Since v1.0.0

# Layer

## layerCustomHost

**Signature**

```ts
declare const layerCustomHost: (options: {
  host: string
  authKey: Redacted.Redacted<string>
}) => Layer.Layer<NimblebitAuth, never, Crypto.Crypto>
```

[Source](https://github.com/leonitousconforti/tinyburg/packages/nimblebit-sdk/blob/main/src/NimblebitAuth.ts#L172)

Since v1.0.0

## layerDirect

**Signature**

```ts
declare const layerDirect: (
  authKey: Schema.Schema.Type<typeof NimblebitConfig.NimblebitAuthKeySchema>
) => Layer.Layer<NimblebitAuth, never, Crypto.Crypto>
```

[Source](https://github.com/leonitousconforti/tinyburg/packages/nimblebit-sdk/blob/main/src/NimblebitAuth.ts#L156)

Since v1.0.0

## layerDirectConfig

**Signature**

```ts
declare const layerDirectConfig: (
  config?: Config.Config<Schema.Schema.Type<typeof NimblebitConfig.NimblebitAuthKeySchema>> | undefined
) => Layer.Layer<NimblebitAuth, Config.ConfigError, Crypto.Crypto>
```

[Source](https://github.com/leonitousconforti/tinyburg/packages/nimblebit-sdk/blob/main/src/NimblebitAuth.ts#L164)

Since v1.0.0

## layerTinyburgAuthProxy

**Signature**

```ts
declare const layerTinyburgAuthProxy: (options: {
  authKey: Redacted.Redacted<string>
}) => Layer.Layer<NimblebitAuth, never, Crypto.Crypto>
```

[Source](https://github.com/leonitousconforti/tinyburg/packages/nimblebit-sdk/blob/main/src/NimblebitAuth.ts#L181)

Since v1.0.0

## layerTinyburgAuthProxyConfig

**Signature**

```ts
declare const layerTinyburgAuthProxyConfig: (
  options: Config.Wrap<Parameters<typeof NimblebitAuth.TinyburgAuthProxy>[0]>
) => Layer.Layer<NimblebitAuth, Config.ConfigError, Crypto.Crypto>
```

[Source](https://github.com/leonitousconforti/tinyburg/packages/nimblebit-sdk/blob/main/src/NimblebitAuth.ts#L189)

Since v1.0.0
