---
title: Endpoints.ts
nav_order: 1
parent: Modules
---

## Endpoints.ts overview

Pocket Planes (game code `pp`) NBSync api endpoints.

Provenance words used below:

- OBSERVED: the game made this request (Play build 2.17.3, 2026-11-09).
- REPLAYED: the SDK's client function succeeded against the live server
  (2026-11-09).
- DTO: the game's response class has these fields.
- LITERAL: the path is compiled into the game but was not exercised.
- DERIVED: inferred from Tiny Tower.

Signing: a random `salt` goes in the path, and `hash` is
`md5(<preimage> + <NBSync._ss>)` where the preimage is
`pp/<playerId>/<salt><playerAuthKey>` (variants noted per endpoint). Every
REPLAYED client function used this scheme.

Salts are signed int32, as the game sends (OBSERVED `-783493558` on
pull_meta).

POST payloads: the game posts form fields (OBSERVED on pull_meta). The POST
endpoints here encode their payloads as JSON, and whether the server
accepts JSON is unverified.

pp has no snapshot endpoints. Saves are uploaded by the game's Java plugin
(`com.nimblebit.nbsync.SyncPush`, whose dex holds `/sync/push/`), outside the il2cpp
code the probe hooks, so no push endpoint is modelled yet.

Not modelled yet:

- `new_id/verify` (LITERAL).
- Play Games and Facebook login flows (LITERAL): `check_pg`, `register_pg`,
  `swap_pg`, `register_fb`, `swap_fb`.
- Static S3 files the game fetches at startup (OBSERVED, not NBSync):
  `NBStatic/ppVersion.json` (`{ current, min }`) and
  `NBStatic/sync/tt/current.ics`.

Since v1.0.0

---

## Exports Grouped by Category

- [Api](#api)
  - [Api](#api-1)
- [Schemas](#schemas)
  - [Gift](#gift)

---

# Api

## Api

The Pocket Planes NBSync api.

**Signature**

```ts
declare const Api: HttpApi.HttpApi<
  "PocketPlanesApi",
  | HttpApiGroup.HttpApiGroup<
      "DeviceManagementGroup",
      | HttpApiEndpoint.HttpApiEndpoint<
          "DeviceNewPlayer",
          "GET",
          "/register/pp/:salt1/:salt2/:hash",
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
          "/player_details/pp/:playerId/:salt/:hash",
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
          "/verify_device/pp/:playerId/:verificationCode",
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
        >
      | HttpApiEndpoint.HttpApiEndpoint<
          "DeviceRegisterEmail",
          "POST",
          "/register_email/pp/:playerId/:salt/:hash",
          Schema.toCodecStringTree<
            Schema.Struct<{ playerId: Schema.brand<Schema.String, "PlayerId">; salt: Schema.Int; hash: Schema.String }>
          >,
          never,
          Schema.toCodecJson<
            Schema.Struct<{ readonly promote: Schema.Literal<1>; readonly email: Schema.Redacted<Schema.String> }>
          >,
          never,
          Schema.toCodecJson<
            | Schema.Struct<{ readonly error: Schema.String }>
            | Schema.Struct<{ readonly success: Schema.Literal<"NewEmail"> }>
            | Schema.Struct<{ readonly success: Schema.Literal<"NewDevice"> }>
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
          "/sync/pull/pp/:playerId/:salt/:hash",
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
          "/sync/current_version/pp/:playerId/:salt/:hash",
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
        >,
      false
    >
  | HttpApiGroup.HttpApiGroup<
      "SocialGroup",
      | HttpApiEndpoint.HttpApiEndpoint<
          "SocialGetVisits",
          "GET",
          "/get_visits/pp/:playerId/:salt/:hash",
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
                readonly total: Schema.Int
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
          "SocialGetGifts",
          "GET",
          "/get_gifts/pp/:playerId/:salt/:hash",
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
                readonly total: Schema.Int
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
          "SocialRequestItems",
          "GET",
          "/request_items/pp/:playerId/:salt/:hash",
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
          "/send_item/pp/:itemType/:playerId/:friendId/:salt/:hash",
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
          "SocialReceiveItem",
          "GET",
          "/receive_item/pp/:playerId/:giftId/:salt/:hash",
          Schema.toCodecStringTree<
            Schema.Struct<{
              playerId: Schema.brand<Schema.String, "PlayerId">
              giftId: Schema.Int
              salt: Schema.Int
              hash: Schema.String
            }>
          >,
          never,
          never,
          never,
          Schema.toCodecJson<
            | Schema.Struct<{ readonly error: Schema.String }>
            | Schema.Struct<{
                readonly success: Schema.Literal<"Received">
                readonly id: Schema.optionalKey<Schema.String>
              }>
            | Schema.Struct<{ readonly success: Schema.Literal<"NotReceived"> }>
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
          "/friend/pull_meta/pp/:playerId/:salt/:hash",
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
          "SocialPullFriendGame",
          "GET",
          "/friend/pull_game/pp/:playerId/:friendId/:salt/:hash",
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
        >,
      false
    >
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/pocket-planes-sdk/src/Endpoints.ts#L470)

Since v1.0.0

# Schemas

## Gift

One element of a `gifts` array. Still `Schema.Unknown`: every `gifts` array
seen on the wire was empty. DTO `NBSyncItemsGift`: `gift_id` String,
`gift_to` String, `gift_from` String, `gift_type` String, `item_type`
NBSyncItemType, `gift_str` String, `h` String, `c` Int32. DTO
`NBSyncItemType`: None=0, Play=1, Gift=2, Visit=3, Promo=4, Cloud=5,
Raffle=6.

**Signature**

```ts
declare const Gift: Schema.Unknown
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/pocket-planes-sdk/src/Endpoints.ts#L103)

Since v1.0.0
