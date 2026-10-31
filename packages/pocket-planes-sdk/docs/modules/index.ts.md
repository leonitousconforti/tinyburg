---
title: index.ts
nav_order: 2
parent: Modules
---

## index.ts overview

Pocket Planes (game code `pp`) NBSync api endpoints.

Signing: a random `salt` (signed int32 - the game emits negatives too) goes
in the path, and `hash` is `md5(<preimage> + <game secret salt>)` where the
preimage is `pp/<playerId>/<salt><playerAuthKey>` (variants noted per
endpoint). The secret salt is the value extracted from `NBSync._ss`.

Verification (against the live server + Frida inspection of the game,
2026-08-26):

- Signing is MD5, VERIFIED server-side: `player_details` accepts the MD5 hash
  and rejects a garbage hash, no hash, and a SHA-256 hash. (The game itself
  computes SHA-256 in `NBSync.genHash` for the unauthenticated `register`
  call, which the server also accepts via MD5 - so it does not affect the
  authenticated endpoints this SDK signs.)
- Response envelopes VERIFIED by reading the game's DTO classes at runtime
  (immune to the metadata obfuscation): register (NBSyncRegisterResponse),
  player_details (NBSyncPlayerDetailsResponse), sync/pull
  (NBSyncGameSaveResponse: success/h/id/data), current_version
  (NBSyncCurrentCheckResponse), verify_device (NBSyncVerifyCodeResponse:
  success/player_id/player_ss/player_email - no photo/nickname on pp),
  get_visits/get_gifts (NBSyncItemsGetResponse), send_item
  (NBSyncItemsSendResponse), receive_item (NBSyncItemsReceiveResponse: also
  carries an `id`), friend/pull_game (NBSyncFriendGameSaveResponse),
  friend/pull_meta (NBSyncFriendGameMetaResponse). register/player_details/
  get_visits/get_gifts/request_items were also exercised live with a burnbot.
- Still open: pp appears to have NO snapshots (`sync/current_snapshots`
  returns Invalid Request), so `pull_snapshot` here is unconfirmed and may
  not exist. register_email is DERIVED from Tiny Tower.

Game-specific payload/item schemas (the `gifts` element - real shape is
NBSyncItemsGift {gift_id, gift_to, gift_from, gift_type, item_type, gift_str,
h, c} - friend meta, save push meta) are `Schema.Unknown` placeholders for
the data-schema work.

Since v1.0.0

---

## Exports Grouped by Category

- [Endpoints](#endpoints)
  - [Endpoints (namespace export)](#endpoints-namespace-export)
- [SDK](#sdk)
  - [PocketPlanes (namespace export)](#pocketplanes-namespace-export)
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

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/src/index.ts#L43)

Since v1.0.0

# SDK

## PocketPlanes (namespace export)

Re-exports all named exports from the "./PocketPlanes.ts" module as `PocketPlanes`.

**Signature**

```ts
export * as PocketPlanes from "./PocketPlanes.ts"
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/src/index.ts#L61)

Since v1.0.0

# Scopes

## Scopes (namespace export)

Re-exports all named exports from the "./Scopes.ts" module as `Scopes`.

**Signature**

```ts
export * as Scopes from "./Scopes.ts"
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/src/index.ts#L72)

Since v1.0.0
