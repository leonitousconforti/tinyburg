---
title: Scopes.ts
nav_order: 3
parent: "@tinyburg/tinytower-classic-sdk"
---

## Scopes.ts overview

The scopes the TinyTower Classic api is guarded by: `tinytowerclassic` for
the whole game, `tinytowerclassic:read` and `tinytowerclassic:write` for
every endpoint that only looks or that changes a player's game, and one scope
per endpoint, such as `tinytowerclassic:device:player_details`.

Each endpoint accepts its own scope, its side's and the game's, narrowest
first: `{ anyOf: [DevicePlayerDetails, Read, TinyTowerClassic] }`. They are
TinyTower's scopes under the `tinytowerclassic` game, with the same
descriptions.

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
  - [TinyTowerClassic](#tinytowerclassic)
  - [Write](#write)

---

# Endpoints

## DevicePlayerDetails

**Signature**

```ts
declare const DevicePlayerDetails: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-classic-sdk/src/Scopes.ts#L49)

Since v1.0.0

## DeviceRegisterEmail

**Signature**

```ts
declare const DeviceRegisterEmail: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-classic-sdk/src/Scopes.ts#L58)

Since v1.0.0

## DeviceVerifyDevice

**Signature**

```ts
declare const DeviceVerifyDevice: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-classic-sdk/src/Scopes.ts#L67)

Since v1.0.0

## RaffleCheckEntered

**Signature**

```ts
declare const RaffleCheckEntered: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-classic-sdk/src/Scopes.ts#L130)

Since v1.0.0

## RaffleEnter

**Signature**

```ts
declare const RaffleEnter: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-classic-sdk/src/Scopes.ts#L139)

Since v1.0.0

## RaffleEnterMulti

**Signature**

```ts
declare const RaffleEnterMulti: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-classic-sdk/src/Scopes.ts#L148)

Since v1.0.0

## SocialGetGifts

**Signature**

```ts
declare const SocialGetGifts: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-classic-sdk/src/Scopes.ts#L157)

Since v1.0.0

## SocialGetVisits

**Signature**

```ts
declare const SocialGetVisits: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-classic-sdk/src/Scopes.ts#L166)

Since v1.0.0

## SocialListFriendSnapshots

**Signature**

```ts
declare const SocialListFriendSnapshots: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-classic-sdk/src/Scopes.ts#L193)

Since v1.0.0

## SocialPullFriendMeta

**Signature**

```ts
declare const SocialPullFriendMeta: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-classic-sdk/src/Scopes.ts#L175)

Since v1.0.0

## SocialPullFriendTower

**Signature**

```ts
declare const SocialPullFriendTower: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-classic-sdk/src/Scopes.ts#L184)

Since v1.0.0

## SocialReceiveGift

**Signature**

```ts
declare const SocialReceiveGift: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-classic-sdk/src/Scopes.ts#L211)

Since v1.0.0

## SocialSendItem

**Signature**

```ts
declare const SocialSendItem: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-classic-sdk/src/Scopes.ts#L202)

Since v1.0.0

## SyncCheckVersion

**Signature**

```ts
declare const SyncCheckVersion: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-classic-sdk/src/Scopes.ts#L85)

Since v1.0.0

## SyncListSnapshots

**Signature**

```ts
declare const SyncListSnapshots: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-classic-sdk/src/Scopes.ts#L103)

Since v1.0.0

## SyncPullSave

**Signature**

```ts
declare const SyncPullSave: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-classic-sdk/src/Scopes.ts#L76)

Since v1.0.0

## SyncPullSnapshot

**Signature**

```ts
declare const SyncPullSnapshot: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-classic-sdk/src/Scopes.ts#L94)

Since v1.0.0

## SyncPushSave

**Signature**

```ts
declare const SyncPushSave: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-classic-sdk/src/Scopes.ts#L112)

Since v1.0.0

## SyncPushSnapshot

**Signature**

```ts
declare const SyncPushSnapshot: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-classic-sdk/src/Scopes.ts#L121)

Since v1.0.0

# Game

## Read

**Signature**

```ts
declare const Read: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-classic-sdk/src/Scopes.ts#L31)

Since v1.0.0

## TinyTowerClassic

**Signature**

```ts
declare const TinyTowerClassic: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-classic-sdk/src/Scopes.ts#L22)

Since v1.0.0

## Write

**Signature**

```ts
declare const Write: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-classic-sdk/src/Scopes.ts#L40)

Since v1.0.0
