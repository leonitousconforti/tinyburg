---
title: Sdk.ts
nav_order: 3
parent: "@tinyburg/treasury-sdk"
---

## Sdk.ts overview

The api the treasury serves: player-to-player trades, escrowed.

Nimblebit has no hold primitive, so the treasury makes one out of the gift
channel: each side's item is sent to a treasury-owned vault tower, where it
sits as an _unreceived_ gift - a native escrow slot - until both deposits
are verified, and only then is each item forwarded to the other side. A
save-splice trade instead rewrites both saves directly, which is why it
requires an explicit confirmation from both parties before anything runs.

Every endpoint but the public stats is bearer authenticated with a JWT
access token the Tinyburg OAuth server issued for the Tinyburg api
(`<site>/v1`), and guarded by a leaf of the `treasury` scope area in
`Scopes`. The treasury lives behind tinyburg.app: the paths here are
reached at `<site>/v1/treasury/*`, which tinyburg.app forwards verbatim,
`Authorization` header included. The first-party app gets its token from
tinyburg.app's `/auth/token`; any other application uses the one it was
issued.

A token without the endpoint's scope is refused with `403` and an
`insufficient_scope` challenge. Any other `403` from a trade endpoint
means the treasury holds no usable grant for the caller's towers;
`GrantStatus` says so explicitly and carries the url that starts the
connect flow.

Since v1.0.0

---

## Exports Grouped by Category

