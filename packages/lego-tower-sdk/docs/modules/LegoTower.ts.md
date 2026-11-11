---
title: LegoTower.ts
nav_order: 2
parent: Modules
---

## LegoTower.ts overview

LEGO Tower SDK: signed calls against Nimblebit's NBSync service.

Signing reuses `@tinyburg/nimblebit-sdk` (`NimblebitAuth`): the game secret
salt (from `NBSync._ss`) is provided as the auth key, and each request is
`md5(<preimage> + <secret salt>)` with a random signed int32 `salt` in the path.
Each method signs the preimage the game was observed signing, except
`sync_pullSave`, whose preimage the live server accepted on replay.

Methods say how they are known (Play build 1.27.2, 2026-11-09): OBSERVED
means the game made the request, REPLAYED means the method succeeded against
sync.nimblebit.com. Save bytes are returned raw (base64-decoded); inflating
(pako) and parsing into a save schema is left to the caller.

Since v1.0.0

---

## Exports Grouped by Category

- [SDK](#sdk)
  - [device_newPlayer](#device_newplayer)
  - [device_playerDetails](#device_playerdetails)
  - [social_getItems](#social_getitems)
  - [social_getMailbox](#social_getmailbox)
  - [social_getMailboxCount](#social_getmailboxcount)
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

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/lego-tower-sdk/src/LegoTower.ts#L38)

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

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/lego-tower-sdk/src/LegoTower.ts#L75)

Since v1.0.0

## social_getItems

Lists items (parts/gifts) waiting for the player. OBSERVED and REPLAYED
(`/get_items/lt/...` -> `{ success: "Found", gifts: [] }`, no `total`).

**Signature**

```ts
declare const social_getItems: (args_0: {
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

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/lego-tower-sdk/src/LegoTower.ts#L157)

Since v1.0.0

## social_getMailbox

Lists the gifts and trades in the player's mailbox. OBSERVED
(`{ success: "Found", total: "0", maxDisplay: 50 }`, no `mail` when empty).

**Signature**

```ts
declare const social_getMailbox: (args_0: {
  readonly playerAuthKey: Redacted.Redacted<string> & Brand<"PlayerAuthKey">
  readonly playerId: string & Brand<"PlayerId">
}) => Effect.Effect<
  | { readonly success: "NotFound" }
  | {
      readonly success: "Found"
      readonly total: number
      readonly maxDisplay: number
      readonly mail?: ReadonlyArray<unknown> | undefined
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

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/lego-tower-sdk/src/LegoTower.ts#L327)

Since v1.0.0

## social_getMailboxCount

Counts the mail waiting for the player. OBSERVED
(`{ success: "Found", total: "0", from: [], maxDisplay: 50 }`).

**Signature**

```ts
declare const social_getMailboxCount: (args_0: {
  readonly playerAuthKey: Redacted.Redacted<string> & Brand<"PlayerAuthKey">
  readonly playerId: string & Brand<"PlayerId">
}) => Effect.Effect<
  | { readonly success: "NotFound" }
  | {
      readonly success: "Found"
      readonly total: number
      readonly maxDisplay: number
      readonly from: ReadonlyArray<unknown>
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

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/lego-tower-sdk/src/LegoTower.ts#L287)

Since v1.0.0

## social_pullFriendGame

Pulls a friend's game save. Returns raw base64-decoded bytes (inflate +
parse separately). OBSERVED preimage
`lt/<playerId>/<friendId>/<salt><playerAuthKey>`, with the player's own id
as `friendId`; only the `SaveNotFound` reply was seen.

**Signature**

```ts
declare const social_pullFriendGame: (
  args_0: {
    readonly playerAuthKey: Redacted.Redacted<string> & Brand<"PlayerAuthKey">
    readonly playerId: string & Brand<"PlayerId">
  } & { friendId: Schema.Schema.Type<typeof Endpoints.PlayerId> }
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

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/lego-tower-sdk/src/LegoTower.ts#L199)

Since v1.0.0

## social_pullFriendMeta

Pulls metadata about a friend. OBSERVED preimage
`lt/<playerId>/<salt><friends><playerAuthKey>`, reply
`{ success: "Found", meta: {} }`. The game posts `friends` as a form field;
this sends it as JSON, and whether the server accepts JSON is unverified.

**Signature**

```ts
declare const social_pullFriendMeta: (
  args_0: {
    readonly playerAuthKey: Redacted.Redacted<string> & Brand<"PlayerAuthKey">
    readonly playerId: string & Brand<"PlayerId">
  } & { friendId: Schema.Schema.Type<typeof Endpoints.PlayerId> }
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

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/lego-tower-sdk/src/LegoTower.ts#L244)

Since v1.0.0

## social_retrieveFriendsSnapshotList

Lists a player's cloud snapshots. OBSERVED preimage
`lt/<playerId>/<friendId>/<salt><playerAuthKey>`; the game passed its own id
as `friendId` and got `{ success: "Found", saves: [] }`.

**Signature**

```ts
declare const social_retrieveFriendsSnapshotList: (
  args_0: {
    readonly playerAuthKey: Redacted.Redacted<string> & Brand<"PlayerAuthKey">
    readonly playerId: string & Brand<"PlayerId">
  } & { friendId: Schema.Schema.Type<typeof Endpoints.PlayerId> }
) => Effect.Effect<
  { readonly success: "NotFound" } | { readonly success: "Found"; readonly saves: ReadonlyArray<unknown> },
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

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/lego-tower-sdk/src/LegoTower.ts#L368)

Since v1.0.0

## sync_pullSave

Pulls the player's cloud save. Returns raw base64-decoded bytes (inflate +
parse separately). REPLAYED: the server accepted the path and preimage and
answered `SaveNotFound` for a player with no save. The envelope's field
names are from the game's DTO; the Found reply was not observed.

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

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/lego-tower-sdk/src/LegoTower.ts#L117)

Since v1.0.0
