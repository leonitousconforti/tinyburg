---
title: Scopes.ts
nav_order: 2
parent: "@tinyburg/tinytower-sdk"
---

## Scopes.ts overview

The scopes the TinyTower api is guarded by, as a tree.

The machinery that builds the tree - `defineGame`, `defineArea`
and the `Leaf`/`Branch`/`Area`/`Game` types - lives in
`@tinyburg/nimblebit-sdk/NimblebitScopes`, because every game's sdk builds the
same shape and none of them should need TinyTower to do it. It is re-exported
here so this module stays the one place a TinyTower consumer has to look.

What is TinyTower's own is below: the areas of its api, and the game built
from them. `Sync.read.pull_save` is the leaf named `tinytower:sync:pull_save`,
and `Sync.read.pull_save.required` is what goes on the endpoint.

Since v1.0.0

---

## Exports Grouped by Category

- [Areas](#areas)
  - [{ device: Device, raffle: Raffle, social: Social, sync: Sync }](#-device-device-raffle-raffle-social-social-sync-sync-)
- [Constructors](#constructors)
  - [defineArea](#definearea)
  - [defineGame](#definegame)
- [Games](#games)
  - [TinyTower](#tinytower)
  - [TinyTowerAreas](#tinytowerareas)
- [Models](#models)
  - [Area](#area)
  - [Branch](#branch)
  - [Game](#game)
  - [Leaf](#leaf)
- [Tree](#tree)
  - [Games](#games-1)
  - [all](#all)

---

# Areas

## { device: Device, raffle: Raffle, social: Social, sync: Sync }

The game's areas, by name, for annotating endpoints:
`Sync.read.pull_save.required`.

**Signature**

```ts
declare const { device: Device, raffle: Raffle, social: Social, sync: Sync }: any
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/Scopes.ts#L154)

Since v1.0.0

# Constructors

## defineArea

**Signature**

```ts
declare const defineArea: <R extends string, W extends string>(
  spec: { readonly name: string } & AreaSpec<R, W> & NoReservedLeaves<R, W>
) => KeyedArea<R, W>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/Scopes.ts#L45)

Since v1.0.0

## defineGame

**Signature**

```ts
declare const defineGame: <const Areas extends Readonly<Record<string, AreaSpec<string, string>>>>(spec: {
  readonly name: string
  readonly description: string
  readonly read: { readonly description: string }
  readonly write: { readonly description: string }
  readonly areas: Areas & {
    readonly [K in keyof Areas]: Areas[K] extends AreaSpec<R, W> ? NoReservedLeaves<R, W> : never
  }
}) => Game & {
  readonly areas: { readonly [K in keyof Areas]: Areas[K] extends AreaSpec<R, W> ? KeyedArea<R, W> : never }
}
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/Scopes.ts#L50)

Since v1.0.0

# Games

## TinyTower

**Signature**

```ts
declare const TinyTower: Game & {
  readonly areas: {
    readonly device: KeyedArea<"player_details", "register_email" | "verify_device">
    readonly sync: KeyedArea<
      "pull_save" | "check_version" | "pull_snapshot" | "list_snapshots",
      "push_save" | "push_snapshot"
    >
    readonly raffle: KeyedArea<"check_entered", "enter" | "enter_multi">
    readonly social: KeyedArea<
      "get_gifts" | "get_visits" | "pull_friend_meta" | "pull_friend_tower" | "list_friend_snapshots",
      "send_item" | "receive_gift"
    >
  }
}
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/Scopes.ts#L139)

Since v1.0.0

## TinyTowerAreas

The areas of the TinyTower api, as `defineGame` takes them. Exported
on their own because TinyTower Classic is the same api under another game
code, and its scope tree is these same areas under another name.

**Signature**

```ts
declare const TinyTowerAreas: {
  readonly device: {
    readonly description: "Player accounts and their devices"
    readonly read: {
      readonly description: "Look up player accounts"
      readonly leaves: { readonly player_details: "Look up a player's public profile details" }
    }
    readonly write: {
      readonly description: "Change a player's account or devices"
      readonly leaves: {
        readonly register_email: "Attach an email address to a player"
        readonly verify_device: "Complete a device verification code"
      }
    }
  }
  readonly sync: {
    readonly description: "Tower saves and cloud snapshots"
    readonly read: {
      readonly description: "Download saves and snapshots"
      readonly leaves: {
        readonly pull_save: "Download a tower's current save data"
        readonly check_version: "Check the current version of a tower's save"
        readonly pull_snapshot: "Download a specific cloud snapshot"
        readonly list_snapshots: "List the cloud snapshots a tower has"
      }
    }
    readonly write: {
      readonly description: "Upload saves and snapshots"
      readonly leaves: {
        readonly push_save: "Upload save data to a tower"
        readonly push_snapshot: "Upload a cloud snapshot"
      }
    }
  }
  readonly raffle: {
    readonly description: "The daily raffle"
    readonly read: {
      readonly description: "Check raffle entries"
      readonly leaves: { readonly check_entered: "Check whether a player entered the current raffle" }
    }
    readonly write: {
      readonly description: "Enter raffles"
      readonly leaves: {
        readonly enter: "Enter a player into the raffle"
        readonly enter_multi: "Enter a player into multiple raffles"
      }
    }
  }
  readonly social: {
    readonly description: "Gifts, visits and friends"
    readonly read: {
      readonly description: "See gifts, visits and friends' towers"
      readonly leaves: {
        readonly get_gifts: "See the gifts waiting for a player"
        readonly get_visits: "See who has visited a tower"
        readonly pull_friend_meta: "Fetch metadata about a player's friends"
        readonly pull_friend_tower: "Download a friend's tower data"
        readonly list_friend_snapshots: "List the cloud snapshots a friend's tower has"
      }
    }
    readonly write: {
      readonly description: "Send and accept gifts and items"
      readonly leaves: {
        readonly send_item: "Send bitizens and items to another player"
        readonly receive_gift: "Accept a gift on a player's behalf"
      }
    }
  }
}
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/Scopes.ts#L61)

Since v1.0.0

# Models

## Area

**Signature**

```ts
declare const Area: any
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/Scopes.ts#L25)

Since v1.0.0

## Branch

**Signature**

```ts
declare const Branch: any
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/Scopes.ts#L30)

Since v1.0.0

## Game

**Signature**

```ts
declare const Game: any
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/Scopes.ts#L35)

Since v1.0.0

## Leaf

**Signature**

```ts
declare const Leaf: any
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/Scopes.ts#L40)

Since v1.0.0

# Tree

## Games

Every game, in the order a dashboard should list them.

**Signature**

```ts
declare const Games: ReadonlyArray<Game>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/Scopes.ts#L162)

Since v1.0.0

## all

Every scope in the tree: each game, its two branches, then each of its
areas with the area's branches and their leaves, in declaration order.

**Signature**

```ts
declare const all: () => ReadonlyArray<ScopeDescription>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/Scopes.ts#L171)

Since v1.0.0
