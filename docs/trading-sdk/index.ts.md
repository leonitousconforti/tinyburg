---
title: index.ts
nav_order: 1
parent: "@tinyburg/trading-sdk"
---

## index.ts overview

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

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/trading-sdk/src/index.ts#L22)

Since v1.0.0

# utils

## Sdk (namespace export)

Re-exports all named exports from the "./Sdk.ts" module as `Sdk`.

**Signature**

```ts
export * as Sdk from "./Sdk.ts"
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/trading-sdk/src/index.ts#L51)

Since v1.0.0
