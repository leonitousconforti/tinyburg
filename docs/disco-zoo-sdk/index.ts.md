---
title: index.ts
nav_order: 3
parent: "@tinyburg/disco-zoo-sdk"
---

## index.ts overview

Disco Zoo SDK: signed calls against Nimblebit's NBSync service.

Signing reuses `@tinyburg/nimblebit-sdk` (`NimblebitAuth`): the game secret
salt (from `NBSync._ss`) is provided as the auth key, and each request is
`md5(<preimage> + <secret salt>)` with a random uint32 `salt` in the path.
All method preimages below are the Tiny Tower formula with the `dz` game code.

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
  - [DiscoZoo (namespace export)](#discozoo-namespace-export)
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

## DiscoZoo (namespace export)

Re-exports all named exports from the "./DiscoZoo.ts" module as `DiscoZoo`.

**Signature**

```ts
export * as DiscoZoo from "./DiscoZoo.ts"
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