- [Api](#api)
  - [Api](#api-1)
- [Groups](#groups)
  - [TreasuryGroup](#treasurygroup)
  - [TreasuryPublicGroup](#treasurypublicgroup)
- [Schemas](#schemas)
  - [GiftItem](#giftitem)
  - [GrantStatus](#grantstatus)
  - [Inventory](#inventory)
  - [ItemSpec](#itemspec)
  - [LedgerEvent](#ledgerevent)
  - [LegState](#legstate)
  - [SpliceItem](#spliceitem)
  - [SpliceItems](#spliceitems)
  - [Trade](#trade)
  - [TradeDetail](#tradedetail)
  - [TradeGame](#tradegame)
  - [TradeLeg](#tradeleg)
  - [TradeMechanism](#trademechanism)
  - [TradeProposal](#tradeproposal)
  - [TradeRole](#traderole)
  - [TradeState](#tradestate)
  - [TreasuryStats](#treasurystats)

---

# Api

## Api

**Signature**

```ts
declare const Api: HttpApi.HttpApi<
  "TreasurySdk",
  | HttpApiGroup.HttpApiGroup<
      "TreasuryGroup",
      | HttpApiEndpoint.HttpApiEndpoint<
          "GrantStatus",
          "GET",
          "/v1/treasury/grant",
          never,
          never,
          never,
          never,
          Schema.toCodecJson<
            Schema.Struct<{
              readonly connected: Schema.Boolean
              readonly scope: Schema.optional<Schema.String>
              readonly connectUrl: Schema.String
            }>
          >,
          never,
          OAuthScope.RequireAccess,
          never
        >
      | HttpApiEndpoint.HttpApiEndpoint<
          "ListTrades",
          "GET",
          "/v1/treasury/trades",
          never,
          never,
          never,
          never,
          Schema.toCodecJson<
            Schema.$Array<
              Schema.Struct<{
                readonly id: Schema.String
                readonly mechanism: Schema.Literals<readonly ["gift", "splice"]>
                readonly game: Schema.Literals<readonly ["tinytower"]>
                readonly state: Schema.Literals<
                  readonly [
                    "proposed",
                    "accepted",
                    "awaiting_confirmation",
                    "escrowing",
                    "escrowed",
                    "releasing",
                    "executing",
                    "settled",
                    "cancelled",
                    "refunding",
                    "refunded",
                    "expired",
                    "failed"
                  ]
                >
                readonly proposerPlayerId: Schema.brand<Schema.String, "PlayerId">
                readonly counterpartyPlayerId: Schema.optional<Schema.brand<Schema.String, "PlayerId">>
                readonly gives: Schema.Union<
                  readonly [
                    Schema.Struct<{
                      readonly _tag: Schema.tag<"GiftItem">
                      readonly itemType: Schema.Enum<{
                        readonly None: "None"
                        readonly Play: "Play"
                        readonly Gift: "Gift"
                        readonly Cloud: "Cloud"
                        readonly Raffle: "Raffle"
                        readonly Visit: "Visit"
                        readonly Leaderboards: "Leaderboards"
                      }>
                      readonly item: Schema.String
                    }>,
                    Schema.Struct<{
                      readonly _tag: Schema.tag<"SpliceItems">
                      readonly items: Schema.$Array<
                        Schema.Struct<{
                          readonly kind: Schema.Literals<readonly ["bitizen", "costume", "pet", "coins", "bux"]>
                          readonly item: Schema.optional<Schema.String>
                          readonly amount: Schema.optional<Schema.Int>
                        }>
                      >
                    }>
                  ]
                >
                readonly wants: Schema.Union<
                  readonly [
                    Schema.Struct<{
                      readonly _tag: Schema.tag<"GiftItem">
                      readonly itemType: Schema.Enum<{
                        readonly None: "None"
                        readonly Play: "Play"
                        readonly Gift: "Gift"
                        readonly Cloud: "Cloud"
                        readonly Raffle: "Raffle"
                        readonly Visit: "Visit"
                        readonly Leaderboards: "Leaderboards"
                      }>
                      readonly item: Schema.String
                    }>,
                    Schema.Struct<{
                      readonly _tag: Schema.tag<"SpliceItems">
                      readonly items: Schema.$Array<
                        Schema.Struct<{
                          readonly kind: Schema.Literals<readonly ["bitizen", "costume", "pet", "coins", "bux"]>
                          readonly item: Schema.optional<Schema.String>
                          readonly amount: Schema.optional<Schema.Int>
                        }>
                      >
                    }>
                  ]
                >
                readonly role: Schema.optional<Schema.Literals<readonly ["proposer", "counterparty"]>>
                readonly proposerConfirmedAt: Schema.optional<Schema.DateTimeUtcFromString>
                readonly counterpartyConfirmedAt: Schema.optional<Schema.DateTimeUtcFromString>
                readonly createdAt: Schema.DateTimeUtcFromString
                readonly expiresAt: Schema.DateTimeUtcFromString
                readonly failureReason: Schema.optional<Schema.String>
              }>
            >
          >,
          never,
          OAuthScope.RequireAccess,
          never
        >
      | HttpApiEndpoint.HttpApiEndpoint<
          "GetTrade",
          "GET",
          "/v1/treasury/trades/:tradeId",
          Schema.toCodecStringTree<Schema.Struct<{ tradeId: Schema.String }>>,
          never,
          never,
          never,
          Schema.toCodecJson<
            Schema.Struct<{
              readonly trade: Schema.Struct<{
                readonly id: Schema.String
                readonly mechanism: Schema.Literals<readonly ["gift", "splice"]>
                readonly game: Schema.Literals<readonly ["tinytower"]>
                readonly state: Schema.Literals<
                  readonly [
                    "proposed",
                    "accepted",
                    "awaiting_confirmation",
                    "escrowing",
                    "escrowed",
                    "releasing",
                    "executing",
                    "settled",
                    "cancelled",
                    "refunding",
                    "refunded",
                    "expired",
                    "failed"
                  ]
                >
                readonly proposerPlayerId: Schema.brand<Schema.String, "PlayerId">
                readonly counterpartyPlayerId: Schema.optional<Schema.brand<Schema.String, "PlayerId">>
                readonly gives: Schema.Union<
                  readonly [
                    Schema.Struct<{
                      readonly _tag: Schema.tag<"GiftItem">
                      readonly itemType: Schema.Enum<{
                        readonly None: "None"
                        readonly Play: "Play"
                        readonly Gift: "Gift"
                        readonly Cloud: "Cloud"
                        readonly Raffle: "Raffle"
                        readonly Visit: "Visit"
                        readonly Leaderboards: "Leaderboards"
                      }>
                      readonly item: Schema.String
                    }>,
                    Schema.Struct<{
                      readonly _tag: Schema.tag<"SpliceItems">
                      readonly items: Schema.$Array<
                        Schema.Struct<{
                          readonly kind: Schema.Literals<readonly ["bitizen", "costume", "pet", "coins", "bux"]>
                          readonly item: Schema.optional<Schema.String>
                          readonly amount: Schema.optional<Schema.Int>
                        }>
                      >
                    }>
                  ]
                >
                readonly wants: Schema.Union<
                  readonly [
                    Schema.Struct<{
                      readonly _tag: Schema.tag<"GiftItem">
                      readonly itemType: Schema.Enum<{
                        readonly None: "None"
                        readonly Play: "Play"
                        readonly Gift: "Gift"
                        readonly Cloud: "Cloud"
                        readonly Raffle: "Raffle"
                        readonly Visit: "Visit"
                        readonly Leaderboards: "Leaderboards"
                      }>
                      readonly item: Schema.String
                    }>,
                    Schema.Struct<{
                      readonly _tag: Schema.tag<"SpliceItems">
                      readonly items: Schema.$Array<
                        Schema.Struct<{
                          readonly kind: Schema.Literals<readonly ["bitizen", "costume", "pet", "coins", "bux"]>
                          readonly item: Schema.optional<Schema.String>
                          readonly amount: Schema.optional<Schema.Int>
                        }>
                      >
                    }>
                  ]
                >
                readonly role: Schema.optional<Schema.Literals<readonly ["proposer", "counterparty"]>>
                readonly proposerConfirmedAt: Schema.optional<Schema.DateTimeUtcFromString>
                readonly counterpartyConfirmedAt: Schema.optional<Schema.DateTimeUtcFromString>
                readonly createdAt: Schema.DateTimeUtcFromString
                readonly expiresAt: Schema.DateTimeUtcFromString
                readonly failureReason: Schema.optional<Schema.String>
              }>
              readonly legs: Schema.$Array<
                Schema.Struct<{
                  readonly role: Schema.Literals<readonly ["proposer", "counterparty"]>
                  readonly fromPlayerId: Schema.brand<Schema.String, "PlayerId">
                  readonly toPlayerId: Schema.brand<Schema.String, "PlayerId">
                  readonly state: Schema.Literals<
                    readonly ["pending", "sent", "verified", "released", "settled", "refund_sent", "refunded", "lost"]
                  >
                  readonly itemType: Schema.Enum<{
                    readonly None: "None"
                    readonly Play: "Play"
                    readonly Gift: "Gift"
                    readonly Cloud: "Cloud"
                    readonly Raffle: "Raffle"
                    readonly Visit: "Visit"
                    readonly Leaderboards: "Leaderboards"
                  }>
                  readonly item: Schema.String
                }>
              >
              readonly ledger: Schema.$Array<
                Schema.Struct<{ readonly event: Schema.String; readonly at: Schema.DateTimeUtcFromString }>
              >
            }>
          >,
          Schema.toCodecJson<typeof HttpApiError.NotFound>,
          OAuthScope.RequireAccess,
          never
        >
      | HttpApiEndpoint.HttpApiEndpoint<
          "ProposeTrade",
          "POST",
          "/v1/treasury/trades",
          never,
          never,
          Schema.toCodecJson<
            Schema.Struct<{
              readonly mechanism: Schema.Literals<readonly ["gift", "splice"]>
              readonly game: Schema.Literals<readonly ["tinytower"]>
              readonly proposerPlayerId: Schema.brand<Schema.String, "PlayerId">
              readonly counterpartyPlayerId: Schema.optional<Schema.brand<Schema.String, "PlayerId">>
              readonly gives: Schema.Union<
                readonly [
                  Schema.Struct<{
                    readonly _tag: Schema.tag<"GiftItem">
                    readonly itemType: Schema.Enum<{
                      readonly None: "None"
                      readonly Play: "Play"
                      readonly Gift: "Gift"
                      readonly Cloud: "Cloud"
                      readonly Raffle: "Raffle"
                      readonly Visit: "Visit"
                      readonly Leaderboards: "Leaderboards"
                    }>
                    readonly item: Schema.String
                  }>,
                  Schema.Struct<{
                    readonly _tag: Schema.tag<"SpliceItems">
                    readonly items: Schema.$Array<
                      Schema.Struct<{
                        readonly kind: Schema.Literals<readonly ["bitizen", "costume", "pet", "coins", "bux"]>
                        readonly item: Schema.optional<Schema.String>
                        readonly amount: Schema.optional<Schema.Int>
                      }>
                    >
                  }>
                ]
              >
              readonly wants: Schema.Union<
                readonly [
                  Schema.Struct<{
                    readonly _tag: Schema.tag<"GiftItem">
                    readonly itemType: Schema.Enum<{
                      readonly None: "None"
                      readonly Play: "Play"
                      readonly Gift: "Gift"
                      readonly Cloud: "Cloud"
                      readonly Raffle: "Raffle"
                      readonly Visit: "Visit"
                      readonly Leaderboards: "Leaderboards"
                    }>
                    readonly item: Schema.String
                  }>,
                  Schema.Struct<{
                    readonly _tag: Schema.tag<"SpliceItems">
                    readonly items: Schema.$Array<
                      Schema.Struct<{
                        readonly kind: Schema.Literals<readonly ["bitizen", "costume", "pet", "coins", "bux"]>
                        readonly item: Schema.optional<Schema.String>
                        readonly amount: Schema.optional<Schema.Int>
                      }>
                    >
                  }>
                ]
              >
              readonly ttlHours: Schema.Int
            }>
          >,
          never,
          Schema.toCodecJson<
            Schema.Struct<{
              readonly id: Schema.String
              readonly mechanism: Schema.Literals<readonly ["gift", "splice"]>
              readonly game: Schema.Literals<readonly ["tinytower"]>
              readonly state: Schema.Literals<
                readonly [
                  "proposed",
                  "accepted",
                  "awaiting_confirmation",
                  "escrowing",
                  "escrowed",
                  "releasing",
                  "executing",
                  "settled",
                  "cancelled",
                  "refunding",
                  "refunded",
                  "expired",
                  "failed"
                ]
              >
              readonly proposerPlayerId: Schema.brand<Schema.String, "PlayerId">
              readonly counterpartyPlayerId: Schema.optional<Schema.brand<Schema.String, "PlayerId">>
              readonly gives: Schema.Union<
                readonly [
                  Schema.Struct<{
                    readonly _tag: Schema.tag<"GiftItem">
                    readonly itemType: Schema.Enum<{
                      readonly None: "None"
                      readonly Play: "Play"
                      readonly Gift: "Gift"
                      readonly Cloud: "Cloud"
                      readonly Raffle: "Raffle"
                      readonly Visit: "Visit"
                      readonly Leaderboards: "Leaderboards"
                    }>
                    readonly item: Schema.String
                  }>,
                  Schema.Struct<{
                    readonly _tag: Schema.tag<"SpliceItems">
                    readonly items: Schema.$Array<
                      Schema.Struct<{
                        readonly kind: Schema.Literals<readonly ["bitizen", "costume", "pet", "coins", "bux"]>
                        readonly item: Schema.optional<Schema.String>
                        readonly amount: Schema.optional<Schema.Int>
                      }>
                    >
                  }>
                ]
              >
              readonly wants: Schema.Union<
                readonly [
                  Schema.Struct<{
                    readonly _tag: Schema.tag<"GiftItem">
                    readonly itemType: Schema.Enum<{
                      readonly None: "None"
                      readonly Play: "Play"
                      readonly Gift: "Gift"
                      readonly Cloud: "Cloud"
                      readonly Raffle: "Raffle"
                      readonly Visit: "Visit"
                      readonly Leaderboards: "Leaderboards"
                    }>
                    readonly item: Schema.String
                  }>,
                  Schema.Struct<{
                    readonly _tag: Schema.tag<"SpliceItems">
                    readonly items: Schema.$Array<
                      Schema.Struct<{
                        readonly kind: Schema.Literals<readonly ["bitizen", "costume", "pet", "coins", "bux"]>
                        readonly item: Schema.optional<Schema.String>
                        readonly amount: Schema.optional<Schema.Int>
                      }>
                    >
                  }>
                ]
              >
              readonly role: Schema.optional<Schema.Literals<readonly ["proposer", "counterparty"]>>
              readonly proposerConfirmedAt: Schema.optional<Schema.DateTimeUtcFromString>
              readonly counterpartyConfirmedAt: Schema.optional<Schema.DateTimeUtcFromString>
              readonly createdAt: Schema.DateTimeUtcFromString
              readonly expiresAt: Schema.DateTimeUtcFromString
              readonly failureReason: Schema.optional<Schema.String>
            }>
          >,
          Schema.toCodecJson<
            typeof HttpApiError.BadRequest | typeof HttpApiError.Forbidden | typeof HttpApiError.ServiceUnavailable
          >,
          OAuthScope.RequireAccess,
          never
        >
      | HttpApiEndpoint.HttpApiEndpoint<
          "AcceptTrade",
          "POST",
          "/v1/treasury/trades/:tradeId/accept",
          Schema.toCodecStringTree<Schema.Struct<{ tradeId: Schema.String }>>,
          never,
          Schema.toCodecJson<Schema.Struct<{ readonly playerId: Schema.brand<Schema.String, "PlayerId"> }>>,
          never,
          Schema.toCodecJson<
            Schema.Struct<{
              readonly id: Schema.String
              readonly mechanism: Schema.Literals<readonly ["gift", "splice"]>
              readonly game: Schema.Literals<readonly ["tinytower"]>
              readonly state: Schema.Literals<
                readonly [
                  "proposed",
                  "accepted",
                  "awaiting_confirmation",
                  "escrowing",
                  "escrowed",
                  "releasing",
                  "executing",
                  "settled",
                  "cancelled",
                  "refunding",
                  "refunded",
                  "expired",
                  "failed"
                ]
              >
              readonly proposerPlayerId: Schema.brand<Schema.String, "PlayerId">
              readonly counterpartyPlayerId: Schema.optional<Schema.brand<Schema.String, "PlayerId">>
              readonly gives: Schema.Union<
                readonly [
                  Schema.Struct<{
                    readonly _tag: Schema.tag<"GiftItem">
                    readonly itemType: Schema.Enum<{
                      readonly None: "None"
                      readonly Play: "Play"
                      readonly Gift: "Gift"
                      readonly Cloud: "Cloud"
                      readonly Raffle: "Raffle"
                      readonly Visit: "Visit"
                      readonly Leaderboards: "Leaderboards"
                    }>
                    readonly item: Schema.String
                  }>,
                  Schema.Struct<{
                    readonly _tag: Schema.tag<"SpliceItems">
                    readonly items: Schema.$Array<
                      Schema.Struct<{
                        readonly kind: Schema.Literals<readonly ["bitizen", "costume", "pet", "coins", "bux"]>
                        readonly item: Schema.optional<Schema.String>
                        readonly amount: Schema.optional<Schema.Int>
                      }>
                    >
                  }>
                ]
              >
              readonly wants: Schema.Union<
                readonly [
                  Schema.Struct<{
                    readonly _tag: Schema.tag<"GiftItem">
                    readonly itemType: Schema.Enum<{
                      readonly None: "None"
                      readonly Play: "Play"
                      readonly Gift: "Gift"
                      readonly Cloud: "Cloud"
                      readonly Raffle: "Raffle"
                      readonly Visit: "Visit"
                      readonly Leaderboards: "Leaderboards"
                    }>
                    readonly item: Schema.String
                  }>,
                  Schema.Struct<{
                    readonly _tag: Schema.tag<"SpliceItems">
                    readonly items: Schema.$Array<
                      Schema.Struct<{
                        readonly kind: Schema.Literals<readonly ["bitizen", "costume", "pet", "coins", "bux"]>
                        readonly item: Schema.optional<Schema.String>
                        readonly amount: Schema.optional<Schema.Int>
                      }>
                    >
                  }>
                ]
              >
              readonly role: Schema.optional<Schema.Literals<readonly ["proposer", "counterparty"]>>
              readonly proposerConfirmedAt: Schema.optional<Schema.DateTimeUtcFromString>
              readonly counterpartyConfirmedAt: Schema.optional<Schema.DateTimeUtcFromString>
              readonly createdAt: Schema.DateTimeUtcFromString
              readonly expiresAt: Schema.DateTimeUtcFromString
              readonly failureReason: Schema.optional<Schema.String>
            }>
          >,
          Schema.toCodecJson<
            | typeof HttpApiError.NotFound
            | typeof HttpApiError.Forbidden
            | typeof HttpApiError.ServiceUnavailable
            | typeof HttpApiError.Conflict
          >,
          OAuthScope.RequireAccess,
          never
        >
      | HttpApiEndpoint.HttpApiEndpoint<
          "CancelTrade",
          "POST",
          "/v1/treasury/trades/:tradeId/cancel",
          Schema.toCodecStringTree<Schema.Struct<{ tradeId: Schema.String }>>,
          never,
          never,
          never,
          Schema.toCodecJson<
            Schema.Struct<{
              readonly id: Schema.String
              readonly mechanism: Schema.Literals<readonly ["gift", "splice"]>
              readonly game: Schema.Literals<readonly ["tinytower"]>
              readonly state: Schema.Literals<
                readonly [
                  "proposed",
                  "accepted",
                  "awaiting_confirmation",
                  "escrowing",
                  "escrowed",
                  "releasing",
                  "executing",
                  "settled",
                  "cancelled",
                  "refunding",
                  "refunded",
                  "expired",
                  "failed"
                ]
              >
              readonly proposerPlayerId: Schema.brand<Schema.String, "PlayerId">
              readonly counterpartyPlayerId: Schema.optional<Schema.brand<Schema.String, "PlayerId">>
              readonly gives: Schema.Union<
                readonly [
                  Schema.Struct<{
                    readonly _tag: Schema.tag<"GiftItem">
                    readonly itemType: Schema.Enum<{
                      readonly None: "None"
                      readonly Play: "Play"
                      readonly Gift: "Gift"
                      readonly Cloud: "Cloud"
                      readonly Raffle: "Raffle"
                      readonly Visit: "Visit"
                      readonly Leaderboards: "Leaderboards"
                    }>
                    readonly item: Schema.String
                  }>,
                  Schema.Struct<{
                    readonly _tag: Schema.tag<"SpliceItems">
                    readonly items: Schema.$Array<
                      Schema.Struct<{
                        readonly kind: Schema.Literals<readonly ["bitizen", "costume", "pet", "coins", "bux"]>
                        readonly item: Schema.optional<Schema.String>
                        readonly amount: Schema.optional<Schema.Int>
                      }>
                    >
                  }>
                ]
              >
              readonly wants: Schema.Union<
                readonly [
                  Schema.Struct<{
                    readonly _tag: Schema.tag<"GiftItem">
                    readonly itemType: Schema.Enum<{
                      readonly None: "None"
                      readonly Play: "Play"
                      readonly Gift: "Gift"
                      readonly Cloud: "Cloud"
                      readonly Raffle: "Raffle"
                      readonly Visit: "Visit"
                      readonly Leaderboards: "Leaderboards"
                    }>
                    readonly item: Schema.String
                  }>,
                  Schema.Struct<{
                    readonly _tag: Schema.tag<"SpliceItems">
                    readonly items: Schema.$Array<
                      Schema.Struct<{
                        readonly kind: Schema.Literals<readonly ["bitizen", "costume", "pet", "coins", "bux"]>
                        readonly item: Schema.optional<Schema.String>
                        readonly amount: Schema.optional<Schema.Int>
                      }>
                    >
                  }>
                ]
              >
              readonly role: Schema.optional<Schema.Literals<readonly ["proposer", "counterparty"]>>
              readonly proposerConfirmedAt: Schema.optional<Schema.DateTimeUtcFromString>
              readonly counterpartyConfirmedAt: Schema.optional<Schema.DateTimeUtcFromString>
              readonly createdAt: Schema.DateTimeUtcFromString
              readonly expiresAt: Schema.DateTimeUtcFromString
              readonly failureReason: Schema.optional<Schema.String>
            }>
          >,
          Schema.toCodecJson<typeof HttpApiError.NotFound | typeof HttpApiError.Conflict>,
          OAuthScope.RequireAccess,
          never
        >
      | HttpApiEndpoint.HttpApiEndpoint<
          "ConfirmSplice",
          "POST",
          "/v1/treasury/trades/:tradeId/confirm",
          Schema.toCodecStringTree<Schema.Struct<{ tradeId: Schema.String }>>,
          never,
          never,
          never,
          Schema.toCodecJson<
            Schema.Struct<{
              readonly id: Schema.String
              readonly mechanism: Schema.Literals<readonly ["gift", "splice"]>
              readonly game: Schema.Literals<readonly ["tinytower"]>
              readonly state: Schema.Literals<
                readonly [
                  "proposed",
                  "accepted",
                  "awaiting_confirmation",
                  "escrowing",
                  "escrowed",
                  "releasing",
                  "executing",
                  "settled",
                  "cancelled",
                  "refunding",
                  "refunded",
                  "expired",
                  "failed"
                ]
              >
              readonly proposerPlayerId: Schema.brand<Schema.String, "PlayerId">
              readonly counterpartyPlayerId: Schema.optional<Schema.brand<Schema.String, "PlayerId">>
              readonly gives: Schema.Union<
                readonly [
                  Schema.Struct<{
                    readonly _tag: Schema.tag<"GiftItem">
                    readonly itemType: Schema.Enum<{
                      readonly None: "None"
                      readonly Play: "Play"
                      readonly Gift: "Gift"
                      readonly Cloud: "Cloud"
                      readonly Raffle: "Raffle"
                      readonly Visit: "Visit"
                      readonly Leaderboards: "Leaderboards"
                    }>
                    readonly item: Schema.String
                  }>,
                  Schema.Struct<{
                    readonly _tag: Schema.tag<"SpliceItems">
                    readonly items: Schema.$Array<
                      Schema.Struct<{
                        readonly kind: Schema.Literals<readonly ["bitizen", "costume", "pet", "coins", "bux"]>
                        readonly item: Schema.optional<Schema.String>
                        readonly amount: Schema.optional<Schema.Int>
                      }>
                    >
                  }>
                ]
              >
              readonly wants: Schema.Union<
                readonly [
                  Schema.Struct<{
                    readonly _tag: Schema.tag<"GiftItem">
                    readonly itemType: Schema.Enum<{
                      readonly None: "None"
                      readonly Play: "Play"
                      readonly Gift: "Gift"
                      readonly Cloud: "Cloud"
                      readonly Raffle: "Raffle"
                      readonly Visit: "Visit"
                      readonly Leaderboards: "Leaderboards"
                    }>
                    readonly item: Schema.String
                  }>,
                  Schema.Struct<{
                    readonly _tag: Schema.tag<"SpliceItems">
                    readonly items: Schema.$Array<
                      Schema.Struct<{
                        readonly kind: Schema.Literals<readonly ["bitizen", "costume", "pet", "coins", "bux"]>
                        readonly item: Schema.optional<Schema.String>
                        readonly amount: Schema.optional<Schema.Int>
                      }>
                    >
                  }>
                ]
              >
              readonly role: Schema.optional<Schema.Literals<readonly ["proposer", "counterparty"]>>
              readonly proposerConfirmedAt: Schema.optional<Schema.DateTimeUtcFromString>
              readonly counterpartyConfirmedAt: Schema.optional<Schema.DateTimeUtcFromString>
              readonly createdAt: Schema.DateTimeUtcFromString
              readonly expiresAt: Schema.DateTimeUtcFromString
              readonly failureReason: Schema.optional<Schema.String>
            }>
          >,
          Schema.toCodecJson<typeof HttpApiError.NotFound | typeof HttpApiError.Conflict>,
          OAuthScope.RequireAccess,
          never
        >
      | HttpApiEndpoint.HttpApiEndpoint<
          "ListInventory",
          "GET",
          "/v1/treasury/inventory/:playerId",
          Schema.toCodecStringTree<Schema.Struct<{ playerId: Schema.brand<Schema.String, "PlayerId"> }>>,
          never,
          never,
          never,
          Schema.toCodecJson<
            Schema.Struct<{
              readonly playerId: Schema.brand<Schema.String, "PlayerId">
              readonly bitizens: Schema.$Array<Schema.String>
              readonly costumes: Schema.$Array<Schema.String>
              readonly pets: Schema.$Array<Schema.String>
              readonly coins: Schema.Int
              readonly bux: Schema.Int
            }>
          >,
          Schema.toCodecJson<
            typeof HttpApiError.NotFound | typeof HttpApiError.Forbidden | typeof HttpApiError.ServiceUnavailable
          >,
          OAuthScope.RequireAccess,
          never
        >,
      false
    >
  | HttpApiGroup.HttpApiGroup<
      "TreasuryPublicGroup",
      HttpApiEndpoint.HttpApiEndpoint<
        "Stats",
        "GET",
        "/v1/treasury/stats",
        never,
        never,
        never,
        never,
        Schema.toCodecJson<
          Schema.Struct<{
            readonly activeTraders: Schema.Int
            readonly settledTrades: Schema.Int
            readonly itemsMoved: Schema.Int
          }>
        >,
        never,
        never,
        never
      >,
      false
    >
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/treasury-sdk/src/Sdk.ts#L387)

Since v1.0.0

# Groups

## TreasuryGroup

Everything the treasury serves. The group annotation is the floor: an
endpoint added later without its own leaf accepts only the whole
`treasury` scope, so nothing defaults to a weaker permission.

**Signature**

```ts
declare const TreasuryGroup: HttpApiGroup.HttpApiGroup<
  "TreasuryGroup",
  | HttpApiEndpoint.HttpApiEndpoint<
      "GrantStatus",
      "GET",
      "/v1/treasury/grant",
      never,
      never,
      never,
      never,
      Schema.toCodecJson<
        Schema.Struct<{
          readonly connected: Schema.Boolean
          readonly scope: Schema.optional<Schema.String>
          readonly connectUrl: Schema.String
        }>
      >,
      never,
      OAuthScope.RequireAccess,
      never
    >
  | HttpApiEndpoint.HttpApiEndpoint<
      "ListTrades",
      "GET",
      "/v1/treasury/trades",
      never,
      never,
      never,
      never,
      Schema.toCodecJson<
        Schema.$Array<
          Schema.Struct<{
            readonly id: Schema.String
            readonly mechanism: Schema.Literals<readonly ["gift", "splice"]>
            readonly game: Schema.Literals<readonly ["tinytower"]>
            readonly state: Schema.Literals<
              readonly [
                "proposed",
                "accepted",
                "awaiting_confirmation",
                "escrowing",
                "escrowed",
                "releasing",
                "executing",
                "settled",
                "cancelled",
                "refunding",
                "refunded",
                "expired",
                "failed"
              ]
            >
            readonly proposerPlayerId: Schema.brand<Schema.String, "PlayerId">
            readonly counterpartyPlayerId: Schema.optional<Schema.brand<Schema.String, "PlayerId">>
            readonly gives: Schema.Union<
              readonly [
                Schema.Struct<{
                  readonly _tag: Schema.tag<"GiftItem">
                  readonly itemType: Schema.Enum<{
                    readonly None: "None"
                    readonly Play: "Play"
                    readonly Gift: "Gift"
                    readonly Cloud: "Cloud"
                    readonly Raffle: "Raffle"
                    readonly Visit: "Visit"
                    readonly Leaderboards: "Leaderboards"
                  }>
                  readonly item: Schema.String
                }>,
                Schema.Struct<{
                  readonly _tag: Schema.tag<"SpliceItems">
                  readonly items: Schema.$Array<
                    Schema.Struct<{
                      readonly kind: Schema.Literals<readonly ["bitizen", "costume", "pet", "coins", "bux"]>
                      readonly item: Schema.optional<Schema.String>
                      readonly amount: Schema.optional<Schema.Int>
                    }>
                  >
                }>
              ]
            >
            readonly wants: Schema.Union<
              readonly [
                Schema.Struct<{
                  readonly _tag: Schema.tag<"GiftItem">
                  readonly itemType: Schema.Enum<{
                    readonly None: "None"
                    readonly Play: "Play"
                    readonly Gift: "Gift"
                    readonly Cloud: "Cloud"
                    readonly Raffle: "Raffle"
                    readonly Visit: "Visit"
                    readonly Leaderboards: "Leaderboards"
                  }>
                  readonly item: Schema.String
                }>,
                Schema.Struct<{
                  readonly _tag: Schema.tag<"SpliceItems">
                  readonly items: Schema.$Array<
                    Schema.Struct<{
                      readonly kind: Schema.Literals<readonly ["bitizen", "costume", "pet", "coins", "bux"]>
                      readonly item: Schema.optional<Schema.String>
                      readonly amount: Schema.optional<Schema.Int>
                    }>
                  >
                }>
              ]
            >
            readonly role: Schema.optional<Schema.Literals<readonly ["proposer", "counterparty"]>>
            readonly proposerConfirmedAt: Schema.optional<Schema.DateTimeUtcFromString>
            readonly counterpartyConfirmedAt: Schema.optional<Schema.DateTimeUtcFromString>
            readonly createdAt: Schema.DateTimeUtcFromString
            readonly expiresAt: Schema.DateTimeUtcFromString
            readonly failureReason: Schema.optional<Schema.String>
          }>
        >
      >,
      never,
      OAuthScope.RequireAccess,
      never
    >
  | HttpApiEndpoint.HttpApiEndpoint<
      "GetTrade",
      "GET",
      "/v1/treasury/trades/:tradeId",
      Schema.toCodecStringTree<Schema.Struct<{ tradeId: Schema.String }>>,
      never,
      never,
      never,
      Schema.toCodecJson<
        Schema.Struct<{
          readonly trade: Schema.Struct<{
            readonly id: Schema.String
            readonly mechanism: Schema.Literals<readonly ["gift", "splice"]>
            readonly game: Schema.Literals<readonly ["tinytower"]>
            readonly state: Schema.Literals<
              readonly [
                "proposed",
                "accepted",
                "awaiting_confirmation",
                "escrowing",
                "escrowed",
                "releasing",
                "executing",
                "settled",
                "cancelled",
                "refunding",
                "refunded",
                "expired",
                "failed"
              ]
            >
            readonly proposerPlayerId: Schema.brand<Schema.String, "PlayerId">
            readonly counterpartyPlayerId: Schema.optional<Schema.brand<Schema.String, "PlayerId">>
            readonly gives: Schema.Union<
              readonly [
                Schema.Struct<{
                  readonly _tag: Schema.tag<"GiftItem">
                  readonly itemType: Schema.Enum<{
                    readonly None: "None"
                    readonly Play: "Play"
                    readonly Gift: "Gift"
                    readonly Cloud: "Cloud"
                    readonly Raffle: "Raffle"
                    readonly Visit: "Visit"
                    readonly Leaderboards: "Leaderboards"
                  }>
                  readonly item: Schema.String
                }>,
                Schema.Struct<{
                  readonly _tag: Schema.tag<"SpliceItems">
                  readonly items: Schema.$Array<
                    Schema.Struct<{
                      readonly kind: Schema.Literals<readonly ["bitizen", "costume", "pet", "coins", "bux"]>
                      readonly item: Schema.optional<Schema.String>
                      readonly amount: Schema.optional<Schema.Int>
                    }>
                  >
                }>
              ]
            >
            readonly wants: Schema.Union<
              readonly [
                Schema.Struct<{
                  readonly _tag: Schema.tag<"GiftItem">
                  readonly itemType: Schema.Enum<{
                    readonly None: "None"
                    readonly Play: "Play"
                    readonly Gift: "Gift"
                    readonly Cloud: "Cloud"
                    readonly Raffle: "Raffle"
                    readonly Visit: "Visit"
                    readonly Leaderboards: "Leaderboards"
                  }>
                  readonly item: Schema.String
                }>,
                Schema.Struct<{
                  readonly _tag: Schema.tag<"SpliceItems">
                  readonly items: Schema.$Array<
                    Schema.Struct<{
                      readonly kind: Schema.Literals<readonly ["bitizen", "costume", "pet", "coins", "bux"]>
                      readonly item: Schema.optional<Schema.String>
                      readonly amount: Schema.optional<Schema.Int>
                    }>
                  >
                }>
              ]
            >
            readonly role: Schema.optional<Schema.Literals<readonly ["proposer", "counterparty"]>>
            readonly proposerConfirmedAt: Schema.optional<Schema.DateTimeUtcFromString>
            readonly counterpartyConfirmedAt: Schema.optional<Schema.DateTimeUtcFromString>
            readonly createdAt: Schema.DateTimeUtcFromString
            readonly expiresAt: Schema.DateTimeUtcFromString
            readonly failureReason: Schema.optional<Schema.String>
          }>
          readonly legs: Schema.$Array<
            Schema.Struct<{
              readonly role: Schema.Literals<readonly ["proposer", "counterparty"]>
              readonly fromPlayerId: Schema.brand<Schema.String, "PlayerId">
              readonly toPlayerId: Schema.brand<Schema.String, "PlayerId">
              readonly state: Schema.Literals<
                readonly ["pending", "sent", "verified", "released", "settled", "refund_sent", "refunded", "lost"]
              >
              readonly itemType: Schema.Enum<{
                readonly None: "None"
                readonly Play: "Play"
                readonly Gift: "Gift"
                readonly Cloud: "Cloud"
                readonly Raffle: "Raffle"
                readonly Visit: "Visit"
                readonly Leaderboards: "Leaderboards"
              }>
              readonly item: Schema.String
            }>
          >
          readonly ledger: Schema.$Array<
            Schema.Struct<{ readonly event: Schema.String; readonly at: Schema.DateTimeUtcFromString }>
          >
        }>
      >,
      Schema.toCodecJson<typeof HttpApiError.NotFound>,
      OAuthScope.RequireAccess,
      never
    >
  | HttpApiEndpoint.HttpApiEndpoint<
      "ProposeTrade",
      "POST",
      "/v1/treasury/trades",
      never,
      never,
      Schema.toCodecJson<
        Schema.Struct<{
          readonly mechanism: Schema.Literals<readonly ["gift", "splice"]>
          readonly game: Schema.Literals<readonly ["tinytower"]>
          readonly proposerPlayerId: Schema.brand<Schema.String, "PlayerId">
          readonly counterpartyPlayerId: Schema.optional<Schema.brand<Schema.String, "PlayerId">>
          readonly gives: Schema.Union<
            readonly [
              Schema.Struct<{
                readonly _tag: Schema.tag<"GiftItem">
                readonly itemType: Schema.Enum<{
                  readonly None: "None"
                  readonly Play: "Play"
                  readonly Gift: "Gift"
                  readonly Cloud: "Cloud"
                  readonly Raffle: "Raffle"
                  readonly Visit: "Visit"
                  readonly Leaderboards: "Leaderboards"
                }>
                readonly item: Schema.String
              }>,
              Schema.Struct<{
                readonly _tag: Schema.tag<"SpliceItems">
                readonly items: Schema.$Array<
                  Schema.Struct<{
                    readonly kind: Schema.Literals<readonly ["bitizen", "costume", "pet", "coins", "bux"]>
                    readonly item: Schema.optional<Schema.String>
                    readonly amount: Schema.optional<Schema.Int>
                  }>
                >
              }>
            ]
          >
          readonly wants: Schema.Union<
            readonly [
              Schema.Struct<{
                readonly _tag: Schema.tag<"GiftItem">
                readonly itemType: Schema.Enum<{
                  readonly None: "None"
                  readonly Play: "Play"
                  readonly Gift: "Gift"
                  readonly Cloud: "Cloud"
                  readonly Raffle: "Raffle"
                  readonly Visit: "Visit"
                  readonly Leaderboards: "Leaderboards"
                }>
                readonly item: Schema.String
              }>,
              Schema.Struct<{
                readonly _tag: Schema.tag<"SpliceItems">
                readonly items: Schema.$Array<
                  Schema.Struct<{
                    readonly kind: Schema.Literals<readonly ["bitizen", "costume", "pet", "coins", "bux"]>
                    readonly item: Schema.optional<Schema.String>
                    readonly amount: Schema.optional<Schema.Int>
                  }>
                >
              }>
            ]
          >
          readonly ttlHours: Schema.Int
        }>
      >,
      never,
      Schema.toCodecJson<
        Schema.Struct<{
          readonly id: Schema.String
          readonly mechanism: Schema.Literals<readonly ["gift", "splice"]>
          readonly game: Schema.Literals<readonly ["tinytower"]>
          readonly state: Schema.Literals<
            readonly [
              "proposed",
              "accepted",
              "awaiting_confirmation",
              "escrowing",
              "escrowed",
              "releasing",
              "executing",
              "settled",
              "cancelled",
              "refunding",
              "refunded",
              "expired",
              "failed"
            ]
          >
          readonly proposerPlayerId: Schema.brand<Schema.String, "PlayerId">
          readonly counterpartyPlayerId: Schema.optional<Schema.brand<Schema.String, "PlayerId">>
          readonly gives: Schema.Union<
            readonly [
              Schema.Struct<{
                readonly _tag: Schema.tag<"GiftItem">
                readonly itemType: Schema.Enum<{
                  readonly None: "None"
                  readonly Play: "Play"
                  readonly Gift: "Gift"
                  readonly Cloud: "Cloud"
                  readonly Raffle: "Raffle"
                  readonly Visit: "Visit"
                  readonly Leaderboards: "Leaderboards"
                }>
                readonly item: Schema.String
              }>,
              Schema.Struct<{
                readonly _tag: Schema.tag<"SpliceItems">
                readonly items: Schema.$Array<
                  Schema.Struct<{
                    readonly kind: Schema.Literals<readonly ["bitizen", "costume", "pet", "coins", "bux"]>
                    readonly item: Schema.optional<Schema.String>
                    readonly amount: Schema.optional<Schema.Int>
                  }>
                >
              }>
            ]
          >
          readonly wants: Schema.Union<
            readonly [
              Schema.Struct<{
                readonly _tag: Schema.tag<"GiftItem">
                readonly itemType: Schema.Enum<{
                  readonly None: "None"
                  readonly Play: "Play"
                  readonly Gift: "Gift"
                  readonly Cloud: "Cloud"
                  readonly Raffle: "Raffle"
                  readonly Visit: "Visit"
                  readonly Leaderboards: "Leaderboards"
                }>
                readonly item: Schema.String
              }>,
              Schema.Struct<{
                readonly _tag: Schema.tag<"SpliceItems">
                readonly items: Schema.$Array<
                  Schema.Struct<{
                    readonly kind: Schema.Literals<readonly ["bitizen", "costume", "pet", "coins", "bux"]>
                    readonly item: Schema.optional<Schema.String>
                    readonly amount: Schema.optional<Schema.Int>
                  }>
                >
              }>
            ]
          >
          readonly role: Schema.optional<Schema.Literals<readonly ["proposer", "counterparty"]>>
          readonly proposerConfirmedAt: Schema.optional<Schema.DateTimeUtcFromString>
          readonly counterpartyConfirmedAt: Schema.optional<Schema.DateTimeUtcFromString>
          readonly createdAt: Schema.DateTimeUtcFromString
          readonly expiresAt: Schema.DateTimeUtcFromString
          readonly failureReason: Schema.optional<Schema.String>
        }>
      >,
      Schema.toCodecJson<
        typeof HttpApiError.BadRequest | typeof HttpApiError.Forbidden | typeof HttpApiError.ServiceUnavailable
      >,
      OAuthScope.RequireAccess,
      never
    >
  | HttpApiEndpoint.HttpApiEndpoint<
      "AcceptTrade",
      "POST",
      "/v1/treasury/trades/:tradeId/accept",
      Schema.toCodecStringTree<Schema.Struct<{ tradeId: Schema.String }>>,
      never,
      Schema.toCodecJson<Schema.Struct<{ readonly playerId: Schema.brand<Schema.String, "PlayerId"> }>>,
      never,
      Schema.toCodecJson<
        Schema.Struct<{
          readonly id: Schema.String
          readonly mechanism: Schema.Literals<readonly ["gift", "splice"]>
          readonly game: Schema.Literals<readonly ["tinytower"]>
          readonly state: Schema.Literals<
            readonly [
              "proposed",
              "accepted",
              "awaiting_confirmation",
              "escrowing",
              "escrowed",
              "releasing",
              "executing",
              "settled",
              "cancelled",
              "refunding",
              "refunded",
              "expired",
              "failed"
            ]
          >
          readonly proposerPlayerId: Schema.brand<Schema.String, "PlayerId">
          readonly counterpartyPlayerId: Schema.optional<Schema.brand<Schema.String, "PlayerId">>
          readonly gives: Schema.Union<
            readonly [
              Schema.Struct<{
                readonly _tag: Schema.tag<"GiftItem">
                readonly itemType: Schema.Enum<{
                  readonly None: "None"
                  readonly Play: "Play"
                  readonly Gift: "Gift"
                  readonly Cloud: "Cloud"
                  readonly Raffle: "Raffle"
                  readonly Visit: "Visit"
                  readonly Leaderboards: "Leaderboards"
                }>
                readonly item: Schema.String
              }>,
              Schema.Struct<{
                readonly _tag: Schema.tag<"SpliceItems">
                readonly items: Schema.$Array<
                  Schema.Struct<{
                    readonly kind: Schema.Literals<readonly ["bitizen", "costume", "pet", "coins", "bux"]>
                    readonly item: Schema.optional<Schema.String>
                    readonly amount: Schema.optional<Schema.Int>
                  }>
                >
              }>
            ]
          >
          readonly wants: Schema.Union<
            readonly [
              Schema.Struct<{
                readonly _tag: Schema.tag<"GiftItem">
                readonly itemType: Schema.Enum<{
                  readonly None: "None"
                  readonly Play: "Play"
                  readonly Gift: "Gift"
                  readonly Cloud: "Cloud"
                  readonly Raffle: "Raffle"
                  readonly Visit: "Visit"
                  readonly Leaderboards: "Leaderboards"
                }>
                readonly item: Schema.String
              }>,
              Schema.Struct<{
                readonly _tag: Schema.tag<"SpliceItems">
                readonly items: Schema.$Array<
                  Schema.Struct<{
                    readonly kind: Schema.Literals<readonly ["bitizen", "costume", "pet", "coins", "bux"]>
                    readonly item: Schema.optional<Schema.String>
                    readonly amount: Schema.optional<Schema.Int>
                  }>
                >
              }>
            ]
          >
          readonly role: Schema.optional<Schema.Literals<readonly ["proposer", "counterparty"]>>
          readonly proposerConfirmedAt: Schema.optional<Schema.DateTimeUtcFromString>
          readonly counterpartyConfirmedAt: Schema.optional<Schema.DateTimeUtcFromString>
          readonly createdAt: Schema.DateTimeUtcFromString
          readonly expiresAt: Schema.DateTimeUtcFromString
          readonly failureReason: Schema.optional<Schema.String>
        }>
      >,
      Schema.toCodecJson<
        | typeof HttpApiError.NotFound
        | typeof HttpApiError.Forbidden
        | typeof HttpApiError.ServiceUnavailable
        | typeof HttpApiError.Conflict
      >,
      OAuthScope.RequireAccess,
      never
    >
  | HttpApiEndpoint.HttpApiEndpoint<
      "CancelTrade",
      "POST",
      "/v1/treasury/trades/:tradeId/cancel",
      Schema.toCodecStringTree<Schema.Struct<{ tradeId: Schema.String }>>,
      never,
      never,
      never,
      Schema.toCodecJson<
        Schema.Struct<{
          readonly id: Schema.String
          readonly mechanism: Schema.Literals<readonly ["gift", "splice"]>
          readonly game: Schema.Literals<readonly ["tinytower"]>
          readonly state: Schema.Literals<
            readonly [
              "proposed",
              "accepted",
              "awaiting_confirmation",
              "escrowing",
              "escrowed",
              "releasing",
              "executing",
              "settled",
              "cancelled",
              "refunding",
              "refunded",
              "expired",
              "failed"
            ]
          >
          readonly proposerPlayerId: Schema.brand<Schema.String, "PlayerId">
          readonly counterpartyPlayerId: Schema.optional<Schema.brand<Schema.String, "PlayerId">>
          readonly gives: Schema.Union<
            readonly [
              Schema.Struct<{
                readonly _tag: Schema.tag<"GiftItem">
                readonly itemType: Schema.Enum<{
                  readonly None: "None"
                  readonly Play: "Play"
                  readonly Gift: "Gift"
                  readonly Cloud: "Cloud"
                  readonly Raffle: "Raffle"
                  readonly Visit: "Visit"
                  readonly Leaderboards: "Leaderboards"
                }>
                readonly item: Schema.String
              }>,
              Schema.Struct<{
                readonly _tag: Schema.tag<"SpliceItems">
                readonly items: Schema.$Array<
                  Schema.Struct<{
                    readonly kind: Schema.Literals<readonly ["bitizen", "costume", "pet", "coins", "bux"]>
                    readonly item: Schema.optional<Schema.String>
                    readonly amount: Schema.optional<Schema.Int>
                  }>
                >
              }>
            ]
          >
          readonly wants: Schema.Union<
            readonly [
              Schema.Struct<{
                readonly _tag: Schema.tag<"GiftItem">
                readonly itemType: Schema.Enum<{
                  readonly None: "None"
                  readonly Play: "Play"
                  readonly Gift: "Gift"
                  readonly Cloud: "Cloud"
                  readonly Raffle: "Raffle"
                  readonly Visit: "Visit"
                  readonly Leaderboards: "Leaderboards"
                }>
                readonly item: Schema.String
              }>,
              Schema.Struct<{
                readonly _tag: Schema.tag<"SpliceItems">
                readonly items: Schema.$Array<
                  Schema.Struct<{
                    readonly kind: Schema.Literals<readonly ["bitizen", "costume", "pet", "coins", "bux"]>
                    readonly item: Schema.optional<Schema.String>
                    readonly amount: Schema.optional<Schema.Int>
                  }>
                >
              }>
            ]
          >
          readonly role: Schema.optional<Schema.Literals<readonly ["proposer", "counterparty"]>>
          readonly proposerConfirmedAt: Schema.optional<Schema.DateTimeUtcFromString>
          readonly counterpartyConfirmedAt: Schema.optional<Schema.DateTimeUtcFromString>
          readonly createdAt: Schema.DateTimeUtcFromString
          readonly expiresAt: Schema.DateTimeUtcFromString
          readonly failureReason: Schema.optional<Schema.String>
        }>
      >,
      Schema.toCodecJson<typeof HttpApiError.NotFound | typeof HttpApiError.Conflict>,
      OAuthScope.RequireAccess,
      never
    >
  | HttpApiEndpoint.HttpApiEndpoint<
      "ConfirmSplice",
      "POST",
      "/v1/treasury/trades/:tradeId/confirm",
      Schema.toCodecStringTree<Schema.Struct<{ tradeId: Schema.String }>>,
      never,
      never,
      never,
      Schema.toCodecJson<
        Schema.Struct<{
          readonly id: Schema.String
          readonly mechanism: Schema.Literals<readonly ["gift", "splice"]>
          readonly game: Schema.Literals<readonly ["tinytower"]>
          readonly state: Schema.Literals<
            readonly [
              "proposed",
              "accepted",
              "awaiting_confirmation",
              "escrowing",
              "escrowed",
              "releasing",
              "executing",
              "settled",
              "cancelled",
              "refunding",
              "refunded",
              "expired",
              "failed"
            ]
          >
          readonly proposerPlayerId: Schema.brand<Schema.String, "PlayerId">
          readonly counterpartyPlayerId: Schema.optional<Schema.brand<Schema.String, "PlayerId">>
          readonly gives: Schema.Union<
            readonly [
              Schema.Struct<{
                readonly _tag: Schema.tag<"GiftItem">
                readonly itemType: Schema.Enum<{
                  readonly None: "None"
                  readonly Play: "Play"
                  readonly Gift: "Gift"
                  readonly Cloud: "Cloud"
                  readonly Raffle: "Raffle"
                  readonly Visit: "Visit"
                  readonly Leaderboards: "Leaderboards"
                }>
                readonly item: Schema.String
              }>,
              Schema.Struct<{
                readonly _tag: Schema.tag<"SpliceItems">
                readonly items: Schema.$Array<
                  Schema.Struct<{
                    readonly kind: Schema.Literals<readonly ["bitizen", "costume", "pet", "coins", "bux"]>
                    readonly item: Schema.optional<Schema.String>
                    readonly amount: Schema.optional<Schema.Int>
                  }>
                >
              }>
            ]
          >
          readonly wants: Schema.Union<
            readonly [
              Schema.Struct<{
                readonly _tag: Schema.tag<"GiftItem">
                readonly itemType: Schema.Enum<{
                  readonly None: "None"
                  readonly Play: "Play"
                  readonly Gift: "Gift"
                  readonly Cloud: "Cloud"
                  readonly Raffle: "Raffle"
                  readonly Visit: "Visit"
                  readonly Leaderboards: "Leaderboards"
                }>
                readonly item: Schema.String
              }>,
              Schema.Struct<{
                readonly _tag: Schema.tag<"SpliceItems">
                readonly items: Schema.$Array<
                  Schema.Struct<{
                    readonly kind: Schema.Literals<readonly ["bitizen", "costume", "pet", "coins", "bux"]>
                    readonly item: Schema.optional<Schema.String>
                    readonly amount: Schema.optional<Schema.Int>
                  }>
                >
              }>
            ]
          >
          readonly role: Schema.optional<Schema.Literals<readonly ["proposer", "counterparty"]>>
          readonly proposerConfirmedAt: Schema.optional<Schema.DateTimeUtcFromString>
          readonly counterpartyConfirmedAt: Schema.optional<Schema.DateTimeUtcFromString>
          readonly createdAt: Schema.DateTimeUtcFromString
          readonly expiresAt: Schema.DateTimeUtcFromString
          readonly failureReason: Schema.optional<Schema.String>
        }>
      >,
      Schema.toCodecJson<typeof HttpApiError.NotFound | typeof HttpApiError.Conflict>,
      OAuthScope.RequireAccess,
      never
    >
  | HttpApiEndpoint.HttpApiEndpoint<
      "ListInventory",
      "GET",
      "/v1/treasury/inventory/:playerId",
      Schema.toCodecStringTree<Schema.Struct<{ playerId: Schema.brand<Schema.String, "PlayerId"> }>>,
      never,
      never,
      never,
      Schema.toCodecJson<
        Schema.Struct<{
          readonly playerId: Schema.brand<Schema.String, "PlayerId">
          readonly bitizens: Schema.$Array<Schema.String>
          readonly costumes: Schema.$Array<Schema.String>
          readonly pets: Schema.$Array<Schema.String>
          readonly coins: Schema.Int
          readonly bux: Schema.Int
        }>
      >,
      Schema.toCodecJson<
        typeof HttpApiError.NotFound | typeof HttpApiError.Forbidden | typeof HttpApiError.ServiceUnavailable
      >,
      OAuthScope.RequireAccess,
      never
    >,
  false
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/treasury-sdk/src/Sdk.ts#L360)

Since v1.0.0

## TreasuryPublicGroup

What the treasury tells anyone at all: the stat counters the home page
shows. The one group without `RequireAccess` or a scope requirement, and
it must stay that way - the home page is public, so this rides
tinyburg.app's proxy without a token behind it.

**Signature**

```ts
declare const TreasuryPublicGroup: HttpApiGroup.HttpApiGroup<
  "TreasuryPublicGroup",
  HttpApiEndpoint.HttpApiEndpoint<
    "Stats",
    "GET",
    "/v1/treasury/stats",
    never,
    never,
    never,
    never,
    Schema.toCodecJson<
      Schema.Struct<{
        readonly activeTraders: Schema.Int
        readonly settledTrades: Schema.Int
        readonly itemsMoved: Schema.Int
      }>
    >,
    never,
    never,
    never
  >,
  false
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/treasury-sdk/src/Sdk.ts#L381)

Since v1.0.0

# Schemas

## GiftItem

One item offered over the gift channel, in the encoded form the game
exchanges items in - the same string `SendItem` carries.

**Signature**

```ts
declare const GiftItem: Schema.Struct<{
  readonly _tag: Schema.tag<"GiftItem">
  readonly itemType: Schema.Enum<{
    readonly None: "None"
    readonly Play: "Play"
    readonly Gift: "Gift"
    readonly Cloud: "Cloud"
    readonly Raffle: "Raffle"
    readonly Visit: "Visit"
    readonly Leaderboards: "Leaderboards"
  }>
  readonly item: Schema.String
}>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/treasury-sdk/src/Sdk.ts#L121)

Since v1.0.0

## GrantStatus

Whether the treasury can currently act on the caller's towers, and where
to go to make it so. The url is built server-side so the browser stays
configuration-free.

**Signature**

```ts
declare const GrantStatus: Schema.Struct<{
  readonly connected: Schema.Boolean
  readonly scope: Schema.optional<Schema.String>
  readonly connectUrl: Schema.String
}>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/treasury-sdk/src/Sdk.ts#L227)

Since v1.0.0

## Inventory

What a tower could put into a trade, read out of its save. Bitizens are the
encoded strings the gift channel carries; costumes and pets are the strings
the save stores.

**Signature**

```ts
declare const Inventory: Schema.Struct<{
  readonly playerId: Schema.brand<Schema.String, "PlayerId">
  readonly bitizens: Schema.$Array<Schema.String>
  readonly costumes: Schema.$Array<Schema.String>
  readonly pets: Schema.$Array<Schema.String>
  readonly coins: Schema.Int
  readonly bux: Schema.Int
}>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/treasury-sdk/src/Sdk.ts#L241)

Since v1.0.0

## ItemSpec

What one side of a trade puts in: a gift-channel item or a list of splice
items, matching the trade's mechanism.

**Signature**

```ts
declare const ItemSpec: Schema.Union<
  readonly [
    Schema.Struct<{
      readonly _tag: Schema.tag<"GiftItem">
      readonly itemType: Schema.Enum<{
        readonly None: "None"
        readonly Play: "Play"
        readonly Gift: "Gift"
        readonly Cloud: "Cloud"
        readonly Raffle: "Raffle"
        readonly Visit: "Visit"
        readonly Leaderboards: "Leaderboards"
      }>
      readonly item: Schema.String
    }>,
    Schema.Struct<{
      readonly _tag: Schema.tag<"SpliceItems">
      readonly items: Schema.$Array<
        Schema.Struct<{
          readonly kind: Schema.Literals<readonly ["bitizen", "costume", "pet", "coins", "bux"]>
          readonly item: Schema.optional<Schema.String>
          readonly amount: Schema.optional<Schema.Int>
        }>
      >
    }>
  ]
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/treasury-sdk/src/Sdk.ts#L156)

Since v1.0.0

## LedgerEvent

One entry of a trade's append-only history, as shown on its timeline.

**Signature**

```ts
declare const LedgerEvent: Schema.Struct<{ readonly event: Schema.String; readonly at: Schema.DateTimeUtcFromString }>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/treasury-sdk/src/Sdk.ts#L202)

Since v1.0.0

## LegState

One side of a gift trade's journey through the vault: `pending` → `sent`
(deposit dispatched) → `verified` (seen in the vault's gift queue) →
`released` (forwarded to the counterparty) → `settled` (vault slot
claimed); refunds run `refund_sent` → `refunded`, and `lost` is a deposit
that never arrived.

**Signature**

```ts
declare const LegState: Schema.Literals<
  readonly ["pending", "sent", "verified", "released", "settled", "refund_sent", "refunded", "lost"]
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/treasury-sdk/src/Sdk.ts#L97)

Since v1.0.0

## SpliceItem

One item offered by splice. Bitizens, costumes and pets carry the encoded
string a save stores them as; coins and bux carry an amount instead.

**Signature**

```ts
declare const SpliceItem: Schema.Struct<{
  readonly kind: Schema.Literals<readonly ["bitizen", "costume", "pet", "coins", "bux"]>
  readonly item: Schema.optional<Schema.String>
  readonly amount: Schema.optional<Schema.Int>
}>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/treasury-sdk/src/Sdk.ts#L134)

Since v1.0.0

## SpliceItems

**Signature**

```ts
declare const SpliceItems: Schema.Struct<{
  readonly _tag: Schema.tag<"SpliceItems">
  readonly items: Schema.$Array<
    Schema.Struct<{
      readonly kind: Schema.Literals<readonly ["bitizen", "costume", "pet", "coins", "bux"]>
      readonly item: Schema.optional<Schema.String>
      readonly amount: Schema.optional<Schema.Int>
    }>
  >
}>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/treasury-sdk/src/Sdk.ts#L144)

Since v1.0.0

## Trade

A trade as the api describes it. `gives` and `wants` are always from the
proposer's point of view; `role` is which side the caller is on, absent for
an open offer the caller could accept.

**Signature**

```ts
declare const Trade: Schema.Struct<{
  readonly id: Schema.String
  readonly mechanism: Schema.Literals<readonly ["gift", "splice"]>
  readonly game: Schema.Literals<readonly ["tinytower"]>
  readonly state: Schema.Literals<
    readonly [
      "proposed",
      "accepted",
      "awaiting_confirmation",
      "escrowing",
      "escrowed",
      "releasing",
      "executing",
      "settled",
      "cancelled",
      "refunding",
      "refunded",
      "expired",
      "failed"
    ]
  >
  readonly proposerPlayerId: Schema.brand<Schema.String, "PlayerId">
  readonly counterpartyPlayerId: Schema.optional<Schema.brand<Schema.String, "PlayerId">>
  readonly gives: Schema.Union<
    readonly [
      Schema.Struct<{
        readonly _tag: Schema.tag<"GiftItem">
        readonly itemType: Schema.Enum<{
          readonly None: "None"
          readonly Play: "Play"
          readonly Gift: "Gift"
          readonly Cloud: "Cloud"
          readonly Raffle: "Raffle"
          readonly Visit: "Visit"
          readonly Leaderboards: "Leaderboards"
        }>
        readonly item: Schema.String
      }>,
      Schema.Struct<{
        readonly _tag: Schema.tag<"SpliceItems">
        readonly items: Schema.$Array<
          Schema.Struct<{
            readonly kind: Schema.Literals<readonly ["bitizen", "costume", "pet", "coins", "bux"]>
            readonly item: Schema.optional<Schema.String>
            readonly amount: Schema.optional<Schema.Int>
          }>
        >
      }>
    ]
  >
  readonly wants: Schema.Union<
    readonly [
      Schema.Struct<{
        readonly _tag: Schema.tag<"GiftItem">
        readonly itemType: Schema.Enum<{
          readonly None: "None"
          readonly Play: "Play"
          readonly Gift: "Gift"
          readonly Cloud: "Cloud"
          readonly Raffle: "Raffle"
          readonly Visit: "Visit"
          readonly Leaderboards: "Leaderboards"
        }>
        readonly item: Schema.String
      }>,
      Schema.Struct<{
        readonly _tag: Schema.tag<"SpliceItems">
        readonly items: Schema.$Array<
          Schema.Struct<{
            readonly kind: Schema.Literals<readonly ["bitizen", "costume", "pet", "coins", "bux"]>
            readonly item: Schema.optional<Schema.String>
            readonly amount: Schema.optional<Schema.Int>
          }>
        >
      }>
    ]
  >
  readonly role: Schema.optional<Schema.Literals<readonly ["proposer", "counterparty"]>>
  readonly proposerConfirmedAt: Schema.optional<Schema.DateTimeUtcFromString>
  readonly counterpartyConfirmedAt: Schema.optional<Schema.DateTimeUtcFromString>
  readonly createdAt: Schema.DateTimeUtcFromString
  readonly expiresAt: Schema.DateTimeUtcFromString
  readonly failureReason: Schema.optional<Schema.String>
}>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/treasury-sdk/src/Sdk.ts#L166)

Since v1.0.0

## TradeDetail

A trade with its legs and its history, for the participants only.

**Signature**

```ts
declare const TradeDetail: Schema.Struct<{
  readonly trade: Schema.Struct<{
    readonly id: Schema.String
    readonly mechanism: Schema.Literals<readonly ["gift", "splice"]>
    readonly game: Schema.Literals<readonly ["tinytower"]>
    readonly state: Schema.Literals<
      readonly [
        "proposed",
        "accepted",
        "awaiting_confirmation",
        "escrowing",
        "escrowed",
        "releasing",
        "executing",
        "settled",
        "cancelled",
        "refunding",
        "refunded",
        "expired",
        "failed"
      ]
    >
    readonly proposerPlayerId: Schema.brand<Schema.String, "PlayerId">
    readonly counterpartyPlayerId: Schema.optional<Schema.brand<Schema.String, "PlayerId">>
    readonly gives: Schema.Union<
      readonly [
        Schema.Struct<{
          readonly _tag: Schema.tag<"GiftItem">
          readonly itemType: Schema.Enum<{
            readonly None: "None"
            readonly Play: "Play"
            readonly Gift: "Gift"
            readonly Cloud: "Cloud"
            readonly Raffle: "Raffle"
            readonly Visit: "Visit"
            readonly Leaderboards: "Leaderboards"
          }>
          readonly item: Schema.String
        }>,
        Schema.Struct<{
          readonly _tag: Schema.tag<"SpliceItems">
          readonly items: Schema.$Array<
            Schema.Struct<{
              readonly kind: Schema.Literals<readonly ["bitizen", "costume", "pet", "coins", "bux"]>
              readonly item: Schema.optional<Schema.String>
              readonly amount: Schema.optional<Schema.Int>
            }>
          >
        }>
      ]
    >
    readonly wants: Schema.Union<
      readonly [
        Schema.Struct<{
          readonly _tag: Schema.tag<"GiftItem">
          readonly itemType: Schema.Enum<{
            readonly None: "None"
            readonly Play: "Play"
            readonly Gift: "Gift"
            readonly Cloud: "Cloud"
            readonly Raffle: "Raffle"
            readonly Visit: "Visit"
            readonly Leaderboards: "Leaderboards"
          }>
          readonly item: Schema.String
        }>,
        Schema.Struct<{
          readonly _tag: Schema.tag<"SpliceItems">
          readonly items: Schema.$Array<
            Schema.Struct<{
              readonly kind: Schema.Literals<readonly ["bitizen", "costume", "pet", "coins", "bux"]>
              readonly item: Schema.optional<Schema.String>
              readonly amount: Schema.optional<Schema.Int>
            }>
          >
        }>
      ]
    >
    readonly role: Schema.optional<Schema.Literals<readonly ["proposer", "counterparty"]>>
    readonly proposerConfirmedAt: Schema.optional<Schema.DateTimeUtcFromString>
    readonly counterpartyConfirmedAt: Schema.optional<Schema.DateTimeUtcFromString>
    readonly createdAt: Schema.DateTimeUtcFromString
    readonly expiresAt: Schema.DateTimeUtcFromString
    readonly failureReason: Schema.optional<Schema.String>
  }>
  readonly legs: Schema.$Array<
    Schema.Struct<{
      readonly role: Schema.Literals<readonly ["proposer", "counterparty"]>
      readonly fromPlayerId: Schema.brand<Schema.String, "PlayerId">
      readonly toPlayerId: Schema.brand<Schema.String, "PlayerId">
      readonly state: Schema.Literals<
        readonly ["pending", "sent", "verified", "released", "settled", "refund_sent", "refunded", "lost"]
      >
      readonly itemType: Schema.Enum<{
        readonly None: "None"
        readonly Play: "Play"
        readonly Gift: "Gift"
        readonly Cloud: "Cloud"
        readonly Raffle: "Raffle"
        readonly Visit: "Visit"
        readonly Leaderboards: "Leaderboards"
      }>
      readonly item: Schema.String
    }>
  >
  readonly ledger: Schema.$Array<
    Schema.Struct<{ readonly event: Schema.String; readonly at: Schema.DateTimeUtcFromString }>
  >
}>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/treasury-sdk/src/Sdk.ts#L213)

Since v1.0.0

## TradeGame

The games the treasury trades in. TinyTower only, until the tinyburg api
serves more.

**Signature**

```ts
declare const TradeGame: Schema.Literals<readonly ["tinytower"]>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/treasury-sdk/src/Sdk.ts#L60)

Since v1.0.0

## TradeLeg

**Signature**

```ts
declare const TradeLeg: Schema.Struct<{
  readonly role: Schema.Literals<readonly ["proposer", "counterparty"]>
  readonly fromPlayerId: Schema.brand<Schema.String, "PlayerId">
  readonly toPlayerId: Schema.brand<Schema.String, "PlayerId">
  readonly state: Schema.Literals<
    readonly ["pending", "sent", "verified", "released", "settled", "refund_sent", "refunded", "lost"]
  >
  readonly itemType: Schema.Enum<{
    readonly None: "None"
    readonly Play: "Play"
    readonly Gift: "Gift"
    readonly Cloud: "Cloud"
    readonly Raffle: "Raffle"
    readonly Visit: "Visit"
    readonly Leaderboards: "Leaderboards"
  }>
  readonly item: Schema.String
}>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/treasury-sdk/src/Sdk.ts#L187)

Since v1.0.0

## TradeMechanism

How a trade moves its items. `gift` rides Nimblebit's gift channel through
the vault; `splice` rewrites both saves and can carry what the gift channel
cannot (costumes, pets, coins, bux).

**Signature**

```ts
declare const TradeMechanism: Schema.Literals<readonly ["gift", "splice"]>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/treasury-sdk/src/Sdk.ts#L51)

Since v1.0.0

## TradeProposal

**Signature**

```ts
declare const TradeProposal: Schema.Struct<{
  readonly mechanism: Schema.Literals<readonly ["gift", "splice"]>
  readonly game: Schema.Literals<readonly ["tinytower"]>
  readonly proposerPlayerId: Schema.brand<Schema.String, "PlayerId">
  readonly counterpartyPlayerId: Schema.optional<Schema.brand<Schema.String, "PlayerId">>
  readonly gives: Schema.Union<
    readonly [
      Schema.Struct<{
        readonly _tag: Schema.tag<"GiftItem">
        readonly itemType: Schema.Enum<{
          readonly None: "None"
          readonly Play: "Play"
          readonly Gift: "Gift"
          readonly Cloud: "Cloud"
          readonly Raffle: "Raffle"
          readonly Visit: "Visit"
          readonly Leaderboards: "Leaderboards"
        }>
        readonly item: Schema.String
      }>,
      Schema.Struct<{
        readonly _tag: Schema.tag<"SpliceItems">
        readonly items: Schema.$Array<
          Schema.Struct<{
            readonly kind: Schema.Literals<readonly ["bitizen", "costume", "pet", "coins", "bux"]>
            readonly item: Schema.optional<Schema.String>
            readonly amount: Schema.optional<Schema.Int>
          }>
        >
      }>
    ]
  >
  readonly wants: Schema.Union<
    readonly [
      Schema.Struct<{
        readonly _tag: Schema.tag<"GiftItem">
        readonly itemType: Schema.Enum<{
          readonly None: "None"
          readonly Play: "Play"
          readonly Gift: "Gift"
          readonly Cloud: "Cloud"
          readonly Raffle: "Raffle"
          readonly Visit: "Visit"
          readonly Leaderboards: "Leaderboards"
        }>
        readonly item: Schema.String
      }>,
      Schema.Struct<{
        readonly _tag: Schema.tag<"SpliceItems">
        readonly items: Schema.$Array<
          Schema.Struct<{
            readonly kind: Schema.Literals<readonly ["bitizen", "costume", "pet", "coins", "bux"]>
            readonly item: Schema.optional<Schema.String>
            readonly amount: Schema.optional<Schema.Int>
          }>
        >
      }>
    ]
  >
  readonly ttlHours: Schema.Int
}>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/treasury-sdk/src/Sdk.ts#L267)

Since v1.0.0

## TradeRole

**Signature**

```ts
declare const TradeRole: Schema.Literals<readonly ["proposer", "counterparty"]>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/treasury-sdk/src/Sdk.ts#L112)

Since v1.0.0

## TradeState

Where a trade is in its life. The happy path is `proposed` → `accepted` →
(`awaiting_confirmation`, splice only) → `escrowing` → `escrowed` →
`releasing` (gift) or `executing` (splice) → `settled`; everything else is
one of the ways out.

**Signature**

```ts
declare const TradeState: Schema.Literals<
  readonly [
    "proposed",
    "accepted",
    "awaiting_confirmation",
    "escrowing",
    "escrowed",
    "releasing",
    "executing",
    "settled",
    "cancelled",
    "refunding",
    "refunded",
    "expired",
    "failed"
  ]
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/treasury-sdk/src/Sdk.ts#L71)

Since v1.0.0

## TreasuryStats

The treasury's public counters, for the home page's stat tiles. Counts
only, cached server-side, and deliberately free of anything per-user.

**Signature**

```ts
declare const TreasuryStats: Schema.Struct<{
  readonly activeTraders: Schema.Int
  readonly settledTrades: Schema.Int
  readonly itemsMoved: Schema.Int
}>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/treasury-sdk/src/Sdk.ts#L257)

Since v1.0.0
