---
title: NimblebitConfig.ts
nav_order: 3
parent: "@tinyburg/nimblebit-sdk"
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
  - [AuthenticatedPlayerSchema](#authenticatedplayerschema)
  - [NimblebitAuthKeySchema](#nimblebitauthkeyschema)
  - [PlayerAuthKeySchema](#playerauthkeyschema)
  - [PlayerEmailSchema](#playeremailschema)
  - [PlayerIdSchema](#playeridschema)
  - [UnauthenticatedPlayerSchema](#unauthenticatedplayerschema)

---

# Config

## AuthenticatedPlayerConfig

**Signature**

```ts
declare const AuthenticatedPlayerConfig: Config.Config<{
  readonly playerAuthKey: Redacted<string> & Brand<"PlayerAuthKey">
  readonly playerId: string & Brand<"PlayerId">
}>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/nimblebit-sdk/src/NimblebitConfig.ts#L107)

Since v1.0.0

## NimblebitAuthKeyConfig

**Signature**

```ts
declare const NimblebitAuthKeyConfig: Config.Config<Redacted<string> & Brand<"NimblebitAuthKey">>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/nimblebit-sdk/src/NimblebitConfig.ts#L167)

Since v1.0.0

## PlayerAuthKeyConfig

**Signature**

```ts
declare const PlayerAuthKeyConfig: Config.Config<Redacted<string> & Brand<"PlayerAuthKey">>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/nimblebit-sdk/src/NimblebitConfig.ts#L88)

Since v1.0.0

## PlayerConfig

**Signature**

```ts
declare const PlayerConfig: Config.Config<
  | {
      readonly playerEmail: Redacted<string> & Brand<"PlayerEmail">
      readonly playerId?: (string & Brand<"PlayerId">) | undefined
    }
  | { readonly playerAuthKey: Redacted<string> & Brand<"PlayerAuthKey">; readonly playerId: string & Brand<"PlayerId"> }
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/nimblebit-sdk/src/NimblebitConfig.ts#L117)

Since v1.0.0

## PlayerEmailConfig

**Signature**

```ts
declare const PlayerEmailConfig: Config.Config<Redacted<string> & Brand<"PlayerEmail">>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/nimblebit-sdk/src/NimblebitConfig.ts#L79)

Since v1.0.0

## PlayerIdConfig

**Signature**

```ts
declare const PlayerIdConfig: Config.Config<string & Brand<"PlayerId">>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/nimblebit-sdk/src/NimblebitConfig.ts#L70)

Since v1.0.0

## UnauthenticatedPlayerConfig

**Signature**

```ts
declare const UnauthenticatedPlayerConfig: Config.Config<{
  readonly playerEmail: Redacted<string> & Brand<"PlayerEmail">
  readonly playerId?: (string & Brand<"PlayerId">) | undefined
}>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/nimblebit-sdk/src/NimblebitConfig.ts#L97)

Since v1.0.0

# Schema

## AuthenticatedPlayerSchema

**Signature**

```ts
declare const AuthenticatedPlayerSchema: Schema.Struct<{
  readonly playerAuthKey: Schema.brand<Schema.RedactedFromValue<Schema.String>, "PlayerAuthKey">
  readonly playerId: Schema.brand<Schema.String, "PlayerId">
}>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/nimblebit-sdk/src/NimblebitConfig.ts#L55)

Since v1.0.0

## NimblebitAuthKeySchema

**Signature**

```ts
declare const NimblebitAuthKeySchema: Schema.brand<Schema.RedactedFromValue<Schema.String>, "NimblebitAuthKey">
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/nimblebit-sdk/src/NimblebitConfig.ts#L64)

Since v1.0.0

## PlayerAuthKeySchema

**Signature**

```ts
declare const PlayerAuthKeySchema: Schema.brand<Schema.RedactedFromValue<Schema.String>, "PlayerAuthKey">
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/nimblebit-sdk/src/NimblebitConfig.ts#L36)

Since v1.0.0

## PlayerEmailSchema

**Signature**

```ts
declare const PlayerEmailSchema: Schema.brand<Schema.RedactedFromValue<Schema.String>, "PlayerEmail">
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/nimblebit-sdk/src/NimblebitConfig.ts#L30)

Since v1.0.0

## PlayerIdSchema

**Signature**

```ts
declare const PlayerIdSchema: Schema.brand<Schema.String, "PlayerId">
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/nimblebit-sdk/src/NimblebitConfig.ts#L19)

Since v1.0.0

## UnauthenticatedPlayerSchema

**Signature**

```ts
declare const UnauthenticatedPlayerSchema: Schema.Struct<{
  readonly playerId: Schema.optional<Schema.brand<Schema.String, "PlayerId">>
  readonly playerEmail: Schema.brand<Schema.RedactedFromValue<Schema.String>, "PlayerEmail">
}>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/nimblebit-sdk/src/NimblebitConfig.ts#L46)

Since v1.0.0
