---
title: Sdk.ts
nav_order: 3
parent: "@tinyburg/trading-sdk"
---

## Sdk.ts overview

The api an application calls to act on a player's games, with the player's
consent.

This is the OAuth side of Tinyburg. The authproxy authenticates requests a
caller makes with a player id and password of their own; this api is for a
caller who holds neither, only an access token a player granted them on the
consent screen. tinyburg.app holds the game credentials for every account a
player has linked, so an application names which linked account it is
acting as (`:playerId`) and tinyburg.app makes the call to Nimblebit on the
player's behalf - if, and only if, the token carries a scope the endpoint
accepts. The scopes are the tree in `Scopes`, and every endpoint here is
annotated with the leaf that guards it.

Every endpoint is bearer authenticated: an application presents the opaque
access token the Tinyburg OAuth server issued it, and tinyburg.app checks it
against the grant behind it on every call. The first-party app is the one
caller without a token: it calls with the player's session cookie, and is
held to the scopes tinyburg.app grants itself.

Saves travel as the text Nimblebit stores, exactly as the TinyTower sdk's
`sync_pullSave` returns them; a client that wants structure decodes with
`TinyTower.SaveData`. The smaller things - snapshot lists, gifts, visits, a
friend's metadata - are plain JSON.

Since v1.0.0

---

## Exports Grouped by Category

