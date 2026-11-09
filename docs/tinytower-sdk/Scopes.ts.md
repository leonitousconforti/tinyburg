---
title: Scopes.ts
nav_order: 3
parent: "@tinyburg/tinytower-sdk"
---

## Scopes.ts overview

The scopes the TinyTower api is guarded by: `tinytower` for the whole game,
`tinytower:read` and `tinytower:write` for every endpoint that only looks or
that changes a player's game, a `:read` and a `:write` scope for each area of
the api, such as `tinytower:device:read`, and one scope per endpoint, such as
`tinytower:device:player_details`.

Each endpoint accepts its own scope, its area's side, the game's side and the
game, narrowest first:
`{ anyOf: [DevicePlayerDetails, DeviceRead, Read, TinyTower] }`.

Since v1.0.0

---

## Exports Grouped by Category

- [Device](#device)
  - [DevicePlayerDetails](#deviceplayerdetails)
  - [DeviceRead](#deviceread)
  - [DeviceRegisterEmail](#deviceregisteremail)
  - [DeviceVerifyDevice](#deviceverifydevice)
  - [DeviceWrite](#devicewrite)
- [Game](#game)
  - [Read](#read)
  - [TinyTower](#tinytower)
  - [Write](#write)
- [Raffle](#raffle)
  - [RaffleCheckEntered](#rafflecheckentered)
  - [RaffleEnter](#raffleenter)
  - [RaffleEnterMulti](#raffleentermulti)
  - [RaffleRead](#raffleread)
  - [RaffleWrite](#rafflewrite)
- [Social](#social)
  - [SocialGetGifts](#socialgetgifts)
  - [SocialGetVisits](#socialgetvisits)
  - [SocialListFriendSnapshots](#sociallistfriendsnapshots)
  - [SocialPullFriendMeta](#socialpullfriendmeta)
  - [SocialPullFriendTower](#socialpullfriendtower)
  - [SocialRead](#socialread)
  - [SocialReceiveGift](#socialreceivegift)
  - [SocialSendItem](#socialsenditem)
  - [SocialWrite](#socialwrite)
- [Sync](#sync)
  - [SyncCheckVersion](#synccheckversion)
  - [SyncListSnapshots](#synclistsnapshots)
  - [SyncPullSave](#syncpullsave)
  - [SyncPullSnapshot](#syncpullsnapshot)
  - [SyncPushSave](#syncpushsave)
  - [SyncPushSnapshot](#syncpushsnapshot)
  - [SyncRead](#syncread)
  - [SyncWrite](#syncwrite)

---

# Device

## DevicePlayerDetails

**Signature**

```ts
declare const DevicePlayerDetails: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/Scopes.ts#L67)

Since v1.0.0

## DeviceRead

**Signature**

```ts
declare const DeviceRead: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/Scopes.ts#L49)

Since v1.0.0

## DeviceRegisterEmail

**Signature**

```ts
declare const DeviceRegisterEmail: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/Scopes.ts#L76)

Since v1.0.0

## DeviceVerifyDevice

**Signature**

```ts
declare const DeviceVerifyDevice: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/Scopes.ts#L85)

Since v1.0.0

## DeviceWrite

**Signature**

```ts
declare const DeviceWrite: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/Scopes.ts#L58)

Since v1.0.0

# Game

## Read

**Signature**

```ts
declare const Read: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/Scopes.ts#L31)

Since v1.0.0

## TinyTower

**Signature**

```ts
declare const TinyTower: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/Scopes.ts#L22)

Since v1.0.0

## Write

**Signature**

```ts
declare const Write: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/Scopes.ts#L40)

Since v1.0.0

# Raffle

## RaffleCheckEntered

**Signature**

```ts
declare const RaffleCheckEntered: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/Scopes.ts#L184)

Since v1.0.0

## RaffleEnter

**Signature**

```ts
declare const RaffleEnter: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/Scopes.ts#L193)

Since v1.0.0

## RaffleEnterMulti

**Signature**

```ts
declare const RaffleEnterMulti: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/Scopes.ts#L202)

Since v1.0.0

## RaffleRead

**Signature**

```ts
declare const RaffleRead: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/Scopes.ts#L166)

Since v1.0.0

## RaffleWrite

**Signature**

```ts
declare const RaffleWrite: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/Scopes.ts#L175)

Since v1.0.0

# Social

## SocialGetGifts

**Signature**

```ts
declare const SocialGetGifts: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/Scopes.ts#L229)

Since v1.0.0

## SocialGetVisits

**Signature**

```ts
declare const SocialGetVisits: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/Scopes.ts#L238)

Since v1.0.0

## SocialListFriendSnapshots

**Signature**

```ts
declare const SocialListFriendSnapshots: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/Scopes.ts#L265)

Since v1.0.0

## SocialPullFriendMeta

**Signature**

```ts
declare const SocialPullFriendMeta: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/Scopes.ts#L247)

Since v1.0.0

## SocialPullFriendTower

**Signature**

```ts
declare const SocialPullFriendTower: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/Scopes.ts#L256)

Since v1.0.0

## SocialRead

**Signature**

```ts
declare const SocialRead: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/Scopes.ts#L211)

Since v1.0.0

## SocialReceiveGift

**Signature**

```ts
declare const SocialReceiveGift: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/Scopes.ts#L283)

Since v1.0.0

## SocialSendItem

**Signature**

```ts
declare const SocialSendItem: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/Scopes.ts#L274)

Since v1.0.0

## SocialWrite

**Signature**

```ts
declare const SocialWrite: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/Scopes.ts#L220)

Since v1.0.0

# Sync

## SyncCheckVersion

**Signature**

```ts
declare const SyncCheckVersion: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/Scopes.ts#L121)

Since v1.0.0

## SyncListSnapshots

**Signature**

```ts
declare const SyncListSnapshots: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/Scopes.ts#L139)

Since v1.0.0

## SyncPullSave

**Signature**

```ts
declare const SyncPullSave: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/Scopes.ts#L112)

Since v1.0.0

## SyncPullSnapshot

**Signature**

```ts
declare const SyncPullSnapshot: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/Scopes.ts#L130)

Since v1.0.0

## SyncPushSave

**Signature**

```ts
declare const SyncPushSave: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/Scopes.ts#L148)

Since v1.0.0

## SyncPushSnapshot

**Signature**

```ts
declare const SyncPushSnapshot: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/Scopes.ts#L157)

Since v1.0.0

## SyncRead

**Signature**

```ts
declare const SyncRead: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/Scopes.ts#L94)

Since v1.0.0

## SyncWrite

**Signature**

```ts
declare const SyncWrite: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/Scopes.ts#L103)

Since v1.0.0
