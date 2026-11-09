---
title: Scopes.ts
nav_order: 3
parent: Modules
---

## Scopes.ts overview

The scopes the TinyTower api is guarded by: `tinytower` for the whole game,
`tinytower:read` and `tinytower:write` for every endpoint that only looks or
that changes a player's game, and one scope per endpoint, such as
`tinytower:device:player_details`.

Each endpoint accepts its own scope, its side's and the game's, narrowest
first: `{ anyOf: [DevicePlayerDetails, Read, TinyTower] }`.

Since v1.0.0

---

## Exports Grouped by Category

- [Endpoints](#endpoints)
  - [DevicePlayerDetails](#deviceplayerdetails)
  - [DeviceRegisterEmail](#deviceregisteremail)
  - [DeviceVerifyDevice](#deviceverifydevice)
  - [RaffleCheckEntered](#rafflecheckentered)
  - [RaffleEnter](#raffleenter)
  - [RaffleEnterMulti](#raffleentermulti)
  - [SocialGetGifts](#socialgetgifts)
  - [SocialGetVisits](#socialgetvisits)
  - [SocialListFriendSnapshots](#sociallistfriendsnapshots)
  - [SocialPullFriendMeta](#socialpullfriendmeta)
  - [SocialPullFriendTower](#socialpullfriendtower)
  - [SocialReceiveGift](#socialreceivegift)
  - [SocialSendItem](#socialsenditem)
  - [SyncCheckVersion](#synccheckversion)
  - [SyncListSnapshots](#synclistsnapshots)
  - [SyncPullSave](#syncpullsave)
  - [SyncPullSnapshot](#syncpullsnapshot)
  - [SyncPushSave](#syncpushsave)
  - [SyncPushSnapshot](#syncpushsnapshot)
- [Game](#game)
  - [Read](#read)
  - [TinyTower](#tinytower)
  - [Write](#write)

---

# Endpoints

## DevicePlayerDetails

**Signature**

```ts
declare const DevicePlayerDetails: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/Scopes.ts#L47)

Since v1.0.0

## DeviceRegisterEmail

**Signature**

```ts
declare const DeviceRegisterEmail: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/Scopes.ts#L56)

Since v1.0.0

## DeviceVerifyDevice

**Signature**

```ts
declare const DeviceVerifyDevice: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/Scopes.ts#L65)

Since v1.0.0

## RaffleCheckEntered

**Signature**

```ts
declare const RaffleCheckEntered: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/Scopes.ts#L128)

Since v1.0.0

## RaffleEnter

**Signature**

```ts
declare const RaffleEnter: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/Scopes.ts#L137)

Since v1.0.0

## RaffleEnterMulti

**Signature**

```ts
declare const RaffleEnterMulti: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/Scopes.ts#L146)

Since v1.0.0

## SocialGetGifts

**Signature**

```ts
declare const SocialGetGifts: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/Scopes.ts#L155)

Since v1.0.0

## SocialGetVisits

**Signature**

```ts
declare const SocialGetVisits: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/Scopes.ts#L164)

Since v1.0.0

## SocialListFriendSnapshots

**Signature**

```ts
declare const SocialListFriendSnapshots: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/Scopes.ts#L191)

Since v1.0.0

## SocialPullFriendMeta

**Signature**

```ts
declare const SocialPullFriendMeta: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/Scopes.ts#L173)

Since v1.0.0

## SocialPullFriendTower

**Signature**

```ts
declare const SocialPullFriendTower: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/Scopes.ts#L182)

Since v1.0.0

## SocialReceiveGift

**Signature**

```ts
declare const SocialReceiveGift: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/Scopes.ts#L209)

Since v1.0.0

## SocialSendItem

**Signature**

```ts
declare const SocialSendItem: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/Scopes.ts#L200)

Since v1.0.0

## SyncCheckVersion

**Signature**

```ts
declare const SyncCheckVersion: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/Scopes.ts#L83)

Since v1.0.0

## SyncListSnapshots

**Signature**

```ts
declare const SyncListSnapshots: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/Scopes.ts#L101)

Since v1.0.0

## SyncPullSave

**Signature**

```ts
declare const SyncPullSave: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/Scopes.ts#L74)

Since v1.0.0

## SyncPullSnapshot

**Signature**

```ts
declare const SyncPullSnapshot: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/Scopes.ts#L92)

Since v1.0.0

## SyncPushSave

**Signature**

```ts
declare const SyncPushSave: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/Scopes.ts#L110)

Since v1.0.0

## SyncPushSnapshot

**Signature**

```ts
declare const SyncPushSnapshot: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/Scopes.ts#L119)

Since v1.0.0

# Game

## Read

**Signature**

```ts
declare const Read: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/Scopes.ts#L29)

Since v1.0.0

## TinyTower

**Signature**

```ts
declare const TinyTower: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/Scopes.ts#L20)

Since v1.0.0

## Write

**Signature**

```ts
declare const Write: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/Scopes.ts#L38)

Since v1.0.0
