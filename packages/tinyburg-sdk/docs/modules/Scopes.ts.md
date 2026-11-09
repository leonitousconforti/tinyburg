---
title: Scopes.ts
nav_order: 2
parent: Modules
---

## Scopes.ts overview

The scopes an application can be granted over a player's games.

Each game has a scope for all of it, one for everything that only looks and
one for everything that changes something, and one per endpoint, so a
player can grant exactly as much as an application asks for: `tinytower`
for all of it, `tinytower:read` for everything that only looks,
`tinytower:pull_save` for one thing. An endpoint accepts its own scope, its
side's and the game's, narrowest first:
`{ anyOf: [TinyTower.PullSave, TinyTower.Read, TinyTower.Game] }`.

These are OAuth scopes: a player approves them on the consent screen, and an
application then acts on the player's linked accounts through tinyburg.app,
which holds the game credentials. Nothing here is a key to Nimblebit.

Since v1.0.0

---

## Exports Grouped by Category

- [Games](#games)
  - [BitCity](#bitcity)
  - [DiscoZoo](#discozoo)
  - [GameScopes (type alias)](#gamescopes-type-alias)
  - [Games](#games-1)
  - [LegoTower](#legotower)
  - [PocketPlanes](#pocketplanes)
  - [PocketTrains](#pockettrains)
  - [TinyTower](#tinytower)
  - [TinyTowerClassic](#tinytowerclassic)
  - [TinyTowerVegas](#tinytowervegas)
  - [all](#all)

---

# Games

## BitCity

**Signature**

```ts
declare const BitCity: {
  Game: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  Read: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  ListAccounts: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  PullSave: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  CheckVersion: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  ListSnapshots: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  PullSnapshot: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  CheckRaffle: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  PlayerDetails: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  ListGifts: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  ListVisits: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  FriendMeta: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  FriendSave: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  FriendSnapshots: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  Write: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  LinkAccount: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  UnlinkAccount: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  PushSave: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  PushSnapshot: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  EnterRaffle: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  EnterMultiRaffle: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  ReceiveGift: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  SendItem: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  Visit: OAuthScope.Described<OAuthScope.OAuthScope<string>>
}
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinyburg-sdk/src/Scopes.ts#L115)

Since v1.0.0

## DiscoZoo

**Signature**

```ts
declare const DiscoZoo: {
  Game: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  Read: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  ListAccounts: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  PullSave: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  CheckVersion: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  ListSnapshots: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  PullSnapshot: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  CheckRaffle: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  PlayerDetails: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  ListGifts: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  ListVisits: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  FriendMeta: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  FriendSave: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  FriendSnapshots: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  Write: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  LinkAccount: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  UnlinkAccount: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  PushSave: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  PushSnapshot: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  EnterRaffle: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  EnterMultiRaffle: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  ReceiveGift: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  SendItem: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  Visit: OAuthScope.Described<OAuthScope.OAuthScope<string>>
}
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinyburg-sdk/src/Scopes.ts#L109)

Since v1.0.0

## GameScopes (type alias)

The scopes every game has, for code that serves any of them.

**Signature**

```ts
type GameScopes = ReturnType<typeof make>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinyburg-sdk/src/Scopes.ts#L73)

Since v1.0.0

## Games

Every game, in the order a consent screen or a developer page lists them.

**Signature**

```ts
declare const Games: ReadonlyArray<{
  Game: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  Read: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  ListAccounts: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  PullSave: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  CheckVersion: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  ListSnapshots: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  PullSnapshot: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  CheckRaffle: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  PlayerDetails: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  ListGifts: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  ListVisits: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  FriendMeta: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  FriendSave: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  FriendSnapshots: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  Write: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  LinkAccount: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  UnlinkAccount: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  PushSave: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  PushSnapshot: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  EnterRaffle: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  EnterMultiRaffle: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  ReceiveGift: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  SendItem: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  Visit: OAuthScope.Described<OAuthScope.OAuthScope<string>>
}>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinyburg-sdk/src/Scopes.ts#L129)

Since v1.0.0

## LegoTower

**Signature**

```ts
declare const LegoTower: {
  Game: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  Read: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  ListAccounts: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  PullSave: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  CheckVersion: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  ListSnapshots: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  PullSnapshot: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  CheckRaffle: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  PlayerDetails: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  ListGifts: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  ListVisits: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  FriendMeta: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  FriendSave: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  FriendSnapshots: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  Write: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  LinkAccount: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  UnlinkAccount: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  PushSave: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  PushSnapshot: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  EnterRaffle: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  EnterMultiRaffle: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  ReceiveGift: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  SendItem: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  Visit: OAuthScope.Described<OAuthScope.OAuthScope<string>>
}
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinyburg-sdk/src/Scopes.ts#L103)

Since v1.0.0

## PocketPlanes

**Signature**

```ts
declare const PocketPlanes: {
  Game: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  Read: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  ListAccounts: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  PullSave: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  CheckVersion: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  ListSnapshots: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  PullSnapshot: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  CheckRaffle: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  PlayerDetails: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  ListGifts: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  ListVisits: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  FriendMeta: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  FriendSave: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  FriendSnapshots: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  Write: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  LinkAccount: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  UnlinkAccount: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  PushSave: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  PushSnapshot: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  EnterRaffle: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  EnterMultiRaffle: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  ReceiveGift: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  SendItem: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  Visit: OAuthScope.Described<OAuthScope.OAuthScope<string>>
}
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinyburg-sdk/src/Scopes.ts#L91)

Since v1.0.0

## PocketTrains

**Signature**

```ts
declare const PocketTrains: {
  Game: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  Read: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  ListAccounts: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  PullSave: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  CheckVersion: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  ListSnapshots: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  PullSnapshot: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  CheckRaffle: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  PlayerDetails: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  ListGifts: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  ListVisits: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  FriendMeta: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  FriendSave: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  FriendSnapshots: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  Write: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  LinkAccount: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  UnlinkAccount: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  PushSave: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  PushSnapshot: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  EnterRaffle: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  EnterMultiRaffle: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  ReceiveGift: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  SendItem: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  Visit: OAuthScope.Described<OAuthScope.OAuthScope<string>>
}
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinyburg-sdk/src/Scopes.ts#L97)

Since v1.0.0

## TinyTower

**Signature**

```ts
declare const TinyTower: {
  Game: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  Read: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  ListAccounts: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  PullSave: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  CheckVersion: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  ListSnapshots: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  PullSnapshot: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  CheckRaffle: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  PlayerDetails: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  ListGifts: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  ListVisits: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  FriendMeta: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  FriendSave: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  FriendSnapshots: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  Write: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  LinkAccount: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  UnlinkAccount: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  PushSave: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  PushSnapshot: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  EnterRaffle: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  EnterMultiRaffle: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  ReceiveGift: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  SendItem: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  Visit: OAuthScope.Described<OAuthScope.OAuthScope<string>>
}
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinyburg-sdk/src/Scopes.ts#L79)

Since v1.0.0

## TinyTowerClassic

**Signature**

```ts
declare const TinyTowerClassic: {
  Game: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  Read: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  ListAccounts: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  PullSave: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  CheckVersion: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  ListSnapshots: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  PullSnapshot: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  CheckRaffle: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  PlayerDetails: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  ListGifts: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  ListVisits: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  FriendMeta: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  FriendSave: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  FriendSnapshots: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  Write: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  LinkAccount: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  UnlinkAccount: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  PushSave: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  PushSnapshot: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  EnterRaffle: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  EnterMultiRaffle: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  ReceiveGift: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  SendItem: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  Visit: OAuthScope.Described<OAuthScope.OAuthScope<string>>
}
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinyburg-sdk/src/Scopes.ts#L85)

Since v1.0.0

## TinyTowerVegas

**Signature**

```ts
declare const TinyTowerVegas: {
  Game: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  Read: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  ListAccounts: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  PullSave: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  CheckVersion: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  ListSnapshots: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  PullSnapshot: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  CheckRaffle: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  PlayerDetails: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  ListGifts: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  ListVisits: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  FriendMeta: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  FriendSave: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  FriendSnapshots: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  Write: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  LinkAccount: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  UnlinkAccount: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  PushSave: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  PushSnapshot: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  EnterRaffle: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  EnterMultiRaffle: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  ReceiveGift: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  SendItem: OAuthScope.Described<OAuthScope.OAuthScope<string>>
  Visit: OAuthScope.Described<OAuthScope.OAuthScope<string>>
}
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinyburg-sdk/src/Scopes.ts#L121)

Since v1.0.0

## all

Every scope of one game, in the order a consent screen lists them: the
game, its read scope and the read endpoints' scopes, then its write scope
and the write endpoints'.

**Signature**

```ts
declare const all: (game: GameScopes) => ReadonlyArray<OAuthScope.Described>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinyburg-sdk/src/Scopes.ts#L148)

Since v1.0.0
