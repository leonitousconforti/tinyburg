---
title: index.ts
nav_order: 3
parent: Modules
---

## index.ts overview

Bit City SDK: signed calls against Nimblebit's NBSync service.

Signing reuses `@tinyburg/nimblebit-sdk` (`NimblebitAuth`): the game secret
salt (from `NBSync._ss`) is provided as the auth key, and each request is
`md5(<preimage> + <secret salt>)` with a random uint32 `salt` in the path.
All method preimages below are the Tiny Tower formula with the `bc` game code.

The methods that were exercised live against sync.nimblebit.com are marked
VERIFIED; save-bearing / write paths follow the same pattern but were not
exercised. Save bytes are returned raw (base64-decoded); inflating (pako) and
parsing into a save schema is left to the caller.

Since v1.0.0

---

## Exports Grouped by Category

- [Endpoints](#endpoints)
  - [Endpoints (namespace export)](#endpoints-namespace-export)
- [SDK](#sdk)
  - [BitCity (namespace export)](#bitcity-namespace-export)
- [Scopes](#scopes)
  - [Scopes (namespace export)](#scopes-namespace-export)

---

# Endpoints

## Endpoints (namespace export)

Re-exports all named exports from the "./Endpoints.ts" module as `Endpoints`.

**Signature**

```ts
export * as Endpoints from "./Endpoints.ts"
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/src/index.ts#L47)

Since v1.0.0

# SDK

## BitCity (namespace export)

Re-exports all named exports from the "./BitCity.ts" module as `BitCity`.

**Signature**

```ts
export * as BitCity from "./BitCity.ts"
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/src/index.ts#L21)

Since v1.0.0

# Scopes

## Scopes (namespace export)

Re-exports all named exports from the "./Scopes.ts" module as `Scopes`.

**Signature**

```ts
export * as Scopes from "./Scopes.ts"
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/src/index.ts#L58)

Since v1.0.0
