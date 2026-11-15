---
title: PocketPlanes.ts
nav_order: 2
parent: Modules
---

## PocketPlanes.ts overview

Pocket Planes SDK: signed calls against Nimblebit's NBSync service.

Signing reuses `@tinyburg/nimblebit-sdk` (`NimblebitAuth`): the game secret
salt (from `NBSync._ss`) is provided as the auth key, and each request is
`md5(<preimage> + <secret salt>)` with a random signed int32 `salt` in the path.
The preimages below are the ones the game used (OBSERVED), except for
get_gifts, which the game never calls.

Each function is marked OBSERVED when the game made its request (Play build
2.17.3, 2026-11-09) and REPLAYED when the function itself succeeded against
the live server (2026-11-09). Save bytes are returned raw (base64-decoded);
inflating (pako) and parsing into a save schema is left to the caller.

Since v1.0.0

---

## Exports Grouped by Category

- [SDK](#sdk)
  - [device_newPlayer](#device_newplayer)
  - [device_playerDetails](#device_playerdetails)
  - [social_getGifts](#social_getgifts)
  - [social_getVisits](#social_getvisits)
  - [social_pullFriendGame](#social_pullfriendgame)
  - [social_pullFriendMeta](#social_pullfriendmeta)
  - [social_requestItems](#social_requestitems)
  - [sync_checkForNewerSave](#sync_checkfornewersave)
  - [sync_pullSave](#sync_pullsave)

---

# SDK

## device_newPlayer

Requests a new player ("burnbot") from the Nimblebit servers. OBSERVED and
REPLAYED.

**Signature**

```ts
declare const device_newPlayer: Effect.Effect<
  {
    readonly playerId: string & Brand<"PlayerId">
    readonly playerSs: Redacted.Redacted<string> & Brand<"PlayerAuthKey">
  },
  | NimblebitError.NimblebitError
  | Forbidden
  | BadRequest
  | Unauthorized
  | InternalServerError
  | Schema.SchemaError
  | HttpClientError,
  NimblebitAuth.NimblebitAuth | HttpClient.HttpClient
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/pocket-planes-sdk/src/PocketPlanes.ts#L40)

Since v1.0.0

## device_playerDetails

Retrieves player details. OBSERVED and REPLAYED.

**Signature**

```ts
declare const device_playerDetails: (args_0: {
  readonly playerAuthKey: Redacted.Redacted<string> & Brand<"PlayerAuthKey">
  readonly playerId: string & Brand<"PlayerId">
}) => Effect.Effect<
  {
    readonly playerId: string & Brand<"PlayerId">
    readonly playerEmail: Redacted.Redacted<string> & Brand<"PlayerEmail">
    readonly registered: boolean
    readonly blacklisted: boolean
    readonly saveVersion: number
    readonly checksum: string
  },
  | NimblebitError.NimblebitError
  | Forbidden
  | BadRequest
  | Unauthorized
  | InternalServerError
  | Schema.SchemaError
  | HttpClientError,
  NimblebitAuth.NimblebitAuth | HttpClient.HttpClient
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/pocket-planes-sdk/src/PocketPlanes.ts#L77)

Since v1.0.0

## social_getGifts

Lists gifts waiting for the player. REPLAYED. The game itself never calls
get_gifts; it fetches its incoming items with `social_requestItems`.

**Signature**

```ts
declare const social_getGifts: (args_0: {
  readonly playerAuthKey: Redacted.Redacted<string> & Brand<"PlayerAuthKey">
  readonly playerId: string & Brand<"PlayerId">
}) => Effect.Effect<
  | { readonly success: "NotFound" }
  | { readonly success: "Found"; readonly gifts: ReadonlyArray<unknown>; readonly total: number },
  | NimblebitError.NimblebitError
  | Forbidden
  | BadRequest
  | Unauthorized
  | InternalServerError
  | Schema.SchemaError
  | HttpClientError,
  NimblebitAuth.NimblebitAuth | HttpClient.HttpClient
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/pocket-planes-sdk/src/PocketPlanes.ts#L238)

Since v1.0.0

## social_getVisits

Lists visits (bitizen/plane exchanges) waiting for the player. OBSERVED and
REPLAYED.

**Signature**

```ts
declare const social_getVisits: (args_0: {
  readonly playerAuthKey: Redacted.Redacted<string> & Brand<"PlayerAuthKey">
  readonly playerId: string & Brand<"PlayerId">
}) => Effect.Effect<
  | { readonly success: "NotFound" }
  | { readonly success: "Found"; readonly gifts: ReadonlyArray<unknown>; readonly total: number },
  | NimblebitError.NimblebitError
  | Forbidden
  | BadRequest
  | Unauthorized
  | InternalServerError
  | Schema.SchemaError
  | HttpClientError,
  NimblebitAuth.NimblebitAuth | HttpClient.HttpClient
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/pocket-planes-sdk/src/PocketPlanes.ts#L198)

Since v1.0.0

## social_pullFriendGame

Pulls a friend's cloud save. Returns raw base64-decoded bytes (inflate +
parse separately). OBSERVED only the no-save case, with the player's own id
as the friend; not REPLAYED.

**Signature**

```ts
declare const social_pullFriendGame: (
  args_0: {
    readonly playerAuthKey: Redacted.Redacted<string> & Brand<"PlayerAuthKey">
    readonly playerId: string & Brand<"PlayerId">
  } & { friendId: Schema.Schema.Type<typeof NimblebitConfig.PlayerIdSchema> }
) => Effect.Effect<
  | { readonly success: "NotFound" }
  | {
      readonly success: "Found"
      readonly data: Uint8Array<ArrayBufferLike>
      readonly checksum: string
      readonly saveId: number
      readonly playerId: string & Brand<"PlayerId">
    },
  | NimblebitError.NimblebitError
  | Forbidden
  | BadRequest
  | Unauthorized
  | InternalServerError
  | Schema.SchemaError
  | HttpClientError,
  NimblebitAuth.NimblebitAuth | HttpClient.HttpClient
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/pocket-planes-sdk/src/PocketPlanes.ts#L364)

Since v1.0.0

## social_pullFriendMeta

Pulls metadata about a friend. OBSERVED with the player's own id as the
friend (`meta` was empty); not REPLAYED. The game sends a list of friends;
this function sends one.

**Signature**

```ts
declare const social_pullFriendMeta: (
  args_0: {
    readonly playerAuthKey: Redacted.Redacted<string> & Brand<"PlayerAuthKey">
    readonly playerId: string & Brand<"PlayerId">
  } & { friendId: Schema.Schema.Type<typeof NimblebitConfig.PlayerIdSchema> }
) => Effect.Effect<
  | { readonly success: "NotFound" }
  | { readonly success: "Found"; readonly meta: { readonly [x: string & Brand<"PlayerId">]: unknown } },
  | NimblebitError.NimblebitError
  | Forbidden
  | BadRequest
  | Unauthorized
  | InternalServerError
  | Schema.SchemaError
  | HttpClientError,
  NimblebitAuth.NimblebitAuth | HttpClient.HttpClient
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/pocket-planes-sdk/src/PocketPlanes.ts#L320)

Since v1.0.0

## social_requestItems

Fetches the sync items (gifts) waiting for the player (Pocket Planes
specific; `{ success, gifts }` with no `total`). The game calls it from
`NBSyncItems.getSyncItems`. OBSERVED and REPLAYED.

**Signature**

```ts
declare const social_requestItems: (args_0: {
  readonly playerAuthKey: Redacted.Redacted<string> & Brand<"PlayerAuthKey">
  readonly playerId: string & Brand<"PlayerId">
}) => Effect.Effect<
  { readonly success: "NotFound" } | { readonly success: "Found"; readonly gifts: ReadonlyArray<unknown> },
  | NimblebitError.NimblebitError
  | Forbidden
  | BadRequest
  | Unauthorized
  | InternalServerError
  | Schema.SchemaError
  | HttpClientError,
  NimblebitAuth.NimblebitAuth | HttpClient.HttpClient
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/pocket-planes-sdk/src/PocketPlanes.ts#L279)

Since v1.0.0

## sync_checkForNewerSave

Checks the latest save version on the Nimblebit servers. OBSERVED only the
no-save case (`NoSave`); not REPLAYED.

**Signature**

```ts
declare const sync_checkForNewerSave: (args_0: {
  readonly playerAuthKey: Redacted.Redacted<string> & Brand<"PlayerAuthKey">
  readonly playerId: string & Brand<"PlayerId">
}) => Effect.Effect<
  { readonly success: "NotFound" } | { readonly success: "Found"; readonly checksum: string; readonly saveId: number },
  | NimblebitError.NimblebitError
  | Forbidden
  | BadRequest
  | Unauthorized
  | InternalServerError
  | Schema.SchemaError
  | HttpClientError,
  NimblebitAuth.NimblebitAuth | HttpClient.HttpClient
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/pocket-planes-sdk/src/PocketPlanes.ts#L158)

Since v1.0.0

## sync_pullSave

Pulls the player's cloud save. Returns raw base64-decoded bytes (inflate +
parse separately). OBSERVED and REPLAYED only the no-save case; the success
envelope is DERIVED from Tiny Tower.

**Signature**

```ts
declare const sync_pullSave: (args_0: {
  readonly playerAuthKey: Redacted.Redacted<string> & Brand<"PlayerAuthKey">
  readonly playerId: string & Brand<"PlayerId">
}) => Effect.Effect<
  | { readonly success: "NotFound" }
  | {
      readonly success: "Found"
      readonly data: Uint8Array<ArrayBufferLike>
      readonly checksum: string
      readonly saveId: number
    },
  | NimblebitError.NimblebitError
  | Forbidden
  | BadRequest
  | Unauthorized
  | InternalServerError
  | Schema.SchemaError
  | HttpClientError,
  NimblebitAuth.NimblebitAuth | HttpClient.HttpClient
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/pocket-planes-sdk/src/PocketPlanes.ts#L118)

Since v1.0.0
