---
title: index.ts
nav_order: 1
parent: "@tinyburg/treasury-sdk"
---

## index.ts overview

The scopes the treasury api is guarded by, as one `treasury` area.

These guard the treasury's own api - proposing, accepting and watching
trades - not the towers the trades move items between. Acting on a tower
(depositing an item into escrow, splicing a save) happens through the
trading api under that game's own scopes, with a grant the player gives the
treasury separately on the consent screen. Splitting the two means "let the
treasury manage my trades" and "let the treasury touch my tower" are
distinct questions with distinct answers.

The area is built with the same `defineArea` every game's scopes are, so
`Treasury.read.list_trades` is the leaf named `treasury:list_trades`, and
`Treasury.read.list_trades.required` is what goes on the endpoint.

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

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/treasury-sdk/src/index.ts#L23)

Since v1.0.0

# utils

## Sdk (namespace export)

Re-exports all named exports from the "./Sdk.ts" module as `Sdk`.

**Signature**

```ts
export * as Sdk from "./Sdk.ts"
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/treasury-sdk/src/index.ts#L52)

Since v1.0.0
