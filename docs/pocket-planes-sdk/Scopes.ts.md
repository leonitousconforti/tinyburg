---
title: Scopes.ts
nav_order: 3
parent: "@tinyburg/pocket-planes-sdk"
---

## Scopes.ts overview

The scopes the Pocket Planes api is guarded by, as a game-rooted tree, built with
`@tinyburg/nimblebit-sdk`'s `defineGame`. Only the endpoints this sdk defines
are covered; areas without both a read and a write side are left out until
their endpoints exist.

Since v1.0.0

---

## Exports Grouped by Category

- [Areas](#areas)
  - [{ device: Device, social: Social }](#-device-device-social-social-)
- [Games](#games)
  - [PocketPlanes](#pocketplanes)
- [Tree](#tree)
  - [Games](#games-1)
  - [all](#all)

---

# Areas

## { device: Device, social: Social }

The game's areas, by name, for annotating endpoints.

**Signature**

```ts
declare const { device: Device, social: Social }: any
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/pocket-planes-sdk/src/Scopes.ts#L68)

Since v1.0.0

# Games

## PocketPlanes

**Signature**

```ts
declare const PocketPlanes: Game & {
  readonly areas: {
    readonly device: KeyedArea<"player_details", "register_email" | "verify_device">
    readonly social: KeyedArea<
      "get_visits" | "get_gifts" | "request_items" | "pull_friend_meta" | "pull_friend_game",
      "send_item" | "receive_item"
    >
  }
}
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/pocket-planes-sdk/src/Scopes.ts#L17)

Since v1.0.0

# Tree

## Games

**Signature**

```ts
declare const Games: ReadonlyArray<Game>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/pocket-planes-sdk/src/Scopes.ts#L74)

Since v1.0.0

## all

**Signature**

```ts
declare const all: () => ReadonlyArray<ScopeDescription>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/pocket-planes-sdk/src/Scopes.ts#L80)

Since v1.0.0
