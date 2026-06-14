---
title: TinyTower.ts
nav_order: 2
parent: "@tinyburg/tinytower-sdk"
---

## TinyTower.ts overview

Tiny Tower SDK for interacting with Nimblebit's cloud services.

Since v1.0.0

---

## Exports Grouped by Category

- [SDK](#sdk)
  - [device_newPlayer](#device_newplayer)
  - [device_playerDetails](#device_playerdetails)
  - [device_registerEmail](#device_registeremail)
  - [device_verifyDevice](#device_verifydevice)
  - [raffle_checkEnteredCurrent](#raffle_checkenteredcurrent)
  - [raffle_enterMultiRaffle](#raffle_entermultiraffle)
  - [raffle_enterRaffle](#raffle_enterraffle)
  - [social_getGifts](#social_getgifts)
  - [social_getVisits](#social_getvisits)
  - [social_pullFriendMeta](#social_pullfriendmeta)
  - [social_pullFriendTower](#social_pullfriendtower)
  - [social_receiveGift](#social_receivegift)
  - [social_retrieveFriendsSnapshotList](#social_retrievefriendssnapshotlist)
  - [social_sendItem](#social_senditem)
  - [social_visit](#social_visit)
  - [sync_checkForNewerSave](#sync_checkfornewersave)
  - [sync_pullSave](#sync_pullsave)
  - [sync_pullSnapshot](#sync_pullsnapshot)
  - [sync_pushSave](#sync_pushsave)
  - [sync_pushSnapshot](#sync_pushsnapshot)
  - [sync_retrieveSnapshotList](#sync_retrievesnapshotlist)
- [Schemas](#schemas)
  - [SaveData](#savedata)

---

# SDK

## device_newPlayer

Requests a new player from the Nimblebit servers.

**Signature**

```ts
declare const device_newPlayer: Effect.Effect<
  {
    readonly playerId: string & Brand<"PlayerId">
    readonly playerSs: Redacted.Redacted<string> & Brand<"PlayerAuthKey">
  },
  | Schema.SchemaError
  | NimblebitError
  | Forbidden
  | BadRequest
  | Unauthorized
  | InternalServerError
  | PlatformError
  | HttpClientError,
  NimblebitAuth.NimblebitAuth | HttpClient.HttpClient
>
```

[Source](https://github.com/leonitousconforti/tinyburg/packages/tinytower-sdk/blob/main/src/TinyTower.ts#L186)

Since v1.0.0

## device_playerDetails

Retrieves player details from the Nimblebit servers.

**Signature**

```ts
declare const device_playerDetails: (args_0: {
  readonly playerAuthKey: Redacted.Redacted<string> & Brand<"PlayerAuthKey">
  readonly playerId: string & Brand<"PlayerId">
}) => Effect.Effect<
  {
    readonly playerEmail: Redacted.Redacted<string> & Brand<"PlayerEmail">
    readonly playerId: string & Brand<"PlayerId">
    readonly registered: boolean
    readonly blacklisted: boolean
  },
  | Schema.SchemaError
  | NimblebitError
  | Forbidden
  | BadRequest
  | Unauthorized
  | InternalServerError
  | PlatformError
  | HttpClientError,
  NimblebitAuth.NimblebitAuth | HttpClient.HttpClient
>
```

[Source](https://github.com/leonitousconforti/tinyburg/packages/tinytower-sdk/blob/main/src/TinyTower.ts#L224)

Since v1.0.0

## device_registerEmail

Registers an email address to a players Nimblebit cloud sync account.

**Signature**

```ts
declare const device_registerEmail: (args_0: {
  readonly playerEmail: Redacted.Redacted<string> & Brand<"PlayerEmail">
  readonly playerId?: (string & Brand<"PlayerId">) | undefined
}) => Effect.Effect<
  "NewDevice" | "NewEmail",
  | Schema.SchemaError
  | NimblebitError
  | Forbidden
  | BadRequest
  | Unauthorized
  | InternalServerError
  | PlatformError
  | HttpClientError,
  NimblebitAuth.NimblebitAuth | HttpClient.HttpClient
>
```

[Source](https://github.com/leonitousconforti/tinyburg/packages/tinytower-sdk/blob/main/src/TinyTower.ts#L304)

Since v1.0.0

## device_verifyDevice

Verifies a cloud sync device after registration with the Nimblebit servers.

**Signature**

```ts
declare const device_verifyDevice: (args_0: {
  verificationCode: string
}) => Effect.Effect<
  {
    readonly success: "NewDevice"
    readonly playerId: string & Brand<"PlayerId">
    readonly playerAuthKey: Redacted.Redacted<string> & Brand<"PlayerAuthKey">
    readonly playerEmail: Redacted.Redacted<string> & Brand<"PlayerEmail">
    readonly playerPhoto?: string | null | undefined
    readonly playerNickname?: string | null | undefined
  },
  Schema.SchemaError | NimblebitError | Forbidden | BadRequest | Unauthorized | InternalServerError | HttpClientError,
  NimblebitAuth.NimblebitAuth | HttpClient.HttpClient
>
```

[Source](https://github.com/leonitousconforti/tinyburg/packages/tinytower-sdk/blob/main/src/TinyTower.ts#L264)

Since v1.0.0

## raffle_checkEnteredCurrent

Checks if the player has entered the current hourly raffle.

**Signature**

```ts
declare const raffle_checkEnteredCurrent: (args_0: {
  readonly playerAuthKey: Redacted.Redacted<string> & Brand<"PlayerAuthKey">
  readonly playerId: string & Brand<"PlayerId">
}) => Effect.Effect<
  boolean,
  | Schema.SchemaError
  | NimblebitError
  | Forbidden
  | BadRequest
  | Unauthorized
  | InternalServerError
  | PlatformError
  | HttpClientError,
  NimblebitAuth.NimblebitAuth | HttpClient.HttpClient
>
```

[Source](https://github.com/leonitousconforti/tinyburg/packages/tinytower-sdk/blob/main/src/TinyTower.ts#L820)

Since v1.0.0

## raffle_enterMultiRaffle

Enters the player into the next 8 hourly raffles.

**Signature**

```ts
declare const raffle_enterMultiRaffle: (args_0: {
  readonly playerAuthKey: Redacted.Redacted<string> & Brand<"PlayerAuthKey">
  readonly playerId: string & Brand<"PlayerId">
}) => Effect.Effect<
  void,
  | Schema.SchemaError
  | NimblebitError
  | Forbidden
  | BadRequest
  | Unauthorized
  | InternalServerError
  | PlatformError
  | HttpClientError,
  NimblebitAuth.NimblebitAuth | HttpClient.HttpClient
>
```

[Source](https://github.com/leonitousconforti/tinyburg/packages/tinytower-sdk/blob/main/src/TinyTower.ts#L772)

Since v1.0.0

## raffle_enterRaffle

Enters the player into the hourly raffle.

**Signature**

```ts
declare const raffle_enterRaffle: (args_0: {
  readonly playerAuthKey: Redacted.Redacted<string> & Brand<"PlayerAuthKey">
  readonly playerId: string & Brand<"PlayerId">
}) => Effect.Effect<
  void,
  | Schema.SchemaError
  | NimblebitError
  | Forbidden
  | BadRequest
  | Unauthorized
  | InternalServerError
  | PlatformError
  | HttpClientError,
  NimblebitAuth.NimblebitAuth | HttpClient.HttpClient
>
```

[Source](https://github.com/leonitousconforti/tinyburg/packages/tinytower-sdk/blob/main/src/TinyTower.ts#L724)

Since v1.0.0

## social_getGifts

Retrieves gifts sent to the player but does not mark them as received.

**Signature**

```ts
declare const social_getGifts: (args_0: {
  readonly playerAuthKey: Redacted.Redacted<string> & Brand<"PlayerAuthKey">
  readonly playerId: string & Brand<"PlayerId">
}) => Effect.Effect<
  {
    total: number
    gifts: ReadonlyArray<{
      readonly id: number
      readonly to: string & Brand<"PlayerId">
      readonly from: string & Brand<"PlayerId">
      readonly type: "None" | "Play" | "Gift" | "Cloud" | "Raffle" | "Visit" | "Leaderboards"
      readonly contents: string
      readonly checksum: string
      readonly c: unknown
    }>
  },
  | Schema.SchemaError
  | NimblebitError
  | Forbidden
  | BadRequest
  | Unauthorized
  | InternalServerError
  | PlatformError
  | HttpClientError,
  NimblebitAuth.NimblebitAuth | HttpClient.HttpClient
>
```

[Source](https://github.com/leonitousconforti/tinyburg/packages/tinytower-sdk/blob/main/src/TinyTower.ts#L921)

Since v1.0.0

## social_getVisits

Retrieves visits made to the player's tower.

**Signature**

```ts
declare const social_getVisits: (args_0: {
  readonly playerAuthKey: Redacted.Redacted<string> & Brand<"PlayerAuthKey">
  readonly playerId: string & Brand<"PlayerId">
}) => Effect.Effect<
  {
    total: number
    visits: ReadonlyArray<{
      readonly id: number
      readonly to: string & Brand<"PlayerId">
      readonly from: string & Brand<"PlayerId">
      readonly type: "None" | "Play" | "Gift" | "Cloud" | "Raffle" | "Visit" | "Leaderboards"
      readonly contents: string
      readonly checksum: string
      readonly c: unknown
    }>
  },
  | Schema.SchemaError
  | NimblebitError
  | Forbidden
  | BadRequest
  | Unauthorized
  | InternalServerError
  | PlatformError
  | HttpClientError,
  NimblebitAuth.NimblebitAuth | HttpClient.HttpClient
>
```

[Source](https://github.com/leonitousconforti/tinyburg/packages/tinytower-sdk/blob/main/src/TinyTower.ts#L1190)

Since v1.0.0

## social_pullFriendMeta

Pulls metadata about a friend's tower from the Nimblebit servers.

**Signature**

```ts
declare const social_pullFriendMeta: (
  args_0: {
    readonly playerAuthKey: Redacted.Redacted<string> & Brand<"PlayerAuthKey">
    readonly playerId: string & Brand<"PlayerId">
  } & { friendId: Schema.Schema.Type<typeof NimblebitConfig.PlayerIdSchema> }
) => Effect.Effect<
  {
    readonly stories: number
    readonly doorman: {
      readonly homeIndex: number
      readonly workIndex: number
      readonly placedDreamJob: boolean
      readonly dreamJobIndex: number
      readonly vip:
        | number
        | "None"
        | "Engineer"
        | "TravelAgent"
        | "Deliveryman"
        | "BigSpender"
        | "Celebrity"
        | "GiftBit"
      readonly attributes: {
        readonly $unknown: ReadonlyArray<string>
        readonly gender: "male" | "female"
        readonly name: string
        readonly birthday: readonly [number, number]
        readonly designColors: {
          readonly pantColor: { readonly r: number; readonly g: number; readonly b: number }
          readonly shirtColor: { readonly r: number; readonly g: number; readonly b: number }
          readonly skinColorIndex: number
          readonly hairColorIndex: number
          readonly shoeColorIndex: number
        }
        readonly accessories: {
          readonly glasses: Result<number, number>
          readonly hairAccessory: Result<number, number>
          readonly tie: Result<
            { readonly r: number; readonly g: number; readonly b: number },
            { readonly r: number; readonly g: number; readonly b: number }
          >
          readonly earrings: Result<
            { readonly r: number; readonly g: number; readonly b: number },
            { readonly r: number; readonly g: number; readonly b: number }
          >
          readonly hat: Result<
            {
              readonly index: number
              readonly gender: "male" | "female" | "bi"
              readonly color: { readonly r: number; readonly g: number; readonly b: number }
            },
            { readonly index: number; readonly color: { readonly r: number; readonly g: number; readonly b: number } }
          >
        }
        readonly skills: {
          readonly food: number
          readonly retail: number
          readonly service: number
          readonly creative: number
          readonly recreation: number
        }
      }
      readonly $unknown: {
        readonly [x: string]: {
          readonly value: string
          readonly $locationMetadata: { readonly after: string | null | undefined }
        }
      }
      readonly costume?: string | undefined
      readonly customName?: string | undefined
      readonly pet?:
        | "bald_eagle"
        | "bear"
        | "bee"
        | "chick"
        | "chicken"
        | "christmas_rudolph"
        | "egg"
        | "elephant"
        | "frog"
        | "horse"
        | "kangaroo"
        | "monkey"
        | "panda"
        | "raccoon"
        | "sheep"
        | "snowman"
        | "unicorn"
        | "robot"
        | "ankylosaurus"
        | "beaver"
        | "butterfly_blue"
        | "cactus"
        | "cat"
        | "camel"
        | "capybara"
        | "chipmunk"
        | "cockatoo"
        | "cougar"
        | "cow"
        | "coyote"
        | "crocodile"
        | "dino_toy"
        | "diplodocus"
        | "direwolf"
        | "dog"
        | "dragon"
        | "eagle"
        | "echidna"
        | "elk"
        | "fox"
        | "giraffe"
        | "goat"
        | "gorilla"
        | "griffin"
        | "hippo"
        | "koala"
        | "lemur"
        | "lion"
        | "mammoth"
        | "moose"
        | "muskox"
        | "opossum"
        | "otter"
        | "owl"
        | "penguin"
        | "pika"
        | "pig"
        | "pigeon"
        | "platypus"
        | "polar_bear"
        | "rabbit"
        | "rat"
        | "rhino"
        | "rock"
        | "rover"
        | "seal"
        | "skunk"
        | "snake"
        | "spider"
        | "squirrel"
        | "stegosaurus"
        | "tiger"
        | "toucan"
        | "tribble"
        | "triceratops"
        | "turtle"
        | "tyrannosaur"
        | "velociraptor"
        | "walrus"
        | "zebra"
        | "black_panther"
        | "chameleon"
        | "duck"
        | "chicks"
        | "lamb"
        | "crow"
        | "iguana"
        | "redpanda"
        | "badger"
        | "black_bear"
        | "bluejay"
        | "rattlesnake"
        | "sloth"
        | "thylacine"
        | "ant_farm"
        | "crab"
        | "octopus"
        | "sponge"
        | "ibex"
        | "porcupine"
        | "bat"
        | "dog_skeleton"
        | "slime"
        | "tentacle"
        | "artic_fox"
        | "saint_bernard"
        | "husky"
        | "box_pet"
        | "elasmotherium"
        | "lemming"
        | "snow_leopard"
        | "armadillo"
        | "hyena"
        | "kiwi"
        | "vulture"
        | "komodo"
        | "turkey"
        | "deer"
        | "christmas_penguin"
        | "cat_in_a_bag"
        | undefined
    }
    readonly maxGold: number
    readonly requestedFloorId: number
    readonly ts: string
    readonly vip: boolean
    readonly bitbook?: string | undefined
  },
  | Schema.SchemaError
  | NimblebitError
  | Forbidden
  | BadRequest
  | Unauthorized
  | InternalServerError
  | PlatformError
  | HttpClientError,
  NimblebitAuth.NimblebitAuth | HttpClient.HttpClient
>
```

[Source](https://github.com/leonitousconforti/tinyburg/packages/tinytower-sdk/blob/main/src/TinyTower.ts#L1021)

Since v1.0.0

## social_pullFriendTower

Pulls a friend's tower save data from the Nimblebit servers.

**Signature**

```ts
declare const social_pullFriendTower: (
  args_0: {
    readonly playerAuthKey: Redacted.Redacted<string> & Brand<"PlayerAuthKey">
    readonly playerId: string & Brand<"PlayerId">
  } & { friendId: Schema.Schema.Type<typeof NimblebitConfig.PlayerIdSchema> }
) => Effect.Effect<
  { saveId: number; data: string },
  | Schema.SchemaError
  | NimblebitError
  | Forbidden
  | BadRequest
  | Unauthorized
  | InternalServerError
  | PlatformError
  | HttpClientError,
  NimblebitAuth.NimblebitAuth | HttpClient.HttpClient
>
```

[Source](https://github.com/leonitousconforti/tinyburg/packages/tinytower-sdk/blob/main/src/TinyTower.ts#L1072)

Since v1.0.0

## social_receiveGift

Marks a gift sent to the player as received.

**Signature**

```ts
declare const social_receiveGift: (
  args_0: {
    readonly playerAuthKey: Redacted.Redacted<string> & Brand<"PlayerAuthKey">
    readonly playerId: string & Brand<"PlayerId">
  } & { giftId: number }
) => Effect.Effect<
  void,
  | Schema.SchemaError
  | NimblebitError
  | Forbidden
  | BadRequest
  | Unauthorized
  | InternalServerError
  | PlatformError
  | HttpClientError,
  NimblebitAuth.NimblebitAuth | HttpClient.HttpClient
>
```

[Source](https://github.com/leonitousconforti/tinyburg/packages/tinytower-sdk/blob/main/src/TinyTower.ts#L972)

Since v1.0.0

## social_retrieveFriendsSnapshotList

Retrieves a list of a friend's snapshots from the Nimblebit servers.

**Signature**

```ts
declare const social_retrieveFriendsSnapshotList: (
  args_0: {
    readonly playerAuthKey: Redacted.Redacted<string> & Brand<"PlayerAuthKey">
    readonly playerId: string & Brand<"PlayerId">
  } & { friendId: Schema.Schema.Type<typeof NimblebitConfig.PlayerIdSchema> }
) => Effect.Effect<
  ReadonlyArray<{ readonly meta: any; readonly snapshotId: number; readonly created: Date }>,
  | Schema.SchemaError
  | NimblebitError
  | Forbidden
  | BadRequest
  | Unauthorized
  | InternalServerError
  | PlatformError
  | HttpClientError,
  NimblebitAuth.NimblebitAuth | HttpClient.HttpClient
>
```

[Source](https://github.com/leonitousconforti/tinyburg/packages/tinytower-sdk/blob/main/src/TinyTower.ts#L1139)

Since v1.0.0

## social_sendItem

Sends a sync item to a friend.

**Signature**

```ts
declare const social_sendItem: (
  args_0: {
    readonly playerAuthKey: Redacted.Redacted<string> & Brand<"PlayerAuthKey">
    readonly playerId: string & Brand<"PlayerId">
  } & {
    itemStr: string
    itemType: (typeof SyncItemType.SyncItemType)[keyof typeof SyncItemType.SyncItemType]
    friendId: Schema.Schema.Type<typeof NimblebitConfig.PlayerIdSchema>
  }
) => Effect.Effect<
  void,
  | Schema.SchemaError
  | NimblebitError
  | Forbidden
  | BadRequest
  | Unauthorized
  | InternalServerError
  | PlatformError
  | HttpClientError,
  NimblebitAuth.NimblebitAuth | HttpClient.HttpClient
>
```

[Source](https://github.com/leonitousconforti/tinyburg/packages/tinytower-sdk/blob/main/src/TinyTower.ts#L860)

Since v1.0.0

## social_visit

Sends a visit to a friend's tower.

**Signature**

```ts
declare const social_visit: (
  args_0: {
    readonly playerAuthKey: Redacted.Redacted<string> & Brand<"PlayerAuthKey">
    readonly playerId: string & Brand<"PlayerId">
  } & { friendId: Schema.Schema.Type<typeof NimblebitConfig.PlayerIdSchema> }
) => Effect.Effect<
  void,
  | Schema.SchemaError
  | NimblebitError
  | Forbidden
  | BadRequest
  | Unauthorized
  | InternalServerError
  | PlatformError
  | HttpClientError,
  NimblebitAuth.NimblebitAuth | HttpClient.HttpClient
>
```

[Source](https://github.com/leonitousconforti/tinyburg/packages/tinytower-sdk/blob/main/src/TinyTower.ts#L1241)

Since v1.0.0

## sync_checkForNewerSave

Checks what the latest save version is on the Nimblebit servers.

**Signature**

```ts
declare const sync_checkForNewerSave: (args_0: {
  readonly playerAuthKey: Redacted.Redacted<string> & Brand<"PlayerAuthKey">
  readonly playerId: string & Brand<"PlayerId">
}) => Effect.Effect<
  number,
  | Schema.SchemaError
  | NimblebitError
  | Forbidden
  | BadRequest
  | Unauthorized
  | InternalServerError
  | PlatformError
  | HttpClientError,
  NimblebitAuth.NimblebitAuth | HttpClient.HttpClient
>
```

[Source](https://github.com/leonitousconforti/tinyburg/packages/tinytower-sdk/blob/main/src/TinyTower.ts#L483)

Since v1.0.0

## sync_pullSave

Pulls the latest save data from the Nimblebit servers.

**Signature**

```ts
declare const sync_pullSave: (args_0: {
  readonly playerAuthKey: Redacted.Redacted<string> & Brand<"PlayerAuthKey">
  readonly playerId: string & Brand<"PlayerId">
}) => Effect.Effect<
  { saveId: number; data: string },
  | Schema.SchemaError
  | NimblebitError
  | Forbidden
  | BadRequest
  | Unauthorized
  | InternalServerError
  | PlatformError
  | HttpClientError,
  NimblebitAuth.NimblebitAuth | HttpClient.HttpClient
>
```

[Source](https://github.com/leonitousconforti/tinyburg/packages/tinytower-sdk/blob/main/src/TinyTower.ts#L351)

Since v1.0.0

## sync_pullSnapshot

Pulls a specific snapshot from the Nimblebit servers.

**Signature**

```ts
declare const sync_pullSnapshot: (
  args_0: {
    readonly playerAuthKey: Redacted.Redacted<string> & Brand<"PlayerAuthKey">
    readonly playerId: string & Brand<"PlayerId">
  } & { snapshotId: number }
) => Effect.Effect<
  { snapshotId: number; data: string },
  | Schema.SchemaError
  | NimblebitError
  | Forbidden
  | BadRequest
  | Unauthorized
  | InternalServerError
  | PlatformError
  | HttpClientError,
  NimblebitAuth.NimblebitAuth | HttpClient.HttpClient
>
```

[Source](https://github.com/leonitousconforti/tinyburg/packages/tinytower-sdk/blob/main/src/TinyTower.ts#L543)

Since v1.0.0

## sync_pushSave

Pushes save data to the Nimblebit servers.

**Signature**

```ts
declare const sync_pushSave: (
  args_0: {
    readonly playerAuthKey: Redacted.Redacted<string> & Brand<"PlayerAuthKey">
    readonly playerId: string & Brand<"PlayerId">
  } & { data: Schema.Schema.Type<typeof SaveData> }
) => Effect.Effect<
  void,
  | Schema.SchemaError
  | NimblebitError
  | Forbidden
  | BadRequest
  | Unauthorized
  | InternalServerError
  | PlatformError
  | HttpClientError,
  NimblebitAuth.NimblebitAuth | HttpClient.HttpClient
>
```

[Source](https://github.com/leonitousconforti/tinyburg/packages/tinytower-sdk/blob/main/src/TinyTower.ts#L415)

Since v1.0.0

## sync_pushSnapshot

Pushes a snapshot to the Nimblebit servers.

**Signature**

```ts
declare const sync_pushSnapshot: (
  args_0: {
    readonly playerAuthKey: Redacted.Redacted<string> & Brand<"PlayerAuthKey">
    readonly playerId: string & Brand<"PlayerId">
  } & { data: Schema.Schema.Type<typeof SaveData> }
) => Effect.Effect<
  void,
  | Schema.SchemaError
  | NimblebitError
  | Forbidden
  | BadRequest
  | Unauthorized
  | InternalServerError
  | PlatformError
  | HttpClientError,
  NimblebitAuth.NimblebitAuth | HttpClient.HttpClient
>
```

[Source](https://github.com/leonitousconforti/tinyburg/packages/tinytower-sdk/blob/main/src/TinyTower.ts#L608)

Since v1.0.0

## sync_retrieveSnapshotList

Retrieves a list of snapshots from the Nimblebit servers.

**Signature**

```ts
declare const sync_retrieveSnapshotList: (args_0: {
  readonly playerAuthKey: Redacted.Redacted<string> & Brand<"PlayerAuthKey">
  readonly playerId: string & Brand<"PlayerId">
}) => Effect.Effect<
  ReadonlyArray<{
    readonly id: number
    readonly timestamp: bigint
    readonly meta: {
      readonly stories: number
      readonly doorman: {
        readonly homeIndex: number
        readonly workIndex: number
        readonly placedDreamJob: boolean
        readonly dreamJobIndex: number
        readonly vip:
          | number
          | "None"
          | "Engineer"
          | "TravelAgent"
          | "Deliveryman"
          | "BigSpender"
          | "Celebrity"
          | "GiftBit"
        readonly attributes: {
          readonly $unknown: ReadonlyArray<string>
          readonly gender: "male" | "female"
          readonly name: string
          readonly birthday: readonly [number, number]
          readonly designColors: {
            readonly pantColor: { readonly r: number; readonly g: number; readonly b: number }
            readonly shirtColor: { readonly r: number; readonly g: number; readonly b: number }
            readonly skinColorIndex: number
            readonly hairColorIndex: number
            readonly shoeColorIndex: number
          }
          readonly accessories: {
            readonly glasses: Result<number, number>
            readonly hairAccessory: Result<number, number>
            readonly tie: Result<
              { readonly r: number; readonly g: number; readonly b: number },
              { readonly r: number; readonly g: number; readonly b: number }
            >
            readonly earrings: Result<
              { readonly r: number; readonly g: number; readonly b: number },
              { readonly r: number; readonly g: number; readonly b: number }
            >
            readonly hat: Result<
              {
                readonly index: number
                readonly gender: "male" | "female" | "bi"
                readonly color: { readonly r: number; readonly g: number; readonly b: number }
              },
              { readonly index: number; readonly color: { readonly r: number; readonly g: number; readonly b: number } }
            >
          }
          readonly skills: {
            readonly food: number
            readonly retail: number
            readonly service: number
            readonly creative: number
            readonly recreation: number
          }
        }
        readonly $unknown: {
          readonly [x: string]: {
            readonly value: string
            readonly $locationMetadata: { readonly after: string | null | undefined }
          }
        }
        readonly costume?: string | undefined
        readonly customName?: string | undefined
        readonly pet?:
          | "bald_eagle"
          | "bear"
          | "bee"
          | "chick"
          | "chicken"
          | "christmas_rudolph"
          | "egg"
          | "elephant"
          | "frog"
          | "horse"
          | "kangaroo"
          | "monkey"
          | "panda"
          | "raccoon"
          | "sheep"
          | "snowman"
          | "unicorn"
          | "robot"
          | "ankylosaurus"
          | "beaver"
          | "butterfly_blue"
          | "cactus"
          | "cat"
          | "camel"
          | "capybara"
          | "chipmunk"
          | "cockatoo"
          | "cougar"
          | "cow"
          | "coyote"
          | "crocodile"
          | "dino_toy"
          | "diplodocus"
          | "direwolf"
          | "dog"
          | "dragon"
          | "eagle"
          | "echidna"
          | "elk"
          | "fox"
          | "giraffe"
          | "goat"
          | "gorilla"
          | "griffin"
          | "hippo"
          | "koala"
          | "lemur"
          | "lion"
          | "mammoth"
          | "moose"
          | "muskox"
          | "opossum"
          | "otter"
          | "owl"
          | "penguin"
          | "pika"
          | "pig"
          | "pigeon"
          | "platypus"
          | "polar_bear"
          | "rabbit"
          | "rat"
          | "rhino"
          | "rock"
          | "rover"
          | "seal"
          | "skunk"
          | "snake"
          | "spider"
          | "squirrel"
          | "stegosaurus"
          | "tiger"
          | "toucan"
          | "tribble"
          | "triceratops"
          | "turtle"
          | "tyrannosaur"
          | "velociraptor"
          | "walrus"
          | "zebra"
          | "black_panther"
          | "chameleon"
          | "duck"
          | "chicks"
          | "lamb"
          | "crow"
          | "iguana"
          | "redpanda"
          | "badger"
          | "black_bear"
          | "bluejay"
          | "rattlesnake"
          | "sloth"
          | "thylacine"
          | "ant_farm"
          | "crab"
          | "octopus"
          | "sponge"
          | "ibex"
          | "porcupine"
          | "bat"
          | "dog_skeleton"
          | "slime"
          | "tentacle"
          | "artic_fox"
          | "saint_bernard"
          | "husky"
          | "box_pet"
          | "elasmotherium"
          | "lemming"
          | "snow_leopard"
          | "armadillo"
          | "hyena"
          | "kiwi"
          | "vulture"
          | "komodo"
          | "turkey"
          | "deer"
          | "christmas_penguin"
          | "cat_in_a_bag"
          | undefined
      }
      readonly maxGold: number
      readonly requestedFloorId: number
      readonly ts: string
      readonly vip: boolean
      readonly bitbook?: string | undefined
    }
  }>,
  | Schema.SchemaError
  | NimblebitError
  | Forbidden
  | BadRequest
  | Unauthorized
  | InternalServerError
  | PlatformError
  | HttpClientError,
  NimblebitAuth.NimblebitAuth | HttpClient.HttpClient
>
```

[Source](https://github.com/leonitousconforti/tinyburg/packages/tinytower-sdk/blob/main/src/TinyTower.ts#L676)

Since v1.0.0

# Schemas

## SaveData

How to decode a SaveData from Nimblebit's object format.

**Signature**

```ts
declare const SaveData: Schema.suspend<
  Schema.decodeTo<
    Schema.decodeTo<
      Schema.Struct<
        {
          readonly coins: Schema.decodeTo<Schema.Int, Schema.NumberFromString, never, never>
          readonly bux: Schema.decodeTo<Schema.Int, Schema.NumberFromString, never, never>
          readonly Ppig: Schema.optionalKey<Schema.String>
          readonly Pplim: Schema.optionalKey<Schema.String>
          readonly maxGold: Schema.NumberFromString
          readonly gold: Schema.NumberFromString
          readonly tip: Schema.NumberFromString
          readonly needUpgrade: Schema.NumberFromString
          readonly ver: Schema.String
          readonly roof: Schema.NumberFromString
          readonly lift: Schema.NumberFromString
          readonly lobby: Schema.NumberFromString
          readonly buxBought: Schema.NumberFromString
          readonly installTime: Schema.NumberFromString
          readonly lastSaleTick: Schema.NumberFromString
          readonly lobbyName: Schema.String
          readonly raffleID: Schema.NumberFromString
          readonly vipTrialEnd: Schema.BigIntFromString
          readonly costumes: Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>
          readonly pets: Schema.optionalKey<Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>>
          readonly missionHist: Schema.optionalKey<
            Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>
          >
          readonly bbHist: Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>
          readonly roofs: Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>
          readonly lifts: Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>
          readonly lobbies: Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>
          readonly bannedFriends: Schema.optionalKey<
            Schema.compose<
              Schema.$Array<Schema.String>,
              Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>
            >
          >
          readonly liftSpeed: Schema.optionalKey<Schema.NumberFromString>
          readonly totalPoints: Schema.BigIntFromString
          readonly lrc: Schema.String
          readonly lfc: Schema.String
          readonly cfd: Schema.String
          readonly lbc: Schema.String
          readonly lbbcp: Schema.String
          readonly lcmiss: Schema.String
          readonly lcg: Schema.String
          readonly sfx: Schema.NumberFromString
          readonly mus: Schema.NumberFromString
          readonly notes: Schema.NumberFromString
          readonly autoLiftDisable: Schema.NumberFromString
          readonly videos: Schema.NumberFromString
          readonly vidCheck: Schema.NumberFromString
          readonly bbnotes: Schema.NumberFromString
          readonly hidechat: Schema.NumberFromString
          readonly tmi: Schema.String
          readonly PVF: Schema.optionalKey<Schema.String>
          readonly PHP: Schema.optionalKey<Schema.String>
          readonly mission: Schema.optionalKey<
            Schema.decodeTo<
              Schema.Struct<
                {
                  readonly id: Schema.String
                  readonly type: Schema.NumberFromString
                  readonly character: Schema.String
                  readonly text: Schema.String
                  readonly cnt: Schema.String
                  readonly ft: Schema.String
                  readonly fid: Schema.String
                  readonly pop: Schema.String
                  readonly com: Schema.String
                } & {
                  readonly $unknown: Schema.$Record<
                    Schema.String,
                    Schema.Struct<{
                      value: Schema.String
                      $locationMetadata: Schema.Struct<{ after: Schema.NullishOr<Schema.String> }>
                    }>
                  >
                }
              >,
              Schema.String,
              never,
              never
            >
          >
          readonly doorman: Schema.decodeTo<
            Schema.Struct<
              {
                readonly homeIndex: Schema.decodeTo<Schema.Int, Schema.NumberFromString, never, never>
                readonly workIndex: Schema.decodeTo<Schema.Int, Schema.NumberFromString, never, never>
                readonly placedDreamJob: Schema.decodeTo<
                  Schema.Boolean,
                  Schema.Literals<readonly ["0", "1"]>,
                  never,
                  never
                >
                readonly dreamJobIndex: Schema.decodeTo<Schema.Int, Schema.NumberFromString, never, never>
                readonly costume: Schema.optionalKey<
                  Schema.Union<
                    readonly [
                      Schema.Literals<
                        Array<
                          | "blink"
                          | "_audioadsguy"
                          | "_parachute"
                          | "airline pilot"
                          | "aloha"
                          | "amigo"
                          | "angel"
                          | "apple_pie"
                          | "apron"
                          | "archaeologist"
                          | "astronaut"
                          | "avocado"
                          | "avocadont"
                          | "baby"
                          | "babyalien"
                          | "bald eagle"
                          | "balloon"
                          | "banana"
                          | "barber"
                          | "barista"
                          | "baseball uniform"
                          | "beach lifeguard"
                          | "beach_boy"
                          | "beach_girl"
                          | "bear"
                          | "bee suit"
                          | "bellhop"
                          | "betsy ross"
                          | "bikachu"
                          | "biker"
                          | "birthday"
                          | "reaper"
                          | "bitman"
                          | "black dress"
                          | "black ranger"
                          | "blacksmith"
                          | "blue egg"
                          | "blue ranger"
                          | "blue suit"
                          | "boxer"
                          | "brick"
                          | "bride"
                          | "brown dress"
                          | "buddy_elf"
                          | "bunny"
                          | "bunnyeaster"
                          | "burglar"
                          | "business suit"
                          | "butterfly"
                          | "candy_cane"
                          | "captain bit"
                          | "carrot"
                          | "cat suit"
                          | "caveman"
                          | "cheerleader"
                          | "cheese_wedge"
                          | "chef"
                          | "chick"
                          | "chicken"
                          | "chinese suit"
                          | "christmas rudolph"
                          | "christmas_boy"
                          | "christmas_carl"
                          | "christmas_elf"
                          | "christmas_tree"
                          | "clown"
                          | "coastguard"
                          | "construction"
                          | "convict"
                          | "cookie"
                          | "cool_bread"
                          | "corn"
                          | "corn_cob"
                          | "cossack"
                          | "cowboy"
                          | "creamy_bowl"
                          | "creepy"
                          | "delivery"
                          | "detective"
                          | "devil"
                          | "dinosaur"
                          | "disco"
                          | "diver"
                          | "dj"
                          | "doctor"
                          | "drumstick_buddy"
                          | "dummy"
                          | "egg"
                          | "elephant"
                          | "elf"
                          | "elvis"
                          | "emperor"
                          | "engineer"
                          | "evil_plant"
                          | "evilmistress"
                          | "executioner"
                          | "explorer"
                          | "eyepatch"
                          | "fairy"
                          | "famous construct"
                          | "farmer"
                          | "fast food uniform"
                          | "fireman"
                          | "fishing"
                          | "flower"
                          | "folklore"
                          | "football player"
                          | "french maid"
                          | "fried_egg"
                          | "frog suit"
                          | "g-man"
                          | "gangster"
                          | "geisha"
                          | "general washington"
                          | "gentleman"
                          | "ghost"
                          | "ghost arrow"
                          | "ghost devil"
                          | "ghost hexe"
                          | "ghost trick treat"
                          | "ghost vampire"
                          | "ghosthustler"
                          | "gift"
                          | "gingerbread"
                          | "gold dress"
                          | "golden_ornament"
                          | "golfer"
                          | "goth"
                          | "green ranger"
                          | "groom"
                          | "grunch"
                          | "guard"
                          | "hatchling"
                          | "hatchlingblue"
                          | "hay_bale"
                          | "hazmat"
                          | "heart"
                          | "hippie"
                          | "horse"
                          | "hotdog"
                          | "hula_girl"
                          | "hunter"
                          | "ice cream master"
                          | "ice queen"
                          | "icecube"
                          | "influencer"
                          | "inquisitor"
                          | "inuit"
                          | "ironbit"
                          | "jet helmet"
                          | "jolly_gift"
                          | "judge"
                          | "kangaroo"
                          | "karate outfit"
                          | "king"
                          | "knight"
                          | "krampus"
                          | "krampus_2"
                          | "lab coat"
                          | "lady"
                          | "leather jacket"
                          | "lecter"
                          | "leprechaun"
                          | "liberty"
                          | "lumberjack"
                          | "mad hatter"
                          | "mad scientist"
                          | "magician"
                          | "maid"
                          | "mama_claus"
                          | "mapple genius"
                          | "mask"
                          | "massive coat"
                          | "milk_glass"
                          | "milky"
                          | "mime"
                          | "miss_tletoe"
                          | "moai"
                          | "monkey"
                          | "monster suit"
                          | "mountie"
                          | "mr_pieman"
                          | "mummy"
                          | "native american"
                          | "neanderthal"
                          | "nerd"
                          | "ninja"
                          | "nurse"
                          | "old diver"
                          | "overalls"
                          | "panda hat"
                          | "panda suit"
                          | "paparazzi"
                          | "peppermint_candy"
                          | "phantom"
                          | "pharaoh"
                          | "photography lover"
                          | "piggy"
                          | "pilgrim"
                          | "pilgrim_man"
                          | "pilgrim_man_2"
                          | "pilgrim_woman"
                          | "pilgrim_woman_2"
                          | "pilot headset"
                          | "pinecone"
                          | "pink egg"
                          | "pink ranger"
                          | "pirate"
                          | "pizza"
                          | "plague"
                          | "plumber a"
                          | "plumber b"
                          | "pool lifeguard"
                          | "potato_bowl"
                          | "princess"
                          | "pumpkin"
                          | "pumpkin_man"
                          | "pumpkin_woman"
                          | "queen_bee"
                          | "racoon"
                          | "race driver"
                          | "red baron"
                          | "red dress"
                          | "red hat"
                          | "red ranger"
                          | "red suit"
                          | "red_ornament"
                          | "revolutionary british"
                          | "revolutionary usa"
                          | "rockstar"
                          | "roman"
                          | "rudolph_2"
                          | "runway"
                          | "sailor"
                          | "sakura"
                          | "salesman"
                          | "samurai"
                          | "sanitation"
                          | "santa"
                          | "santa_claus"
                          | "santas_hat"
                          | "security"
                          | "sera"
                          | "shark"
                          | "sheep"
                          | "shimmering_star"
                          | "skier a"
                          | "skier b"
                          | "snapdog"
                          | "snow_queen"
                          | "snowbit"
                          | "snowflake"
                          | "snowman"
                          | "soccer"
                          | "soldier"
                          | "sour_apple"
                          | "spaghetti_and_meatballs"
                          | "sparkling_ribbon"
                          | "spring_bee"
                          | "spring_bunny"
                          | "spud"
                          | "star captain"
                          | "stocking"
                          | "student tourist"
                          | "summer dj"
                          | "sumo"
                          | "sunflower"
                          | "super hero"
                          | "superbit"
                          | "surgeon"
                          | "swimmer"
                          | "toga"
                          | "tourist"
                          | "tourist diver"
                          | "travel agent"
                          | "tree_trunk"
                          | "trooper"
                          | "turkey_friend"
                          | "turkey_man"
                          | "turkey_woman"
                          | "uncle sam"
                          | "unicorn"
                          | "usher"
                          | "vampire"
                          | "viking"
                          | "waiter"
                          | "waldo"
                          | "watermelon"
                          | "werebit"
                          | "white suit"
                          | "witch"
                          | "yellow egg"
                          | "yellow ranger"
                          | "yeti"
                          | "young wizard"
                          | "zombie"
                          | "cyborg"
                          | "fez"
                          | "fishtank"
                          | "hot_cocoa"
                          | "robot"
                          | "snow_globe"
                        >
                      >,
                      Schema.String
                    ]
                  >
                >
                readonly vip: Schema.Union<
                  readonly [
                    Schema.Union<
                      readonly [
                        Schema.decodeTo<Schema.Literal<"None">, Schema.Literal<"0">, never, never>,
                        Schema.decodeTo<Schema.Literal<"Engineer">, Schema.Literal<"1">, never, never>,
                        Schema.decodeTo<Schema.Literal<"TravelAgent">, Schema.Literal<"2">, never, never>,
                        Schema.decodeTo<Schema.Literal<"Deliveryman">, Schema.Literal<"3">, never, never>,
                        Schema.decodeTo<Schema.Literal<"BigSpender">, Schema.Literal<"4">, never, never>,
                        Schema.decodeTo<Schema.Literal<"Celebrity">, Schema.Literal<"5">, never, never>,
                        Schema.decodeTo<Schema.Literal<"GiftBit">, Schema.Literal<"6">, never, never>
                      ]
                    >,
                    Schema.compose<Schema.Int, Schema.NumberFromString>
                  ]
                >
                readonly customName: Schema.optionalKey<Schema.String>
                readonly pet: Schema.optionalKey<
                  Schema.Literals<
                    Array<
                      | "bald_eagle"
                      | "bear"
                      | "bee"
                      | "chick"
                      | "chicken"
                      | "christmas_rudolph"
                      | "egg"
                      | "elephant"
                      | "frog"
                      | "horse"
                      | "kangaroo"
                      | "monkey"
                      | "panda"
                      | "raccoon"
                      | "sheep"
                      | "snowman"
                      | "unicorn"
                      | "robot"
                      | "ankylosaurus"
                      | "beaver"
                      | "butterfly_blue"
                      | "cactus"
                      | "cat"
                      | "camel"
                      | "capybara"
                      | "chipmunk"
                      | "cockatoo"
                      | "cougar"
                      | "cow"
                      | "coyote"
                      | "crocodile"
                      | "dino_toy"
                      | "diplodocus"
                      | "direwolf"
                      | "dog"
                      | "dragon"
                      | "eagle"
                      | "echidna"
                      | "elk"
                      | "fox"
                      | "giraffe"
                      | "goat"
                      | "gorilla"
                      | "griffin"
                      | "hippo"
                      | "koala"
                      | "lemur"
                      | "lion"
                      | "mammoth"
                      | "moose"
                      | "muskox"
                      | "opossum"
                      | "otter"
                      | "owl"
                      | "penguin"
                      | "pika"
                      | "pig"
                      | "pigeon"
                      | "platypus"
                      | "polar_bear"
                      | "rabbit"
                      | "rat"
                      | "rhino"
                      | "rock"
                      | "rover"
                      | "seal"
                      | "skunk"
                      | "snake"
                      | "spider"
                      | "squirrel"
                      | "stegosaurus"
                      | "tiger"
                      | "toucan"
                      | "tribble"
                      | "triceratops"
                      | "turtle"
                      | "tyrannosaur"
                      | "velociraptor"
                      | "walrus"
                      | "zebra"
                      | "black_panther"
                      | "chameleon"
                      | "duck"
                      | "chicks"
                      | "lamb"
                      | "crow"
                      | "iguana"
                      | "redpanda"
                      | "badger"
                      | "black_bear"
                      | "bluejay"
                      | "rattlesnake"
                      | "sloth"
                      | "thylacine"
                      | "ant_farm"
                      | "crab"
                      | "octopus"
                      | "sponge"
                      | "ibex"
                      | "porcupine"
                      | "bat"
                      | "dog_skeleton"
                      | "slime"
                      | "tentacle"
                      | "artic_fox"
                      | "saint_bernard"
                      | "husky"
                      | "box_pet"
                      | "elasmotherium"
                      | "lemming"
                      | "snow_leopard"
                      | "armadillo"
                      | "hyena"
                      | "kiwi"
                      | "vulture"
                      | "komodo"
                      | "turkey"
                      | "deer"
                      | "christmas_penguin"
                      | "cat_in_a_bag"
                    >
                  >
                >
                readonly attributes: Schema.suspend<
                  Schema.decodeTo<
                    Schema.Struct<{
                      readonly $unknown: Schema.$Array<Schema.String>
                      readonly gender: Schema.Literals<readonly ["female", "male"]>
                      readonly name: Schema.String
                      readonly birthday: Schema.Tuple<readonly [Schema.Int, Schema.Int]>
                      readonly designColors: Schema.Struct<{
                        readonly pantColor: Schema.toType<
                          Schema.decodeTo<
                            Schema.Struct<{ readonly r: Schema.Int; readonly g: Schema.Int; readonly b: Schema.Int }>,
                            Schema.TemplateLiteralParser<
                              readonly [
                                Schema.compose<Schema.Finite, Schema.NumberFromString>,
                                ":",
                                Schema.compose<Schema.Finite, Schema.NumberFromString>,
                                ":",
                                Schema.compose<Schema.Finite, Schema.NumberFromString>
                              ]
                            >,
                            never,
                            never
                          >
                        >
                        readonly shirtColor: Schema.toType<
                          Schema.decodeTo<
                            Schema.Struct<{ readonly r: Schema.Int; readonly g: Schema.Int; readonly b: Schema.Int }>,
                            Schema.TemplateLiteralParser<
                              readonly [
                                Schema.compose<Schema.Finite, Schema.NumberFromString>,
                                ":",
                                Schema.compose<Schema.Finite, Schema.NumberFromString>,
                                ":",
                                Schema.compose<Schema.Finite, Schema.NumberFromString>
                              ]
                            >,
                            never,
                            never
                          >
                        >
                        readonly skinColorIndex: Schema.Number
                        readonly hairColorIndex: Schema.Number
                        readonly shoeColorIndex: Schema.Number
                      }>
                      readonly accessories: Schema.Struct<{
                        readonly glasses: Schema.Result<Schema.Number, Schema.Number>
                        readonly hairAccessory: Schema.Result<Schema.Number, Schema.Number>
                        readonly tie: Schema.Result<
                          Schema.toType<
                            Schema.decodeTo<
                              Schema.Struct<{ readonly r: Schema.Int; readonly g: Schema.Int; readonly b: Schema.Int }>,
                              Schema.TemplateLiteralParser<
                                readonly [
                                  Schema.compose<Schema.Finite, Schema.NumberFromString>,
                                  ":",
                                  Schema.compose<Schema.Finite, Schema.NumberFromString>,
                                  ":",
                                  Schema.compose<Schema.Finite, Schema.NumberFromString>
                                ]
                              >,
                              never,
                              never
                            >
                          >,
                          Schema.toType<
                            Schema.decodeTo<
                              Schema.Struct<{ readonly r: Schema.Int; readonly g: Schema.Int; readonly b: Schema.Int }>,
                              Schema.TemplateLiteralParser<
                                readonly [
                                  Schema.compose<Schema.Finite, Schema.NumberFromString>,
                                  ":",
                                  Schema.compose<Schema.Finite, Schema.NumberFromString>,
                                  ":",
                                  Schema.compose<Schema.Finite, Schema.NumberFromString>
                                ]
                              >,
                              never,
                              never
                            >
                          >
                        >
                        readonly earrings: Schema.Result<
                          Schema.toType<
                            Schema.decodeTo<
                              Schema.Struct<{ readonly r: Schema.Int; readonly g: Schema.Int; readonly b: Schema.Int }>,
                              Schema.TemplateLiteralParser<
                                readonly [
                                  Schema.compose<Schema.Finite, Schema.NumberFromString>,
                                  ":",
                                  Schema.compose<Schema.Finite, Schema.NumberFromString>,
                                  ":",
                                  Schema.compose<Schema.Finite, Schema.NumberFromString>
                                ]
                              >,
                              never,
                              never
                            >
                          >,
                          Schema.toType<
                            Schema.decodeTo<
                              Schema.Struct<{ readonly r: Schema.Int; readonly g: Schema.Int; readonly b: Schema.Int }>,
                              Schema.TemplateLiteralParser<
                                readonly [
                                  Schema.compose<Schema.Finite, Schema.NumberFromString>,
                                  ":",
                                  Schema.compose<Schema.Finite, Schema.NumberFromString>,
                                  ":",
                                  Schema.compose<Schema.Finite, Schema.NumberFromString>
                                ]
                              >,
                              never,
                              never
                            >
                          >
                        >
                        readonly hat: Schema.Result<
                          Schema.Struct<{
                            readonly index: Schema.Number
                            readonly gender: Schema.Literals<readonly ["female", "male", "bi"]>
                            readonly color: Schema.toType<
                              Schema.decodeTo<
                                Schema.Struct<{
                                  readonly r: Schema.Int
                                  readonly g: Schema.Int
                                  readonly b: Schema.Int
                                }>,
                                Schema.TemplateLiteralParser<
                                  readonly [
                                    Schema.compose<Schema.Finite, Schema.NumberFromString>,
                                    ":",
                                    Schema.compose<Schema.Finite, Schema.NumberFromString>,
                                    ":",
                                    Schema.compose<Schema.Finite, Schema.NumberFromString>
                                  ]
                                >,
                                never,
                                never
                              >
                            >
                          }>,
                          Schema.Struct<{
                            readonly index: Schema.Number
                            readonly color: Schema.toType<
                              Schema.decodeTo<
                                Schema.Struct<{
                                  readonly r: Schema.Int
                                  readonly g: Schema.Int
                                  readonly b: Schema.Int
                                }>,
                                Schema.TemplateLiteralParser<
                                  readonly [
                                    Schema.compose<Schema.Finite, Schema.NumberFromString>,
                                    ":",
                                    Schema.compose<Schema.Finite, Schema.NumberFromString>,
                                    ":",
                                    Schema.compose<Schema.Finite, Schema.NumberFromString>
                                  ]
                                >,
                                never,
                                never
                              >
                            >
                          }>
                        >
                      }>
                      readonly skills: Schema.Struct<{
                        readonly food: Schema.Int
                        readonly retail: Schema.Int
                        readonly service: Schema.Int
                        readonly creative: Schema.Int
                        readonly recreation: Schema.Int
                      }>
                    }>,
                    Schema.decodeTo<
                      Schema.Struct<
                        {
                          male: Schema.compose<
                            Schema.Boolean,
                            Schema.Union<
                              readonly [
                                Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                              ]
                            >
                          >
                          firstNameIndex: Schema.compose<Schema.Number, Schema.NumberFromString>
                          lastNameIndex: Schema.compose<Schema.Number, Schema.NumberFromString>
                          birthMonth: Schema.compose<Schema.Int, Schema.NumberFromString>
                          birthDay: Schema.compose<Schema.Int, Schema.NumberFromString>
                          skinColorIndex: Schema.compose<Schema.Number, Schema.NumberFromString>
                          hairColorIndex: Schema.compose<Schema.Number, Schema.NumberFromString>
                          shoeColorIndex: Schema.compose<Schema.Number, Schema.NumberFromString>
                          pantColor: Schema.decodeTo<
                            Schema.Struct<{ readonly r: Schema.Int; readonly g: Schema.Int; readonly b: Schema.Int }>,
                            Schema.TemplateLiteralParser<
                              readonly [
                                Schema.compose<Schema.Finite, Schema.NumberFromString>,
                                ":",
                                Schema.compose<Schema.Finite, Schema.NumberFromString>,
                                ":",
                                Schema.compose<Schema.Finite, Schema.NumberFromString>
                              ]
                            >,
                            never,
                            never
                          >
                          shirtColor: Schema.decodeTo<
                            Schema.Struct<{ readonly r: Schema.Int; readonly g: Schema.Int; readonly b: Schema.Int }>,
                            Schema.TemplateLiteralParser<
                              readonly [
                                Schema.compose<Schema.Finite, Schema.NumberFromString>,
                                ":",
                                Schema.compose<Schema.Finite, Schema.NumberFromString>,
                                ":",
                                Schema.compose<Schema.Finite, Schema.NumberFromString>
                              ]
                            >,
                            never,
                            never
                          >
                          hasGlasses: Schema.compose<
                            Schema.Boolean,
                            Schema.Union<
                              readonly [
                                Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                              ]
                            >
                          >
                          glassesIndex: Schema.compose<Schema.Number, Schema.NumberFromString>
                          hasTie: Schema.compose<
                            Schema.Boolean,
                            Schema.Union<
                              readonly [
                                Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                              ]
                            >
                          >
                          tieColor: Schema.decodeTo<
                            Schema.Struct<{ readonly r: Schema.Int; readonly g: Schema.Int; readonly b: Schema.Int }>,
                            Schema.TemplateLiteralParser<
                              readonly [
                                Schema.compose<Schema.Finite, Schema.NumberFromString>,
                                ":",
                                Schema.compose<Schema.Finite, Schema.NumberFromString>,
                                ":",
                                Schema.compose<Schema.Finite, Schema.NumberFromString>
                              ]
                            >,
                            never,
                            never
                          >
                          hasHairAccessory: Schema.compose<
                            Schema.Boolean,
                            Schema.Union<
                              readonly [
                                Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                              ]
                            >
                          >
                          hairAccessoryIndex: Schema.compose<Schema.Number, Schema.NumberFromString>
                          hasBiHat: Schema.compose<
                            Schema.Boolean,
                            Schema.Union<
                              readonly [
                                Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                              ]
                            >
                          >
                          hasMaleHat: Schema.compose<
                            Schema.Boolean,
                            Schema.Union<
                              readonly [
                                Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                              ]
                            >
                          >
                          hasFemaleHat: Schema.compose<
                            Schema.Boolean,
                            Schema.Union<
                              readonly [
                                Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                              ]
                            >
                          >
                          hatIndex: Schema.compose<Schema.Number, Schema.NumberFromString>
                          hatColor: Schema.decodeTo<
                            Schema.Struct<{ readonly r: Schema.Int; readonly g: Schema.Int; readonly b: Schema.Int }>,
                            Schema.TemplateLiteralParser<
                              readonly [
                                Schema.compose<Schema.Finite, Schema.NumberFromString>,
                                ":",
                                Schema.compose<Schema.Finite, Schema.NumberFromString>,
                                ":",
                                Schema.compose<Schema.Finite, Schema.NumberFromString>
                              ]
                            >,
                            never,
                            never
                          >
                          hasEarrings: Schema.compose<
                            Schema.Boolean,
                            Schema.Union<
                              readonly [
                                Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                              ]
                            >
                          >
                          earringsColor: Schema.decodeTo<
                            Schema.Struct<{ readonly r: Schema.Int; readonly g: Schema.Int; readonly b: Schema.Int }>,
                            Schema.TemplateLiteralParser<
                              readonly [
                                Schema.compose<Schema.Finite, Schema.NumberFromString>,
                                ":",
                                Schema.compose<Schema.Finite, Schema.NumberFromString>,
                                ":",
                                Schema.compose<Schema.Finite, Schema.NumberFromString>
                              ]
                            >,
                            never,
                            never
                          >
                          skillFood: Schema.compose<Schema.Int, Schema.NumberFromString>
                          skillService: Schema.compose<Schema.Int, Schema.NumberFromString>
                          skillRecreation: Schema.compose<Schema.Int, Schema.NumberFromString>
                          skillRetail: Schema.compose<Schema.Int, Schema.NumberFromString>
                          skillCreative: Schema.compose<Schema.Int, Schema.NumberFromString>
                        } & { readonly $unknown: Schema.$Array<Schema.String> }
                      >,
                      Schema.String,
                      never,
                      never
                    >,
                    never,
                    never
                  >
                >
              } & {
                readonly $unknown: Schema.$Record<
                  Schema.String,
                  Schema.Struct<{
                    value: Schema.String
                    $locationMetadata: Schema.Struct<{ after: Schema.NullishOr<Schema.String> }>
                  }>
                >
              }
            >,
            Schema.String,
            never,
            never
          >
          readonly playerID: Schema.String
          readonly playerRegistered: Schema.NumberFromString
          readonly bzns: Schema.decodeTo<
            Schema.$Array<
              Schema.decodeTo<
                Schema.Struct<
                  {
                    readonly homeIndex: Schema.decodeTo<Schema.Int, Schema.NumberFromString, never, never>
                    readonly workIndex: Schema.decodeTo<Schema.Int, Schema.NumberFromString, never, never>
                    readonly placedDreamJob: Schema.decodeTo<
                      Schema.Boolean,
                      Schema.Literals<readonly ["0", "1"]>,
                      never,
                      never
                    >
                    readonly dreamJobIndex: Schema.decodeTo<Schema.Int, Schema.NumberFromString, never, never>
                    readonly costume: Schema.optionalKey<
                      Schema.Union<
                        readonly [
                          Schema.Literals<
                            Array<
                              | "blink"
                              | "_audioadsguy"
                              | "_parachute"
                              | "airline pilot"
                              | "aloha"
                              | "amigo"
                              | "angel"
                              | "apple_pie"
                              | "apron"
                              | "archaeologist"
                              | "astronaut"
                              | "avocado"
                              | "avocadont"
                              | "baby"
                              | "babyalien"
                              | "bald eagle"
                              | "balloon"
                              | "banana"
                              | "barber"
                              | "barista"
                              | "baseball uniform"
                              | "beach lifeguard"
                              | "beach_boy"
                              | "beach_girl"
                              | "bear"
                              | "bee suit"
                              | "bellhop"
                              | "betsy ross"
                              | "bikachu"
                              | "biker"
                              | "birthday"
                              | "reaper"
                              | "bitman"
                              | "black dress"
                              | "black ranger"
                              | "blacksmith"
                              | "blue egg"
                              | "blue ranger"
                              | "blue suit"
                              | "boxer"
                              | "brick"
                              | "bride"
                              | "brown dress"
                              | "buddy_elf"
                              | "bunny"
                              | "bunnyeaster"
                              | "burglar"
                              | "business suit"
                              | "butterfly"
                              | "candy_cane"
                              | "captain bit"
                              | "carrot"
                              | "cat suit"
                              | "caveman"
                              | "cheerleader"
                              | "cheese_wedge"
                              | "chef"
                              | "chick"
                              | "chicken"
                              | "chinese suit"
                              | "christmas rudolph"
                              | "christmas_boy"
                              | "christmas_carl"
                              | "christmas_elf"
                              | "christmas_tree"
                              | "clown"
                              | "coastguard"
                              | "construction"
                              | "convict"
                              | "cookie"
                              | "cool_bread"
                              | "corn"
                              | "corn_cob"
                              | "cossack"
                              | "cowboy"
                              | "creamy_bowl"
                              | "creepy"
                              | "delivery"
                              | "detective"
                              | "devil"
                              | "dinosaur"
                              | "disco"
                              | "diver"
                              | "dj"
                              | "doctor"
                              | "drumstick_buddy"
                              | "dummy"
                              | "egg"
                              | "elephant"
                              | "elf"
                              | "elvis"
                              | "emperor"
                              | "engineer"
                              | "evil_plant"
                              | "evilmistress"
                              | "executioner"
                              | "explorer"
                              | "eyepatch"
                              | "fairy"
                              | "famous construct"
                              | "farmer"
                              | "fast food uniform"
                              | "fireman"
                              | "fishing"
                              | "flower"
                              | "folklore"
                              | "football player"
                              | "french maid"
                              | "fried_egg"
                              | "frog suit"
                              | "g-man"
                              | "gangster"
                              | "geisha"
                              | "general washington"
                              | "gentleman"
                              | "ghost"
                              | "ghost arrow"
                              | "ghost devil"
                              | "ghost hexe"
                              | "ghost trick treat"
                              | "ghost vampire"
                              | "ghosthustler"
                              | "gift"
                              | "gingerbread"
                              | "gold dress"
                              | "golden_ornament"
                              | "golfer"
                              | "goth"
                              | "green ranger"
                              | "groom"
                              | "grunch"
                              | "guard"
                              | "hatchling"
                              | "hatchlingblue"
                              | "hay_bale"
                              | "hazmat"
                              | "heart"
                              | "hippie"
                              | "horse"
                              | "hotdog"
                              | "hula_girl"
                              | "hunter"
                              | "ice cream master"
                              | "ice queen"
                              | "icecube"
                              | "influencer"
                              | "inquisitor"
                              | "inuit"
                              | "ironbit"
                              | "jet helmet"
                              | "jolly_gift"
                              | "judge"
                              | "kangaroo"
                              | "karate outfit"
                              | "king"
                              | "knight"
                              | "krampus"
                              | "krampus_2"
                              | "lab coat"
                              | "lady"
                              | "leather jacket"
                              | "lecter"
                              | "leprechaun"
                              | "liberty"
                              | "lumberjack"
                              | "mad hatter"
                              | "mad scientist"
                              | "magician"
                              | "maid"
                              | "mama_claus"
                              | "mapple genius"
                              | "mask"
                              | "massive coat"
                              | "milk_glass"
                              | "milky"
                              | "mime"
                              | "miss_tletoe"
                              | "moai"
                              | "monkey"
                              | "monster suit"
                              | "mountie"
                              | "mr_pieman"
                              | "mummy"
                              | "native american"
                              | "neanderthal"
                              | "nerd"
                              | "ninja"
                              | "nurse"
                              | "old diver"
                              | "overalls"
                              | "panda hat"
                              | "panda suit"
                              | "paparazzi"
                              | "peppermint_candy"
                              | "phantom"
                              | "pharaoh"
                              | "photography lover"
                              | "piggy"
                              | "pilgrim"
                              | "pilgrim_man"
                              | "pilgrim_man_2"
                              | "pilgrim_woman"
                              | "pilgrim_woman_2"
                              | "pilot headset"
                              | "pinecone"
                              | "pink egg"
                              | "pink ranger"
                              | "pirate"
                              | "pizza"
                              | "plague"
                              | "plumber a"
                              | "plumber b"
                              | "pool lifeguard"
                              | "potato_bowl"
                              | "princess"
                              | "pumpkin"
                              | "pumpkin_man"
                              | "pumpkin_woman"
                              | "queen_bee"
                              | "racoon"
                              | "race driver"
                              | "red baron"
                              | "red dress"
                              | "red hat"
                              | "red ranger"
                              | "red suit"
                              | "red_ornament"
                              | "revolutionary british"
                              | "revolutionary usa"
                              | "rockstar"
                              | "roman"
                              | "rudolph_2"
                              | "runway"
                              | "sailor"
                              | "sakura"
                              | "salesman"
                              | "samurai"
                              | "sanitation"
                              | "santa"
                              | "santa_claus"
                              | "santas_hat"
                              | "security"
                              | "sera"
                              | "shark"
                              | "sheep"
                              | "shimmering_star"
                              | "skier a"
                              | "skier b"
                              | "snapdog"
                              | "snow_queen"
                              | "snowbit"
                              | "snowflake"
                              | "snowman"
                              | "soccer"
                              | "soldier"
                              | "sour_apple"
                              | "spaghetti_and_meatballs"
                              | "sparkling_ribbon"
                              | "spring_bee"
                              | "spring_bunny"
                              | "spud"
                              | "star captain"
                              | "stocking"
                              | "student tourist"
                              | "summer dj"
                              | "sumo"
                              | "sunflower"
                              | "super hero"
                              | "superbit"
                              | "surgeon"
                              | "swimmer"
                              | "toga"
                              | "tourist"
                              | "tourist diver"
                              | "travel agent"
                              | "tree_trunk"
                              | "trooper"
                              | "turkey_friend"
                              | "turkey_man"
                              | "turkey_woman"
                              | "uncle sam"
                              | "unicorn"
                              | "usher"
                              | "vampire"
                              | "viking"
                              | "waiter"
                              | "waldo"
                              | "watermelon"
                              | "werebit"
                              | "white suit"
                              | "witch"
                              | "yellow egg"
                              | "yellow ranger"
                              | "yeti"
                              | "young wizard"
                              | "zombie"
                              | "cyborg"
                              | "fez"
                              | "fishtank"
                              | "hot_cocoa"
                              | "robot"
                              | "snow_globe"
                            >
                          >,
                          Schema.String
                        ]
                      >
                    >
                    readonly vip: Schema.Union<
                      readonly [
                        Schema.Union<
                          readonly [
                            Schema.decodeTo<Schema.Literal<"None">, Schema.Literal<"0">, never, never>,
                            Schema.decodeTo<Schema.Literal<"Engineer">, Schema.Literal<"1">, never, never>,
                            Schema.decodeTo<Schema.Literal<"TravelAgent">, Schema.Literal<"2">, never, never>,
                            Schema.decodeTo<Schema.Literal<"Deliveryman">, Schema.Literal<"3">, never, never>,
                            Schema.decodeTo<Schema.Literal<"BigSpender">, Schema.Literal<"4">, never, never>,
                            Schema.decodeTo<Schema.Literal<"Celebrity">, Schema.Literal<"5">, never, never>,
                            Schema.decodeTo<Schema.Literal<"GiftBit">, Schema.Literal<"6">, never, never>
                          ]
                        >,
                        Schema.compose<Schema.Int, Schema.NumberFromString>
                      ]
                    >
                    readonly customName: Schema.optionalKey<Schema.String>
                    readonly pet: Schema.optionalKey<
                      Schema.Literals<
                        Array<
                          | "bald_eagle"
                          | "bear"
                          | "bee"
                          | "chick"
                          | "chicken"
                          | "christmas_rudolph"
                          | "egg"
                          | "elephant"
                          | "frog"
                          | "horse"
                          | "kangaroo"
                          | "monkey"
                          | "panda"
                          | "raccoon"
                          | "sheep"
                          | "snowman"
                          | "unicorn"
                          | "robot"
                          | "ankylosaurus"
                          | "beaver"
                          | "butterfly_blue"
                          | "cactus"
                          | "cat"
                          | "camel"
                          | "capybara"
                          | "chipmunk"
                          | "cockatoo"
                          | "cougar"
                          | "cow"
                          | "coyote"
                          | "crocodile"
                          | "dino_toy"
                          | "diplodocus"
                          | "direwolf"
                          | "dog"
                          | "dragon"
                          | "eagle"
                          | "echidna"
                          | "elk"
                          | "fox"
                          | "giraffe"
                          | "goat"
                          | "gorilla"
                          | "griffin"
                          | "hippo"
                          | "koala"
                          | "lemur"
                          | "lion"
                          | "mammoth"
                          | "moose"
                          | "muskox"
                          | "opossum"
                          | "otter"
                          | "owl"
                          | "penguin"
                          | "pika"
                          | "pig"
                          | "pigeon"
                          | "platypus"
                          | "polar_bear"
                          | "rabbit"
                          | "rat"
                          | "rhino"
                          | "rock"
                          | "rover"
                          | "seal"
                          | "skunk"
                          | "snake"
                          | "spider"
                          | "squirrel"
                          | "stegosaurus"
                          | "tiger"
                          | "toucan"
                          | "tribble"
                          | "triceratops"
                          | "turtle"
                          | "tyrannosaur"
                          | "velociraptor"
                          | "walrus"
                          | "zebra"
                          | "black_panther"
                          | "chameleon"
                          | "duck"
                          | "chicks"
                          | "lamb"
                          | "crow"
                          | "iguana"
                          | "redpanda"
                          | "badger"
                          | "black_bear"
                          | "bluejay"
                          | "rattlesnake"
                          | "sloth"
                          | "thylacine"
                          | "ant_farm"
                          | "crab"
                          | "octopus"
                          | "sponge"
                          | "ibex"
                          | "porcupine"
                          | "bat"
                          | "dog_skeleton"
                          | "slime"
                          | "tentacle"
                          | "artic_fox"
                          | "saint_bernard"
                          | "husky"
                          | "box_pet"
                          | "elasmotherium"
                          | "lemming"
                          | "snow_leopard"
                          | "armadillo"
                          | "hyena"
                          | "kiwi"
                          | "vulture"
                          | "komodo"
                          | "turkey"
                          | "deer"
                          | "christmas_penguin"
                          | "cat_in_a_bag"
                        >
                      >
                    >
                    readonly attributes: Schema.suspend<
                      Schema.decodeTo<
                        Schema.Struct<{
                          readonly $unknown: Schema.$Array<Schema.String>
                          readonly gender: Schema.Literals<readonly ["female", "male"]>
                          readonly name: Schema.String
                          readonly birthday: Schema.Tuple<readonly [Schema.Int, Schema.Int]>
                          readonly designColors: Schema.Struct<{
                            readonly pantColor: Schema.toType<
                              Schema.decodeTo<
                                Schema.Struct<{
                                  readonly r: Schema.Int
                                  readonly g: Schema.Int
                                  readonly b: Schema.Int
                                }>,
                                Schema.TemplateLiteralParser<
                                  readonly [
                                    Schema.compose<Schema.Finite, Schema.NumberFromString>,
                                    ":",
                                    Schema.compose<Schema.Finite, Schema.NumberFromString>,
                                    ":",
                                    Schema.compose<Schema.Finite, Schema.NumberFromString>
                                  ]
                                >,
                                never,
                                never
                              >
                            >
                            readonly shirtColor: Schema.toType<
                              Schema.decodeTo<
                                Schema.Struct<{
                                  readonly r: Schema.Int
                                  readonly g: Schema.Int
                                  readonly b: Schema.Int
                                }>,
                                Schema.TemplateLiteralParser<
                                  readonly [
                                    Schema.compose<Schema.Finite, Schema.NumberFromString>,
                                    ":",
                                    Schema.compose<Schema.Finite, Schema.NumberFromString>,
                                    ":",
                                    Schema.compose<Schema.Finite, Schema.NumberFromString>
                                  ]
                                >,
                                never,
                                never
                              >
                            >
                            readonly skinColorIndex: Schema.Number
                            readonly hairColorIndex: Schema.Number
                            readonly shoeColorIndex: Schema.Number
                          }>
                          readonly accessories: Schema.Struct<{
                            readonly glasses: Schema.Result<Schema.Number, Schema.Number>
                            readonly hairAccessory: Schema.Result<Schema.Number, Schema.Number>
                            readonly tie: Schema.Result<
                              Schema.toType<
                                Schema.decodeTo<
                                  Schema.Struct<{
                                    readonly r: Schema.Int
                                    readonly g: Schema.Int
                                    readonly b: Schema.Int
                                  }>,
                                  Schema.TemplateLiteralParser<
                                    readonly [
                                      Schema.compose<Schema.Finite, Schema.NumberFromString>,
                                      ":",
                                      Schema.compose<Schema.Finite, Schema.NumberFromString>,
                                      ":",
                                      Schema.compose<Schema.Finite, Schema.NumberFromString>
                                    ]
                                  >,
                                  never,
                                  never
                                >
                              >,
                              Schema.toType<
                                Schema.decodeTo<
                                  Schema.Struct<{
                                    readonly r: Schema.Int
                                    readonly g: Schema.Int
                                    readonly b: Schema.Int
                                  }>,
                                  Schema.TemplateLiteralParser<
                                    readonly [
                                      Schema.compose<Schema.Finite, Schema.NumberFromString>,
                                      ":",
                                      Schema.compose<Schema.Finite, Schema.NumberFromString>,
                                      ":",
                                      Schema.compose<Schema.Finite, Schema.NumberFromString>
                                    ]
                                  >,
                                  never,
                                  never
                                >
                              >
                            >
                            readonly earrings: Schema.Result<
                              Schema.toType<
                                Schema.decodeTo<
                                  Schema.Struct<{
                                    readonly r: Schema.Int
                                    readonly g: Schema.Int
                                    readonly b: Schema.Int
                                  }>,
                                  Schema.TemplateLiteralParser<
                                    readonly [
                                      Schema.compose<Schema.Finite, Schema.NumberFromString>,
                                      ":",
                                      Schema.compose<Schema.Finite, Schema.NumberFromString>,
                                      ":",
                                      Schema.compose<Schema.Finite, Schema.NumberFromString>
                                    ]
                                  >,
                                  never,
                                  never
                                >
                              >,
                              Schema.toType<
                                Schema.decodeTo<
                                  Schema.Struct<{
                                    readonly r: Schema.Int
                                    readonly g: Schema.Int
                                    readonly b: Schema.Int
                                  }>,
                                  Schema.TemplateLiteralParser<
                                    readonly [
                                      Schema.compose<Schema.Finite, Schema.NumberFromString>,
                                      ":",
                                      Schema.compose<Schema.Finite, Schema.NumberFromString>,
                                      ":",
                                      Schema.compose<Schema.Finite, Schema.NumberFromString>
                                    ]
                                  >,
                                  never,
                                  never
                                >
                              >
                            >
                            readonly hat: Schema.Result<
                              Schema.Struct<{
                                readonly index: Schema.Number
                                readonly gender: Schema.Literals<readonly ["female", "male", "bi"]>
                                readonly color: Schema.toType<
                                  Schema.decodeTo<
                                    Schema.Struct<{
                                      readonly r: Schema.Int
                                      readonly g: Schema.Int
                                      readonly b: Schema.Int
                                    }>,
                                    Schema.TemplateLiteralParser<
                                      readonly [
                                        Schema.compose<Schema.Finite, Schema.NumberFromString>,
                                        ":",
                                        Schema.compose<Schema.Finite, Schema.NumberFromString>,
                                        ":",
                                        Schema.compose<Schema.Finite, Schema.NumberFromString>
                                      ]
                                    >,
                                    never,
                                    never
                                  >
                                >
                              }>,
                              Schema.Struct<{
                                readonly index: Schema.Number
                                readonly color: Schema.toType<
                                  Schema.decodeTo<
                                    Schema.Struct<{
                                      readonly r: Schema.Int
                                      readonly g: Schema.Int
                                      readonly b: Schema.Int
                                    }>,
                                    Schema.TemplateLiteralParser<
                                      readonly [
                                        Schema.compose<Schema.Finite, Schema.NumberFromString>,
                                        ":",
                                        Schema.compose<Schema.Finite, Schema.NumberFromString>,
                                        ":",
                                        Schema.compose<Schema.Finite, Schema.NumberFromString>
                                      ]
                                    >,
                                    never,
                                    never
                                  >
                                >
                              }>
                            >
                          }>
                          readonly skills: Schema.Struct<{
                            readonly food: Schema.Int
                            readonly retail: Schema.Int
                            readonly service: Schema.Int
                            readonly creative: Schema.Int
                            readonly recreation: Schema.Int
                          }>
                        }>,
                        Schema.decodeTo<
                          Schema.Struct<
                            {
                              male: Schema.compose<
                                Schema.Boolean,
                                Schema.Union<
                                  readonly [
                                    Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                    Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                                  ]
                                >
                              >
                              firstNameIndex: Schema.compose<Schema.Number, Schema.NumberFromString>
                              lastNameIndex: Schema.compose<Schema.Number, Schema.NumberFromString>
                              birthMonth: Schema.compose<Schema.Int, Schema.NumberFromString>
                              birthDay: Schema.compose<Schema.Int, Schema.NumberFromString>
                              skinColorIndex: Schema.compose<Schema.Number, Schema.NumberFromString>
                              hairColorIndex: Schema.compose<Schema.Number, Schema.NumberFromString>
                              shoeColorIndex: Schema.compose<Schema.Number, Schema.NumberFromString>
                              pantColor: Schema.decodeTo<
                                Schema.Struct<{
                                  readonly r: Schema.Int
                                  readonly g: Schema.Int
                                  readonly b: Schema.Int
                                }>,
                                Schema.TemplateLiteralParser<
                                  readonly [
                                    Schema.compose<Schema.Finite, Schema.NumberFromString>,
                                    ":",
                                    Schema.compose<Schema.Finite, Schema.NumberFromString>,
                                    ":",
                                    Schema.compose<Schema.Finite, Schema.NumberFromString>
                                  ]
                                >,
                                never,
                                never
                              >
                              shirtColor: Schema.decodeTo<
                                Schema.Struct<{
                                  readonly r: Schema.Int
                                  readonly g: Schema.Int
                                  readonly b: Schema.Int
                                }>,
                                Schema.TemplateLiteralParser<
                                  readonly [
                                    Schema.compose<Schema.Finite, Schema.NumberFromString>,
                                    ":",
                                    Schema.compose<Schema.Finite, Schema.NumberFromString>,
                                    ":",
                                    Schema.compose<Schema.Finite, Schema.NumberFromString>
                                  ]
                                >,
                                never,
                                never
                              >
                              hasGlasses: Schema.compose<
                                Schema.Boolean,
                                Schema.Union<
                                  readonly [
                                    Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                    Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                                  ]
                                >
                              >
                              glassesIndex: Schema.compose<Schema.Number, Schema.NumberFromString>
                              hasTie: Schema.compose<
                                Schema.Boolean,
                                Schema.Union<
                                  readonly [
                                    Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                    Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                                  ]
                                >
                              >
                              tieColor: Schema.decodeTo<
                                Schema.Struct<{
                                  readonly r: Schema.Int
                                  readonly g: Schema.Int
                                  readonly b: Schema.Int
                                }>,
                                Schema.TemplateLiteralParser<
                                  readonly [
                                    Schema.compose<Schema.Finite, Schema.NumberFromString>,
                                    ":",
                                    Schema.compose<Schema.Finite, Schema.NumberFromString>,
                                    ":",
                                    Schema.compose<Schema.Finite, Schema.NumberFromString>
                                  ]
                                >,
                                never,
                                never
                              >
                              hasHairAccessory: Schema.compose<
                                Schema.Boolean,
                                Schema.Union<
                                  readonly [
                                    Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                    Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                                  ]
                                >
                              >
                              hairAccessoryIndex: Schema.compose<Schema.Number, Schema.NumberFromString>
                              hasBiHat: Schema.compose<
                                Schema.Boolean,
                                Schema.Union<
                                  readonly [
                                    Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                    Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                                  ]
                                >
                              >
                              hasMaleHat: Schema.compose<
                                Schema.Boolean,
                                Schema.Union<
                                  readonly [
                                    Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                    Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                                  ]
                                >
                              >
                              hasFemaleHat: Schema.compose<
                                Schema.Boolean,
                                Schema.Union<
                                  readonly [
                                    Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                    Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                                  ]
                                >
                              >
                              hatIndex: Schema.compose<Schema.Number, Schema.NumberFromString>
                              hatColor: Schema.decodeTo<
                                Schema.Struct<{
                                  readonly r: Schema.Int
                                  readonly g: Schema.Int
                                  readonly b: Schema.Int
                                }>,
                                Schema.TemplateLiteralParser<
                                  readonly [
                                    Schema.compose<Schema.Finite, Schema.NumberFromString>,
                                    ":",
                                    Schema.compose<Schema.Finite, Schema.NumberFromString>,
                                    ":",
                                    Schema.compose<Schema.Finite, Schema.NumberFromString>
                                  ]
                                >,
                                never,
                                never
                              >
                              hasEarrings: Schema.compose<
                                Schema.Boolean,
                                Schema.Union<
                                  readonly [
                                    Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                    Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                                  ]
                                >
                              >
                              earringsColor: Schema.decodeTo<
                                Schema.Struct<{
                                  readonly r: Schema.Int
                                  readonly g: Schema.Int
                                  readonly b: Schema.Int
                                }>,
                                Schema.TemplateLiteralParser<
                                  readonly [
                                    Schema.compose<Schema.Finite, Schema.NumberFromString>,
                                    ":",
                                    Schema.compose<Schema.Finite, Schema.NumberFromString>,
                                    ":",
                                    Schema.compose<Schema.Finite, Schema.NumberFromString>
                                  ]
                                >,
                                never,
                                never
                              >
                              skillFood: Schema.compose<Schema.Int, Schema.NumberFromString>
                              skillService: Schema.compose<Schema.Int, Schema.NumberFromString>
                              skillRecreation: Schema.compose<Schema.Int, Schema.NumberFromString>
                              skillRetail: Schema.compose<Schema.Int, Schema.NumberFromString>
                              skillCreative: Schema.compose<Schema.Int, Schema.NumberFromString>
                            } & { readonly $unknown: Schema.$Array<Schema.String> }
                          >,
                          Schema.String,
                          never,
                          never
                        >,
                        never,
                        never
                      >
                    >
                  } & {
                    readonly $unknown: Schema.$Record<
                      Schema.String,
                      Schema.Struct<{
                        value: Schema.String
                        $locationMetadata: Schema.Struct<{ after: Schema.NullishOr<Schema.String> }>
                      }>
                    >
                  }
                >,
                Schema.String,
                never,
                never
              >
            >,
            Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>,
            never,
            never
          >
          readonly stories: Schema.decodeTo<
            Schema.$Array<
              Schema.decodeTo<
                Schema.Struct<
                  {
                    readonly storyHeight: Schema.decodeTo<Schema.Int, Schema.NumberFromString, never, never>
                    readonly floorId: Schema.suspend<
                      Schema.decodeTo<
                        Schema.Union<Array<ValidFloorsSchema>>,
                        Schema.compose<ValidIndicesSchema, Schema.NumberFromString>,
                        never,
                        never
                      >
                    >
                    readonly level: Schema.decodeTo<Schema.Int, Schema.NumberFromString, never, never>
                    readonly openDate: Schema.decodeTo<
                      Schema.decodeTo<
                        Schema.Union<
                          readonly [
                            Schema.Date,
                            Schema.Struct<{ readonly date: Schema.Date; readonly extraTicks: Schema.BigInt }>
                          ]
                        >,
                        Schema.BigInt,
                        never,
                        never
                      >,
                      Schema.BigIntFromString,
                      never,
                      never
                    >
                    readonly stockBaseTime: Schema.String
                    readonly stockingTier: Schema.decodeTo<Schema.Int, Schema.NumberFromString, never, never>
                    readonly stockingStartTime: Schema.decodeTo<
                      Schema.decodeTo<
                        Schema.Union<
                          readonly [
                            Schema.Date,
                            Schema.Struct<{ readonly date: Schema.Date; readonly extraTicks: Schema.BigInt }>
                          ]
                        >,
                        Schema.BigInt,
                        never,
                        never
                      >,
                      Schema.BigIntFromString,
                      never,
                      never
                    >
                    readonly stocks: Schema.decodeTo<
                      Schema.$Array<Schema.BigIntFromString>,
                      Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>,
                      never,
                      never
                    >
                    readonly lastSaleTicks: Schema.decodeTo<
                      Schema.$Array<
                        Schema.compose<
                          Schema.decodeTo<
                            Schema.Union<
                              readonly [
                                Schema.Date,
                                Schema.Struct<{ readonly date: Schema.Date; readonly extraTicks: Schema.BigInt }>
                              ]
                            >,
                            Schema.BigInt,
                            never,
                            never
                          >,
                          Schema.BigIntFromString
                        >
                      >,
                      Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>,
                      never,
                      never
                    >
                    readonly floorName: Schema.String
                    readonly floorPaint: Schema.optionalKey<Schema.String>
                  } & {
                    readonly $unknown: Schema.$Record<
                      Schema.String,
                      Schema.Struct<{
                        value: Schema.String
                        $locationMetadata: Schema.Struct<{ after: Schema.NullishOr<Schema.String> }>
                      }>
                    >
                  }
                >,
                Schema.String,
                never,
                never
              >
            >,
            Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>,
            never,
            never
          >
          readonly friends: Schema.optionalKey<
            Schema.compose<
              Schema.Union<
                readonly [
                  Schema.Literal<"">,
                  Schema.compose<
                    Schema.$Array<
                      Schema.Union<
                        readonly [
                          Schema.decodeTo<
                            Schema.Struct<{
                              readonly displayName: Schema.String
                              readonly friendId: Schema.toType<Schema.brand<Schema.String, "PlayerId">>
                              readonly timestamp: Schema.toType<
                                Schema.decodeTo<
                                  Schema.Union<
                                    readonly [
                                      Schema.Date,
                                      Schema.Struct<{ readonly date: Schema.Date; readonly extraTicks: Schema.BigInt }>
                                    ]
                                  >,
                                  Schema.BigInt,
                                  never,
                                  never
                                >
                              >
                            }>,
                            Schema.TemplateLiteralParser<
                              readonly [
                                Schema.String,
                                "|",
                                Schema.brand<Schema.String, "PlayerId">,
                                "|",
                                Schema.decodeTo<
                                  Schema.Union<
                                    readonly [
                                      Schema.Date,
                                      Schema.Struct<{ readonly date: Schema.Date; readonly extraTicks: Schema.BigInt }>
                                    ]
                                  >,
                                  Schema.BigInt,
                                  never,
                                  never
                                >
                              ]
                            >,
                            never,
                            never
                          >,
                          Schema.decodeTo<
                            Schema.Struct<{
                              readonly displayName: Schema.String
                              readonly friendId: Schema.toType<Schema.brand<Schema.String, "PlayerId">>
                            }>,
                            Schema.TemplateLiteralParser<
                              readonly [Schema.String, "|", Schema.brand<Schema.String, "PlayerId">]
                            >,
                            never,
                            never
                          >
                        ]
                      >
                    >,
                    Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>
                  >
                ]
              >,
              Schema.String
            >
          >
          readonly bbPosts: Schema.decodeTo<
            Schema.$Array<
              Schema.decodeTo<
                Schema.Struct<
                  {
                    readonly tid: Schema.String
                    readonly bitizen: Schema.decodeTo<
                      Schema.Struct<
                        {
                          readonly homeIndex: Schema.decodeTo<Schema.Int, Schema.NumberFromString, never, never>
                          readonly workIndex: Schema.decodeTo<Schema.Int, Schema.NumberFromString, never, never>
                          readonly placedDreamJob: Schema.decodeTo<
                            Schema.Boolean,
                            Schema.Literals<readonly ["0", "1"]>,
                            never,
                            never
                          >
                          readonly dreamJobIndex: Schema.decodeTo<Schema.Int, Schema.NumberFromString, never, never>
                          readonly costume: Schema.optionalKey<
                            Schema.Union<
                              readonly [
                                Schema.Literals<
                                  Array<
                                    | "blink"
                                    | "_audioadsguy"
                                    | "_parachute"
                                    | "airline pilot"
                                    | "aloha"
                                    | "amigo"
                                    | "angel"
                                    | "apple_pie"
                                    | "apron"
                                    | "archaeologist"
                                    | "astronaut"
                                    | "avocado"
                                    | "avocadont"
                                    | "baby"
                                    | "babyalien"
                                    | "bald eagle"
                                    | "balloon"
                                    | "banana"
                                    | "barber"
                                    | "barista"
                                    | "baseball uniform"
                                    | "beach lifeguard"
                                    | "beach_boy"
                                    | "beach_girl"
                                    | "bear"
                                    | "bee suit"
                                    | "bellhop"
                                    | "betsy ross"
                                    | "bikachu"
                                    | "biker"
                                    | "birthday"
                                    | "reaper"
                                    | "bitman"
                                    | "black dress"
                                    | "black ranger"
                                    | "blacksmith"
                                    | "blue egg"
                                    | "blue ranger"
                                    | "blue suit"
                                    | "boxer"
                                    | "brick"
                                    | "bride"
                                    | "brown dress"
                                    | "buddy_elf"
                                    | "bunny"
                                    | "bunnyeaster"
                                    | "burglar"
                                    | "business suit"
                                    | "butterfly"
                                    | "candy_cane"
                                    | "captain bit"
                                    | "carrot"
                                    | "cat suit"
                                    | "caveman"
                                    | "cheerleader"
                                    | "cheese_wedge"
                                    | "chef"
                                    | "chick"
                                    | "chicken"
                                    | "chinese suit"
                                    | "christmas rudolph"
                                    | "christmas_boy"
                                    | "christmas_carl"
                                    | "christmas_elf"
                                    | "christmas_tree"
                                    | "clown"
                                    | "coastguard"
                                    | "construction"
                                    | "convict"
                                    | "cookie"
                                    | "cool_bread"
                                    | "corn"
                                    | "corn_cob"
                                    | "cossack"
                                    | "cowboy"
                                    | "creamy_bowl"
                                    | "creepy"
                                    | "delivery"
                                    | "detective"
                                    | "devil"
                                    | "dinosaur"
                                    | "disco"
                                    | "diver"
                                    | "dj"
                                    | "doctor"
                                    | "drumstick_buddy"
                                    | "dummy"
                                    | "egg"
                                    | "elephant"
                                    | "elf"
                                    | "elvis"
                                    | "emperor"
                                    | "engineer"
                                    | "evil_plant"
                                    | "evilmistress"
                                    | "executioner"
                                    | "explorer"
                                    | "eyepatch"
                                    | "fairy"
                                    | "famous construct"
                                    | "farmer"
                                    | "fast food uniform"
                                    | "fireman"
                                    | "fishing"
                                    | "flower"
                                    | "folklore"
                                    | "football player"
                                    | "french maid"
                                    | "fried_egg"
                                    | "frog suit"
                                    | "g-man"
                                    | "gangster"
                                    | "geisha"
                                    | "general washington"
                                    | "gentleman"
                                    | "ghost"
                                    | "ghost arrow"
                                    | "ghost devil"
                                    | "ghost hexe"
                                    | "ghost trick treat"
                                    | "ghost vampire"
                                    | "ghosthustler"
                                    | "gift"
                                    | "gingerbread"
                                    | "gold dress"
                                    | "golden_ornament"
                                    | "golfer"
                                    | "goth"
                                    | "green ranger"
                                    | "groom"
                                    | "grunch"
                                    | "guard"
                                    | "hatchling"
                                    | "hatchlingblue"
                                    | "hay_bale"
                                    | "hazmat"
                                    | "heart"
                                    | "hippie"
                                    | "horse"
                                    | "hotdog"
                                    | "hula_girl"
                                    | "hunter"
                                    | "ice cream master"
                                    | "ice queen"
                                    | "icecube"
                                    | "influencer"
                                    | "inquisitor"
                                    | "inuit"
                                    | "ironbit"
                                    | "jet helmet"
                                    | "jolly_gift"
                                    | "judge"
                                    | "kangaroo"
                                    | "karate outfit"
                                    | "king"
                                    | "knight"
                                    | "krampus"
                                    | "krampus_2"
                                    | "lab coat"
                                    | "lady"
                                    | "leather jacket"
                                    | "lecter"
                                    | "leprechaun"
                                    | "liberty"
                                    | "lumberjack"
                                    | "mad hatter"
                                    | "mad scientist"
                                    | "magician"
                                    | "maid"
                                    | "mama_claus"
                                    | "mapple genius"
                                    | "mask"
                                    | "massive coat"
                                    | "milk_glass"
                                    | "milky"
                                    | "mime"
                                    | "miss_tletoe"
                                    | "moai"
                                    | "monkey"
                                    | "monster suit"
                                    | "mountie"
                                    | "mr_pieman"
                                    | "mummy"
                                    | "native american"
                                    | "neanderthal"
                                    | "nerd"
                                    | "ninja"
                                    | "nurse"
                                    | "old diver"
                                    | "overalls"
                                    | "panda hat"
                                    | "panda suit"
                                    | "paparazzi"
                                    | "peppermint_candy"
                                    | "phantom"
                                    | "pharaoh"
                                    | "photography lover"
                                    | "piggy"
                                    | "pilgrim"
                                    | "pilgrim_man"
                                    | "pilgrim_man_2"
                                    | "pilgrim_woman"
                                    | "pilgrim_woman_2"
                                    | "pilot headset"
                                    | "pinecone"
                                    | "pink egg"
                                    | "pink ranger"
                                    | "pirate"
                                    | "pizza"
                                    | "plague"
                                    | "plumber a"
                                    | "plumber b"
                                    | "pool lifeguard"
                                    | "potato_bowl"
                                    | "princess"
                                    | "pumpkin"
                                    | "pumpkin_man"
                                    | "pumpkin_woman"
                                    | "queen_bee"
                                    | "racoon"
                                    | "race driver"
                                    | "red baron"
                                    | "red dress"
                                    | "red hat"
                                    | "red ranger"
                                    | "red suit"
                                    | "red_ornament"
                                    | "revolutionary british"
                                    | "revolutionary usa"
                                    | "rockstar"
                                    | "roman"
                                    | "rudolph_2"
                                    | "runway"
                                    | "sailor"
                                    | "sakura"
                                    | "salesman"
                                    | "samurai"
                                    | "sanitation"
                                    | "santa"
                                    | "santa_claus"
                                    | "santas_hat"
                                    | "security"
                                    | "sera"
                                    | "shark"
                                    | "sheep"
                                    | "shimmering_star"
                                    | "skier a"
                                    | "skier b"
                                    | "snapdog"
                                    | "snow_queen"
                                    | "snowbit"
                                    | "snowflake"
                                    | "snowman"
                                    | "soccer"
                                    | "soldier"
                                    | "sour_apple"
                                    | "spaghetti_and_meatballs"
                                    | "sparkling_ribbon"
                                    | "spring_bee"
                                    | "spring_bunny"
                                    | "spud"
                                    | "star captain"
                                    | "stocking"
                                    | "student tourist"
                                    | "summer dj"
                                    | "sumo"
                                    | "sunflower"
                                    | "super hero"
                                    | "superbit"
                                    | "surgeon"
                                    | "swimmer"
                                    | "toga"
                                    | "tourist"
                                    | "tourist diver"
                                    | "travel agent"
                                    | "tree_trunk"
                                    | "trooper"
                                    | "turkey_friend"
                                    | "turkey_man"
                                    | "turkey_woman"
                                    | "uncle sam"
                                    | "unicorn"
                                    | "usher"
                                    | "vampire"
                                    | "viking"
                                    | "waiter"
                                    | "waldo"
                                    | "watermelon"
                                    | "werebit"
                                    | "white suit"
                                    | "witch"
                                    | "yellow egg"
                                    | "yellow ranger"
                                    | "yeti"
                                    | "young wizard"
                                    | "zombie"
                                    | "cyborg"
                                    | "fez"
                                    | "fishtank"
                                    | "hot_cocoa"
                                    | "robot"
                                    | "snow_globe"
                                  >
                                >,
                                Schema.String
                              ]
                            >
                          >
                          readonly vip: Schema.Union<
                            readonly [
                              Schema.Union<
                                readonly [
                                  Schema.decodeTo<Schema.Literal<"None">, Schema.Literal<"0">, never, never>,
                                  Schema.decodeTo<Schema.Literal<"Engineer">, Schema.Literal<"1">, never, never>,
                                  Schema.decodeTo<Schema.Literal<"TravelAgent">, Schema.Literal<"2">, never, never>,
                                  Schema.decodeTo<Schema.Literal<"Deliveryman">, Schema.Literal<"3">, never, never>,
                                  Schema.decodeTo<Schema.Literal<"BigSpender">, Schema.Literal<"4">, never, never>,
                                  Schema.decodeTo<Schema.Literal<"Celebrity">, Schema.Literal<"5">, never, never>,
                                  Schema.decodeTo<Schema.Literal<"GiftBit">, Schema.Literal<"6">, never, never>
                                ]
                              >,
                              Schema.compose<Schema.Int, Schema.NumberFromString>
                            ]
                          >
                          readonly customName: Schema.optionalKey<Schema.String>
                          readonly pet: Schema.optionalKey<
                            Schema.Literals<
                              Array<
                                | "bald_eagle"
                                | "bear"
                                | "bee"
                                | "chick"
                                | "chicken"
                                | "christmas_rudolph"
                                | "egg"
                                | "elephant"
                                | "frog"
                                | "horse"
                                | "kangaroo"
                                | "monkey"
                                | "panda"
                                | "raccoon"
                                | "sheep"
                                | "snowman"
                                | "unicorn"
                                | "robot"
                                | "ankylosaurus"
                                | "beaver"
                                | "butterfly_blue"
                                | "cactus"
                                | "cat"
                                | "camel"
                                | "capybara"
                                | "chipmunk"
                                | "cockatoo"
                                | "cougar"
                                | "cow"
                                | "coyote"
                                | "crocodile"
                                | "dino_toy"
                                | "diplodocus"
                                | "direwolf"
                                | "dog"
                                | "dragon"
                                | "eagle"
                                | "echidna"
                                | "elk"
                                | "fox"
                                | "giraffe"
                                | "goat"
                                | "gorilla"
                                | "griffin"
                                | "hippo"
                                | "koala"
                                | "lemur"
                                | "lion"
                                | "mammoth"
                                | "moose"
                                | "muskox"
                                | "opossum"
                                | "otter"
                                | "owl"
                                | "penguin"
                                | "pika"
                                | "pig"
                                | "pigeon"
                                | "platypus"
                                | "polar_bear"
                                | "rabbit"
                                | "rat"
                                | "rhino"
                                | "rock"
                                | "rover"
                                | "seal"
                                | "skunk"
                                | "snake"
                                | "spider"
                                | "squirrel"
                                | "stegosaurus"
                                | "tiger"
                                | "toucan"
                                | "tribble"
                                | "triceratops"
                                | "turtle"
                                | "tyrannosaur"
                                | "velociraptor"
                                | "walrus"
                                | "zebra"
                                | "black_panther"
                                | "chameleon"
                                | "duck"
                                | "chicks"
                                | "lamb"
                                | "crow"
                                | "iguana"
                                | "redpanda"
                                | "badger"
                                | "black_bear"
                                | "bluejay"
                                | "rattlesnake"
                                | "sloth"
                                | "thylacine"
                                | "ant_farm"
                                | "crab"
                                | "octopus"
                                | "sponge"
                                | "ibex"
                                | "porcupine"
                                | "bat"
                                | "dog_skeleton"
                                | "slime"
                                | "tentacle"
                                | "artic_fox"
                                | "saint_bernard"
                                | "husky"
                                | "box_pet"
                                | "elasmotherium"
                                | "lemming"
                                | "snow_leopard"
                                | "armadillo"
                                | "hyena"
                                | "kiwi"
                                | "vulture"
                                | "komodo"
                                | "turkey"
                                | "deer"
                                | "christmas_penguin"
                                | "cat_in_a_bag"
                              >
                            >
                          >
                          readonly attributes: Schema.suspend<
                            Schema.decodeTo<
                              Schema.Struct<{
                                readonly $unknown: Schema.$Array<Schema.String>
                                readonly gender: Schema.Literals<readonly ["female", "male"]>
                                readonly name: Schema.String
                                readonly birthday: Schema.Tuple<readonly [Schema.Int, Schema.Int]>
                                readonly designColors: Schema.Struct<{
                                  readonly pantColor: Schema.toType<
                                    Schema.decodeTo<
                                      Schema.Struct<{
                                        readonly r: Schema.Int
                                        readonly g: Schema.Int
                                        readonly b: Schema.Int
                                      }>,
                                      Schema.TemplateLiteralParser<
                                        readonly [
                                          Schema.compose<Schema.Finite, Schema.NumberFromString>,
                                          ":",
                                          Schema.compose<Schema.Finite, Schema.NumberFromString>,
                                          ":",
                                          Schema.compose<Schema.Finite, Schema.NumberFromString>
                                        ]
                                      >,
                                      never,
                                      never
                                    >
                                  >
                                  readonly shirtColor: Schema.toType<
                                    Schema.decodeTo<
                                      Schema.Struct<{
                                        readonly r: Schema.Int
                                        readonly g: Schema.Int
                                        readonly b: Schema.Int
                                      }>,
                                      Schema.TemplateLiteralParser<
                                        readonly [
                                          Schema.compose<Schema.Finite, Schema.NumberFromString>,
                                          ":",
                                          Schema.compose<Schema.Finite, Schema.NumberFromString>,
                                          ":",
                                          Schema.compose<Schema.Finite, Schema.NumberFromString>
                                        ]
                                      >,
                                      never,
                                      never
                                    >
                                  >
                                  readonly skinColorIndex: Schema.Number
                                  readonly hairColorIndex: Schema.Number
                                  readonly shoeColorIndex: Schema.Number
                                }>
                                readonly accessories: Schema.Struct<{
                                  readonly glasses: Schema.Result<Schema.Number, Schema.Number>
                                  readonly hairAccessory: Schema.Result<Schema.Number, Schema.Number>
                                  readonly tie: Schema.Result<
                                    Schema.toType<
                                      Schema.decodeTo<
                                        Schema.Struct<{
                                          readonly r: Schema.Int
                                          readonly g: Schema.Int
                                          readonly b: Schema.Int
                                        }>,
                                        Schema.TemplateLiteralParser<
                                          readonly [
                                            Schema.compose<Schema.Finite, Schema.NumberFromString>,
                                            ":",
                                            Schema.compose<Schema.Finite, Schema.NumberFromString>,
                                            ":",
                                            Schema.compose<Schema.Finite, Schema.NumberFromString>
                                          ]
                                        >,
                                        never,
                                        never
                                      >
                                    >,
                                    Schema.toType<
                                      Schema.decodeTo<
                                        Schema.Struct<{
                                          readonly r: Schema.Int
                                          readonly g: Schema.Int
                                          readonly b: Schema.Int
                                        }>,
                                        Schema.TemplateLiteralParser<
                                          readonly [
                                            Schema.compose<Schema.Finite, Schema.NumberFromString>,
                                            ":",
                                            Schema.compose<Schema.Finite, Schema.NumberFromString>,
                                            ":",
                                            Schema.compose<Schema.Finite, Schema.NumberFromString>
                                          ]
                                        >,
                                        never,
                                        never
                                      >
                                    >
                                  >
                                  readonly earrings: Schema.Result<
                                    Schema.toType<
                                      Schema.decodeTo<
                                        Schema.Struct<{
                                          readonly r: Schema.Int
                                          readonly g: Schema.Int
                                          readonly b: Schema.Int
                                        }>,
                                        Schema.TemplateLiteralParser<
                                          readonly [
                                            Schema.compose<Schema.Finite, Schema.NumberFromString>,
                                            ":",
                                            Schema.compose<Schema.Finite, Schema.NumberFromString>,
                                            ":",
                                            Schema.compose<Schema.Finite, Schema.NumberFromString>
                                          ]
                                        >,
                                        never,
                                        never
                                      >
                                    >,
                                    Schema.toType<
                                      Schema.decodeTo<
                                        Schema.Struct<{
                                          readonly r: Schema.Int
                                          readonly g: Schema.Int
                                          readonly b: Schema.Int
                                        }>,
                                        Schema.TemplateLiteralParser<
                                          readonly [
                                            Schema.compose<Schema.Finite, Schema.NumberFromString>,
                                            ":",
                                            Schema.compose<Schema.Finite, Schema.NumberFromString>,
                                            ":",
                                            Schema.compose<Schema.Finite, Schema.NumberFromString>
                                          ]
                                        >,
                                        never,
                                        never
                                      >
                                    >
                                  >
                                  readonly hat: Schema.Result<
                                    Schema.Struct<{
                                      readonly index: Schema.Number
                                      readonly gender: Schema.Literals<readonly ["female", "male", "bi"]>
                                      readonly color: Schema.toType<
                                        Schema.decodeTo<
                                          Schema.Struct<{
                                            readonly r: Schema.Int
                                            readonly g: Schema.Int
                                            readonly b: Schema.Int
                                          }>,
                                          Schema.TemplateLiteralParser<
                                            readonly [
                                              Schema.compose<Schema.Finite, Schema.NumberFromString>,
                                              ":",
                                              Schema.compose<Schema.Finite, Schema.NumberFromString>,
                                              ":",
                                              Schema.compose<Schema.Finite, Schema.NumberFromString>
                                            ]
                                          >,
                                          never,
                                          never
                                        >
                                      >
                                    }>,
                                    Schema.Struct<{
                                      readonly index: Schema.Number
                                      readonly color: Schema.toType<
                                        Schema.decodeTo<
                                          Schema.Struct<{
                                            readonly r: Schema.Int
                                            readonly g: Schema.Int
                                            readonly b: Schema.Int
                                          }>,
                                          Schema.TemplateLiteralParser<
                                            readonly [
                                              Schema.compose<Schema.Finite, Schema.NumberFromString>,
                                              ":",
                                              Schema.compose<Schema.Finite, Schema.NumberFromString>,
                                              ":",
                                              Schema.compose<Schema.Finite, Schema.NumberFromString>
                                            ]
                                          >,
                                          never,
                                          never
                                        >
                                      >
                                    }>
                                  >
                                }>
                                readonly skills: Schema.Struct<{
                                  readonly food: Schema.Int
                                  readonly retail: Schema.Int
                                  readonly service: Schema.Int
                                  readonly creative: Schema.Int
                                  readonly recreation: Schema.Int
                                }>
                              }>,
                              Schema.decodeTo<
                                Schema.Struct<
                                  {
                                    male: Schema.compose<
                                      Schema.Boolean,
                                      Schema.Union<
                                        readonly [
                                          Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                          Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                                        ]
                                      >
                                    >
                                    firstNameIndex: Schema.compose<Schema.Number, Schema.NumberFromString>
                                    lastNameIndex: Schema.compose<Schema.Number, Schema.NumberFromString>
                                    birthMonth: Schema.compose<Schema.Int, Schema.NumberFromString>
                                    birthDay: Schema.compose<Schema.Int, Schema.NumberFromString>
                                    skinColorIndex: Schema.compose<Schema.Number, Schema.NumberFromString>
                                    hairColorIndex: Schema.compose<Schema.Number, Schema.NumberFromString>
                                    shoeColorIndex: Schema.compose<Schema.Number, Schema.NumberFromString>
                                    pantColor: Schema.decodeTo<
                                      Schema.Struct<{
                                        readonly r: Schema.Int
                                        readonly g: Schema.Int
                                        readonly b: Schema.Int
                                      }>,
                                      Schema.TemplateLiteralParser<
                                        readonly [
                                          Schema.compose<Schema.Finite, Schema.NumberFromString>,
                                          ":",
                                          Schema.compose<Schema.Finite, Schema.NumberFromString>,
                                          ":",
                                          Schema.compose<Schema.Finite, Schema.NumberFromString>
                                        ]
                                      >,
                                      never,
                                      never
                                    >
                                    shirtColor: Schema.decodeTo<
                                      Schema.Struct<{
                                        readonly r: Schema.Int
                                        readonly g: Schema.Int
                                        readonly b: Schema.Int
                                      }>,
                                      Schema.TemplateLiteralParser<
                                        readonly [
                                          Schema.compose<Schema.Finite, Schema.NumberFromString>,
                                          ":",
                                          Schema.compose<Schema.Finite, Schema.NumberFromString>,
                                          ":",
                                          Schema.compose<Schema.Finite, Schema.NumberFromString>
                                        ]
                                      >,
                                      never,
                                      never
                                    >
                                    hasGlasses: Schema.compose<
                                      Schema.Boolean,
                                      Schema.Union<
                                        readonly [
                                          Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                          Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                                        ]
                                      >
                                    >
                                    glassesIndex: Schema.compose<Schema.Number, Schema.NumberFromString>
                                    hasTie: Schema.compose<
                                      Schema.Boolean,
                                      Schema.Union<
                                        readonly [
                                          Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                          Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                                        ]
                                      >
                                    >
                                    tieColor: Schema.decodeTo<
                                      Schema.Struct<{
                                        readonly r: Schema.Int
                                        readonly g: Schema.Int
                                        readonly b: Schema.Int
                                      }>,
                                      Schema.TemplateLiteralParser<
                                        readonly [
                                          Schema.compose<Schema.Finite, Schema.NumberFromString>,
                                          ":",
                                          Schema.compose<Schema.Finite, Schema.NumberFromString>,
                                          ":",
                                          Schema.compose<Schema.Finite, Schema.NumberFromString>
                                        ]
                                      >,
                                      never,
                                      never
                                    >
                                    hasHairAccessory: Schema.compose<
                                      Schema.Boolean,
                                      Schema.Union<
                                        readonly [
                                          Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                          Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                                        ]
                                      >
                                    >
                                    hairAccessoryIndex: Schema.compose<Schema.Number, Schema.NumberFromString>
                                    hasBiHat: Schema.compose<
                                      Schema.Boolean,
                                      Schema.Union<
                                        readonly [
                                          Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                          Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                                        ]
                                      >
                                    >
                                    hasMaleHat: Schema.compose<
                                      Schema.Boolean,
                                      Schema.Union<
                                        readonly [
                                          Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                          Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                                        ]
                                      >
                                    >
                                    hasFemaleHat: Schema.compose<
                                      Schema.Boolean,
                                      Schema.Union<
                                        readonly [
                                          Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                          Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                                        ]
                                      >
                                    >
                                    hatIndex: Schema.compose<Schema.Number, Schema.NumberFromString>
                                    hatColor: Schema.decodeTo<
                                      Schema.Struct<{
                                        readonly r: Schema.Int
                                        readonly g: Schema.Int
                                        readonly b: Schema.Int
                                      }>,
                                      Schema.TemplateLiteralParser<
                                        readonly [
                                          Schema.compose<Schema.Finite, Schema.NumberFromString>,
                                          ":",
                                          Schema.compose<Schema.Finite, Schema.NumberFromString>,
                                          ":",
                                          Schema.compose<Schema.Finite, Schema.NumberFromString>
                                        ]
                                      >,
                                      never,
                                      never
                                    >
                                    hasEarrings: Schema.compose<
                                      Schema.Boolean,
                                      Schema.Union<
                                        readonly [
                                          Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                                          Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                                        ]
                                      >
                                    >
                                    earringsColor: Schema.decodeTo<
                                      Schema.Struct<{
                                        readonly r: Schema.Int
                                        readonly g: Schema.Int
                                        readonly b: Schema.Int
                                      }>,
                                      Schema.TemplateLiteralParser<
                                        readonly [
                                          Schema.compose<Schema.Finite, Schema.NumberFromString>,
                                          ":",
                                          Schema.compose<Schema.Finite, Schema.NumberFromString>,
                                          ":",
                                          Schema.compose<Schema.Finite, Schema.NumberFromString>
                                        ]
                                      >,
                                      never,
                                      never
                                    >
                                    skillFood: Schema.compose<Schema.Int, Schema.NumberFromString>
                                    skillService: Schema.compose<Schema.Int, Schema.NumberFromString>
                                    skillRecreation: Schema.compose<Schema.Int, Schema.NumberFromString>
                                    skillRetail: Schema.compose<Schema.Int, Schema.NumberFromString>
                                    skillCreative: Schema.compose<Schema.Int, Schema.NumberFromString>
                                  } & { readonly $unknown: Schema.$Array<Schema.String> }
                                >,
                                Schema.String,
                                never,
                                never
                              >,
                              never,
                              never
                            >
                          >
                        } & {
                          readonly $unknown: Schema.$Record<
                            Schema.String,
                            Schema.Struct<{
                              value: Schema.String
                              $locationMetadata: Schema.Struct<{ after: Schema.NullishOr<Schema.String> }>
                            }>
                          >
                        }
                      >,
                      Schema.String,
                      never,
                      never
                    >
                    readonly source_name: Schema.String
                    readonly date: Schema.decodeTo<
                      Schema.decodeTo<
                        Schema.Union<
                          readonly [
                            Schema.Date,
                            Schema.Struct<{ readonly date: Schema.Date; readonly extraTicks: Schema.BigInt }>
                          ]
                        >,
                        Schema.BigInt,
                        never,
                        never
                      >,
                      Schema.BigIntFromString,
                      never,
                      never
                    >
                    readonly body: Schema.String
                    readonly media_type: Schema.String
                    readonly media_path: Schema.String
                    readonly likes: Schema.decodeTo<Schema.Int, Schema.NumberFromString, never, never>
                  } & {
                    readonly $unknown: Schema.$Record<
                      Schema.String,
                      Schema.Struct<{
                        value: Schema.String
                        $locationMetadata: Schema.Struct<{ after: Schema.NullishOr<Schema.String> }>
                      }>
                    >
                  }
                >,
                Schema.String,
                never,
                never
              >
            >,
            Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never, never>,
            never,
            never
          >
          readonly bbpost: Schema.String
        } & {
          readonly $unknown: Schema.$Record<
            Schema.String,
            Schema.Struct<{
              value: Schema.String
              $locationMetadata: Schema.Struct<{ after: Schema.NullishOr<Schema.String> }>
            }>
          >
        }
      >,
      Schema.String,
      never,
      never
    >,
    Schema.String,
    never,
    never
  >
>
```

[Source](https://github.com/leonitousconforti/tinyburg/packages/tinytower-sdk/blob/main/src/TinyTower.ts#L34)

Since v1.0.0
