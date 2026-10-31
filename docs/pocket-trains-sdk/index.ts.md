---
title: index.ts
nav_order: 2
parent: "@tinyburg/pocket-trains-sdk"
---

## index.ts overview

Pocket Trains (game code `pt`) NBSync api endpoints.

Signing: a random `salt` (signed int32) goes in the path, and `hash` is
`md5(<preimage> + <game secret salt>)` with the preimage
`pt/<playerId>/<salt><playerAuthKey>` (variants noted per endpoint). The
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
- pt-specific gifting: `get_gifts_pt` -> NBSyncGetPTGiftResponse with
  NBSyncGetPTGift elements, plus a gift-id flow (NBSyncGetGiftIDResponse,
  `friend/pull_meta_gift_id`). The get_gifts_pt REQUEST params are UNCONFIRMED
  (the tried `/get_gifts_pt/pt/:playerId/:salt/:hash` form was rejected), so
  that endpoint is marked accordingly.

Game-specific save/meta schemas are left as `Schema.Unknown` placeholders.

Since v1.0.0

---

## Exports Grouped by Category

- [Endpoints](#endpoints)
  - [Endpoints (namespace export)](#endpoints-namespace-export)
- [SDK](#sdk)
  - [PocketTrains (namespace export)](#pockettrains-namespace-export)
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

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/src/index.ts#L33)

Since v1.0.0

# SDK

## PocketTrains (namespace export)

Re-exports all named exports from the "./PocketTrains.ts" module as `PocketTrains`.

**Signature**

```ts
export * as PocketTrains from "./PocketTrains.ts"
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/src/index.ts#L51)

Since v1.0.0

# Scopes

## Scopes (namespace export)

Re-exports all named exports from the "./Scopes.ts" module as `Scopes`.

**Signature**

```ts
export * as Scopes from "./Scopes.ts"
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/src/index.ts#L62)

Since v1.0.0
