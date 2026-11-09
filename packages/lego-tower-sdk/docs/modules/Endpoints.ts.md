---
title: Endpoints.ts
nav_order: 1
parent: Modules
---

## Endpoints.ts overview

LEGO Tower (game code `lt`) NBSync api endpoints.

Signing: a random `salt` goes in the path, and `hash` is
`md5(<preimage> + <game secret salt>)` with the preimage
`lt/<playerId>/<salt><playerAuthKey>` (variants noted per endpoint). The
secret salt is the value of `NBSync._ss`. Every NBSync request the game
made, `register` included, was signed this way. The game's salt is a signed
int32 (it sent a negative one); the `salt` params here accept only uint32,
which is what `NimblebitAuth` generates.

Each endpoint says how it is known (Play build 1.27.2, 2026-11-09):

- OBSERVED: the game made this request.
- REPLAYED: the sdk's client function succeeded against the live server.
- DTO: the game's response class has these fields.
- LITERAL: the path is compiled into the game but was not exercised.
- DERIVED: inferred from Tiny Tower.

DTO int fields can arrive as numeric strings (the mailbox `total` did), so
int schemas on replies that were never observed may be too strict. LEGO
Tower issues player ids longer than 5 chars (relaxed `PlayerId` schema).

Not modelled yet (LITERAL only): `receive_item`, `send_trade`,
`accept_trade`, `reject_trade`, `remove_trade`, `get_ag`, `send_ag`,
`sync/push_snapshot`, `friend/editorpull_game`, `register_email`,
`register_email_lang`, `code/verify` and `af/lt`. The Facebook, Play Games
and LEGO Life flows (`register_fb`, `swap_fb`, `register_pg`, `check_pg`,
`swap_pg`, `register_ll`, `check_ll`, `swap_ll`, `friends_ll`) are left out
too. Saves are uploaded by the game's Java plugin (`com.nimblebit.nbsync.SyncPush`,
`/sync/push/`), which the il2cpp probe does not see; that is not modelled
yet either.

Game-specific save/meta schemas are left as `Schema.Unknown` placeholders.

Since v1.0.0

---

## Exports Grouped by Category

