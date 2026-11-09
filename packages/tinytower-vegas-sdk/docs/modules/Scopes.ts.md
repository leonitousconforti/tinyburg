---
title: Scopes.ts
nav_order: 2
parent: Modules
---

## Scopes.ts overview

The scopes the Tiny Tower Vegas api is guarded by: `tinytowervegas` for the
whole game, `tinytowervegas:read` and `tinytowervegas:write` for every
endpoint that only looks or that changes a player's game, a `:read` and a
`:write` scope for each area of the api, such as
`tinytowervegas:device:read`, and one scope per endpoint, such as
`tinytowervegas:device:player_details`.

Each endpoint accepts its own scope, its area's side, the game's side and the
game, narrowest first:
`{ anyOf: [DevicePlayerDetails, DeviceRead, Read, TinyTowerVegas] }`. An
endpoint this module has no scope for is left unscoped, and the authproxy
guards it with `tinytowervegas:read` or `tinytowervegas`.

Since v1.0.0

---

## Exports Grouped by Category

- [Device](#device)
  - [DevicePlayerDetails](#deviceplayerdetails)
  - [DeviceRead](#deviceread)
  - [DeviceVerifyDevice](#deviceverifydevice)
  - [DeviceWrite](#devicewrite)
- [Game](#game)
  - [Read](#read)
  - [TinyTowerVegas](#tinytowervegas)
  - [Write](#write)
- [Social](#social)
  - [SocialGetItems](#socialgetitems)
  - [SocialGetVisits](#socialgetvisits)
  - [SocialPullFriendGame](#socialpullfriendgame)
  - [SocialPullFriendMeta](#socialpullfriendmeta)
  - [SocialRead](#socialread)
  - [SocialReceiveItem](#socialreceiveitem)
  - [SocialSendItem](#socialsenditem)
  - [SocialWrite](#socialwrite)

---

# Device

## DevicePlayerDetails

**Signature**

```ts
declare const DevicePlayerDetails: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-vegas-sdk/src/Scopes.ts#L70)

Since v1.0.0

## DeviceRead

**Signature**

```ts
declare const DeviceRead: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-vegas-sdk/src/Scopes.ts#L52)

Since v1.0.0

## DeviceVerifyDevice

**Signature**

```ts
declare const DeviceVerifyDevice: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-vegas-sdk/src/Scopes.ts#L79)

Since v1.0.0

## DeviceWrite

**Signature**

```ts
declare const DeviceWrite: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-vegas-sdk/src/Scopes.ts#L61)

Since v1.0.0

# Game

## Read

**Signature**

```ts
declare const Read: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-vegas-sdk/src/Scopes.ts#L34)

Since v1.0.0

## TinyTowerVegas

**Signature**

```ts
declare const TinyTowerVegas: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-vegas-sdk/src/Scopes.ts#L25)

Since v1.0.0

## Write

**Signature**

```ts
declare const Write: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-vegas-sdk/src/Scopes.ts#L43)

Since v1.0.0

# Social

## SocialGetItems

**Signature**

```ts
declare const SocialGetItems: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-vegas-sdk/src/Scopes.ts#L106)

Since v1.0.0

## SocialGetVisits

**Signature**

```ts
declare const SocialGetVisits: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-vegas-sdk/src/Scopes.ts#L115)

Since v1.0.0

## SocialPullFriendGame

**Signature**

```ts
declare const SocialPullFriendGame: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-vegas-sdk/src/Scopes.ts#L124)

Since v1.0.0

## SocialPullFriendMeta

**Signature**

```ts
declare const SocialPullFriendMeta: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-vegas-sdk/src/Scopes.ts#L133)

Since v1.0.0

## SocialRead

**Signature**

```ts
declare const SocialRead: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-vegas-sdk/src/Scopes.ts#L88)

Since v1.0.0

## SocialReceiveItem

**Signature**

```ts
declare const SocialReceiveItem: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-vegas-sdk/src/Scopes.ts#L151)

Since v1.0.0

## SocialSendItem

**Signature**

```ts
declare const SocialSendItem: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-vegas-sdk/src/Scopes.ts#L142)

Since v1.0.0

## SocialWrite

**Signature**

```ts
declare const SocialWrite: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-vegas-sdk/src/Scopes.ts#L97)

Since v1.0.0
