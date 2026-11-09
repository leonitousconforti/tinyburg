---
title: Scopes.ts
nav_order: 2
parent: "@tinyburg/treasury-sdk"
---

## Scopes.ts overview

The scopes the treasury api is guarded by: `treasury` for all of it,
`treasury:read` and `treasury:write` for everything that only looks or that
changes a trade, and one scope per endpoint, such as
`treasury:list_trades`. An endpoint accepts its own scope, its side's and
the whole treasury's, narrowest first:
`{ anyOf: [ListTrades, Read, Treasury] }`.

These guard the treasury's own api - proposing, accepting and watching
trades - not the towers the trades move items between. Acting on a tower
(depositing an item into escrow, splicing a save) happens through the
tinyburg api under that game's own scopes, with a grant the player gives the
treasury separately on the consent screen. Splitting the two means "let the
treasury manage my trades" and "let the treasury touch my tower" are
distinct questions with distinct answers.

Since v1.0.0

---

## Exports Grouped by Category

- [Endpoints](#endpoints)
  - [Accept](#accept)
  - [Cancel](#cancel)
  - [ConfirmSplice](#confirmsplice)
  - [GetTrade](#gettrade)
  - [GrantStatus](#grantstatus)
  - [ListInventory](#listinventory)
  - [ListTrades](#listtrades)
  - [Propose](#propose)
- [Treasury](#treasury)
  - [Read](#read)
  - [Treasury](#treasury-1)
  - [Write](#write)
  - [all](#all)

---

# Endpoints

## Accept

**Signature**

```ts
declare const Accept: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/treasury-sdk/src/Scopes.ts#L99)

Since v1.0.0

## Cancel

**Signature**

```ts
declare const Cancel: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/treasury-sdk/src/Scopes.ts#L108)

Since v1.0.0

## ConfirmSplice

**Signature**

```ts
declare const ConfirmSplice: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/treasury-sdk/src/Scopes.ts#L117)

Since v1.0.0

## GetTrade

**Signature**

```ts
declare const GetTrade: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/treasury-sdk/src/Scopes.ts#L72)

Since v1.0.0

## GrantStatus

**Signature**

```ts
declare const GrantStatus: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/treasury-sdk/src/Scopes.ts#L54)

Since v1.0.0

## ListInventory

**Signature**

```ts
declare const ListInventory: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/treasury-sdk/src/Scopes.ts#L81)

Since v1.0.0

## ListTrades

**Signature**

```ts
declare const ListTrades: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/treasury-sdk/src/Scopes.ts#L63)

Since v1.0.0

## Propose

**Signature**

```ts
declare const Propose: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/treasury-sdk/src/Scopes.ts#L90)

Since v1.0.0

# Treasury

## Read

**Signature**

```ts
declare const Read: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/treasury-sdk/src/Scopes.ts#L36)

Since v1.0.0

## Treasury

**Signature**

```ts
declare const Treasury: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/treasury-sdk/src/Scopes.ts#L27)

Since v1.0.0

## Write

**Signature**

```ts
declare const Write: OAuthScope.Described<OAuthScope.OAuthScope<string>>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/treasury-sdk/src/Scopes.ts#L45)

Since v1.0.0

## all

Every scope, in the order a consent screen lists them: the treasury, its
read scope and the read endpoints' scopes, then its write scope and the
write endpoints'.

**Signature**

```ts
declare const all: () => ReadonlyArray<OAuthScope.Described>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/treasury-sdk/src/Scopes.ts#L130)

Since v1.0.0