- [Api](#api)
  - [Api](#api-1)
- [Config](#config)
  - [AuthenticatedPlayerConfig](#authenticatedplayerconfig)
- [Schemas](#schemas)
  - [AuthenticatedPlayer](#authenticatedplayer)
  - [Gift](#gift)
  - [PlayerId](#playerid)

---

# Api

## Api

The LEGO Tower NBSync api.

**Signature**

```ts
declare const Api: HttpApi.HttpApi<
  "LegoTowerApi",
  | HttpApiGroup.HttpApiGroup<
      "DeviceManagementGroup",
      | HttpApiEndpoint.HttpApiEndpoint<
          "DeviceNewPlayer",
          "GET",
          "/register/lt/:salt1/:salt2/:hash",
          Schema.toCodecStringTree<Schema.Struct<{ salt1: Schema.Int; salt2: Schema.Int; hash: Schema.String }>>,
          never,
          never,
          never,
          Schema.toCodecJson<
            | Schema.Struct<{ readonly error: Schema.String }>
            | Schema.encodeKeys<
                Schema.Struct<{
                  readonly playerId: Schema.brand<Schema.String, "PlayerId">
                  readonly playerSs: Schema.brand<Schema.RedactedFromValue<Schema.String>, "PlayerAuthKey">
                }>,
                { readonly playerId: "player_id"; readonly playerSs: "player_ss" }
              >
          >,
          Schema.toCodecJson<
            | typeof HttpApiError.Forbidden
            | typeof HttpApiError.BadRequest
            | typeof HttpApiError.Unauthorized
            | typeof HttpApiError.InternalServerError
          >,
          never,
          never
        >
      | HttpApiEndpoint.HttpApiEndpoint<
          "DevicePlayerDetails",
          "GET",
          "/player_details/lt/:playerId/:salt/:hash",
          Schema.toCodecStringTree<
            Schema.Struct<{ playerId: Schema.brand<Schema.String, "PlayerId">; salt: Schema.Int; hash: Schema.String }>
          >,
          never,
          never,
          never,
          Schema.toCodecJson<
            | Schema.Struct<{ readonly error: Schema.String }>
            | Schema.Struct<{
                readonly success: Schema.Literal<"Found">
                readonly player: Schema.encodeKeys<
                  Schema.Struct<{
                    readonly playerId: Schema.brand<Schema.String, "PlayerId">
                    readonly playerEmail: Schema.brand<Schema.RedactedFromValue<Schema.String>, "PlayerEmail">
                    readonly registered: Schema.compose<Schema.BooleanFromBit, Schema.NumberFromString>
                    readonly blacklisted: Schema.compose<Schema.BooleanFromBit, Schema.NumberFromString>
                    readonly saveVersion: Schema.compose<Schema.Int, Schema.NumberFromString>
                    readonly checksum: Schema.String
                  }>,
                  { readonly playerId: "player_id"; readonly playerEmail: "email"; readonly checksum: "h" }
                >
              }>
          >,
          Schema.toCodecJson<
            | typeof HttpApiError.Forbidden
            | typeof HttpApiError.BadRequest
            | typeof HttpApiError.Unauthorized
            | typeof HttpApiError.InternalServerError
          >,
          never,
          never
        >
      | HttpApiEndpoint.HttpApiEndpoint<
          "DeviceVerifyDevice",
          "GET",
          "/verify_device/lt/:playerId/:verificationCode",
          Schema.toCodecStringTree<
            Schema.Struct<{ playerId: Schema.brand<Schema.String, "PlayerId">; verificationCode: Schema.String }>
          >,
          never,
          never,
          never,
          Schema.toCodecJson<
            | Schema.Struct<{ readonly error: Schema.String }>
            | Schema.encodeKeys<
                Schema.Struct<{
                  readonly success: Schema.Literal<"NewDevice">
                  readonly playerId: Schema.brand<Schema.String, "PlayerId">
                  readonly playerAuthKey: Schema.brand<Schema.RedactedFromValue<Schema.String>, "PlayerAuthKey">
                  readonly playerEmail: Schema.brand<Schema.RedactedFromValue<Schema.String>, "PlayerEmail">
                }>,
                {
                  readonly playerId: "player_id"
                  readonly playerAuthKey: "player_ss"
                  readonly playerEmail: "player_email"
                }
              >
          >,
          Schema.toCodecJson<
            | typeof HttpApiError.Forbidden
            | typeof HttpApiError.BadRequest
            | typeof HttpApiError.Unauthorized
            | typeof HttpApiError.InternalServerError
          >,
          never,
          never
        >,
      false
    >
  | HttpApiGroup.HttpApiGroup<
      "SyncManagementGroup",
      | HttpApiEndpoint.HttpApiEndpoint<
          "SyncPullSave",
          "GET",
          "/sync/pull/lt/:playerId/:salt/:hash",
          Schema.toCodecStringTree<
            Schema.Struct<{ playerId: Schema.brand<Schema.String, "PlayerId">; salt: Schema.Int; hash: Schema.String }>
          >,
          never,
          never,
          never,
          Schema.toCodecJson<
            | Schema.Struct<{ readonly error: Schema.String }>
            | Schema.Struct<{ readonly success: Schema.Literal<"NotFound"> }>
            | Schema.encodeKeys<
                Schema.Struct<{
                  readonly success: Schema.Literal<"Found">
                  readonly data: Schema.Uint8ArrayFromBase64
                  readonly checksum: Schema.String
                  readonly saveId: Schema.NumberFromString
                }>,
                { readonly checksum: "h"; readonly saveId: "id" }
              >
          >,
          Schema.toCodecJson<
            | typeof HttpApiError.Forbidden
            | typeof HttpApiError.BadRequest
            | typeof HttpApiError.Unauthorized
            | typeof HttpApiError.InternalServerError
          >,
          never,
          never
        >
      | HttpApiEndpoint.HttpApiEndpoint<
          "SyncCheckForNewerSave",
          "GET",
          "/sync/current_version/lt/:playerId/:salt/:hash",
          Schema.toCodecStringTree<
            Schema.Struct<{ playerId: Schema.brand<Schema.String, "PlayerId">; salt: Schema.Int; hash: Schema.String }>
          >,
          never,
          never,
          never,
          Schema.toCodecJson<
            | Schema.Struct<{ readonly error: Schema.String }>
            | Schema.Struct<{ readonly success: Schema.Literal<"NotFound"> }>
            | Schema.encodeKeys<
                Schema.Struct<{
                  readonly success: Schema.Literal<"Found">
                  readonly checksum: Schema.String
                  readonly saveId: Schema.NumberFromString
                }>,
                { readonly checksum: "h"; readonly saveId: "id" }
              >
          >,
          Schema.toCodecJson<
            | typeof HttpApiError.Forbidden
            | typeof HttpApiError.BadRequest
            | typeof HttpApiError.Unauthorized
            | typeof HttpApiError.InternalServerError
          >,
          never,
          never
        >
      | HttpApiEndpoint.HttpApiEndpoint<
          "SyncRetrieveSnapshotList",
          "GET",
          "/sync/current_snapshots/lt/:playerId/:salt/:hash",
          Schema.toCodecStringTree<
            Schema.Struct<{ playerId: Schema.brand<Schema.String, "PlayerId">; salt: Schema.Int; hash: Schema.String }>
          >,
          never,
          never,
          never,
          Schema.toCodecJson<
            | Schema.Struct<{ readonly error: Schema.String }>
            | Schema.Struct<{ readonly success: Schema.Literal<"NotFound"> }>
            | Schema.Struct<{
                readonly success: Schema.Literal<"Found">
                readonly saves: Schema.$Array<
                  Schema.Struct<{
                    readonly id: Schema.Int
                    readonly created: Schema.Int
                    readonly meta: Schema.$Record<Schema.String, Schema.Unknown>
                  }>
                >
              }>
          >,
          Schema.toCodecJson<
            | typeof HttpApiError.Forbidden
            | typeof HttpApiError.BadRequest
            | typeof HttpApiError.Unauthorized
            | typeof HttpApiError.InternalServerError
          >,
          never,
          never
        >
      | HttpApiEndpoint.HttpApiEndpoint<
          "SyncPullSnapshot",
          "GET",
          "/sync/pull_snapshot/lt/:playerId/:snapshotId/:salt/:hash",
          Schema.toCodecStringTree<
            Schema.Struct<{
              playerId: Schema.brand<Schema.String, "PlayerId">
              snapshotId: Schema.Int
              salt: Schema.Int
              hash: Schema.String
            }>
          >,
          never,
          never,
          never,
          Schema.toCodecJson<
            | Schema.Struct<{ readonly error: Schema.String }>
            | Schema.Struct<{ readonly success: Schema.Literal<"NotFound"> }>
            | Schema.encodeKeys<
                Schema.Struct<{
                  readonly success: Schema.Literal<"Found">
                  readonly data: Schema.Uint8ArrayFromBase64
                  readonly checksum: Schema.String
                  readonly snapshotId: Schema.NumberFromString
                }>,
                { readonly checksum: "h"; readonly snapshotId: "id" }
              >
          >,
          Schema.toCodecJson<
            | typeof HttpApiError.Forbidden
            | typeof HttpApiError.BadRequest
            | typeof HttpApiError.Unauthorized
            | typeof HttpApiError.InternalServerError
          >,
          never,
          never
        >,
      false
    >
  | HttpApiGroup.HttpApiGroup<
      "SocialGroup",
      | HttpApiEndpoint.HttpApiEndpoint<
          "SocialGetItems",
          "GET",
          "/get_items/lt/:playerId/:salt/:hash",
          Schema.toCodecStringTree<
            Schema.Struct<{ playerId: Schema.brand<Schema.String, "PlayerId">; salt: Schema.Int; hash: Schema.String }>
          >,
          never,
          never,
          never,
          Schema.toCodecJson<
            | Schema.Struct<{ readonly error: Schema.String }>
            | Schema.Struct<{ readonly success: Schema.Literal<"NotFound"> }>
            | Schema.Struct<{
                readonly success: Schema.Literal<"Found">
                readonly gifts: Schema.$Array<Schema.Unknown>
              }>
          >,
          Schema.toCodecJson<
            | typeof HttpApiError.Forbidden
            | typeof HttpApiError.BadRequest
            | typeof HttpApiError.Unauthorized
            | typeof HttpApiError.InternalServerError
          >,
          never,
          never
        >
      | HttpApiEndpoint.HttpApiEndpoint<
          "SocialGetVisits",
          "GET",
          "/get_visits/lt/:playerId/:salt/:hash",
          Schema.toCodecStringTree<
            Schema.Struct<{ playerId: Schema.brand<Schema.String, "PlayerId">; salt: Schema.Int; hash: Schema.String }>
          >,
          never,
          never,
          never,
          Schema.toCodecJson<
            | Schema.Struct<{ readonly error: Schema.String }>
            | Schema.Struct<{ readonly success: Schema.Literal<"NotFound"> }>
            | Schema.Struct<{
                readonly success: Schema.Literal<"Found">
                readonly gifts: Schema.$Array<Schema.Unknown>
              }>
          >,
          Schema.toCodecJson<
            | typeof HttpApiError.Forbidden
            | typeof HttpApiError.BadRequest
            | typeof HttpApiError.Unauthorized
            | typeof HttpApiError.InternalServerError
          >,
          never,
          never
        >
      | HttpApiEndpoint.HttpApiEndpoint<
          "SocialSendItem",
          "POST",
          "/send_item/lt/:itemType/:playerId/:friendId/:salt/:hash",
          Schema.toCodecStringTree<
            Schema.Struct<{
              itemType: Schema.String
              playerId: Schema.brand<Schema.String, "PlayerId">
              friendId: Schema.brand<Schema.String, "PlayerId">
              salt: Schema.Int
              hash: Schema.String
            }>
          >,
          never,
          Schema.toCodecJson<Schema.Struct<{ readonly itemStr: Schema.String }>>,
          never,
          Schema.toCodecJson<
            | Schema.Struct<{ readonly error: Schema.String }>
            | Schema.Struct<{ readonly success: Schema.Literal<"Sent"> }>
            | Schema.Struct<{ readonly success: Schema.Literal<"NotSent"> }>
          >,
          Schema.toCodecJson<
            | typeof HttpApiError.Forbidden
            | typeof HttpApiError.BadRequest
            | typeof HttpApiError.Unauthorized
            | typeof HttpApiError.InternalServerError
          >,
          never,
          never
        >
      | HttpApiEndpoint.HttpApiEndpoint<
          "SocialPullFriendGame",
          "GET",
          "/friend/pull_game/lt/:playerId/:friendId/:salt/:hash",
          Schema.toCodecStringTree<
            Schema.Struct<{
              playerId: Schema.brand<Schema.String, "PlayerId">
              friendId: Schema.brand<Schema.String, "PlayerId">
              salt: Schema.Int
              hash: Schema.String
            }>
          >,
          never,
          never,
          never,
          Schema.toCodecJson<
            | Schema.Struct<{ readonly error: Schema.String }>
            | Schema.Struct<{ readonly success: Schema.Literal<"NotFound"> }>
            | Schema.encodeKeys<
                Schema.Struct<{
                  readonly success: Schema.Literal<"Found">
                  readonly data: Schema.Uint8ArrayFromBase64
                  readonly checksum: Schema.String
                  readonly saveId: Schema.NumberFromString
                  readonly playerId: Schema.brand<Schema.String, "PlayerId">
                }>,
                { readonly checksum: "h"; readonly saveId: "id"; readonly playerId: "player_id" }
              >
          >,
          Schema.toCodecJson<
            | typeof HttpApiError.Forbidden
            | typeof HttpApiError.BadRequest
            | typeof HttpApiError.Unauthorized
            | typeof HttpApiError.InternalServerError
          >,
          never,
          never
        >
      | HttpApiEndpoint.HttpApiEndpoint<
          "SocialPullFriendMeta",
          "POST",
          "/friend/pull_meta/lt/:playerId/:salt/:hash",
          Schema.toCodecStringTree<
            Schema.Struct<{ playerId: Schema.brand<Schema.String, "PlayerId">; salt: Schema.Int; hash: Schema.String }>
          >,
          never,
          Schema.toCodecJson<Schema.Struct<{ readonly friends: Schema.brand<Schema.String, "PlayerId"> }>>,
          never,
          Schema.toCodecJson<
            | Schema.Struct<{ readonly error: Schema.String }>
            | Schema.Struct<{ readonly success: Schema.Literal<"NotFound"> }>
            | Schema.Struct<{
                readonly success: Schema.Literal<"Found">
                readonly meta: Schema.$Record<Schema.brand<Schema.String, "PlayerId">, Schema.Unknown>
              }>
          >,
          Schema.toCodecJson<
            | typeof HttpApiError.Forbidden
            | typeof HttpApiError.BadRequest
            | typeof HttpApiError.Unauthorized
            | typeof HttpApiError.InternalServerError
          >,
          never,
          never
        >
      | HttpApiEndpoint.HttpApiEndpoint<
          "SocialGetMailboxCount",
          "GET",
          "/get_mailbox_count/lt/:playerId/:salt/:hash",
          Schema.toCodecStringTree<
            Schema.Struct<{ playerId: Schema.brand<Schema.String, "PlayerId">; salt: any; hash: Schema.String }>
          >,
          never,
          never,
          never,
          Schema.toCodecJson<
            | Schema.Struct<{ readonly error: Schema.String }>
            | Schema.Struct<{ readonly success: Schema.Literal<"NotFound"> }>
            | Schema.Struct<{
                readonly success: Schema.Literal<"Found">
                readonly total: Schema.compose<Schema.Int, Schema.FiniteFromString>
                readonly maxDisplay: Schema.Int
                readonly from: Schema.$Array<Schema.Unknown>
              }>
          >,
          Schema.toCodecJson<
            | typeof HttpApiError.Forbidden
            | typeof HttpApiError.BadRequest
            | typeof HttpApiError.Unauthorized
            | typeof HttpApiError.InternalServerError
          >,
          never,
          never
        >
      | HttpApiEndpoint.HttpApiEndpoint<
          "SocialGetMailbox",
          "GET",
          "/get_mailbox/lt/:playerId/:salt/:hash",
          Schema.toCodecStringTree<
            Schema.Struct<{ playerId: Schema.brand<Schema.String, "PlayerId">; salt: any; hash: Schema.String }>
          >,
          never,
          never,
          never,
          Schema.toCodecJson<
            | Schema.Struct<{ readonly error: Schema.String }>
            | Schema.Struct<{ readonly success: Schema.Literal<"NotFound"> }>
            | Schema.Struct<{
                readonly success: Schema.Literal<"Found">
                readonly total: Schema.compose<Schema.Int, Schema.FiniteFromString>
                readonly maxDisplay: Schema.Int
                readonly mail: Schema.optionalKey<Schema.$Array<Schema.Unknown>>
              }>
          >,
          Schema.toCodecJson<
            | typeof HttpApiError.Forbidden
            | typeof HttpApiError.BadRequest
            | typeof HttpApiError.Unauthorized
            | typeof HttpApiError.InternalServerError
          >,
          never,
          never
        >
      | HttpApiEndpoint.HttpApiEndpoint<
          "SocialRetrieveFriendsSnapshotList",
          "GET",
          "/sync/current_player_snapshots/lt/:playerId/:friendId/:salt/:hash",
          Schema.toCodecStringTree<
            Schema.Struct<{
              playerId: Schema.brand<Schema.String, "PlayerId">
              friendId: Schema.brand<Schema.String, "PlayerId">
              salt: any
              hash: Schema.String
            }>
          >,
          never,
          never,
          never,
          Schema.toCodecJson<
            | Schema.Struct<{ readonly error: Schema.String }>
            | Schema.Struct<{ readonly success: Schema.Literal<"NotFound"> }>
            | Schema.Struct<{
                readonly success: Schema.Literal<"Found">
                readonly saves: Schema.$Array<Schema.Unknown>
              }>
          >,
          Schema.toCodecJson<
            | typeof HttpApiError.Forbidden
            | typeof HttpApiError.BadRequest
            | typeof HttpApiError.Unauthorized
            | typeof HttpApiError.InternalServerError
          >,
          never,
          never
        >,
      false
    >
  | HttpApiGroup.HttpApiGroup<
      "TradeGroup",
      HttpApiEndpoint.HttpApiEndpoint<
        "TradeGetTrades",
        "GET",
        "/get_trades/lt/:playerId/:salt/:hash",
        Schema.toCodecStringTree<
          Schema.Struct<{ playerId: Schema.brand<Schema.String, "PlayerId">; salt: Schema.Int; hash: Schema.String }>
        >,
        never,
        never,
        never,
        Schema.toCodecJson<
          | Schema.Struct<{ readonly error: Schema.String }>
          | Schema.Struct<{ readonly success: Schema.Literal<"NotFound"> }>
          | Schema.Struct<{
              readonly success: Schema.Literal<"Found">
              readonly trades: Schema.$Array<
                Schema.Struct<{
                  readonly id: Schema.Int
                  readonly to: Schema.String
                  readonly from: Schema.String
                  readonly status: Schema.Int
                  readonly payload: Schema.String
                  readonly added: Schema.Int
                  readonly expire: Schema.Int
                }>
              >
            }>
        >,
        Schema.toCodecJson<
          | typeof HttpApiError.Forbidden
          | typeof HttpApiError.BadRequest
          | typeof HttpApiError.Unauthorized
          | typeof HttpApiError.InternalServerError
        >,
        never,
        never
      >,
      false
    >
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/lego-tower-sdk/src/Endpoints.ts#L603)

Since v1.0.0

# Config

## AuthenticatedPlayerConfig

Loads an `AuthenticatedPlayer` from `PLAYER_AUTH_KEY` and `PLAYER_ID`.

**Signature**

```ts
declare const AuthenticatedPlayerConfig: Config.Config<{
  readonly playerAuthKey: Redacted<string> & Brand<"PlayerAuthKey">
  readonly playerId: string & Brand<"PlayerId">
}>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/lego-tower-sdk/src/Endpoints.ts#L82)

Since v1.0.0

# Schemas

## AuthenticatedPlayer

An authenticated LEGO Tower player. The shared
`NimblebitConfig.AuthenticatedPlayerSchema` limits ids to 5 chars and
rejects LEGO Tower ids.

**Signature**

```ts
declare const AuthenticatedPlayer: Schema.Struct<{
  readonly playerAuthKey: Schema.brand<Schema.RedactedFromValue<Schema.String>, "PlayerAuthKey">
  readonly playerId: Schema.brand<Schema.String, "PlayerId">
}>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/lego-tower-sdk/src/Endpoints.ts#L71)

Since v1.0.0

## Gift

A gift/item in the general item channel (get_items / send_item). DTO
NBSyncItemsGift `{gift_id: String, gift_to: String, gift_from: String,
gift_type: String, item_type: NBSyncItemType (None 0, Play 1, Gift 2, Visit
3, Promo 4), gift_str: String, h: String}`. Only empty gift lists were
observed, so the wire type of `item_type` is unknown.

**Signature**

```ts
declare const Gift: Schema.Unknown
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/lego-tower-sdk/src/Endpoints.ts#L120)

Since v1.0.0

## PlayerId

LEGO Tower player id. Unlike tt/pp/pt, LEGO Tower issues ids longer than 5
chars (e.g. `1QVVY7`), so the shared `PlayerId`
(max length 5) is too strict here.

**Signature**

```ts
declare const PlayerId: Schema.brand<Schema.String, "PlayerId">
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/lego-tower-sdk/src/Endpoints.ts#L56)

Since v1.0.0
