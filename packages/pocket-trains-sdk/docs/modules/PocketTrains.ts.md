---
title: PocketTrains.ts
nav_order: 2
parent: Modules
---

## PocketTrains.ts overview

Pocket Trains SDK: signed calls against Nimblebit's NBSync service.

Signing reuses `@tinyburg/nimblebit-sdk` (`NimblebitAuth`): the game secret
salt (from `NBSync._ss`) is provided as the auth key, and each request is
`md5(<preimage> + <secret salt>)` with a random uint32 `salt` in the path.
All method preimages below are the Tiny Tower formula with the `pt` game code.

The methods that were exercised live against sync.nimblebit.com are marked
VERIFIED; save-bearing / write paths follow the same pattern but were not
exercised. Save bytes are returned raw (base64-decoded); inflating (pako) and
parsing into a save schema is left to the caller.

Since v1.0.0

---

## Exports Grouped by Category

- [SDK](#sdk)
  - [device_newPlayer](#device_newplayer)
  - [device_playerDetails](#device_playerdetails)
  - [social_getItems](#social_getitems)
  - [sync_pullSave](#sync_pullsave)

---

# SDK

## device_newPlayer

Requests a new player ("burnbot") from the Nimblebit servers. VERIFIED.

**Signature**

```ts
declare const device_newPlayer: Effect.Effect<
  {
    readonly playerId: string & Brand<"PlayerId">
    readonly playerSs: Redacted.Redacted<string> & Brand<"PlayerAuthKey">
  },
  | NimblebitError
  | Forbidden
  | BadRequest
  | Unauthorized
  | InternalServerError
  | Schema.SchemaError
  | PlatformError
  | HttpClientError,
  NimblebitAuth.NimblebitAuth | HttpClient.HttpClient
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/pocket-trains-sdk/src/PocketTrains.ts#L38)

Since v1.0.0

## device_playerDetails

Retrieves player details. VERIFIED.

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
  | NimblebitError
  | Forbidden
  | BadRequest
  | Unauthorized
  | InternalServerError
  | Schema.SchemaError
  | PlatformError
  | HttpClientError,
  NimblebitAuth.NimblebitAuth | HttpClient.HttpClient
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/pocket-trains-sdk/src/PocketTrains.ts#L75)

Since v1.0.0

## social_getItems

Lists items (parts/gifts) waiting for the player. VERIFIED
(`/get_items/pt/...` -> `{ success:"Found", gifts:[...] }`, no total).

**Signature**

```ts
declare const social_getItems: (args_0: {
  readonly playerAuthKey: Redacted.Redacted<string> & Brand<"PlayerAuthKey">
  readonly playerId: string & Brand<"PlayerId">
}) => Effect.Effect<
  { readonly success: "NotFound" } | { readonly success: "Found"; readonly gifts: ReadonlyArray<unknown> },
  | NimblebitError
  | Forbidden
  | BadRequest
  | Unauthorized
  | InternalServerError
  | Schema.SchemaError
  | PlatformError
  | HttpClientError,
  NimblebitAuth.NimblebitAuth | HttpClient.HttpClient
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/pocket-trains-sdk/src/PocketTrains.ts#L155)

Since v1.0.0

## sync_pullSave

Pulls the player's cloud save. Returns raw base64-decoded bytes (inflate +
parse separately). Success envelope DERIVED from Tiny Tower.

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
  | NimblebitError
  | Forbidden
  | BadRequest
  | Unauthorized
  | InternalServerError
  | Schema.SchemaError
  | PlatformError
  | HttpClientError,
  NimblebitAuth.NimblebitAuth | HttpClient.HttpClient
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/pocket-trains-sdk/src/PocketTrains.ts#L115)

Since v1.0.0
