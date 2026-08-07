---
title: Sdk.ts
nav_order: 2
parent: Modules
---

## Sdk.ts overview

Since v1.0.0

---

## Exports Grouped by Category

- [utils](#utils)
  - [Api](#api)
  - [TOWERS_READ_SCOPE](#towers_read_scope)
  - [TOWERS_SCOPE](#towers_scope)
  - [TOWERS_WRITE_SCOPE](#towers_write_scope)

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

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/trading-sdk/src/Sdk.ts#L187)

Since v1.0.0

## TOWERS_READ_SCOPE

Read-only access to a player's towers: pulling a save, listing linked
accounts, checking raffle entry.

Exists because `towers` was too coarse to grant honestly. An application that
only wants to look at a friends list should not also be able to overwrite the
tower, and until this split there was no way for a player to grant the one
without the other.

**Signature**

```ts
declare const TOWERS_READ_SCOPE: "towers:read"
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/trading-sdk/src/Sdk.ts#L139)

Since v1.0.0

## TOWERS_SCOPE

The scope guarding a player's towers. Signing someone in is not enough to
touch their towers: an application has to be granted this on top of
`openid`/`profile`, and the player approves it on the consent screen.

Grants both reading and writing. Prefer `TOWERS_READ_SCOPE` or
`TOWERS_WRITE_SCOPE`, which say which half an application actually
needs; this one stays accepted so tokens and clients registered before the
split keep working.

**Signature**

```ts
declare const TOWERS_SCOPE: "towers"
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/trading-sdk/src/Sdk.ts#L126)

Since v1.0.0

## TOWERS_WRITE_SCOPE

Write access to a player's towers: pushing a save, entering raffles, linking
and unlinking accounts.

Deliberately not implied by `TOWERS_READ_SCOPE`. An application that
needs both asks for both, so the consent screen can say so plainly.

**Signature**

```ts
declare const TOWERS_WRITE_SCOPE: "towers:write"
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/trading-sdk/src/Sdk.ts#L150)

Since v1.0.0
