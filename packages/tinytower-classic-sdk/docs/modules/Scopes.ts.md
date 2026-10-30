---
title: Scopes.ts
nav_order: 3
parent: Modules
---

## Scopes.ts overview

The scopes the TinyTower Classic api is guarded by: the same areas as
TinyTower, under the `tinytowerclassic` game, so `tinytowerclassic:read`
grants every read in Classic and `tinytowerclassic:sync:pull_save` one
endpoint. The tree is built by `@tinyburg/nimblebit-sdk`'s `defineGame`
from TinyTower's own area spec, so the two games cannot drift apart in
shape, only in name.

Since v1.0.0

---

## Exports Grouped by Category

- [Areas](#areas)
  - [{ device: Device, raffle: Raffle, social: Social, sync: Sync }](#-device-device-raffle-raffle-social-social-sync-sync-)
- [Games](#games)
  - [TinyTowerClassic](#tinytowerclassic)
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

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-classic-sdk/src/Scopes.ts#L35)

Since v1.0.0

# Games

## TinyTowerClassic

**Signature**

```ts
declare const TinyTowerClassic: Game & {
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

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-classic-sdk/src/Scopes.ts#L20)

Since v1.0.0

# Tree

## Games

Every game this package declares.

**Signature**

```ts
declare const Games: ReadonlyArray<Game>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-classic-sdk/src/Scopes.ts#L43)

Since v1.0.0

## all

Every scope in the tree, in declaration order.

**Signature**

```ts
declare const all: () => ReadonlyArray<ScopeDescription>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-classic-sdk/src/Scopes.ts#L51)

Since v1.0.0
