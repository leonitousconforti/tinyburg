---
title: Scopes.ts
nav_order: 3
parent: Modules
---

## Scopes.ts overview

The scopes the LEGO Tower api is guarded by: `legotower` for the whole game,
`legotower:read` and `legotower:write` for every endpoint that only looks or
that changes a player's game, and one scope per endpoint, such as
`legotower:device:player_details`.

Each endpoint accepts its own scope, its side's and the game's, narrowest
first: `{ anyOf: [DevicePlayerDetails, Read, LEGOTower] }`. An endpoint this
module has no scope for is left unscoped, and the authproxy guards it with
`legotower:read` or `legotower`.

Since v1.0.0

---

## Exports Grouped by Category

- [Endpoints](#endpoints)
  - [DevicePlayerDetails](#deviceplayerdetails)
  - [DeviceVerifyDevice](#deviceverifydevice)
  - [SocialGetItems](#socialgetitems)
  - [SocialGetVisits](#socialgetvisits)
  - [SocialPullFriendGame](#socialpullfriendgame)
  - [SocialPullFriendMeta](#socialpullfriendmeta)
  - [SocialSendItem](#socialsenditem)
- [Game](#game)
  - [LEGOTower](#legotower)
  - [Read](#read)
  - [Write](#write)

---

# Endpoints

## DevicePlayerDetails

**Signature**

```ts
declare const DevicePlayerDetails: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/lego-tower-sdk/src/Scopes.ts#L49)

Since v1.0.0

## DeviceVerifyDevice

**Signature**

```ts
declare const DeviceVerifyDevice: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/lego-tower-sdk/src/Scopes.ts#L58)

Since v1.0.0

## SocialGetItems

**Signature**

```ts
declare const SocialGetItems: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/lego-tower-sdk/src/Scopes.ts#L67)

Since v1.0.0

## SocialGetVisits

**Signature**

```ts
declare const SocialGetVisits: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/lego-tower-sdk/src/Scopes.ts#L76)

Since v1.0.0

## SocialPullFriendGame

**Signature**

```ts
declare const SocialPullFriendGame: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/lego-tower-sdk/src/Scopes.ts#L85)

Since v1.0.0

## SocialPullFriendMeta

**Signature**

```ts
declare const SocialPullFriendMeta: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/lego-tower-sdk/src/Scopes.ts#L94)

Since v1.0.0

## SocialSendItem

**Signature**

```ts
declare const SocialSendItem: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/lego-tower-sdk/src/Scopes.ts#L103)

Since v1.0.0

# Game

## LEGOTower

**Signature**

```ts
declare const LEGOTower: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/lego-tower-sdk/src/Scopes.ts#L22)

Since v1.0.0

## Read

**Signature**

```ts
declare const Read: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/lego-tower-sdk/src/Scopes.ts#L31)

Since v1.0.0

## Write

**Signature**

```ts
declare const Write: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/lego-tower-sdk/src/Scopes.ts#L40)

Since v1.0.0
