---
title: index.ts
nav_order: 1
parent: "@tinyburg/tinyburg-sdk"
---

## index.ts overview

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

- [Scopes](#scopes)
  - [Scopes (namespace export)](#scopes-namespace-export)
- [utils](#utils)
  - [Sdk (namespace export)](#sdk-namespace-export)

---

# Scopes

## Scopes (namespace export)

Re-exports all named exports from the "./Scopes.ts" module as `Scopes`.

**Signature**

```ts
export * as Scopes from "./Scopes.ts"
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinyburg-sdk/src/index.ts#L23)

Since v1.0.0

# utils

## Sdk (namespace export)

Re-exports all named exports from the "./Sdk.ts" module as `Sdk`.

**Signature**

```ts
export * as Sdk from "./Sdk.ts"
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinyburg-sdk/src/index.ts#L52)

Since v1.0.0
