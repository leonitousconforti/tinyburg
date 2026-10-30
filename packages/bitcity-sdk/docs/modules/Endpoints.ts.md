---
title: Endpoints.ts
nav_order: 2
parent: Modules
---

## Endpoints.ts overview

Bit City (game code `bc`) NBSync api endpoints.

Signing: a random `salt` (signed int32) goes in the path, and `hash` is
`md5(<preimage> + <game secret salt>)` with the preimage
`bc/<playerId>/<salt><playerAuthKey>` (variants noted per endpoint). The
secret salt is the value extracted from `NBSync._ss`.

Verification (live server + Frida DTO inspection of the game, 2026-08-26):

- Signing is MD5, server-validated (same scheme as Tiny Tower / Pocket
  Planes; the game computes SHA-256 only for the unauthenticated `register`).
- Response envelopes VERIFIED by reading the game's DTO classes at runtime:
  register, player_details, sync/pull (NBSyncGameSaveResponse), current_version,
  verify_device, friend/pull_game, friend/pull_meta (meta is a flat
  Dictionary<String,Object> on pt), send_item (NBSyncItemsSendResponse),
  get_items (NBSyncItemsGetResponse: success/gifts, NO `total` unlike pp).
  `get_items` was also exercised live with a burnbot.
- Minimal NBSync endpoint set (Bit City is a lightweight city builder).

Game-specific save/meta schemas are left as `Schema.Unknown` placeholders.

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

The Bit City NBSync api.

**Signature**

```ts
declare const Api: HttpApi.HttpApi<
  "BitCityApi",
  | HttpApiGroup.HttpApiGroup<
      "DeviceManagementGroup",
      | HttpApiEndpoint.HttpApiEndpoint<
          "DeviceNewPlayer",
          "GET",
          "/register/bc/:salt1/:salt2/:hash",
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
          "/player_details/bc/:playerId/:salt/:hash",
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
          "/verify_device/bc/:playerId/:verificationCode",
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
          "/sync/pull/bc/:playerId/:salt/:hash",
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
          "/sync/current_version/bc/:playerId/:salt/:hash",
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
          "SocialGetItems",
          "GET",
          "/get_items/bc/:playerId/:salt/:hash",
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
          "/send_item/bc/:itemType/:playerId/:friendId/:salt/:hash",
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
          "/friend/pull_game/bc/:playerId/:friendId/:salt/:hash",
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
          "/friend/pull_meta/bc/:playerId/:salt/:hash",
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
        >,
      false
    >
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/src/Endpoints.ts#L287)

Since v1.0.0

# Schemas

## Gift

A gift/item in the general item channel (get_items / send_item). Verified DTO
NBSyncItemsGift on pt: `{gift_id, gift_to, gift_from, gift_type, item_type,
gift_str, h}` (no `c`, unlike pp). Left open for the data-schema work.

**Signature**

```ts
declare const Gift: Schema.Unknown
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/src/Endpoints.ts#L65)

Since v1.0.0
