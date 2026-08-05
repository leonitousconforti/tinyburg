---
title: Sdk.ts
nav_order: 2
parent: Modules
---

## Sdk.ts overview

---

## Exports Grouped by Category

- [utils](#utils)
  - [Api](#api)
  - [TOWERS_SCOPE](#towers_scope)

---

# utils

## Api

**Signature**

```ts
declare const Api: HttpApi.HttpApi<
  "TradingSdk",
  | HttpApiGroup.HttpApiGroup<
      "LinkedTinyTowerAccountsGroup",
      | HttpApiEndpoint.HttpApiEndpoint<
          "TinyburgLinkedTinyTowerAccountsList",
          "GET",
          "/v1/tinytower/linkedAccounts/list",
          never,
          never,
          never,
          never,
          Schema.toCodecJson<
            Schema.$Array<
              Schema.Struct<{
                readonly playerId: Schema.brand<Schema.String, "PlayerId">
                readonly createdAt: Schema.DateTimeUtcFromString
              }>
            >
          >,
          Schema.toCodecJson<typeof HttpApiError.NotImplemented>,
          ResourceServer.Authorization,
          never
        >
      | HttpApiEndpoint.HttpApiEndpoint<
          "TinyburgLinkedTinyTowerAccountsUnlink",
          "DELETE",
          "/v1/tinytower/linkedAccounts/unlink/:friendCode",
          Schema.toCodecStringTree<Schema.Struct<{ friendCode: Schema.brand<Schema.String, "PlayerId"> }>>,
          never,
          never,
          never,
          Schema.toCodecJson<Schema.Void>,
          Schema.toCodecJson<typeof HttpApiError.NotImplemented>,
          ResourceServer.Authorization,
          never
        >
      | HttpApiEndpoint.HttpApiEndpoint<
          "TinyburgLinkedTinyTowerAccountsLink",
          "POST",
          "/v1/tinytower/linkedAccounts/link",
          Schema.toCodecStringTree<
            Schema.Struct<{
              friendCode: Schema.brand<Schema.String, "PlayerId">
              email: Schema.brand<Schema.RedactedFromValue<Schema.String>, "PlayerEmail">
            }>
          >,
          never,
          Schema.toCodecJson<
            Schema.Struct<{
              readonly friendCode: Schema.brand<Schema.String, "PlayerId">
              readonly email: Schema.brand<Schema.RedactedFromValue<Schema.String>, "PlayerEmail">
            }>
          >,
          never,
          Schema.toCodecJson<Schema.Void>,
          Schema.toCodecJson<typeof HttpApiError.NotImplemented>,
          ResourceServer.Authorization,
          never
        >
      | HttpApiEndpoint.HttpApiEndpoint<
          "TinyburgLinkedTinyTowerAccountsVerify",
          "POST",
          "/v1/tinytower/linkedAccounts/verify",
          Schema.toCodecStringTree<
            Schema.Struct<{ friendCode: Schema.brand<Schema.String, "PlayerId">; verificationCode: Schema.String }>
          >,
          never,
          Schema.toCodecJson<
            Schema.Struct<{
              readonly friendCode: Schema.brand<Schema.String, "PlayerId">
              readonly verificationCode: Schema.String
            }>
          >,
          never,
          Schema.toCodecJson<Schema.Void>,
          Schema.toCodecJson<typeof HttpApiError.NotImplemented>,
          ResourceServer.Authorization,
          never
        >,
      false
    >
  | HttpApiGroup.HttpApiGroup<
      "TinyTowerGroup",
      | HttpApiEndpoint.HttpApiEndpoint<
          "TinyTowerSyncPullSave",
          "GET",
          "/v1/tinytower/sync/download/:friendCode",
          Schema.toCodecStringTree<Schema.Struct<{ friendCode: Schema.brand<Schema.String, "PlayerId"> }>>,
          never,
          never,
          never,
          Schema.toCodecJson<Schema.String>,
          Schema.toCodecJson<typeof HttpApiError.NotImplemented>,
          ResourceServer.Authorization,
          never
        >
      | HttpApiEndpoint.HttpApiEndpoint<
          "TinyTowerSyncPushSave",
          "POST",
          "/v1/tinytower/sync/upload/:friendCode",
          Schema.toCodecStringTree<Schema.Struct<{ friendCode: Schema.brand<Schema.String, "PlayerId"> }>>,
          never,
          Schema.toCodecJson<Schema.String>,
          never,
          Schema.toCodecJson<Schema.Void>,
          Schema.toCodecJson<typeof HttpApiError.NotImplemented>,
          ResourceServer.Authorization,
          never
        >
      | HttpApiEndpoint.HttpApiEndpoint<
          "TinyTowerRaffleCheckEnteredCurrent",
          "GET",
          "/v1/tinytower/raffle/check/:friendCode",
          Schema.toCodecStringTree<Schema.Struct<{ friendCode: Schema.brand<Schema.String, "PlayerId"> }>>,
          never,
          never,
          never,
          Schema.toCodecJson<Schema.Boolean>,
          Schema.toCodecJson<typeof HttpApiError.NotImplemented>,
          ResourceServer.Authorization,
          never
        >
      | HttpApiEndpoint.HttpApiEndpoint<
          "TinyTowerRaffleEnter",
          "POST",
          "/v1/tinytower/raffle/enter/:friendCode",
          Schema.toCodecStringTree<Schema.Struct<{ friendCode: Schema.brand<Schema.String, "PlayerId"> }>>,
          never,
          never,
          never,
          Schema.toCodecJson<Schema.Void>,
          Schema.toCodecJson<typeof HttpApiError.NotImplemented>,
          ResourceServer.Authorization,
          never
        >
      | HttpApiEndpoint.HttpApiEndpoint<
          "TinyTowerRaffleEnterMulti",
          "POST",
          "/v1/tinytower/raffle/enterMulti/:friendCode",
          Schema.toCodecStringTree<Schema.Struct<{ friendCode: Schema.brand<Schema.String, "PlayerId"> }>>,
          never,
          never,
          never,
          Schema.toCodecJson<Schema.Void>,
          Schema.toCodecJson<typeof HttpApiError.NotImplemented>,
          ResourceServer.Authorization,
          never
        >,
      false
    >
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/trading-sdk/src/Sdk.ts#L140)

Since v1.0.0

## TOWERS_SCOPE

The scope guarding a player's towers. Signing someone in is not enough to
touch their towers: an application has to be granted this on top of
`openid`/`profile`, and the player approves it on the consent screen.

**Signature**

```ts
declare const TOWERS_SCOPE: "towers"
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/trading-sdk/src/Sdk.ts#L117)

Since v1.0.0