- [Api](#api)
  - [Api](#api-1)
- [Groups](#groups)
  - [BitCityAccountsGroup](#bitcityaccountsgroup)
  - [DiscoZooAccountsGroup](#discozooaccountsgroup)
  - [LegoTowerAccountsGroup](#legotoweraccountsgroup)
  - [PocketPlanesAccountsGroup](#pocketplanesaccountsgroup)
  - [PocketTrainsAccountsGroup](#pockettrainsaccountsgroup)
  - [TinyTowerAccountsGroup](#tinytoweraccountsgroup)
  - [TinyTowerClassicAccountsGroup](#tinytowerclassicaccountsgroup)
  - [TinyTowerClassicGroup](#tinytowerclassicgroup)
  - [TinyTowerGroup](#tinytowergroup)
  - [TinyTowerVegasAccountsGroup](#tinytowervegasaccountsgroup)
- [Schemas](#schemas)
  - [FriendSnapshot](#friendsnapshot)
  - [Gift](#gift)
  - [Gifts](#gifts)
  - [ItemToSend](#itemtosend)
  - [LinkedAccount](#linkedaccount)
  - [PlayerDetails](#playerdetails)
  - [RaffleStatus](#rafflestatus)
  - [Save](#save)
  - [SaveUpload](#saveupload)
  - [SaveVersion](#saveversion)
  - [Snapshot](#snapshot)
  - [SnapshotData](#snapshotdata)
  - [TowerMeta](#towermeta)

---

# Api

## Api

NOTE: the Pocket Planes / Pocket Trains / LEGO Tower / Disco Zoo / Bit City /
Tiny Tower Vegas accounts groups are defined and exported above but not yet
added here. Adding them requires the tinyburg.app server to implement their
link handlers, which run through NimblebitAuth's per-game burn bots - wired
once that game-aware `burnbot(game)` refactor lands. `.add(...)` them then.

**Signature**

```ts
declare const Api: HttpApi.HttpApi<
  "TradingSdk",
  | HttpApiGroup.HttpApiGroup<
      "TinyTowerAccountsGroup",
      | HttpApiEndpoint.HttpApiEndpoint<
          "ListAccounts",
          "GET",
          "/v1/tinytower/accounts",
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
          never,
          OAuthScope.RequireAccess,
          never
        >
      | HttpApiEndpoint.HttpApiEndpoint<
          "LinkAccount",
          "POST",
          "/v1/tinytower/accounts",
          never,
          never,
          Schema.toCodecJson<
            Schema.Struct<{
              readonly playerId: Schema.brand<Schema.String, "PlayerId">
              readonly email: Schema.brand<Schema.RedactedFromValue<Schema.String>, "PlayerEmail">
            }>
          >,
          never,
          Schema.toCodecJson<Schema.Void>,
          Schema.toCodecJson<
            typeof HttpApiError.BadRequest | typeof HttpApiError.Conflict | typeof HttpApiError.ServiceUnavailable
          >,
          OAuthScope.RequireAccess,
          never
        >
      | HttpApiEndpoint.HttpApiEndpoint<
          "VerifyAccount",
          "POST",
          "/v1/tinytower/accounts/:playerId/verify",
          Schema.toCodecStringTree<Schema.Struct<{ playerId: Schema.brand<Schema.String, "PlayerId"> }>>,
          never,
          Schema.toCodecJson<Schema.Struct<{ readonly verificationCode: Schema.String }>>,
          never,
          Schema.toCodecJson<Schema.Void>,
          Schema.toCodecJson<
            typeof HttpApiError.BadRequest | typeof HttpApiError.Conflict | typeof HttpApiError.ServiceUnavailable
          >,
          OAuthScope.RequireAccess,
          never
        >
      | HttpApiEndpoint.HttpApiEndpoint<
          "UnlinkAccount",
          "DELETE",
          "/v1/tinytower/accounts/:playerId",
          Schema.toCodecStringTree<Schema.Struct<{ playerId: Schema.brand<Schema.String, "PlayerId"> }>>,
          never,
          never,
          never,
          Schema.toCodecJson<Schema.Void>,
          Schema.toCodecJson<typeof HttpApiError.NotFound>,
          OAuthScope.RequireAccess,
          never
        >,
      false
    >
  | HttpApiGroup.HttpApiGroup<
      "TinyTowerGroup",
      | HttpApiEndpoint.HttpApiEndpoint<
          "PullSave",
          "GET",
          "/v1/tinytower/:playerId/save",
          Schema.toCodecStringTree<Schema.Struct<{ playerId: Schema.brand<Schema.String, "PlayerId"> }>>,
          never,
          never,
          never,
          Schema.toCodecJson<Schema.Struct<{ readonly saveId: Schema.Number; readonly data: Schema.String }>>,
          Schema.toCodecJson<typeof HttpApiError.ServiceUnavailable | typeof HttpApiError.NotFound>,
          OAuthScope.RequireAccess,
          never
        >
      | HttpApiEndpoint.HttpApiEndpoint<
          "PushSave",
          "PUT",
          "/v1/tinytower/:playerId/save",
          Schema.toCodecStringTree<Schema.Struct<{ playerId: Schema.brand<Schema.String, "PlayerId"> }>>,
          never,
          Schema.toCodecJson<Schema.Struct<{ readonly data: Schema.String }>>,
          never,
          Schema.toCodecJson<Schema.Void>,
          Schema.toCodecJson<
            typeof HttpApiError.BadRequest | typeof HttpApiError.ServiceUnavailable | typeof HttpApiError.NotFound
          >,
          OAuthScope.RequireAccess,
          never
        >
      | HttpApiEndpoint.HttpApiEndpoint<
          "CheckVersion",
          "GET",
          "/v1/tinytower/:playerId/save/version",
          Schema.toCodecStringTree<Schema.Struct<{ playerId: Schema.brand<Schema.String, "PlayerId"> }>>,
          never,
          never,
          never,
          Schema.toCodecJson<Schema.Struct<{ readonly saveId: Schema.Number }>>,
          Schema.toCodecJson<typeof HttpApiError.ServiceUnavailable | typeof HttpApiError.NotFound>,
          OAuthScope.RequireAccess,
          never
        >
      | HttpApiEndpoint.HttpApiEndpoint<
          "ListSnapshots",
          "GET",
          "/v1/tinytower/:playerId/snapshots",
          Schema.toCodecStringTree<Schema.Struct<{ playerId: Schema.brand<Schema.String, "PlayerId"> }>>,
          never,
          never,
          never,
          Schema.toCodecJson<
            Schema.$Array<
              Schema.Struct<{
                readonly id: Schema.Int
                readonly timestamp: Schema.String
                readonly meta: Schema.Struct<{
                  readonly stories: Schema.Int
                  readonly maxGold: Schema.Int
                  readonly requestedFloorId: Schema.Int
                  readonly vip: Schema.Boolean
                  readonly doorman: Schema.String
                }>
              }>
            >
          >,
          Schema.toCodecJson<typeof HttpApiError.ServiceUnavailable | typeof HttpApiError.NotFound>,
          OAuthScope.RequireAccess,
          never
        >
      | HttpApiEndpoint.HttpApiEndpoint<
          "PushSnapshot",
          "POST",
          "/v1/tinytower/:playerId/snapshots",
          Schema.toCodecStringTree<Schema.Struct<{ playerId: Schema.brand<Schema.String, "PlayerId"> }>>,
          never,
          Schema.toCodecJson<Schema.Struct<{ readonly data: Schema.String }>>,
          never,
          Schema.toCodecJson<Schema.Void>,
          Schema.toCodecJson<
            typeof HttpApiError.BadRequest | typeof HttpApiError.ServiceUnavailable | typeof HttpApiError.NotFound
          >,
          OAuthScope.RequireAccess,
          never
        >
      | HttpApiEndpoint.HttpApiEndpoint<
          "PullSnapshot",
          "GET",
          "/v1/tinytower/:playerId/snapshots/:snapshotId",
          Schema.toCodecStringTree<
            Schema.Struct<{ playerId: Schema.brand<Schema.String, "PlayerId">; snapshotId: Schema.Int }>
          >,
          never,
          never,
          never,
          Schema.toCodecJson<Schema.Struct<{ readonly snapshotId: Schema.Number; readonly data: Schema.String }>>,
          Schema.toCodecJson<typeof HttpApiError.ServiceUnavailable | typeof HttpApiError.NotFound>,
          OAuthScope.RequireAccess,
          never
        >
      | HttpApiEndpoint.HttpApiEndpoint<
          "CheckRaffle",
          "GET",
          "/v1/tinytower/:playerId/raffle",
          Schema.toCodecStringTree<Schema.Struct<{ playerId: Schema.brand<Schema.String, "PlayerId"> }>>,
          never,
          never,
          never,
          Schema.toCodecJson<Schema.Struct<{ readonly entered: Schema.Boolean }>>,
          Schema.toCodecJson<typeof HttpApiError.ServiceUnavailable | typeof HttpApiError.NotFound>,
          OAuthScope.RequireAccess,
          never
        >
      | HttpApiEndpoint.HttpApiEndpoint<
          "EnterRaffle",
          "POST",
          "/v1/tinytower/:playerId/raffle/enter",
          Schema.toCodecStringTree<Schema.Struct<{ playerId: Schema.brand<Schema.String, "PlayerId"> }>>,
          never,
          never,
          never,
          Schema.toCodecJson<Schema.Void>,
          Schema.toCodecJson<typeof HttpApiError.ServiceUnavailable | typeof HttpApiError.NotFound>,
          OAuthScope.RequireAccess,
          never
        >
      | HttpApiEndpoint.HttpApiEndpoint<
          "EnterMultiRaffle",
          "POST",
          "/v1/tinytower/:playerId/raffle/enter-multi",
          Schema.toCodecStringTree<Schema.Struct<{ playerId: Schema.brand<Schema.String, "PlayerId"> }>>,
          never,
          never,
          never,
          Schema.toCodecJson<Schema.Void>,
          Schema.toCodecJson<typeof HttpApiError.ServiceUnavailable | typeof HttpApiError.NotFound>,
          OAuthScope.RequireAccess,
          never
        >
      | HttpApiEndpoint.HttpApiEndpoint<
          "PlayerDetails",
          "GET",
          "/v1/tinytower/:playerId/details",
          Schema.toCodecStringTree<Schema.Struct<{ playerId: Schema.brand<Schema.String, "PlayerId"> }>>,
          never,
          never,
          never,
          Schema.toCodecJson<
            Schema.Struct<{
              readonly playerId: Schema.brand<Schema.String, "PlayerId">
              readonly playerEmail: Schema.String
              readonly registered: Schema.Boolean
              readonly blacklisted: Schema.Boolean
            }>
          >,
          Schema.toCodecJson<typeof HttpApiError.ServiceUnavailable | typeof HttpApiError.NotFound>,
          OAuthScope.RequireAccess,
          never
        >
      | HttpApiEndpoint.HttpApiEndpoint<
          "ListGifts",
          "GET",
          "/v1/tinytower/:playerId/gifts",
          Schema.toCodecStringTree<Schema.Struct<{ playerId: Schema.brand<Schema.String, "PlayerId"> }>>,
          never,
          never,
          never,
          Schema.toCodecJson<
            Schema.Struct<{
              readonly total: Schema.Int
              readonly gifts: Schema.$Array<
                Schema.Struct<{
                  readonly id: Schema.Number
                  readonly from: Schema.brand<Schema.String, "PlayerId">
                  readonly to: Schema.brand<Schema.String, "PlayerId">
                  readonly type: Schema.Enum<{
                    readonly None: "None"
                    readonly Play: "Play"
                    readonly Gift: "Gift"
                    readonly Cloud: "Cloud"
                    readonly Raffle: "Raffle"
                    readonly Visit: "Visit"
                    readonly Leaderboards: "Leaderboards"
                  }>
                  readonly contents: Schema.String
                }>
              >
            }>
          >,
          Schema.toCodecJson<typeof HttpApiError.ServiceUnavailable | typeof HttpApiError.NotFound>,
          OAuthScope.RequireAccess,
          never
        >
      | HttpApiEndpoint.HttpApiEndpoint<
          "ReceiveGift",
          "POST",
          "/v1/tinytower/:playerId/gifts/:giftId/receive",
          Schema.toCodecStringTree<
            Schema.Struct<{ playerId: Schema.brand<Schema.String, "PlayerId">; giftId: Schema.Int }>
          >,
          never,
          never,
          never,
          Schema.toCodecJson<Schema.Void>,
          Schema.toCodecJson<typeof HttpApiError.ServiceUnavailable | typeof HttpApiError.NotFound>,
          OAuthScope.RequireAccess,
          never
        >
      | HttpApiEndpoint.HttpApiEndpoint<
          "ListVisits",
          "GET",
          "/v1/tinytower/:playerId/visits",
          Schema.toCodecStringTree<Schema.Struct<{ playerId: Schema.brand<Schema.String, "PlayerId"> }>>,
          never,
          never,
          never,
          Schema.toCodecJson<
            Schema.Struct<{
              readonly total: Schema.Int
              readonly gifts: Schema.$Array<
                Schema.Struct<{
                  readonly id: Schema.Number
                  readonly from: Schema.brand<Schema.String, "PlayerId">
                  readonly to: Schema.brand<Schema.String, "PlayerId">
                  readonly type: Schema.Enum<{
                    readonly None: "None"
                    readonly Play: "Play"
                    readonly Gift: "Gift"
                    readonly Cloud: "Cloud"
                    readonly Raffle: "Raffle"
                    readonly Visit: "Visit"
                    readonly Leaderboards: "Leaderboards"
                  }>
                  readonly contents: Schema.String
                }>
              >
            }>
          >,
          Schema.toCodecJson<typeof HttpApiError.ServiceUnavailable | typeof HttpApiError.NotFound>,
          OAuthScope.RequireAccess,
          never
        >
      | HttpApiEndpoint.HttpApiEndpoint<
          "SendItem",
          "POST",
          "/v1/tinytower/:playerId/friends/:friendId/items",
          Schema.toCodecStringTree<
            Schema.Struct<{
              playerId: Schema.brand<Schema.String, "PlayerId">
              friendId: Schema.brand<Schema.String, "PlayerId">
            }>
          >,
          never,
          Schema.toCodecJson<
            Schema.Struct<{
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
          >,
          never,
          Schema.toCodecJson<Schema.Void>,
          Schema.toCodecJson<typeof HttpApiError.ServiceUnavailable | typeof HttpApiError.NotFound>,
          OAuthScope.RequireAccess,
          never
        >
      | HttpApiEndpoint.HttpApiEndpoint<
          "Visit",
          "POST",
          "/v1/tinytower/:playerId/friends/:friendId/visit",
          Schema.toCodecStringTree<
            Schema.Struct<{
              playerId: Schema.brand<Schema.String, "PlayerId">
              friendId: Schema.brand<Schema.String, "PlayerId">
            }>
          >,
          never,
          never,
          never,
          Schema.toCodecJson<Schema.Void>,
          Schema.toCodecJson<typeof HttpApiError.ServiceUnavailable | typeof HttpApiError.NotFound>,
          OAuthScope.RequireAccess,
          never
        >
      | HttpApiEndpoint.HttpApiEndpoint<
          "FriendMeta",
          "GET",
          "/v1/tinytower/:playerId/friends/:friendId/meta",
          Schema.toCodecStringTree<
            Schema.Struct<{
              playerId: Schema.brand<Schema.String, "PlayerId">
              friendId: Schema.brand<Schema.String, "PlayerId">
            }>
          >,
          never,
          never,
          never,
          Schema.toCodecJson<
            Schema.Struct<{
              readonly stories: Schema.Int
              readonly maxGold: Schema.Int
              readonly requestedFloorId: Schema.Int
              readonly vip: Schema.Boolean
              readonly doorman: Schema.String
            }>
          >,
          Schema.toCodecJson<typeof HttpApiError.ServiceUnavailable | typeof HttpApiError.NotFound>,
          OAuthScope.RequireAccess,
          never
        >
      | HttpApiEndpoint.HttpApiEndpoint<
          "FriendSave",
          "GET",
          "/v1/tinytower/:playerId/friends/:friendId/save",
          Schema.toCodecStringTree<
            Schema.Struct<{
              playerId: Schema.brand<Schema.String, "PlayerId">
              friendId: Schema.brand<Schema.String, "PlayerId">
            }>
          >,
          never,
          never,
          never,
          Schema.toCodecJson<Schema.Struct<{ readonly saveId: Schema.Number; readonly data: Schema.String }>>,
          Schema.toCodecJson<typeof HttpApiError.ServiceUnavailable | typeof HttpApiError.NotFound>,
          OAuthScope.RequireAccess,
          never
        >
      | HttpApiEndpoint.HttpApiEndpoint<
          "FriendSnapshots",
          "GET",
          "/v1/tinytower/:playerId/friends/:friendId/snapshots",
          Schema.toCodecStringTree<
            Schema.Struct<{
              playerId: Schema.brand<Schema.String, "PlayerId">
              friendId: Schema.brand<Schema.String, "PlayerId">
            }>
          >,
          never,
          never,
          never,
          Schema.toCodecJson<
            Schema.$Array<
              Schema.Struct<{ readonly snapshotId: Schema.Int; readonly created: Schema.DateTimeUtcFromString }>
            >
          >,
          Schema.toCodecJson<typeof HttpApiError.ServiceUnavailable | typeof HttpApiError.NotFound>,
          OAuthScope.RequireAccess,
          never
        >,
      false
    >
  | HttpApiGroup.HttpApiGroup<
      "TinyTowerClassicAccountsGroup",
      | HttpApiEndpoint.HttpApiEndpoint<
          "ListAccounts",
          "GET",
          "/v1/tinytowerclassic/accounts",
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
          never,
          OAuthScope.RequireAccess,
          never
        >
      | HttpApiEndpoint.HttpApiEndpoint<
          "LinkAccount",
          "POST",
          "/v1/tinytowerclassic/accounts",
          never,
          never,
          Schema.toCodecJson<
            Schema.Struct<{
              readonly playerId: Schema.brand<Schema.String, "PlayerId">
              readonly email: Schema.brand<Schema.RedactedFromValue<Schema.String>, "PlayerEmail">
            }>
          >,
          never,
          Schema.toCodecJson<Schema.Void>,
          Schema.toCodecJson<
            typeof HttpApiError.BadRequest | typeof HttpApiError.Conflict | typeof HttpApiError.ServiceUnavailable
          >,
          OAuthScope.RequireAccess,
          never
        >
      | HttpApiEndpoint.HttpApiEndpoint<
          "VerifyAccount",
          "POST",
          "/v1/tinytowerclassic/accounts/:playerId/verify",
          Schema.toCodecStringTree<Schema.Struct<{ playerId: Schema.brand<Schema.String, "PlayerId"> }>>,
          never,
          Schema.toCodecJson<Schema.Struct<{ readonly verificationCode: Schema.String }>>,
          never,
          Schema.toCodecJson<Schema.Void>,
          Schema.toCodecJson<
            typeof HttpApiError.BadRequest | typeof HttpApiError.Conflict | typeof HttpApiError.ServiceUnavailable
          >,
          OAuthScope.RequireAccess,
          never
        >
      | HttpApiEndpoint.HttpApiEndpoint<
          "UnlinkAccount",
          "DELETE",
          "/v1/tinytowerclassic/accounts/:playerId",
          Schema.toCodecStringTree<Schema.Struct<{ playerId: Schema.brand<Schema.String, "PlayerId"> }>>,
          never,
          never,
          never,
          Schema.toCodecJson<Schema.Void>,
          Schema.toCodecJson<typeof HttpApiError.NotFound>,
          OAuthScope.RequireAccess,
          never
        >,
      false
    >
  | HttpApiGroup.HttpApiGroup<
      "TinyTowerClassicGroup",
      | HttpApiEndpoint.HttpApiEndpoint<
          "PullSave",
          "GET",
          "/v1/tinytowerclassic/:playerId/save",
          Schema.toCodecStringTree<Schema.Struct<{ playerId: Schema.brand<Schema.String, "PlayerId"> }>>,
          never,
          never,
          never,
          Schema.toCodecJson<Schema.Struct<{ readonly saveId: Schema.Number; readonly data: Schema.String }>>,
          Schema.toCodecJson<typeof HttpApiError.ServiceUnavailable | typeof HttpApiError.NotFound>,
          OAuthScope.RequireAccess,
          never
        >
      | HttpApiEndpoint.HttpApiEndpoint<
          "PushSave",
          "PUT",
          "/v1/tinytowerclassic/:playerId/save",
          Schema.toCodecStringTree<Schema.Struct<{ playerId: Schema.brand<Schema.String, "PlayerId"> }>>,
          never,
          Schema.toCodecJson<Schema.Struct<{ readonly data: Schema.String }>>,
          never,
          Schema.toCodecJson<Schema.Void>,
          Schema.toCodecJson<
            typeof HttpApiError.BadRequest | typeof HttpApiError.ServiceUnavailable | typeof HttpApiError.NotFound
          >,
          OAuthScope.RequireAccess,
          never
        >
      | HttpApiEndpoint.HttpApiEndpoint<
          "CheckVersion",
          "GET",
          "/v1/tinytowerclassic/:playerId/save/version",
          Schema.toCodecStringTree<Schema.Struct<{ playerId: Schema.brand<Schema.String, "PlayerId"> }>>,
          never,
          never,
          never,
          Schema.toCodecJson<Schema.Struct<{ readonly saveId: Schema.Number }>>,
          Schema.toCodecJson<typeof HttpApiError.ServiceUnavailable | typeof HttpApiError.NotFound>,
          OAuthScope.RequireAccess,
          never
        >
      | HttpApiEndpoint.HttpApiEndpoint<
          "ListSnapshots",
          "GET",
          "/v1/tinytowerclassic/:playerId/snapshots",
          Schema.toCodecStringTree<Schema.Struct<{ playerId: Schema.brand<Schema.String, "PlayerId"> }>>,
          never,
          never,
          never,
          Schema.toCodecJson<
            Schema.$Array<
              Schema.Struct<{
                readonly id: Schema.Int
                readonly timestamp: Schema.String
                readonly meta: Schema.Struct<{
                  readonly stories: Schema.Int
                  readonly maxGold: Schema.Int
                  readonly requestedFloorId: Schema.Int
                  readonly vip: Schema.Boolean
                  readonly doorman: Schema.String
                }>
              }>
            >
          >,
          Schema.toCodecJson<typeof HttpApiError.ServiceUnavailable | typeof HttpApiError.NotFound>,
          OAuthScope.RequireAccess,
          never
        >
      | HttpApiEndpoint.HttpApiEndpoint<
          "PushSnapshot",
          "POST",
          "/v1/tinytowerclassic/:playerId/snapshots",
          Schema.toCodecStringTree<Schema.Struct<{ playerId: Schema.brand<Schema.String, "PlayerId"> }>>,
          never,
          Schema.toCodecJson<Schema.Struct<{ readonly data: Schema.String }>>,
          never,
          Schema.toCodecJson<Schema.Void>,
          Schema.toCodecJson<
            typeof HttpApiError.BadRequest | typeof HttpApiError.ServiceUnavailable | typeof HttpApiError.NotFound
          >,
          OAuthScope.RequireAccess,
          never
        >
      | HttpApiEndpoint.HttpApiEndpoint<
          "PullSnapshot",
          "GET",
          "/v1/tinytowerclassic/:playerId/snapshots/:snapshotId",
          Schema.toCodecStringTree<
            Schema.Struct<{ playerId: Schema.brand<Schema.String, "PlayerId">; snapshotId: Schema.Int }>
          >,
          never,
          never,
          never,
          Schema.toCodecJson<Schema.Struct<{ readonly snapshotId: Schema.Number; readonly data: Schema.String }>>,
          Schema.toCodecJson<typeof HttpApiError.ServiceUnavailable | typeof HttpApiError.NotFound>,
          OAuthScope.RequireAccess,
          never
        >
      | HttpApiEndpoint.HttpApiEndpoint<
          "CheckRaffle",
          "GET",
          "/v1/tinytowerclassic/:playerId/raffle",
          Schema.toCodecStringTree<Schema.Struct<{ playerId: Schema.brand<Schema.String, "PlayerId"> }>>,
          never,
          never,
          never,
          Schema.toCodecJson<Schema.Struct<{ readonly entered: Schema.Boolean }>>,
          Schema.toCodecJson<typeof HttpApiError.ServiceUnavailable | typeof HttpApiError.NotFound>,
          OAuthScope.RequireAccess,
          never
        >
      | HttpApiEndpoint.HttpApiEndpoint<
          "EnterRaffle",
          "POST",
          "/v1/tinytowerclassic/:playerId/raffle/enter",
          Schema.toCodecStringTree<Schema.Struct<{ playerId: Schema.brand<Schema.String, "PlayerId"> }>>,
          never,
          never,
          never,
          Schema.toCodecJson<Schema.Void>,
          Schema.toCodecJson<typeof HttpApiError.ServiceUnavailable | typeof HttpApiError.NotFound>,
          OAuthScope.RequireAccess,
          never
        >
      | HttpApiEndpoint.HttpApiEndpoint<
          "EnterMultiRaffle",
          "POST",
          "/v1/tinytowerclassic/:playerId/raffle/enter-multi",
          Schema.toCodecStringTree<Schema.Struct<{ playerId: Schema.brand<Schema.String, "PlayerId"> }>>,
          never,
          never,
          never,
          Schema.toCodecJson<Schema.Void>,
          Schema.toCodecJson<typeof HttpApiError.ServiceUnavailable | typeof HttpApiError.NotFound>,
          OAuthScope.RequireAccess,
          never
        >
      | HttpApiEndpoint.HttpApiEndpoint<
          "PlayerDetails",
          "GET",
          "/v1/tinytowerclassic/:playerId/details",
          Schema.toCodecStringTree<Schema.Struct<{ playerId: Schema.brand<Schema.String, "PlayerId"> }>>,
          never,
          never,
          never,
          Schema.toCodecJson<
            Schema.Struct<{
              readonly playerId: Schema.brand<Schema.String, "PlayerId">
              readonly playerEmail: Schema.String
              readonly registered: Schema.Boolean
              readonly blacklisted: Schema.Boolean
            }>
          >,
          Schema.toCodecJson<typeof HttpApiError.ServiceUnavailable | typeof HttpApiError.NotFound>,
          OAuthScope.RequireAccess,
          never
        >
      | HttpApiEndpoint.HttpApiEndpoint<
          "ListGifts",
          "GET",
          "/v1/tinytowerclassic/:playerId/gifts",
          Schema.toCodecStringTree<Schema.Struct<{ playerId: Schema.brand<Schema.String, "PlayerId"> }>>,
          never,
          never,
          never,
          Schema.toCodecJson<
            Schema.Struct<{
              readonly total: Schema.Int
              readonly gifts: Schema.$Array<
                Schema.Struct<{
                  readonly id: Schema.Number
                  readonly from: Schema.brand<Schema.String, "PlayerId">
                  readonly to: Schema.brand<Schema.String, "PlayerId">
                  readonly type: Schema.Enum<{
                    readonly None: "None"
                    readonly Play: "Play"
                    readonly Gift: "Gift"
                    readonly Cloud: "Cloud"
                    readonly Raffle: "Raffle"
                    readonly Visit: "Visit"
                    readonly Leaderboards: "Leaderboards"
                  }>
                  readonly contents: Schema.String
                }>
              >
            }>
          >,
          Schema.toCodecJson<typeof HttpApiError.ServiceUnavailable | typeof HttpApiError.NotFound>,
          OAuthScope.RequireAccess,
          never
        >
      | HttpApiEndpoint.HttpApiEndpoint<
          "ReceiveGift",
          "POST",
          "/v1/tinytowerclassic/:playerId/gifts/:giftId/receive",
          Schema.toCodecStringTree<
            Schema.Struct<{ playerId: Schema.brand<Schema.String, "PlayerId">; giftId: Schema.Int }>
          >,
          never,
          never,
          never,
          Schema.toCodecJson<Schema.Void>,
          Schema.toCodecJson<typeof HttpApiError.ServiceUnavailable | typeof HttpApiError.NotFound>,
          OAuthScope.RequireAccess,
          never
        >
      | HttpApiEndpoint.HttpApiEndpoint<
          "ListVisits",
          "GET",
          "/v1/tinytowerclassic/:playerId/visits",
          Schema.toCodecStringTree<Schema.Struct<{ playerId: Schema.brand<Schema.String, "PlayerId"> }>>,
          never,
          never,
          never,
          Schema.toCodecJson<
            Schema.Struct<{
              readonly total: Schema.Int
              readonly gifts: Schema.$Array<
                Schema.Struct<{
                  readonly id: Schema.Number
                  readonly from: Schema.brand<Schema.String, "PlayerId">
                  readonly to: Schema.brand<Schema.String, "PlayerId">
                  readonly type: Schema.Enum<{
                    readonly None: "None"
                    readonly Play: "Play"
                    readonly Gift: "Gift"
                    readonly Cloud: "Cloud"
                    readonly Raffle: "Raffle"
                    readonly Visit: "Visit"
                    readonly Leaderboards: "Leaderboards"
                  }>
                  readonly contents: Schema.String
                }>
              >
            }>
          >,
          Schema.toCodecJson<typeof HttpApiError.ServiceUnavailable | typeof HttpApiError.NotFound>,
          OAuthScope.RequireAccess,
          never
        >
      | HttpApiEndpoint.HttpApiEndpoint<
          "SendItem",
          "POST",
          "/v1/tinytowerclassic/:playerId/friends/:friendId/items",
          Schema.toCodecStringTree<
            Schema.Struct<{
              playerId: Schema.brand<Schema.String, "PlayerId">
              friendId: Schema.brand<Schema.String, "PlayerId">
            }>
          >,
          never,
          Schema.toCodecJson<
            Schema.Struct<{
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
          >,
          never,
          Schema.toCodecJson<Schema.Void>,
          Schema.toCodecJson<typeof HttpApiError.ServiceUnavailable | typeof HttpApiError.NotFound>,
          OAuthScope.RequireAccess,
          never
        >
      | HttpApiEndpoint.HttpApiEndpoint<
          "Visit",
          "POST",
          "/v1/tinytowerclassic/:playerId/friends/:friendId/visit",
          Schema.toCodecStringTree<
            Schema.Struct<{
              playerId: Schema.brand<Schema.String, "PlayerId">
              friendId: Schema.brand<Schema.String, "PlayerId">
            }>
          >,
          never,
          never,
          never,
          Schema.toCodecJson<Schema.Void>,
          Schema.toCodecJson<typeof HttpApiError.ServiceUnavailable | typeof HttpApiError.NotFound>,
          OAuthScope.RequireAccess,
          never
        >
      | HttpApiEndpoint.HttpApiEndpoint<
          "FriendMeta",
          "GET",
          "/v1/tinytowerclassic/:playerId/friends/:friendId/meta",
          Schema.toCodecStringTree<
            Schema.Struct<{
              playerId: Schema.brand<Schema.String, "PlayerId">
              friendId: Schema.brand<Schema.String, "PlayerId">
            }>
          >,
          never,
          never,
          never,
          Schema.toCodecJson<
            Schema.Struct<{
              readonly stories: Schema.Int
              readonly maxGold: Schema.Int
              readonly requestedFloorId: Schema.Int
              readonly vip: Schema.Boolean
              readonly doorman: Schema.String
            }>
          >,
          Schema.toCodecJson<typeof HttpApiError.ServiceUnavailable | typeof HttpApiError.NotFound>,
          OAuthScope.RequireAccess,
          never
        >
      | HttpApiEndpoint.HttpApiEndpoint<
          "FriendSave",
          "GET",
          "/v1/tinytowerclassic/:playerId/friends/:friendId/save",
          Schema.toCodecStringTree<
            Schema.Struct<{
              playerId: Schema.brand<Schema.String, "PlayerId">
              friendId: Schema.brand<Schema.String, "PlayerId">
            }>
          >,
          never,
          never,
          never,
          Schema.toCodecJson<Schema.Struct<{ readonly saveId: Schema.Number; readonly data: Schema.String }>>,
          Schema.toCodecJson<typeof HttpApiError.ServiceUnavailable | typeof HttpApiError.NotFound>,
          OAuthScope.RequireAccess,
          never
        >
      | HttpApiEndpoint.HttpApiEndpoint<
          "FriendSnapshots",
          "GET",
          "/v1/tinytowerclassic/:playerId/friends/:friendId/snapshots",
          Schema.toCodecStringTree<
            Schema.Struct<{
              playerId: Schema.brand<Schema.String, "PlayerId">
              friendId: Schema.brand<Schema.String, "PlayerId">
            }>
          >,
          never,
          never,
          never,
          Schema.toCodecJson<
            Schema.$Array<
              Schema.Struct<{ readonly snapshotId: Schema.Int; readonly created: Schema.DateTimeUtcFromString }>
            >
          >,
          Schema.toCodecJson<typeof HttpApiError.ServiceUnavailable | typeof HttpApiError.NotFound>,
          OAuthScope.RequireAccess,
          never
        >,
      false
    >
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/trading-sdk/src/Sdk.ts#L509)

Since v1.0.0

# Groups

## BitCityAccountsGroup

The BitCity accounts a player has linked, and linking more. (The act-on-behalf
tower api is not exposed for this game yet.)

**Signature**

```ts
declare const BitCityAccountsGroup: HttpApiGroup.HttpApiGroup<
  "BitCityAccountsGroup",
  | HttpApiEndpoint.HttpApiEndpoint<
      "ListAccounts",
      "GET",
      "/v1/bitcity/accounts",
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
      never,
      OAuthScope.RequireAccess,
      never
    >
  | HttpApiEndpoint.HttpApiEndpoint<
      "LinkAccount",
      "POST",
      "/v1/bitcity/accounts",
      never,
      never,
      Schema.toCodecJson<
        Schema.Struct<{
          readonly playerId: Schema.brand<Schema.String, "PlayerId">
          readonly email: Schema.brand<Schema.RedactedFromValue<Schema.String>, "PlayerEmail">
        }>
      >,
      never,
      Schema.toCodecJson<Schema.Void>,
      Schema.toCodecJson<
        typeof HttpApiError.BadRequest | typeof HttpApiError.Conflict | typeof HttpApiError.ServiceUnavailable
      >,
      OAuthScope.RequireAccess,
      never
    >
  | HttpApiEndpoint.HttpApiEndpoint<
      "VerifyAccount",
      "POST",
      "/v1/bitcity/accounts/:playerId/verify",
      Schema.toCodecStringTree<Schema.Struct<{ playerId: Schema.brand<Schema.String, "PlayerId"> }>>,
      never,
      Schema.toCodecJson<Schema.Struct<{ readonly verificationCode: Schema.String }>>,
      never,
      Schema.toCodecJson<Schema.Void>,
      Schema.toCodecJson<
        typeof HttpApiError.BadRequest | typeof HttpApiError.Conflict | typeof HttpApiError.ServiceUnavailable
      >,
      OAuthScope.RequireAccess,
      never
    >
  | HttpApiEndpoint.HttpApiEndpoint<
      "UnlinkAccount",
      "DELETE",
      "/v1/bitcity/accounts/:playerId",
      Schema.toCodecStringTree<Schema.Struct<{ playerId: Schema.brand<Schema.String, "PlayerId"> }>>,
      never,
      never,
      never,
      Schema.toCodecJson<Schema.Void>,
      Schema.toCodecJson<typeof HttpApiError.NotFound>,
      OAuthScope.RequireAccess,
      never
    >,
  false
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/trading-sdk/src/Sdk.ts#L488)

Since v1.0.0

## DiscoZooAccountsGroup

The DiscoZoo accounts a player has linked, and linking more. (The act-on-behalf
tower api is not exposed for this game yet.)

**Signature**

```ts
declare const DiscoZooAccountsGroup: HttpApiGroup.HttpApiGroup<
  "DiscoZooAccountsGroup",
  | HttpApiEndpoint.HttpApiEndpoint<
      "ListAccounts",
      "GET",
      "/v1/discozoo/accounts",
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
      never,
      OAuthScope.RequireAccess,
      never
    >
  | HttpApiEndpoint.HttpApiEndpoint<
      "LinkAccount",
      "POST",
      "/v1/discozoo/accounts",
      never,
      never,
      Schema.toCodecJson<
        Schema.Struct<{
          readonly playerId: Schema.brand<Schema.String, "PlayerId">
          readonly email: Schema.brand<Schema.RedactedFromValue<Schema.String>, "PlayerEmail">
        }>
      >,
      never,
      Schema.toCodecJson<Schema.Void>,
      Schema.toCodecJson<
        typeof HttpApiError.BadRequest | typeof HttpApiError.Conflict | typeof HttpApiError.ServiceUnavailable
      >,
      OAuthScope.RequireAccess,
      never
    >
  | HttpApiEndpoint.HttpApiEndpoint<
      "VerifyAccount",
      "POST",
      "/v1/discozoo/accounts/:playerId/verify",
      Schema.toCodecStringTree<Schema.Struct<{ playerId: Schema.brand<Schema.String, "PlayerId"> }>>,
      never,
      Schema.toCodecJson<Schema.Struct<{ readonly verificationCode: Schema.String }>>,
      never,
      Schema.toCodecJson<Schema.Void>,
      Schema.toCodecJson<
        typeof HttpApiError.BadRequest | typeof HttpApiError.Conflict | typeof HttpApiError.ServiceUnavailable
      >,
      OAuthScope.RequireAccess,
      never
    >
  | HttpApiEndpoint.HttpApiEndpoint<
      "UnlinkAccount",
      "DELETE",
      "/v1/discozoo/accounts/:playerId",
      Schema.toCodecStringTree<Schema.Struct<{ playerId: Schema.brand<Schema.String, "PlayerId"> }>>,
      never,
      never,
      never,
      Schema.toCodecJson<Schema.Void>,
      Schema.toCodecJson<typeof HttpApiError.NotFound>,
      OAuthScope.RequireAccess,
      never
    >,
  false
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/trading-sdk/src/Sdk.ts#L479)

Since v1.0.0

## LegoTowerAccountsGroup

The LegoTower accounts a player has linked, and linking more. (The act-on-behalf
tower api is not exposed for this game yet.)

**Signature**

```ts
declare const LegoTowerAccountsGroup: HttpApiGroup.HttpApiGroup<
  "LegoTowerAccountsGroup",
  | HttpApiEndpoint.HttpApiEndpoint<
      "ListAccounts",
      "GET",
      "/v1/legotower/accounts",
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
      never,
      OAuthScope.RequireAccess,
      never
    >
  | HttpApiEndpoint.HttpApiEndpoint<
      "LinkAccount",
      "POST",
      "/v1/legotower/accounts",
      never,
      never,
      Schema.toCodecJson<
        Schema.Struct<{
          readonly playerId: Schema.brand<Schema.String, "PlayerId">
          readonly email: Schema.brand<Schema.RedactedFromValue<Schema.String>, "PlayerEmail">
        }>
      >,
      never,
      Schema.toCodecJson<Schema.Void>,
      Schema.toCodecJson<
        typeof HttpApiError.BadRequest | typeof HttpApiError.Conflict | typeof HttpApiError.ServiceUnavailable
      >,
      OAuthScope.RequireAccess,
      never
    >
  | HttpApiEndpoint.HttpApiEndpoint<
      "VerifyAccount",
      "POST",
      "/v1/legotower/accounts/:playerId/verify",
      Schema.toCodecStringTree<Schema.Struct<{ playerId: Schema.brand<Schema.String, "PlayerId"> }>>,
      never,
      Schema.toCodecJson<Schema.Struct<{ readonly verificationCode: Schema.String }>>,
      never,
      Schema.toCodecJson<Schema.Void>,
      Schema.toCodecJson<
        typeof HttpApiError.BadRequest | typeof HttpApiError.Conflict | typeof HttpApiError.ServiceUnavailable
      >,
      OAuthScope.RequireAccess,
      never
    >
  | HttpApiEndpoint.HttpApiEndpoint<
      "UnlinkAccount",
      "DELETE",
      "/v1/legotower/accounts/:playerId",
      Schema.toCodecStringTree<Schema.Struct<{ playerId: Schema.brand<Schema.String, "PlayerId"> }>>,
      never,
      never,
      never,
      Schema.toCodecJson<Schema.Void>,
      Schema.toCodecJson<typeof HttpApiError.NotFound>,
      OAuthScope.RequireAccess,
      never
    >,
  false
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/trading-sdk/src/Sdk.ts#L470)

Since v1.0.0

## PocketPlanesAccountsGroup

The PocketPlanes accounts a player has linked, and linking more. (The act-on-behalf
tower api is not exposed for this game yet.)

**Signature**

```ts
declare const PocketPlanesAccountsGroup: HttpApiGroup.HttpApiGroup<
  "PocketPlanesAccountsGroup",
  | HttpApiEndpoint.HttpApiEndpoint<
      "ListAccounts",
      "GET",
      "/v1/pocketplanes/accounts",
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
      never,
      OAuthScope.RequireAccess,
      never
    >
  | HttpApiEndpoint.HttpApiEndpoint<
      "LinkAccount",
      "POST",
      "/v1/pocketplanes/accounts",
      never,
      never,
      Schema.toCodecJson<
        Schema.Struct<{
          readonly playerId: Schema.brand<Schema.String, "PlayerId">
          readonly email: Schema.brand<Schema.RedactedFromValue<Schema.String>, "PlayerEmail">
        }>
      >,
      never,
      Schema.toCodecJson<Schema.Void>,
      Schema.toCodecJson<
        typeof HttpApiError.BadRequest | typeof HttpApiError.Conflict | typeof HttpApiError.ServiceUnavailable
      >,
      OAuthScope.RequireAccess,
      never
    >
  | HttpApiEndpoint.HttpApiEndpoint<
      "VerifyAccount",
      "POST",
      "/v1/pocketplanes/accounts/:playerId/verify",
      Schema.toCodecStringTree<Schema.Struct<{ playerId: Schema.brand<Schema.String, "PlayerId"> }>>,
      never,
      Schema.toCodecJson<Schema.Struct<{ readonly verificationCode: Schema.String }>>,
      never,
      Schema.toCodecJson<Schema.Void>,
      Schema.toCodecJson<
        typeof HttpApiError.BadRequest | typeof HttpApiError.Conflict | typeof HttpApiError.ServiceUnavailable
      >,
      OAuthScope.RequireAccess,
      never
    >
  | HttpApiEndpoint.HttpApiEndpoint<
      "UnlinkAccount",
      "DELETE",
      "/v1/pocketplanes/accounts/:playerId",
      Schema.toCodecStringTree<Schema.Struct<{ playerId: Schema.brand<Schema.String, "PlayerId"> }>>,
      never,
      never,
      never,
      Schema.toCodecJson<Schema.Void>,
      Schema.toCodecJson<typeof HttpApiError.NotFound>,
      OAuthScope.RequireAccess,
      never
    >,
  false
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/trading-sdk/src/Sdk.ts#L452)

Since v1.0.0

## PocketTrainsAccountsGroup

The PocketTrains accounts a player has linked, and linking more. (The act-on-behalf
tower api is not exposed for this game yet.)

**Signature**

```ts
declare const PocketTrainsAccountsGroup: HttpApiGroup.HttpApiGroup<
  "PocketTrainsAccountsGroup",
  | HttpApiEndpoint.HttpApiEndpoint<
      "ListAccounts",
      "GET",
      "/v1/pockettrains/accounts",
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
      never,
      OAuthScope.RequireAccess,
      never
    >
  | HttpApiEndpoint.HttpApiEndpoint<
      "LinkAccount",
      "POST",
      "/v1/pockettrains/accounts",
      never,
      never,
      Schema.toCodecJson<
        Schema.Struct<{
          readonly playerId: Schema.brand<Schema.String, "PlayerId">
          readonly email: Schema.brand<Schema.RedactedFromValue<Schema.String>, "PlayerEmail">
        }>
      >,
      never,
      Schema.toCodecJson<Schema.Void>,
      Schema.toCodecJson<
        typeof HttpApiError.BadRequest | typeof HttpApiError.Conflict | typeof HttpApiError.ServiceUnavailable
      >,
      OAuthScope.RequireAccess,
      never
    >
  | HttpApiEndpoint.HttpApiEndpoint<
      "VerifyAccount",
      "POST",
      "/v1/pockettrains/accounts/:playerId/verify",
      Schema.toCodecStringTree<Schema.Struct<{ playerId: Schema.brand<Schema.String, "PlayerId"> }>>,
      never,
      Schema.toCodecJson<Schema.Struct<{ readonly verificationCode: Schema.String }>>,
      never,
      Schema.toCodecJson<Schema.Void>,
      Schema.toCodecJson<
        typeof HttpApiError.BadRequest | typeof HttpApiError.Conflict | typeof HttpApiError.ServiceUnavailable
      >,
      OAuthScope.RequireAccess,
      never
    >
  | HttpApiEndpoint.HttpApiEndpoint<
      "UnlinkAccount",
      "DELETE",
      "/v1/pockettrains/accounts/:playerId",
      Schema.toCodecStringTree<Schema.Struct<{ playerId: Schema.brand<Schema.String, "PlayerId"> }>>,
      never,
      never,
      never,
      Schema.toCodecJson<Schema.Void>,
      Schema.toCodecJson<typeof HttpApiError.NotFound>,
      OAuthScope.RequireAccess,
      never
    >,
  false
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/trading-sdk/src/Sdk.ts#L461)

Since v1.0.0

## TinyTowerAccountsGroup

The TinyTower accounts a player has linked, and linking more.

**Signature**

```ts
declare const TinyTowerAccountsGroup: HttpApiGroup.HttpApiGroup<
  "TinyTowerAccountsGroup",
  | HttpApiEndpoint.HttpApiEndpoint<
      "ListAccounts",
      "GET",
      "/v1/tinytower/accounts",
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
      never,
      OAuthScope.RequireAccess,
      never
    >
  | HttpApiEndpoint.HttpApiEndpoint<
      "LinkAccount",
      "POST",
      "/v1/tinytower/accounts",
      never,
      never,
      Schema.toCodecJson<
        Schema.Struct<{
          readonly playerId: Schema.brand<Schema.String, "PlayerId">
          readonly email: Schema.brand<Schema.RedactedFromValue<Schema.String>, "PlayerEmail">
        }>
      >,
      never,
      Schema.toCodecJson<Schema.Void>,
      Schema.toCodecJson<
        typeof HttpApiError.BadRequest | typeof HttpApiError.Conflict | typeof HttpApiError.ServiceUnavailable
      >,
      OAuthScope.RequireAccess,
      never
    >
  | HttpApiEndpoint.HttpApiEndpoint<
      "VerifyAccount",
      "POST",
      "/v1/tinytower/accounts/:playerId/verify",
      Schema.toCodecStringTree<Schema.Struct<{ playerId: Schema.brand<Schema.String, "PlayerId"> }>>,
      never,
      Schema.toCodecJson<Schema.Struct<{ readonly verificationCode: Schema.String }>>,
      never,
      Schema.toCodecJson<Schema.Void>,
      Schema.toCodecJson<
        typeof HttpApiError.BadRequest | typeof HttpApiError.Conflict | typeof HttpApiError.ServiceUnavailable
      >,
      OAuthScope.RequireAccess,
      never
    >
  | HttpApiEndpoint.HttpApiEndpoint<
      "UnlinkAccount",
      "DELETE",
      "/v1/tinytower/accounts/:playerId",
      Schema.toCodecStringTree<Schema.Struct<{ playerId: Schema.brand<Schema.String, "PlayerId"> }>>,
      never,
      never,
      never,
      Schema.toCodecJson<Schema.Void>,
      Schema.toCodecJson<typeof HttpApiError.NotFound>,
      OAuthScope.RequireAccess,
      never
    >,
  false
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/trading-sdk/src/Sdk.ts#L417)

Since v1.0.0

## TinyTowerClassicAccountsGroup

The TinyTower Classic accounts a player has linked, and linking more.

**Signature**

```ts
declare const TinyTowerClassicAccountsGroup: HttpApiGroup.HttpApiGroup<
  "TinyTowerClassicAccountsGroup",
  | HttpApiEndpoint.HttpApiEndpoint<
      "ListAccounts",
      "GET",
      "/v1/tinytowerclassic/accounts",
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
      never,
      OAuthScope.RequireAccess,
      never
    >
  | HttpApiEndpoint.HttpApiEndpoint<
      "LinkAccount",
      "POST",
      "/v1/tinytowerclassic/accounts",
      never,
      never,
      Schema.toCodecJson<
        Schema.Struct<{
          readonly playerId: Schema.brand<Schema.String, "PlayerId">
          readonly email: Schema.brand<Schema.RedactedFromValue<Schema.String>, "PlayerEmail">
        }>
      >,
      never,
      Schema.toCodecJson<Schema.Void>,
      Schema.toCodecJson<
        typeof HttpApiError.BadRequest | typeof HttpApiError.Conflict | typeof HttpApiError.ServiceUnavailable
      >,
      OAuthScope.RequireAccess,
      never
    >
  | HttpApiEndpoint.HttpApiEndpoint<
      "VerifyAccount",
      "POST",
      "/v1/tinytowerclassic/accounts/:playerId/verify",
      Schema.toCodecStringTree<Schema.Struct<{ playerId: Schema.brand<Schema.String, "PlayerId"> }>>,
      never,
      Schema.toCodecJson<Schema.Struct<{ readonly verificationCode: Schema.String }>>,
      never,
      Schema.toCodecJson<Schema.Void>,
      Schema.toCodecJson<
        typeof HttpApiError.BadRequest | typeof HttpApiError.Conflict | typeof HttpApiError.ServiceUnavailable
      >,
      OAuthScope.RequireAccess,
      never
    >
  | HttpApiEndpoint.HttpApiEndpoint<
      "UnlinkAccount",
      "DELETE",
      "/v1/tinytowerclassic/accounts/:playerId",
      Schema.toCodecStringTree<Schema.Struct<{ playerId: Schema.brand<Schema.String, "PlayerId"> }>>,
      never,
      never,
      never,
      Schema.toCodecJson<Schema.Void>,
      Schema.toCodecJson<typeof HttpApiError.NotFound>,
      OAuthScope.RequireAccess,
      never
    >,
  false
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/trading-sdk/src/Sdk.ts#L434)

Since v1.0.0

## TinyTowerClassicGroup

Everything a linked TinyTower Classic account can do in the game, acting
as that account.

**Signature**

```ts
declare const TinyTowerClassicGroup: HttpApiGroup.HttpApiGroup<
  "TinyTowerClassicGroup",
  | HttpApiEndpoint.HttpApiEndpoint<
      "PullSave",
      "GET",
      "/v1/tinytowerclassic/:playerId/save",
      Schema.toCodecStringTree<Schema.Struct<{ playerId: Schema.brand<Schema.String, "PlayerId"> }>>,
      never,
      never,
      never,
      Schema.toCodecJson<Schema.Struct<{ readonly saveId: Schema.Number; readonly data: Schema.String }>>,
      Schema.toCodecJson<typeof HttpApiError.ServiceUnavailable | typeof HttpApiError.NotFound>,
      OAuthScope.RequireAccess,
      never
    >
  | HttpApiEndpoint.HttpApiEndpoint<
      "PushSave",
      "PUT",
      "/v1/tinytowerclassic/:playerId/save",
      Schema.toCodecStringTree<Schema.Struct<{ playerId: Schema.brand<Schema.String, "PlayerId"> }>>,
      never,
      Schema.toCodecJson<Schema.Struct<{ readonly data: Schema.String }>>,
      never,
      Schema.toCodecJson<Schema.Void>,
      Schema.toCodecJson<
        typeof HttpApiError.BadRequest | typeof HttpApiError.ServiceUnavailable | typeof HttpApiError.NotFound
      >,
      OAuthScope.RequireAccess,
      never
    >
  | HttpApiEndpoint.HttpApiEndpoint<
      "CheckVersion",
      "GET",
      "/v1/tinytowerclassic/:playerId/save/version",
      Schema.toCodecStringTree<Schema.Struct<{ playerId: Schema.brand<Schema.String, "PlayerId"> }>>,
      never,
      never,
      never,
      Schema.toCodecJson<Schema.Struct<{ readonly saveId: Schema.Number }>>,
      Schema.toCodecJson<typeof HttpApiError.ServiceUnavailable | typeof HttpApiError.NotFound>,
      OAuthScope.RequireAccess,
      never
    >
  | HttpApiEndpoint.HttpApiEndpoint<
      "ListSnapshots",
      "GET",
      "/v1/tinytowerclassic/:playerId/snapshots",
      Schema.toCodecStringTree<Schema.Struct<{ playerId: Schema.brand<Schema.String, "PlayerId"> }>>,
      never,
      never,
      never,
      Schema.toCodecJson<
        Schema.$Array<
          Schema.Struct<{
            readonly id: Schema.Int
            readonly timestamp: Schema.String
            readonly meta: Schema.Struct<{
              readonly stories: Schema.Int
              readonly maxGold: Schema.Int
              readonly requestedFloorId: Schema.Int
              readonly vip: Schema.Boolean
              readonly doorman: Schema.String
            }>
          }>
        >
      >,
      Schema.toCodecJson<typeof HttpApiError.ServiceUnavailable | typeof HttpApiError.NotFound>,
      OAuthScope.RequireAccess,
      never
    >
  | HttpApiEndpoint.HttpApiEndpoint<
      "PushSnapshot",
      "POST",
      "/v1/tinytowerclassic/:playerId/snapshots",
      Schema.toCodecStringTree<Schema.Struct<{ playerId: Schema.brand<Schema.String, "PlayerId"> }>>,
      never,
      Schema.toCodecJson<Schema.Struct<{ readonly data: Schema.String }>>,
      never,
      Schema.toCodecJson<Schema.Void>,
      Schema.toCodecJson<
        typeof HttpApiError.BadRequest | typeof HttpApiError.ServiceUnavailable | typeof HttpApiError.NotFound
      >,
      OAuthScope.RequireAccess,
      never
    >
  | HttpApiEndpoint.HttpApiEndpoint<
      "PullSnapshot",
      "GET",
      "/v1/tinytowerclassic/:playerId/snapshots/:snapshotId",
      Schema.toCodecStringTree<
        Schema.Struct<{ playerId: Schema.brand<Schema.String, "PlayerId">; snapshotId: Schema.Int }>
      >,
      never,
      never,
      never,
      Schema.toCodecJson<Schema.Struct<{ readonly snapshotId: Schema.Number; readonly data: Schema.String }>>,
      Schema.toCodecJson<typeof HttpApiError.ServiceUnavailable | typeof HttpApiError.NotFound>,
      OAuthScope.RequireAccess,
      never
    >
  | HttpApiEndpoint.HttpApiEndpoint<
      "CheckRaffle",
      "GET",
      "/v1/tinytowerclassic/:playerId/raffle",
      Schema.toCodecStringTree<Schema.Struct<{ playerId: Schema.brand<Schema.String, "PlayerId"> }>>,
      never,
      never,
      never,
      Schema.toCodecJson<Schema.Struct<{ readonly entered: Schema.Boolean }>>,
      Schema.toCodecJson<typeof HttpApiError.ServiceUnavailable | typeof HttpApiError.NotFound>,
      OAuthScope.RequireAccess,
      never
    >
  | HttpApiEndpoint.HttpApiEndpoint<
      "EnterRaffle",
      "POST",
      "/v1/tinytowerclassic/:playerId/raffle/enter",
      Schema.toCodecStringTree<Schema.Struct<{ playerId: Schema.brand<Schema.String, "PlayerId"> }>>,
      never,
      never,
      never,
      Schema.toCodecJson<Schema.Void>,
      Schema.toCodecJson<typeof HttpApiError.ServiceUnavailable | typeof HttpApiError.NotFound>,
      OAuthScope.RequireAccess,
      never
    >
  | HttpApiEndpoint.HttpApiEndpoint<
      "EnterMultiRaffle",
      "POST",
      "/v1/tinytowerclassic/:playerId/raffle/enter-multi",
      Schema.toCodecStringTree<Schema.Struct<{ playerId: Schema.brand<Schema.String, "PlayerId"> }>>,
      never,
      never,
      never,
      Schema.toCodecJson<Schema.Void>,
      Schema.toCodecJson<typeof HttpApiError.ServiceUnavailable | typeof HttpApiError.NotFound>,
      OAuthScope.RequireAccess,
      never
    >
  | HttpApiEndpoint.HttpApiEndpoint<
      "PlayerDetails",
      "GET",
      "/v1/tinytowerclassic/:playerId/details",
      Schema.toCodecStringTree<Schema.Struct<{ playerId: Schema.brand<Schema.String, "PlayerId"> }>>,
      never,
      never,
      never,
      Schema.toCodecJson<
        Schema.Struct<{
          readonly playerId: Schema.brand<Schema.String, "PlayerId">
          readonly playerEmail: Schema.String
          readonly registered: Schema.Boolean
          readonly blacklisted: Schema.Boolean
        }>
      >,
      Schema.toCodecJson<typeof HttpApiError.ServiceUnavailable | typeof HttpApiError.NotFound>,
      OAuthScope.RequireAccess,
      never
    >
  | HttpApiEndpoint.HttpApiEndpoint<
      "ListGifts",
      "GET",
      "/v1/tinytowerclassic/:playerId/gifts",
      Schema.toCodecStringTree<Schema.Struct<{ playerId: Schema.brand<Schema.String, "PlayerId"> }>>,
      never,
      never,
      never,
      Schema.toCodecJson<
        Schema.Struct<{
          readonly total: Schema.Int
          readonly gifts: Schema.$Array<
            Schema.Struct<{
              readonly id: Schema.Number
              readonly from: Schema.brand<Schema.String, "PlayerId">
              readonly to: Schema.brand<Schema.String, "PlayerId">
              readonly type: Schema.Enum<{
                readonly None: "None"
                readonly Play: "Play"
                readonly Gift: "Gift"
                readonly Cloud: "Cloud"
                readonly Raffle: "Raffle"
                readonly Visit: "Visit"
                readonly Leaderboards: "Leaderboards"
              }>
              readonly contents: Schema.String
            }>
          >
        }>
      >,
      Schema.toCodecJson<typeof HttpApiError.ServiceUnavailable | typeof HttpApiError.NotFound>,
      OAuthScope.RequireAccess,
      never
    >
  | HttpApiEndpoint.HttpApiEndpoint<
      "ReceiveGift",
      "POST",
      "/v1/tinytowerclassic/:playerId/gifts/:giftId/receive",
      Schema.toCodecStringTree<
        Schema.Struct<{ playerId: Schema.brand<Schema.String, "PlayerId">; giftId: Schema.Int }>
      >,
      never,
      never,
      never,
      Schema.toCodecJson<Schema.Void>,
      Schema.toCodecJson<typeof HttpApiError.ServiceUnavailable | typeof HttpApiError.NotFound>,
      OAuthScope.RequireAccess,
      never
    >
  | HttpApiEndpoint.HttpApiEndpoint<
      "ListVisits",
      "GET",
      "/v1/tinytowerclassic/:playerId/visits",
      Schema.toCodecStringTree<Schema.Struct<{ playerId: Schema.brand<Schema.String, "PlayerId"> }>>,
      never,
      never,
      never,
      Schema.toCodecJson<
        Schema.Struct<{
          readonly total: Schema.Int
          readonly gifts: Schema.$Array<
            Schema.Struct<{
              readonly id: Schema.Number
              readonly from: Schema.brand<Schema.String, "PlayerId">
              readonly to: Schema.brand<Schema.String, "PlayerId">
              readonly type: Schema.Enum<{
                readonly None: "None"
                readonly Play: "Play"
                readonly Gift: "Gift"
                readonly Cloud: "Cloud"
                readonly Raffle: "Raffle"
                readonly Visit: "Visit"
                readonly Leaderboards: "Leaderboards"
              }>
              readonly contents: Schema.String
            }>
          >
        }>
      >,
      Schema.toCodecJson<typeof HttpApiError.ServiceUnavailable | typeof HttpApiError.NotFound>,
      OAuthScope.RequireAccess,
      never
    >
  | HttpApiEndpoint.HttpApiEndpoint<
      "SendItem",
      "POST",
      "/v1/tinytowerclassic/:playerId/friends/:friendId/items",
      Schema.toCodecStringTree<
        Schema.Struct<{
          playerId: Schema.brand<Schema.String, "PlayerId">
          friendId: Schema.brand<Schema.String, "PlayerId">
        }>
      >,
      never,
      Schema.toCodecJson<
        Schema.Struct<{
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
      >,
      never,
      Schema.toCodecJson<Schema.Void>,
      Schema.toCodecJson<typeof HttpApiError.ServiceUnavailable | typeof HttpApiError.NotFound>,
      OAuthScope.RequireAccess,
      never
    >
  | HttpApiEndpoint.HttpApiEndpoint<
      "Visit",
      "POST",
      "/v1/tinytowerclassic/:playerId/friends/:friendId/visit",
      Schema.toCodecStringTree<
        Schema.Struct<{
          playerId: Schema.brand<Schema.String, "PlayerId">
          friendId: Schema.brand<Schema.String, "PlayerId">
        }>
      >,
      never,
      never,
      never,
      Schema.toCodecJson<Schema.Void>,
      Schema.toCodecJson<typeof HttpApiError.ServiceUnavailable | typeof HttpApiError.NotFound>,
      OAuthScope.RequireAccess,
      never
    >
  | HttpApiEndpoint.HttpApiEndpoint<
      "FriendMeta",
      "GET",
      "/v1/tinytowerclassic/:playerId/friends/:friendId/meta",
      Schema.toCodecStringTree<
        Schema.Struct<{
          playerId: Schema.brand<Schema.String, "PlayerId">
          friendId: Schema.brand<Schema.String, "PlayerId">
        }>
      >,
      never,
      never,
      never,
      Schema.toCodecJson<
        Schema.Struct<{
          readonly stories: Schema.Int
          readonly maxGold: Schema.Int
          readonly requestedFloorId: Schema.Int
          readonly vip: Schema.Boolean
          readonly doorman: Schema.String
        }>
      >,
      Schema.toCodecJson<typeof HttpApiError.ServiceUnavailable | typeof HttpApiError.NotFound>,
      OAuthScope.RequireAccess,
      never
    >
  | HttpApiEndpoint.HttpApiEndpoint<
      "FriendSave",
      "GET",
      "/v1/tinytowerclassic/:playerId/friends/:friendId/save",
      Schema.toCodecStringTree<
        Schema.Struct<{
          playerId: Schema.brand<Schema.String, "PlayerId">
          friendId: Schema.brand<Schema.String, "PlayerId">
        }>
      >,
      never,
      never,
      never,
      Schema.toCodecJson<Schema.Struct<{ readonly saveId: Schema.Number; readonly data: Schema.String }>>,
      Schema.toCodecJson<typeof HttpApiError.ServiceUnavailable | typeof HttpApiError.NotFound>,
      OAuthScope.RequireAccess,
      never
    >
  | HttpApiEndpoint.HttpApiEndpoint<
      "FriendSnapshots",
      "GET",
      "/v1/tinytowerclassic/:playerId/friends/:friendId/snapshots",
      Schema.toCodecStringTree<
        Schema.Struct<{
          playerId: Schema.brand<Schema.String, "PlayerId">
          friendId: Schema.brand<Schema.String, "PlayerId">
        }>
      >,
      never,
      never,
      never,
      Schema.toCodecJson<
        Schema.$Array<
          Schema.Struct<{ readonly snapshotId: Schema.Int; readonly created: Schema.DateTimeUtcFromString }>
        >
      >,
      Schema.toCodecJson<typeof HttpApiError.ServiceUnavailable | typeof HttpApiError.NotFound>,
      OAuthScope.RequireAccess,
      never
    >,
  false
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/trading-sdk/src/Sdk.ts#L443)

Since v1.0.0

## TinyTowerGroup

Everything a linked TinyTower account can do in the game, acting as that
account.

**Signature**

```ts
declare const TinyTowerGroup: HttpApiGroup.HttpApiGroup<
  "TinyTowerGroup",
  | HttpApiEndpoint.HttpApiEndpoint<
      "PullSave",
      "GET",
      "/v1/tinytower/:playerId/save",
      Schema.toCodecStringTree<Schema.Struct<{ playerId: Schema.brand<Schema.String, "PlayerId"> }>>,
      never,
      never,
      never,
      Schema.toCodecJson<Schema.Struct<{ readonly saveId: Schema.Number; readonly data: Schema.String }>>,
      Schema.toCodecJson<typeof HttpApiError.ServiceUnavailable | typeof HttpApiError.NotFound>,
      OAuthScope.RequireAccess,
      never
    >
  | HttpApiEndpoint.HttpApiEndpoint<
      "PushSave",
      "PUT",
      "/v1/tinytower/:playerId/save",
      Schema.toCodecStringTree<Schema.Struct<{ playerId: Schema.brand<Schema.String, "PlayerId"> }>>,
      never,
      Schema.toCodecJson<Schema.Struct<{ readonly data: Schema.String }>>,
      never,
      Schema.toCodecJson<Schema.Void>,
      Schema.toCodecJson<
        typeof HttpApiError.BadRequest | typeof HttpApiError.ServiceUnavailable | typeof HttpApiError.NotFound
      >,
      OAuthScope.RequireAccess,
      never
    >
  | HttpApiEndpoint.HttpApiEndpoint<
      "CheckVersion",
      "GET",
      "/v1/tinytower/:playerId/save/version",
      Schema.toCodecStringTree<Schema.Struct<{ playerId: Schema.brand<Schema.String, "PlayerId"> }>>,
      never,
      never,
      never,
      Schema.toCodecJson<Schema.Struct<{ readonly saveId: Schema.Number }>>,
      Schema.toCodecJson<typeof HttpApiError.ServiceUnavailable | typeof HttpApiError.NotFound>,
      OAuthScope.RequireAccess,
      never
    >
  | HttpApiEndpoint.HttpApiEndpoint<
      "ListSnapshots",
      "GET",
      "/v1/tinytower/:playerId/snapshots",
      Schema.toCodecStringTree<Schema.Struct<{ playerId: Schema.brand<Schema.String, "PlayerId"> }>>,
      never,
      never,
      never,
      Schema.toCodecJson<
        Schema.$Array<
          Schema.Struct<{
            readonly id: Schema.Int
            readonly timestamp: Schema.String
            readonly meta: Schema.Struct<{
              readonly stories: Schema.Int
              readonly maxGold: Schema.Int
              readonly requestedFloorId: Schema.Int
              readonly vip: Schema.Boolean
              readonly doorman: Schema.String
            }>
          }>
        >
      >,
      Schema.toCodecJson<typeof HttpApiError.ServiceUnavailable | typeof HttpApiError.NotFound>,
      OAuthScope.RequireAccess,
      never
    >
  | HttpApiEndpoint.HttpApiEndpoint<
      "PushSnapshot",
      "POST",
      "/v1/tinytower/:playerId/snapshots",
      Schema.toCodecStringTree<Schema.Struct<{ playerId: Schema.brand<Schema.String, "PlayerId"> }>>,
      never,
      Schema.toCodecJson<Schema.Struct<{ readonly data: Schema.String }>>,
      never,
      Schema.toCodecJson<Schema.Void>,
      Schema.toCodecJson<
        typeof HttpApiError.BadRequest | typeof HttpApiError.ServiceUnavailable | typeof HttpApiError.NotFound
      >,
      OAuthScope.RequireAccess,
      never
    >
  | HttpApiEndpoint.HttpApiEndpoint<
      "PullSnapshot",
      "GET",
      "/v1/tinytower/:playerId/snapshots/:snapshotId",
      Schema.toCodecStringTree<
        Schema.Struct<{ playerId: Schema.brand<Schema.String, "PlayerId">; snapshotId: Schema.Int }>
      >,
      never,
      never,
      never,
      Schema.toCodecJson<Schema.Struct<{ readonly snapshotId: Schema.Number; readonly data: Schema.String }>>,
      Schema.toCodecJson<typeof HttpApiError.ServiceUnavailable | typeof HttpApiError.NotFound>,
      OAuthScope.RequireAccess,
      never
    >
  | HttpApiEndpoint.HttpApiEndpoint<
      "CheckRaffle",
      "GET",
      "/v1/tinytower/:playerId/raffle",
      Schema.toCodecStringTree<Schema.Struct<{ playerId: Schema.brand<Schema.String, "PlayerId"> }>>,
      never,
      never,
      never,
      Schema.toCodecJson<Schema.Struct<{ readonly entered: Schema.Boolean }>>,
      Schema.toCodecJson<typeof HttpApiError.ServiceUnavailable | typeof HttpApiError.NotFound>,
      OAuthScope.RequireAccess,
      never
    >
  | HttpApiEndpoint.HttpApiEndpoint<
      "EnterRaffle",
      "POST",
      "/v1/tinytower/:playerId/raffle/enter",
      Schema.toCodecStringTree<Schema.Struct<{ playerId: Schema.brand<Schema.String, "PlayerId"> }>>,
      never,
      never,
      never,
      Schema.toCodecJson<Schema.Void>,
      Schema.toCodecJson<typeof HttpApiError.ServiceUnavailable | typeof HttpApiError.NotFound>,
      OAuthScope.RequireAccess,
      never
    >
  | HttpApiEndpoint.HttpApiEndpoint<
      "EnterMultiRaffle",
      "POST",
      "/v1/tinytower/:playerId/raffle/enter-multi",
      Schema.toCodecStringTree<Schema.Struct<{ playerId: Schema.brand<Schema.String, "PlayerId"> }>>,
      never,
      never,
      never,
      Schema.toCodecJson<Schema.Void>,
      Schema.toCodecJson<typeof HttpApiError.ServiceUnavailable | typeof HttpApiError.NotFound>,
      OAuthScope.RequireAccess,
      never
    >
  | HttpApiEndpoint.HttpApiEndpoint<
      "PlayerDetails",
      "GET",
      "/v1/tinytower/:playerId/details",
      Schema.toCodecStringTree<Schema.Struct<{ playerId: Schema.brand<Schema.String, "PlayerId"> }>>,
      never,
      never,
      never,
      Schema.toCodecJson<
        Schema.Struct<{
          readonly playerId: Schema.brand<Schema.String, "PlayerId">
          readonly playerEmail: Schema.String
          readonly registered: Schema.Boolean
          readonly blacklisted: Schema.Boolean
        }>
      >,
      Schema.toCodecJson<typeof HttpApiError.ServiceUnavailable | typeof HttpApiError.NotFound>,
      OAuthScope.RequireAccess,
      never
    >
  | HttpApiEndpoint.HttpApiEndpoint<
      "ListGifts",
      "GET",
      "/v1/tinytower/:playerId/gifts",
      Schema.toCodecStringTree<Schema.Struct<{ playerId: Schema.brand<Schema.String, "PlayerId"> }>>,
      never,
      never,
      never,
      Schema.toCodecJson<
        Schema.Struct<{
          readonly total: Schema.Int
          readonly gifts: Schema.$Array<
            Schema.Struct<{
              readonly id: Schema.Number
              readonly from: Schema.brand<Schema.String, "PlayerId">
              readonly to: Schema.brand<Schema.String, "PlayerId">
              readonly type: Schema.Enum<{
                readonly None: "None"
                readonly Play: "Play"
                readonly Gift: "Gift"
                readonly Cloud: "Cloud"
                readonly Raffle: "Raffle"
                readonly Visit: "Visit"
                readonly Leaderboards: "Leaderboards"
              }>
              readonly contents: Schema.String
            }>
          >
        }>
      >,
      Schema.toCodecJson<typeof HttpApiError.ServiceUnavailable | typeof HttpApiError.NotFound>,
      OAuthScope.RequireAccess,
      never
    >
  | HttpApiEndpoint.HttpApiEndpoint<
      "ReceiveGift",
      "POST",
      "/v1/tinytower/:playerId/gifts/:giftId/receive",
      Schema.toCodecStringTree<
        Schema.Struct<{ playerId: Schema.brand<Schema.String, "PlayerId">; giftId: Schema.Int }>
      >,
      never,
      never,
      never,
      Schema.toCodecJson<Schema.Void>,
      Schema.toCodecJson<typeof HttpApiError.ServiceUnavailable | typeof HttpApiError.NotFound>,
      OAuthScope.RequireAccess,
      never
    >
  | HttpApiEndpoint.HttpApiEndpoint<
      "ListVisits",
      "GET",
      "/v1/tinytower/:playerId/visits",
      Schema.toCodecStringTree<Schema.Struct<{ playerId: Schema.brand<Schema.String, "PlayerId"> }>>,
      never,
      never,
      never,
      Schema.toCodecJson<
        Schema.Struct<{
          readonly total: Schema.Int
          readonly gifts: Schema.$Array<
            Schema.Struct<{
              readonly id: Schema.Number
              readonly from: Schema.brand<Schema.String, "PlayerId">
              readonly to: Schema.brand<Schema.String, "PlayerId">
              readonly type: Schema.Enum<{
                readonly None: "None"
                readonly Play: "Play"
                readonly Gift: "Gift"
                readonly Cloud: "Cloud"
                readonly Raffle: "Raffle"
                readonly Visit: "Visit"
                readonly Leaderboards: "Leaderboards"
              }>
              readonly contents: Schema.String
            }>
          >
        }>
      >,
      Schema.toCodecJson<typeof HttpApiError.ServiceUnavailable | typeof HttpApiError.NotFound>,
      OAuthScope.RequireAccess,
      never
    >
  | HttpApiEndpoint.HttpApiEndpoint<
      "SendItem",
      "POST",
      "/v1/tinytower/:playerId/friends/:friendId/items",
      Schema.toCodecStringTree<
        Schema.Struct<{
          playerId: Schema.brand<Schema.String, "PlayerId">
          friendId: Schema.brand<Schema.String, "PlayerId">
        }>
      >,
      never,
      Schema.toCodecJson<
        Schema.Struct<{
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
      >,
      never,
      Schema.toCodecJson<Schema.Void>,
      Schema.toCodecJson<typeof HttpApiError.ServiceUnavailable | typeof HttpApiError.NotFound>,
      OAuthScope.RequireAccess,
      never
    >
  | HttpApiEndpoint.HttpApiEndpoint<
      "Visit",
      "POST",
      "/v1/tinytower/:playerId/friends/:friendId/visit",
      Schema.toCodecStringTree<
        Schema.Struct<{
          playerId: Schema.brand<Schema.String, "PlayerId">
          friendId: Schema.brand<Schema.String, "PlayerId">
        }>
      >,
      never,
      never,
      never,
      Schema.toCodecJson<Schema.Void>,
      Schema.toCodecJson<typeof HttpApiError.ServiceUnavailable | typeof HttpApiError.NotFound>,
      OAuthScope.RequireAccess,
      never
    >
  | HttpApiEndpoint.HttpApiEndpoint<
      "FriendMeta",
      "GET",
      "/v1/tinytower/:playerId/friends/:friendId/meta",
      Schema.toCodecStringTree<
        Schema.Struct<{
          playerId: Schema.brand<Schema.String, "PlayerId">
          friendId: Schema.brand<Schema.String, "PlayerId">
        }>
      >,
      never,
      never,
      never,
      Schema.toCodecJson<
        Schema.Struct<{
          readonly stories: Schema.Int
          readonly maxGold: Schema.Int
          readonly requestedFloorId: Schema.Int
          readonly vip: Schema.Boolean
          readonly doorman: Schema.String
        }>
      >,
      Schema.toCodecJson<typeof HttpApiError.ServiceUnavailable | typeof HttpApiError.NotFound>,
      OAuthScope.RequireAccess,
      never
    >
  | HttpApiEndpoint.HttpApiEndpoint<
      "FriendSave",
      "GET",
      "/v1/tinytower/:playerId/friends/:friendId/save",
      Schema.toCodecStringTree<
        Schema.Struct<{
          playerId: Schema.brand<Schema.String, "PlayerId">
          friendId: Schema.brand<Schema.String, "PlayerId">
        }>
      >,
      never,
      never,
      never,
      Schema.toCodecJson<Schema.Struct<{ readonly saveId: Schema.Number; readonly data: Schema.String }>>,
      Schema.toCodecJson<typeof HttpApiError.ServiceUnavailable | typeof HttpApiError.NotFound>,
      OAuthScope.RequireAccess,
      never
    >
  | HttpApiEndpoint.HttpApiEndpoint<
      "FriendSnapshots",
      "GET",
      "/v1/tinytower/:playerId/friends/:friendId/snapshots",
      Schema.toCodecStringTree<
        Schema.Struct<{
          playerId: Schema.brand<Schema.String, "PlayerId">
          friendId: Schema.brand<Schema.String, "PlayerId">
        }>
      >,
      never,
      never,
      never,
      Schema.toCodecJson<
        Schema.$Array<
          Schema.Struct<{ readonly snapshotId: Schema.Int; readonly created: Schema.DateTimeUtcFromString }>
        >
      >,
      Schema.toCodecJson<typeof HttpApiError.ServiceUnavailable | typeof HttpApiError.NotFound>,
      OAuthScope.RequireAccess,
      never
    >,
  false
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/trading-sdk/src/Sdk.ts#L426)

Since v1.0.0

## TinyTowerVegasAccountsGroup

The TinyTowerVegas accounts a player has linked, and linking more. (The act-on-behalf
tower api is not exposed for this game yet.)

**Signature**

```ts
declare const TinyTowerVegasAccountsGroup: HttpApiGroup.HttpApiGroup<
  "TinyTowerVegasAccountsGroup",
  | HttpApiEndpoint.HttpApiEndpoint<
      "ListAccounts",
      "GET",
      "/v1/tinytowervegas/accounts",
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
      never,
      OAuthScope.RequireAccess,
      never
    >
  | HttpApiEndpoint.HttpApiEndpoint<
      "LinkAccount",
      "POST",
      "/v1/tinytowervegas/accounts",
      never,
      never,
      Schema.toCodecJson<
        Schema.Struct<{
          readonly playerId: Schema.brand<Schema.String, "PlayerId">
          readonly email: Schema.brand<Schema.RedactedFromValue<Schema.String>, "PlayerEmail">
        }>
      >,
      never,
      Schema.toCodecJson<Schema.Void>,
      Schema.toCodecJson<
        typeof HttpApiError.BadRequest | typeof HttpApiError.Conflict | typeof HttpApiError.ServiceUnavailable
      >,
      OAuthScope.RequireAccess,
      never
    >
  | HttpApiEndpoint.HttpApiEndpoint<
      "VerifyAccount",
      "POST",
      "/v1/tinytowervegas/accounts/:playerId/verify",
      Schema.toCodecStringTree<Schema.Struct<{ playerId: Schema.brand<Schema.String, "PlayerId"> }>>,
      never,
      Schema.toCodecJson<Schema.Struct<{ readonly verificationCode: Schema.String }>>,
      never,
      Schema.toCodecJson<Schema.Void>,
      Schema.toCodecJson<
        typeof HttpApiError.BadRequest | typeof HttpApiError.Conflict | typeof HttpApiError.ServiceUnavailable
      >,
      OAuthScope.RequireAccess,
      never
    >
  | HttpApiEndpoint.HttpApiEndpoint<
      "UnlinkAccount",
      "DELETE",
      "/v1/tinytowervegas/accounts/:playerId",
      Schema.toCodecStringTree<Schema.Struct<{ playerId: Schema.brand<Schema.String, "PlayerId"> }>>,
      never,
      never,
      never,
      Schema.toCodecJson<Schema.Void>,
      Schema.toCodecJson<typeof HttpApiError.NotFound>,
      OAuthScope.RequireAccess,
      never
    >,
  false
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/trading-sdk/src/Sdk.ts#L497)

Since v1.0.0

# Schemas

## FriendSnapshot

One of a friend's cloud snapshots, which Nimblebit describes more briefly
than a tower's own.

**Signature**

```ts
declare const FriendSnapshot: Schema.Struct<{
  readonly snapshotId: Schema.Int
  readonly created: Schema.DateTimeUtcFromString
}>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/trading-sdk/src/Sdk.ts#L128)

Since v1.0.0

## Gift

A gift or a visit waiting for a tower.

**Signature**

```ts
declare const Gift: Schema.Struct<{
  readonly id: Schema.Number
  readonly from: Schema.brand<Schema.String, "PlayerId">
  readonly to: Schema.brand<Schema.String, "PlayerId">
  readonly type: Schema.Enum<{
    readonly None: "None"
    readonly Play: "Play"
    readonly Gift: "Gift"
    readonly Cloud: "Cloud"
    readonly Raffle: "Raffle"
    readonly Visit: "Visit"
    readonly Leaderboards: "Leaderboards"
  }>
  readonly contents: Schema.String
}>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/trading-sdk/src/Sdk.ts#L158)

Since v1.0.0

## Gifts

**Signature**

```ts
declare const Gifts: Schema.Struct<{
  readonly total: Schema.Int
  readonly gifts: Schema.$Array<
    Schema.Struct<{
      readonly id: Schema.Number
      readonly from: Schema.brand<Schema.String, "PlayerId">
      readonly to: Schema.brand<Schema.String, "PlayerId">
      readonly type: Schema.Enum<{
        readonly None: "None"
        readonly Play: "Play"
        readonly Gift: "Gift"
        readonly Cloud: "Cloud"
        readonly Raffle: "Raffle"
        readonly Visit: "Visit"
        readonly Leaderboards: "Leaderboards"
      }>
      readonly contents: Schema.String
    }>
  >
}>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/trading-sdk/src/Sdk.ts#L170)

Since v1.0.0

## ItemToSend

Something to send to another player: a bitizen, a visit, a gift, in the
encoded form the game exchanges them in.

**Signature**

```ts
declare const ItemToSend: Schema.Struct<{
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

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/trading-sdk/src/Sdk.ts#L182)

Since v1.0.0

## LinkedAccount

A TinyTower account a player has proven they own.

**Signature**

```ts
declare const LinkedAccount: Schema.Struct<{
  readonly playerId: Schema.brand<Schema.String, "PlayerId">
  readonly createdAt: Schema.DateTimeUtcFromString
}>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/trading-sdk/src/Sdk.ts#L49)

Since v1.0.0

## PlayerDetails

**Signature**

```ts
declare const PlayerDetails: Schema.Struct<{
  readonly playerId: Schema.brand<Schema.String, "PlayerId">
  readonly playerEmail: Schema.String
  readonly registered: Schema.Boolean
  readonly blacklisted: Schema.Boolean
}>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/trading-sdk/src/Sdk.ts#L145)

Since v1.0.0

## RaffleStatus

**Signature**

```ts
declare const RaffleStatus: Schema.Struct<{ readonly entered: Schema.Boolean }>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/trading-sdk/src/Sdk.ts#L137)

Since v1.0.0

## Save

A save as Nimblebit stores it: the text, and the version it was stored as.

**Signature**

```ts
declare const Save: Schema.Struct<{ readonly saveId: Schema.Number; readonly data: Schema.String }>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/trading-sdk/src/Sdk.ts#L60)

Since v1.0.0

## SaveUpload

A save to upload. The text is decoded with `TinyTower.SaveData` on the way
in, so a save that does not parse is refused with `400` rather than sent on.

**Signature**

```ts
declare const SaveUpload: Schema.Struct<{ readonly data: Schema.String }>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/trading-sdk/src/Sdk.ts#L72)

Since v1.0.0

## SaveVersion

**Signature**

```ts
declare const SaveVersion: Schema.Struct<{ readonly saveId: Schema.Number }>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/trading-sdk/src/Sdk.ts#L80)

Since v1.0.0

## Snapshot

One of a tower's own cloud snapshots. The timestamp is Nimblebit's, a
64-bit tick count, carried as a string so nothing rounds it.

**Signature**

```ts
declare const Snapshot: Schema.Struct<{
  readonly id: Schema.Int
  readonly timestamp: Schema.String
  readonly meta: Schema.Struct<{
    readonly stories: Schema.Int
    readonly maxGold: Schema.Int
    readonly requestedFloorId: Schema.Int
    readonly vip: Schema.Boolean
    readonly doorman: Schema.String
  }>
}>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/trading-sdk/src/Sdk.ts#L106)

Since v1.0.0

## SnapshotData

**Signature**

```ts
declare const SnapshotData: Schema.Struct<{ readonly snapshotId: Schema.Number; readonly data: Schema.String }>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/trading-sdk/src/Sdk.ts#L116)

Since v1.0.0

## TowerMeta

What Nimblebit says about a tower without handing over its save: the shape
of it, and the doorman in the encoded form the game exchanges bitizens in.

**Signature**

```ts
declare const TowerMeta: Schema.Struct<{
  readonly stories: Schema.Int
  readonly maxGold: Schema.Int
  readonly requestedFloorId: Schema.Int
  readonly vip: Schema.Boolean
  readonly doorman: Schema.String
}>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/trading-sdk/src/Sdk.ts#L91)

Since v1.0.0
