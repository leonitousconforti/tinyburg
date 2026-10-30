---
title: Scopes.ts
nav_order: 2
parent: Modules
---

## Scopes.ts overview

The scopes an application can be granted over a player's games, as a tree.

One area per game. Each splits into a `:read` and a `:write` branch with a
leaf per endpoint beneath, so a player can grant exactly as much as an
application asks for: `tinytower:read` for everything that only looks,
`tinytower:pull_save` for one thing, `tinytower` for all of it. The tree is
built with the same `defineArea` the TinyTower sdk uses for the authproxy's
keys, so both catalogs have one shape and one set of rules.

These are OAuth scopes: a player approves them on the consent screen, and an
application then acts on the player's linked accounts through tinyburg.app,
which holds the game credentials. Nothing here is a key to Nimblebit.

Since v1.0.0

---

## Exports Grouped by Category

- [Areas](#areas)
  - [BitCity](#bitcity)
  - [DiscoZoo](#discozoo)
  - [GameArea (type alias)](#gamearea-type-alias)
  - [LegoTower](#legotower)
  - [PocketPlanes](#pocketplanes)
  - [PocketTrains](#pockettrains)
  - [TinyTower](#tinytower)
  - [TinyTowerClassic](#tinytowerclassic)
  - [TinyTowerVegas](#tinytowervegas)
- [Tree](#tree)
  - [Areas](#areas-1)
  - [all](#all)

---

# Areas

## BitCity

**Signature**

```ts
declare const BitCity: KeyedArea<
  | "list_accounts"
  | "pull_save"
  | "check_version"
  | "list_snapshots"
  | "pull_snapshot"
  | "check_raffle"
  | "player_details"
  | "list_gifts"
  | "list_visits"
  | "friend_meta"
  | "friend_save"
  | "friend_snapshots",
  | "link_account"
  | "unlink_account"
  | "push_save"
  | "push_snapshot"
  | "enter_raffle"
  | "enter_multi_raffle"
  | "receive_gift"
  | "send_item"
  | "visit"
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/trading-sdk/src/Scopes.ts#L103)

Since v1.0.0

## DiscoZoo

**Signature**

```ts
declare const DiscoZoo: KeyedArea<
  | "list_accounts"
  | "pull_save"
  | "check_version"
  | "list_snapshots"
  | "pull_snapshot"
  | "check_raffle"
  | "player_details"
  | "list_gifts"
  | "list_visits"
  | "friend_meta"
  | "friend_save"
  | "friend_snapshots",
  | "link_account"
  | "unlink_account"
  | "push_save"
  | "push_snapshot"
  | "enter_raffle"
  | "enter_multi_raffle"
  | "receive_gift"
  | "send_item"
  | "visit"
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/trading-sdk/src/Scopes.ts#L97)

Since v1.0.0

## GameArea (type alias)

The shape every game's area has, for code that serves any of them.

**Signature**

```ts
type GameArea = typeof TinyTower
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/trading-sdk/src/Scopes.ts#L117)

Since v1.0.0

## LegoTower

**Signature**

```ts
declare const LegoTower: KeyedArea<
  | "list_accounts"
  | "pull_save"
  | "check_version"
  | "list_snapshots"
  | "pull_snapshot"
  | "check_raffle"
  | "player_details"
  | "list_gifts"
  | "list_visits"
  | "friend_meta"
  | "friend_save"
  | "friend_snapshots",
  | "link_account"
  | "unlink_account"
  | "push_save"
  | "push_snapshot"
  | "enter_raffle"
  | "enter_multi_raffle"
  | "receive_gift"
  | "send_item"
  | "visit"
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/trading-sdk/src/Scopes.ts#L91)

Since v1.0.0

## PocketPlanes

**Signature**

```ts
declare const PocketPlanes: KeyedArea<
  | "list_accounts"
  | "pull_save"
  | "check_version"
  | "list_snapshots"
  | "pull_snapshot"
  | "check_raffle"
  | "player_details"
  | "list_gifts"
  | "list_visits"
  | "friend_meta"
  | "friend_save"
  | "friend_snapshots",
  | "link_account"
  | "unlink_account"
  | "push_save"
  | "push_snapshot"
  | "enter_raffle"
  | "enter_multi_raffle"
  | "receive_gift"
  | "send_item"
  | "visit"
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/trading-sdk/src/Scopes.ts#L79)

Since v1.0.0

## PocketTrains

**Signature**

```ts
declare const PocketTrains: KeyedArea<
  | "list_accounts"
  | "pull_save"
  | "check_version"
  | "list_snapshots"
  | "pull_snapshot"
  | "check_raffle"
  | "player_details"
  | "list_gifts"
  | "list_visits"
  | "friend_meta"
  | "friend_save"
  | "friend_snapshots",
  | "link_account"
  | "unlink_account"
  | "push_save"
  | "push_snapshot"
  | "enter_raffle"
  | "enter_multi_raffle"
  | "receive_gift"
  | "send_item"
  | "visit"
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/trading-sdk/src/Scopes.ts#L85)

Since v1.0.0

## TinyTower

**Signature**

```ts
declare const TinyTower: KeyedArea<
  | "list_accounts"
  | "pull_save"
  | "check_version"
  | "list_snapshots"
  | "pull_snapshot"
  | "check_raffle"
  | "player_details"
  | "list_gifts"
  | "list_visits"
  | "friend_meta"
  | "friend_save"
  | "friend_snapshots",
  | "link_account"
  | "unlink_account"
  | "push_save"
  | "push_snapshot"
  | "enter_raffle"
  | "enter_multi_raffle"
  | "receive_gift"
  | "send_item"
  | "visit"
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/trading-sdk/src/Scopes.ts#L67)

Since v1.0.0

## TinyTowerClassic

**Signature**

```ts
declare const TinyTowerClassic: KeyedArea<
  | "list_accounts"
  | "pull_save"
  | "check_version"
  | "list_snapshots"
  | "pull_snapshot"
  | "check_raffle"
  | "player_details"
  | "list_gifts"
  | "list_visits"
  | "friend_meta"
  | "friend_save"
  | "friend_snapshots",
  | "link_account"
  | "unlink_account"
  | "push_save"
  | "push_snapshot"
  | "enter_raffle"
  | "enter_multi_raffle"
  | "receive_gift"
  | "send_item"
  | "visit"
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/trading-sdk/src/Scopes.ts#L73)

Since v1.0.0

## TinyTowerVegas

**Signature**

```ts
declare const TinyTowerVegas: KeyedArea<
  | "list_accounts"
  | "pull_save"
  | "check_version"
  | "list_snapshots"
  | "pull_snapshot"
  | "check_raffle"
  | "player_details"
  | "list_gifts"
  | "list_visits"
  | "friend_meta"
  | "friend_save"
  | "friend_snapshots",
  | "link_account"
  | "unlink_account"
  | "push_save"
  | "push_snapshot"
  | "enter_raffle"
  | "enter_multi_raffle"
  | "receive_gift"
  | "send_item"
  | "visit"
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/trading-sdk/src/Scopes.ts#L109)

Since v1.0.0

# Tree

## Areas

Every game, in the order a consent screen or a developer page lists them.

**Signature**

```ts
declare const Areas: ReadonlyArray<
  KeyedArea<
    | "list_accounts"
    | "pull_save"
    | "check_version"
    | "list_snapshots"
    | "pull_snapshot"
    | "check_raffle"
    | "player_details"
    | "list_gifts"
    | "list_visits"
    | "friend_meta"
    | "friend_save"
    | "friend_snapshots",
    | "link_account"
    | "unlink_account"
    | "push_save"
    | "push_snapshot"
    | "enter_raffle"
    | "enter_multi_raffle"
    | "receive_gift"
    | "send_item"
    | "visit"
  >
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/trading-sdk/src/Scopes.ts#L125)

Since v1.0.0

## all

Every scope in the tree, areas first, then each area's branches, then
their leaves.

**Signature**

```ts
declare const all: () => ReadonlyArray<ScopeDescription>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/trading-sdk/src/Scopes.ts#L143)

Since v1.0.0
