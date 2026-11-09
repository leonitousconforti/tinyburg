---
title: TinyTowerVegas.ts
nav_order: 3
parent: Modules
---

## TinyTowerVegas.ts overview

Tiny Tower Vegas SDK: signed calls against Nimblebit's NBSync service.

Signing reuses `@tinyburg/nimblebit-sdk` (`NimblebitAuth`): the game secret
salt (from `NBSync._ss`) is provided as the auth key, and each request is
`md5(<preimage> + <secret salt>)` with a random `salt` in the path. The SDK
draws uint32 salts, which the server accepts; the game sends signed int32
ones. Each preimage below is the one the game was OBSERVED signing (Play
build 1.5.2, 2026-11-09), except `sync_pullSave`'s, which the game did not
send.

Functions marked REPLAYED succeeded against sync.nimblebit.com (2026-11-09).
Save bytes are returned raw (base64-decoded); inflating (pako) and parsing
into a save schema is left to the caller.

Since v1.0.0

---

## Exports Grouped by Category

- [SDK](#sdk)
  - [device_newPlayer](#device_newplayer)
  - [device_playerDetails](#device_playerdetails)
  - [social_getItems](#social_getitems)
  - [social_getVisits](#social_getvisits)
  - [social_pullFriendGame](#social_pullfriendgame)
  - [social_pullFriendMeta](#social_pullfriendmeta)
  - [social_retrieveFriendsSnapshotList](#social_retrievefriendssnapshotlist)
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

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-vegas-sdk/src/TinyTowerVegas.ts#L41)

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

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-vegas-sdk/src/TinyTowerVegas.ts#L78)

Since v1.0.0

## social_getItems

Lists items (gifts) waiting for the player. OBSERVED and REPLAYED
(`/get_items/vegas/...` -> `{ success: "Found", event_rewards: [...], gifts:
[...] }`).

**Signature**

```ts
declare const social_getItems: (args_0: {
  readonly playerAuthKey: Redacted.Redacted<string> & Brand<"PlayerAuthKey">
  readonly playerId: string & Brand<"PlayerId">
}) => Effect.Effect<
  | { readonly success: "NotFound" }
  | {
      readonly success: "Found"
      readonly gifts: ReadonlyArray<unknown>
      readonly event_rewards?: ReadonlyArray<unknown> | undefined
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

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-vegas-sdk/src/TinyTowerVegas.ts#L161)

Since v1.0.0

## social_getVisits

Lists the visits made to the player's tower. OBSERVED preimage
`vegas/<playerId>/<salt><playerAuthKey>`; not replayed.

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

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-vegas-sdk/src/TinyTowerVegas.ts#L201)

Since v1.0.0

## social_pullFriendGame

Pulls a friend's cloud save. Returns raw base64-decoded bytes (inflate +
parse separately). OBSERVED preimage
`vegas/<playerId>/<friendId>/<salt><playerAuthKey>`, captured with the
player's own id as the friend, so the order of the two ids is DERIVED from
Tiny Tower. Only the `{ error: "SaveNotFound" }` reply was seen; not
replayed.

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

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-vegas-sdk/src/TinyTowerVegas.ts#L245)

Since v1.0.0

## social_pullFriendMeta

Pulls metadata about a friend. OBSERVED preimage
`vegas/<playerId>/<salt><friendId><playerAuthKey>`, captured with the
player's own id as the friend; not replayed. The game posts `friends` as a
form field and takes a list of them; this sends one id as JSON, which the
server is not known to accept.

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

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-vegas-sdk/src/TinyTowerVegas.ts#L291)

Since v1.0.0

## social_retrieveFriendsSnapshotList

Lists a friend's cloud snapshots. OBSERVED preimage
`vegas/<playerId>/<friendId>/<salt><playerAuthKey>`; with the player's own
id as the friend the server answered `{ error: "Invalid Request" }`. The
order of the two ids and the `Found` envelope are DERIVED from Tiny Tower;
not replayed.

**Signature**

```ts
declare const social_retrieveFriendsSnapshotList: (
  args_0: {
    readonly playerAuthKey: Redacted.Redacted<string> & Brand<"PlayerAuthKey">
    readonly playerId: string & Brand<"PlayerId">
  } & { friendId: Schema.Schema.Type<typeof NimblebitConfig.PlayerIdSchema> }
) => Effect.Effect<
  { readonly success: "NotFound" } | { readonly success: "Found"; readonly saves: ReadonlyArray<unknown> },
  | NimblebitError.NimblebitError
  | Forbidden
  | BadRequest
  | Unauthorized
  | InternalServerError
  | Schema.SchemaError
  | HttpClientError,
  any
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-vegas-sdk/src/TinyTowerVegas.ts#L337)

Since v1.0.0

## sync_pullSave

Pulls the player's cloud save. Returns raw base64-decoded bytes (inflate +
parse separately). Replayed for a player with no save, the server answered
`{ error: "SaveNotFound" }`, so it accepts this path and preimage. The
`Found` envelope is DERIVED from Tiny Tower.

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

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-vegas-sdk/src/TinyTowerVegas.ts#L120)

Since v1.0.0
