---
title: Scopes.ts
nav_order: 2
parent: Modules
---

## Scopes.ts overview

The scopes the treasury api is guarded by, as one `treasury` area.

These guard the treasury's own api - proposing, accepting and watching
trades - not the towers the trades move items between. Acting on a tower
(depositing an item into escrow, splicing a save) happens through the
tinyburg api under that game's own scopes, with a grant the player gives the
treasury separately on the consent screen. Splitting the two means "let the
treasury manage my trades" and "let the treasury touch my tower" are
distinct questions with distinct answers.

The area is built with the same `defineArea` every game's scopes are, so
`Treasury.read.list_trades` is the leaf named `treasury:list_trades`, and
`Treasury.read.list_trades.required` is what goes on the endpoint.

Since v1.0.0

---

## Exports Grouped by Category

- [Areas](#areas)
  - [Treasury](#treasury)
  - [TreasuryArea (type alias)](#treasuryarea-type-alias)
- [Tree](#tree)
  - [all](#all)

---

# Areas

## Treasury

**Signature**

```ts
declare const Treasury: KeyedArea<
  "grant_status" | "list_trades" | "get_trade" | "list_inventory",
  "propose" | "accept" | "cancel" | "confirm_splice"
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/treasury-sdk/src/Scopes.ts#L26)

Since v1.0.0

## TreasuryArea (type alias)

The shape of the treasury's area, for code that takes it as a value.

**Signature**

```ts
type TreasuryArea = typeof Treasury
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/treasury-sdk/src/Scopes.ts#L55)

Since v1.0.0

# Tree

## all

Every scope in the tree, the area first, then each branch, then its
leaves. The order a consent screen lists them in.

**Signature**

```ts
declare const all: () => ReadonlyArray<ScopeDescription>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/treasury-sdk/src/Scopes.ts#L64)

Since v1.0.0
