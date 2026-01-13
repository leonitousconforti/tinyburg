---
title: NimblebitConfig.ts
nav_order: 3
parent: Modules
---

## NimblebitConfig.ts overview

Configuration and schemas for authenticating with Nimblebit's cloud sync
service.

Since v1.0.0

---

## Exports Grouped by Category

- [Config](#config)
  - [AuthenticatedPlayerConfig](#authenticatedplayerconfig)
  - [NimblebitAuthKeyConfig](#nimblebitauthkeyconfig)
  - [PlayerAuthKeyConfig](#playerauthkeyconfig)
  - [PlayerConfig](#playerconfig)
  - [PlayerEmailConfig](#playeremailconfig)
  - [PlayerIdConfig](#playeridconfig)
  - [UnauthenticatedPlayerConfig](#unauthenticatedplayerconfig)
- [Schema](#schema)
  - [AuthenticatedPlayerSchema (class)](#authenticatedplayerschema-class)
  - [NimblebitAuthKeySchema (class)](#nimblebitauthkeyschema-class)
  - [PlayerAuthKeySchema (class)](#playerauthkeyschema-class)
  - [PlayerEmailSchema (class)](#playeremailschema-class)
  - [PlayerIdSchema (class)](#playeridschema-class)
  - [UnauthenticatedPlayerSchema (class)](#unauthenticatedplayerschema-class)

---

# Config

## AuthenticatedPlayerConfig

**Signature**

```ts
declare const AuthenticatedPlayerConfig: Config.Config<{
  readonly playerId: string & Brand<"PlayerId">
  readonly playerAuthKey: Redacted<string> & Brand<"PlayerAuthKey">
}>
```

[Source](https://github.com/leonitousconforti/tinyburg/packages/nimblebit-sdk/blob/main/src/NimblebitConfig.ts#L108)

Since v1.0.0

## NimblebitAuthKeyConfig

**Signature**

```ts
declare const NimblebitAuthKeyConfig: Config.Config<Redacted<string> & Brand<"NimblebitAuthKey">>
```

[Source](https://github.com/leonitousconforti/tinyburg/packages/nimblebit-sdk/blob/main/src/NimblebitConfig.ts#L159)

Since v1.0.0

## PlayerAuthKeyConfig

**Signature**

```ts
declare const PlayerAuthKeyConfig: Config.Config<Redacted<string> & Brand<"PlayerAuthKey">>
```

[Source](https://github.com/leonitousconforti/tinyburg/packages/nimblebit-sdk/blob/main/src/NimblebitConfig.ts#L90)

Since v1.0.0

## PlayerConfig

**Signature**

```ts
declare const PlayerConfig: Config.Config<
  | {
      readonly playerEmail: Redacted<string> & Brand<"PlayerEmail">
      readonly playerId?: (string & Brand<"PlayerId">) | undefined
    }
  | { readonly playerId: string & Brand<"PlayerId">; readonly playerAuthKey: Redacted<string> & Brand<"PlayerAuthKey"> }
>
```

[Source](https://github.com/leonitousconforti/tinyburg/packages/nimblebit-sdk/blob/main/src/NimblebitConfig.ts#L117)

Since v1.0.0

## PlayerEmailConfig

**Signature**

```ts
declare const PlayerEmailConfig: Config.Config<Redacted<string> & Brand<"PlayerEmail">>
```

[Source](https://github.com/leonitousconforti/tinyburg/packages/nimblebit-sdk/blob/main/src/NimblebitConfig.ts#L81)

Since v1.0.0

## PlayerIdConfig

**Signature**

```ts
declare const PlayerIdConfig: Config.Config<string & Brand<"PlayerId">>
```

[Source](https://github.com/leonitousconforti/tinyburg/packages/nimblebit-sdk/blob/main/src/NimblebitConfig.ts#L72)

Since v1.0.0

## UnauthenticatedPlayerConfig

**Signature**

```ts
declare const UnauthenticatedPlayerConfig: Config.Config<{
  readonly playerEmail: Redacted<string> & Brand<"PlayerEmail">
  readonly playerId?: (string & Brand<"PlayerId">) | undefined
}>
```

[Source](https://github.com/leonitousconforti/tinyburg/packages/nimblebit-sdk/blob/main/src/NimblebitConfig.ts#L99)

Since v1.0.0

# Schema

## AuthenticatedPlayerSchema (class)

**Signature**

```ts
declare class AuthenticatedPlayerSchema
```

[Source](https://github.com/leonitousconforti/tinyburg/packages/nimblebit-sdk/blob/main/src/NimblebitConfig.ts#L53)

Since v1.0.0

## NimblebitAuthKeySchema (class)

**Signature**

```ts
declare class NimblebitAuthKeySchema
```

[Source](https://github.com/leonitousconforti/tinyburg/packages/nimblebit-sdk/blob/main/src/NimblebitConfig.ts#L62)

Since v1.0.0

## PlayerAuthKeySchema (class)

**Signature**

```ts
declare class PlayerAuthKeySchema
```

[Source](https://github.com/leonitousconforti/tinyburg/packages/nimblebit-sdk/blob/main/src/NimblebitConfig.ts#L38)

Since v1.0.0

## PlayerEmailSchema (class)

**Signature**

```ts
declare class PlayerEmailSchema
```

[Source](https://github.com/leonitousconforti/tinyburg/packages/nimblebit-sdk/blob/main/src/NimblebitConfig.ts#L32)

Since v1.0.0

## PlayerIdSchema (class)

**Signature**

```ts
declare class PlayerIdSchema
```

[Source](https://github.com/leonitousconforti/tinyburg/packages/nimblebit-sdk/blob/main/src/NimblebitConfig.ts#L20)

Since v1.0.0

## UnauthenticatedPlayerSchema (class)

**Signature**

```ts
declare class UnauthenticatedPlayerSchema
```

[Source](https://github.com/leonitousconforti/tinyburg/packages/nimblebit-sdk/blob/main/src/NimblebitConfig.ts#L44)

Since v1.0.0
