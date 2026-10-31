---
title: index.ts
nav_order: 2
parent: "@tinyburg/lego-tower-sdk"
---

## index.ts overview

LEGO Tower (game code `lt`) NBSync api endpoints.

Signing: a random `salt` (signed int32) goes in the path, and `hash` is
`md5(<preimage> + <game secret salt>)` with the preimage
`lt/<playerId>/<salt><playerAuthKey>` (variants noted per endpoint). The
secret salt is the value extracted from `NBSync._ss`.

Verification (live server + Frida DTO inspection of the game, 2026-08-26):

- Signing is MD5, server-validated (same scheme as Tiny Tower / Pocket
  Planes; the game computes SHA-256 only for the unauthenticated `register`).
- Response envelopes VERIFIED by reading the game's DTO classes at runtime:
  register, player_details, sync/pull (NBSyncGameSaveResponse), current_version,
  verify_device, friend/pull_game, friend/pull_meta (meta is a flat
  Dictionary<String,Object> on pt), send_item (NBSyncItemsSendResponse),
  get_items (NBSyncItemsGetResponse: success/gifts, NO `total` unlike pp).
  `get_items` was also exercised live with a burnbot.
- Rich endpoint set: adds snapshots, trades, mailbox, AG, and LL-friends.
- LEGO Tower issues player ids longer than 5 chars (relaxed PlayerId schema).

Game-specific save/meta schemas are left as `Schema.Unknown` placeholders.

Since v1.0.0

---

## Exports Grouped by Category

- [Endpoints](#endpoints)
  - [Endpoints (namespace export)](#endpoints-namespace-export)
- [SDK](#sdk)
  - [LegoTower (namespace export)](#legotower-namespace-export)
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

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/src/index.ts#L30)

Since v1.0.0

# SDK

## LegoTower (namespace export)

Re-exports all named exports from the "./LegoTower.ts" module as `LegoTower`.

**Signature**

```ts
export * as LegoTower from "./LegoTower.ts"
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/src/index.ts#L48)

Since v1.0.0

# Scopes

## Scopes (namespace export)

Re-exports all named exports from the "./Scopes.ts" module as `Scopes`.

**Signature**

```ts
export * as Scopes from "./Scopes.ts"
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/src/index.ts#L59)

Since v1.0.0
