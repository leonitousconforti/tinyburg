---
title: Scopes.ts
nav_order: 3
parent: "@tinyburg/pocket-trains-sdk"
---

## Scopes.ts overview

The scopes the Pocket Trains api is guarded by: `pockettrains` for the whole
game, `pockettrains:read` and `pockettrains:write` for every endpoint that
only looks or that changes a player's game, a `:read` and a `:write` scope
for each area of the api, such as `pockettrains:device:read`, and one scope
per endpoint, such as `pockettrains:device:player_details`.

Each endpoint accepts its own scope, its area's side, the game's side and the
game, narrowest first:
`{ anyOf: [DevicePlayerDetails, DeviceRead, Read, PocketTrains] }`. An
endpoint this module has no scope for is left unscoped, and the authproxy
guards it with `pockettrains:read` or `pockettrains`.

Since v1.0.0

---

## Exports Grouped by Category

- [Device](#device)
  - [DevicePlayerDetails](#deviceplayerdetails)
  - [DeviceRead](#deviceread)
  - [DeviceVerifyDevice](#deviceverifydevice)
  - [DeviceWrite](#devicewrite)
- [Game](#game)
  - [PocketTrains](#pockettrains)
  - [Read](#read)
  - [Write](#write)
- [Social](#social)
  - [SocialGetGiftsPt](#socialgetgiftspt)
  - [SocialGetItems](#socialgetitems)
  - [SocialPullFriendGame](#socialpullfriendgame)
  - [SocialPullFriendMeta](#socialpullfriendmeta)
  - [SocialRead](#socialread)
  - [SocialSendItem](#socialsenditem)
  - [SocialWrite](#socialwrite)

---

# Device

## DevicePlayerDetails

**Signature**

```ts
declare const DevicePlayerDetails: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/pocket-trains-sdk/src/Scopes.ts#L69)

Since v1.0.0

## DeviceRead

**Signature**

```ts
declare const DeviceRead: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/pocket-trains-sdk/src/Scopes.ts#L51)

Since v1.0.0

## DeviceVerifyDevice

**Signature**

```ts
declare const DeviceVerifyDevice: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/pocket-trains-sdk/src/Scopes.ts#L78)

Since v1.0.0

## DeviceWrite

**Signature**

```ts
declare const DeviceWrite: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/pocket-trains-sdk/src/Scopes.ts#L60)

Since v1.0.0

# Game

## PocketTrains

**Signature**

```ts
declare const PocketTrains: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/pocket-trains-sdk/src/Scopes.ts#L24)

Since v1.0.0

## Read

**Signature**

```ts
declare const Read: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/pocket-trains-sdk/src/Scopes.ts#L33)

Since v1.0.0

## Write

**Signature**

```ts
declare const Write: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/pocket-trains-sdk/src/Scopes.ts#L42)

Since v1.0.0

# Social

## SocialGetGiftsPt

**Signature**

```ts
declare const SocialGetGiftsPt: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/pocket-trains-sdk/src/Scopes.ts#L114)

Since v1.0.0

## SocialGetItems

**Signature**

```ts
declare const SocialGetItems: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/pocket-trains-sdk/src/Scopes.ts#L105)

Since v1.0.0

## SocialPullFriendGame

**Signature**

```ts
declare const SocialPullFriendGame: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/pocket-trains-sdk/src/Scopes.ts#L123)

Since v1.0.0

## SocialPullFriendMeta

**Signature**

```ts
declare const SocialPullFriendMeta: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/pocket-trains-sdk/src/Scopes.ts#L132)

Since v1.0.0

## SocialRead

**Signature**

```ts
declare const SocialRead: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/pocket-trains-sdk/src/Scopes.ts#L87)

Since v1.0.0

## SocialSendItem

**Signature**

```ts
declare const SocialSendItem: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/pocket-trains-sdk/src/Scopes.ts#L141)

Since v1.0.0

## SocialWrite

**Signature**

```ts
declare const SocialWrite: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/pocket-trains-sdk/src/Scopes.ts#L96)

Since v1.0.0
