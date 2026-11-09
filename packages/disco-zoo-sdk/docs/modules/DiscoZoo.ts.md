---
title: DiscoZoo.ts
nav_order: 1
parent: Modules
---

## DiscoZoo.ts overview

Disco Zoo SDK: signed calls against Nimblebit's NBSync service.

Signing reuses `@tinyburg/nimblebit-sdk` (`NimblebitAuth`): the game secret
salt (from `NBSync._ss`) is provided as the auth key, and each request is
`md5(<preimage> + <secret salt>)` with a random uint32 `salt` in the path.
The game itself uses signed int32 salts; the server accepts both.

Each method says where its preimage comes from (Play build 1.6.3,
2026-11-09): OBSERVED (the game made this request) or REPLAYED (this function
was accepted by the live server). Save bytes are returned raw
(base64-decoded); inflating (pako) and parsing into a save schema is left to
the caller.

Since v1.0.0

---

## Exports Grouped by Category

- [SDK](#sdk)
  - [device_newPlayer](#device_newplayer)
  - [device_playerDetails](#device_playerdetails)
  - [social_getItems](#social_getitems)
  - [social_pullFriendGame](#social_pullfriendgame)
  - [social_pullFriendMeta](#social_pullfriendmeta)
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
  | Forbidden
  | BadRequest
  | Unauthorized
  | InternalServerError
  | NimblebitError
  | Schema.SchemaError
  | PlatformError
  | HttpClientError,
  NimblebitAuth.NimblebitAuth | HttpClient.HttpClient
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/disco-zoo-sdk/src/DiscoZoo.ts#L40)

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
  | Forbidden
  | BadRequest
  | Unauthorized
  | InternalServerError
  | NimblebitError
  | Schema.SchemaError
  | PlatformError
  | HttpClientError,
  NimblebitAuth.NimblebitAuth | HttpClient.HttpClient
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/disco-zoo-sdk/src/DiscoZoo.ts#L77)

Since v1.0.0

## social_getItems

Lists items (gifts) waiting for the player. OBSERVED and REPLAYED
(`/get_items/dz/...` -> `{ success: "Found", gifts: [] }`, no `total`).

**Signature**

```ts
declare const social_getItems: (args_0: {
  readonly playerAuthKey: Redacted.Redacted<string> & Brand<"PlayerAuthKey">
  readonly playerId: string & Brand<"PlayerId">
}) => Effect.Effect<
  { readonly success: "NotFound" } | { readonly success: "Found"; readonly gifts: ReadonlyArray<unknown> },
  | Forbidden
  | BadRequest
  | Unauthorized
  | InternalServerError
  | NimblebitError
  | Schema.SchemaError
  | PlatformError
  | HttpClientError,
  NimblebitAuth.NimblebitAuth | HttpClient.HttpClient
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/disco-zoo-sdk/src/DiscoZoo.ts#L159)

Since v1.0.0

## social_pullFriendGame

Pulls a friend's cloud save. Returns raw base64-decoded bytes (inflate +
parse separately). OBSERVED preimage
`dz/<playerId>/<friendId>/<salt><playerAuthKey>`; the game was driven with
its own id as `friendId`, and only the SaveNotFound reply was seen.

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
  | Forbidden
  | BadRequest
  | Unauthorized
  | InternalServerError
  | NimblebitError
  | Schema.SchemaError
  | PlatformError
  | HttpClientError,
  NimblebitAuth.NimblebitAuth | HttpClient.HttpClient
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/disco-zoo-sdk/src/DiscoZoo.ts#L201)

Since v1.0.0

## social_pullFriendMeta

Fetches a friend's meta. OBSERVED preimage
`dz/<playerId>/<salt><friendId><playerAuthKey>`, response
`{ success: "Found", meta: {} }`, with the game's own id as `friendId`. The
game posts a list of friends as a form
field; this sends one friend as JSON, which the server is not verified to
accept.

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
  | Forbidden
  | BadRequest
  | Unauthorized
  | InternalServerError
  | NimblebitError
  | Schema.SchemaError
  | PlatformError
  | HttpClientError,
  NimblebitAuth.NimblebitAuth | HttpClient.HttpClient
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/disco-zoo-sdk/src/DiscoZoo.ts#L248)

Since v1.0.0

## sync_pullSave

Pulls the player's cloud save. Returns raw base64-decoded bytes (inflate +
parse separately). REPLAYED: the live server accepted the path and signature
and answered SaveNotFound for a fresh player. The envelope field names come
from the game's DTO; the Found body is not captured yet.

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
  | Forbidden
  | BadRequest
  | Unauthorized
  | InternalServerError
  | NimblebitError
  | Schema.SchemaError
  | PlatformError
  | HttpClientError,
  NimblebitAuth.NimblebitAuth | HttpClient.HttpClient
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/disco-zoo-sdk/src/DiscoZoo.ts#L119)

Since v1.0.0
