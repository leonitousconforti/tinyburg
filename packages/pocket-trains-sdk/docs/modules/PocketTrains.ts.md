---
title: PocketTrains.ts
nav_order: 2
parent: Modules
---

## PocketTrains.ts overview

Pocket Trains SDK: signed calls against Nimblebit's NBSync service.

Signing reuses `@tinyburg/nimblebit-sdk` (`NimblebitAuth`): the game secret
salt (from `NBSync._ss`) is provided as the auth key, and each request is
`md5(<preimage> + <secret salt>)` with a random signed int32 `salt` in the path.
Each preimage matches the one the game was seen signing, except `get_items`,
whose game request was not observed.

Each method says whether the game was OBSERVED making its request and whether
the method was REPLAYED against sync.nimblebit.com (2026-11-09). Save bytes
are returned raw (base64-decoded); inflating (pako) and parsing into a save
schema is left to the caller.

Since v1.0.0

---

## Exports Grouped by Category

- [SDK](#sdk)
  - [device_newPlayer](#device_newplayer)
  - [device_playerDetails](#device_playerdetails)
  - [social_getItems](#social_getitems)
  - [social_pullFriendGame](#social_pullfriendgame)
  - [social_pullFriendMeta](#social_pullfriendmeta)
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

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/pocket-trains-sdk/src/PocketTrains.ts#L40)

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

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/pocket-trains-sdk/src/PocketTrains.ts#L77)

Since v1.0.0

## social_getItems

Lists items (parts/gifts) waiting for the player. REPLAYED
(`/get_items/pt/...` -> `{ success:"Found", gifts:[...] }`, no total); the
game's own request was not observed. A later call for the same player returned
no gifts, so this may consume them (unverified).

**Signature**

```ts
declare const social_getItems: (args_0: {
  readonly playerAuthKey: Redacted.Redacted<string> & Brand<"PlayerAuthKey">
  readonly playerId: string & Brand<"PlayerId">
}) => Effect.Effect<
  | { readonly success: "NotFound" }
  | {
      readonly success: "Found"
      readonly gifts: ReadonlyArray<{
        readonly h: string
        readonly gift_id: string
        readonly gift_to: string
        readonly gift_from: string
        readonly gift_type: string
        readonly gift_str: string
        readonly c?: number | undefined
      }>
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

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/pocket-trains-sdk/src/PocketTrains.ts#L201)

Since v1.0.0

## social_pullFriendGame

Pulls a friend's cloud save. Returns raw base64-decoded bytes (inflate + parse
separately). OBSERVED, but only with the player's own id as the friend and no
save (`{ error: "SaveNotFound" }`); the Found envelope is from the game's DTO
NBSyncFriendGameSaveResponse. Not replayed.

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

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/pocket-trains-sdk/src/PocketTrains.ts#L243)

Since v1.0.0

## social_pullFriendMeta

Pulls metadata about a friend. OBSERVED, but only with the player's own id as
the friend (`{ success: "Found", meta: {} }`). The game posts `friends` as a
form field and passes a list; this sends one id as JSON, and whether the
server accepts JSON is unverified. Not replayed.

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

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/pocket-trains-sdk/src/PocketTrains.ts#L288)

Since v1.0.0

## sync_checkForNewerSave

Checks the id of the player's latest cloud save. OBSERVED, but only for a
player without a save (`{ error: "NoSave" }`); the Found envelope is from the
game's DTO NBSyncCurrentCheckResponse. Not replayed.

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

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/pocket-trains-sdk/src/PocketTrains.ts#L159)

Since v1.0.0

## sync_pullSave

Pulls the player's cloud save. Returns raw base64-decoded bytes (inflate +
parse separately). OBSERVED and REPLAYED, but only for a player without a
save; the Found envelope is from the game's DTO NBSyncGameSaveResponse.

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

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/pocket-trains-sdk/src/PocketTrains.ts#L118)

Since v1.0.0
