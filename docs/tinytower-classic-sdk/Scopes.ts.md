---
title: Scopes.ts
nav_order: 3
parent: "@tinyburg/tinytower-classic-sdk"
---

## Scopes.ts overview

The scopes the TinyTower Classic api is guarded by: `tinytowerclassic` for
the whole game, `tinytowerclassic:read` and `tinytowerclassic:write` for
every endpoint that only looks or that changes a player's game, a `:read` and
a `:write` scope for each area of the api, such as
`tinytowerclassic:device:read`, and one scope per endpoint, such as
`tinytowerclassic:device:player_details`.

Each endpoint accepts its own scope, its area's side, the game's side and the
game, narrowest first:
`{ anyOf: [DevicePlayerDetails, DeviceRead, Read, TinyTowerClassic] }`. They
are TinyTower's scopes under the `tinytowerclassic` game, with the same
descriptions.

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
  - [TinyTowerClassic](#tinytowerclassic)
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

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-classic-sdk/src/Scopes.ts#L70)

Since v1.0.0

## DeviceRead

**Signature**

```ts
declare const DeviceRead: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-classic-sdk/src/Scopes.ts#L52)

Since v1.0.0

## DeviceRegisterEmail

**Signature**

```ts
declare const DeviceRegisterEmail: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-classic-sdk/src/Scopes.ts#L79)

Since v1.0.0

## DeviceVerifyDevice

**Signature**

```ts
declare const DeviceVerifyDevice: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-classic-sdk/src/Scopes.ts#L88)

Since v1.0.0

## DeviceWrite

**Signature**

```ts
declare const DeviceWrite: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-classic-sdk/src/Scopes.ts#L61)

Since v1.0.0

# Game

## Read

**Signature**

```ts
declare const Read: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-classic-sdk/src/Scopes.ts#L34)

Since v1.0.0

## TinyTowerClassic

**Signature**

```ts
declare const TinyTowerClassic: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-classic-sdk/src/Scopes.ts#L25)

Since v1.0.0

## Write

**Signature**

```ts
declare const Write: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-classic-sdk/src/Scopes.ts#L43)

Since v1.0.0

# Raffle

## RaffleCheckEntered

**Signature**

```ts
declare const RaffleCheckEntered: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-classic-sdk/src/Scopes.ts#L187)

Since v1.0.0

## RaffleEnter

**Signature**

```ts
declare const RaffleEnter: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-classic-sdk/src/Scopes.ts#L196)

Since v1.0.0

## RaffleEnterMulti

**Signature**

```ts
declare const RaffleEnterMulti: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-classic-sdk/src/Scopes.ts#L205)

Since v1.0.0

## RaffleRead

**Signature**

```ts
declare const RaffleRead: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-classic-sdk/src/Scopes.ts#L169)

Since v1.0.0

## RaffleWrite

**Signature**

```ts
declare const RaffleWrite: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-classic-sdk/src/Scopes.ts#L178)

Since v1.0.0

# Social

## SocialGetGifts

**Signature**

```ts
declare const SocialGetGifts: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-classic-sdk/src/Scopes.ts#L232)

Since v1.0.0

## SocialGetVisits

**Signature**

```ts
declare const SocialGetVisits: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-classic-sdk/src/Scopes.ts#L241)

Since v1.0.0

## SocialListFriendSnapshots

**Signature**

```ts
declare const SocialListFriendSnapshots: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-classic-sdk/src/Scopes.ts#L268)

Since v1.0.0

## SocialPullFriendMeta

**Signature**

```ts
declare const SocialPullFriendMeta: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-classic-sdk/src/Scopes.ts#L250)

Since v1.0.0

## SocialPullFriendTower

**Signature**

```ts
declare const SocialPullFriendTower: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-classic-sdk/src/Scopes.ts#L259)

Since v1.0.0

## SocialRead

**Signature**

```ts
declare const SocialRead: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-classic-sdk/src/Scopes.ts#L214)

Since v1.0.0

## SocialReceiveGift

**Signature**

```ts
declare const SocialReceiveGift: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-classic-sdk/src/Scopes.ts#L286)

Since v1.0.0

## SocialSendItem

**Signature**

```ts
declare const SocialSendItem: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-classic-sdk/src/Scopes.ts#L277)

Since v1.0.0

## SocialWrite

**Signature**

```ts
declare const SocialWrite: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-classic-sdk/src/Scopes.ts#L223)

Since v1.0.0

# Sync

## SyncCheckVersion

**Signature**

```ts
declare const SyncCheckVersion: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-classic-sdk/src/Scopes.ts#L124)

Since v1.0.0

## SyncListSnapshots

**Signature**

```ts
declare const SyncListSnapshots: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-classic-sdk/src/Scopes.ts#L142)

Since v1.0.0

## SyncPullSave

**Signature**

```ts
declare const SyncPullSave: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-classic-sdk/src/Scopes.ts#L115)

Since v1.0.0

## SyncPullSnapshot

**Signature**

```ts
declare const SyncPullSnapshot: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-classic-sdk/src/Scopes.ts#L133)

Since v1.0.0

## SyncPushSave

**Signature**

```ts
declare const SyncPushSave: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-classic-sdk/src/Scopes.ts#L151)

Since v1.0.0

## SyncPushSnapshot

**Signature**

```ts
declare const SyncPushSnapshot: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-classic-sdk/src/Scopes.ts#L160)

Since v1.0.0

## SyncRead

**Signature**

```ts
declare const SyncRead: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-classic-sdk/src/Scopes.ts#L97)

Since v1.0.0

## SyncWrite

**Signature**

```ts
declare const SyncWrite: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-classic-sdk/src/Scopes.ts#L106)

Since v1.0.0
