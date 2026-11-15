---
title: BitCity.ts
nav_order: 1
parent: Modules
---

## BitCity.ts overview

Bit City SDK: signed calls against Nimblebit's NBSync service.

Signing reuses `@tinyburg/nimblebit-sdk` (`NimblebitAuth`): the game secret
salt (from `NBSync._ss`) is provided as the auth key, and each request is
`md5(<preimage> + <secret salt>)` with a random signed int32 `salt` in the path.

Each method says where its preimage comes from: OBSERVED (the game made
this request, Play build 1.6.0, 2026-11-09) and/or REPLAYED (this function
ran against sync.nimblebit.com, 2026-11-09). Save bytes are returned raw
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
  | NimblebitError.NimblebitError
  | Schema.SchemaError
  | HttpClientError,
  NimblebitAuth.NimblebitAuth | HttpClient.HttpClient
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/bitcity-sdk/src/BitCity.ts#L39)

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
  | NimblebitError.NimblebitError
  | Schema.SchemaError
  | HttpClientError,
  NimblebitAuth.NimblebitAuth | HttpClient.HttpClient
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/bitcity-sdk/src/BitCity.ts#L76)

Since v1.0.0

## social_getItems

Lists the gifts waiting for the player. OBSERVED and REPLAYED
(`/get_items/bc/...` -> `{ success: "Found", gifts: [] }`).

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
  | NimblebitError.NimblebitError
  | Schema.SchemaError
  | HttpClientError,
  NimblebitAuth.NimblebitAuth | HttpClient.HttpClient
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/bitcity-sdk/src/BitCity.ts#L158)

Since v1.0.0

## social_pullFriendGame

Pulls a friend's cloud save. Returns raw base64-decoded bytes (inflate +
parse separately). The preimage is OBSERVED, with the player's own id as the
friend; this function was not REPLAYED.

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
  | NimblebitError.NimblebitError
  | Schema.SchemaError
  | HttpClientError,
  NimblebitAuth.NimblebitAuth | HttpClient.HttpClient
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/bitcity-sdk/src/BitCity.ts#L199)

Since v1.0.0

## social_pullFriendMeta

Fetches metadata about a friend's game. The preimage is OBSERVED, with the
player's own id as the friend; this function was not REPLAYED. `friends` is
sent as JSON while the game posts a form, and whether the server accepts JSON
is unverified.

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
  | NimblebitError.NimblebitError
  | Schema.SchemaError
  | HttpClientError,
  NimblebitAuth.NimblebitAuth | HttpClient.HttpClient
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/bitcity-sdk/src/BitCity.ts#L244)

Since v1.0.0

## sync_pullSave

Pulls the player's cloud save. Returns raw base64-decoded bytes (inflate +
parse separately). REPLAYED: the server accepted the signature and answered
`SaveNotFound` for a player with no save. The `Found` fields match the DTO
NBSyncGameSaveResponse, but no save was returned.

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
  | NimblebitError.NimblebitError
  | Schema.SchemaError
  | HttpClientError,
  NimblebitAuth.NimblebitAuth | HttpClient.HttpClient
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/bitcity-sdk/src/BitCity.ts#L118)

Since v1.0.0
