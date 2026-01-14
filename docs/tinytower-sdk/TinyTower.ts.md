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
  NimblebitError | HttpApiDecodeError | BadRequest | Unauthorized | InternalServerError | HttpClientError | ParseError,
  NimblebitAuth.NimblebitAuth | HttpClient.HttpClient
>
```

[Source](https://github.com/leonitousconforti/tinyburg/packages/tinytower-sdk/blob/main/src/TinyTower.ts#L117)

Since v1.0.0

## device_playerDetails

Retrieves player details from the Nimblebit servers.

**Signature**

```ts
declare const device_playerDetails: (args_0: {
  readonly playerId: string & Brand<"PlayerId">
  readonly playerAuthKey: Redacted.Redacted<string> & Brand<"PlayerAuthKey">
}) => Effect.Effect<
  {
    readonly playerId: string & Brand<"PlayerId">
    readonly playerEmail: Redacted.Redacted<string> & Brand<"PlayerEmail">
    readonly registered: boolean
    readonly blacklisted: boolean
  },
  NimblebitError | HttpApiDecodeError | BadRequest | Unauthorized | InternalServerError | HttpClientError | ParseError,
  NimblebitAuth.NimblebitAuth | HttpClient.HttpClient
>
```

[Source](https://github.com/leonitousconforti/tinyburg/packages/tinytower-sdk/blob/main/src/TinyTower.ts#L155)

Since v1.0.0

## device_registerEmail

Registers an email address to a players Nimblebit cloud sync account.

**Signature**

```ts
declare const device_registerEmail: (args_0: {
  readonly playerId?: (string & Brand<"PlayerId">) | undefined
  readonly playerEmail: Redacted.Redacted<string> & Brand<"PlayerEmail">
}) => Effect.Effect<
  "NewDevice" | "NewEmail",
  NimblebitError | HttpApiDecodeError | BadRequest | Unauthorized | InternalServerError | HttpClientError | ParseError,
  NimblebitAuth.NimblebitAuth | HttpClient.HttpClient
>
```

[Source](https://github.com/leonitousconforti/tinyburg/packages/tinytower-sdk/blob/main/src/TinyTower.ts#L235)

Since v1.0.0

## device_verifyDevice

Verifies a cloud sync device after registration with the Nimblebit servers.

**Signature**

```ts
declare const device_verifyDevice: (args_0: {
  verificationCode: string
}) => Effect.Effect<
  {
    readonly playerId: string & Brand<"PlayerId">
    readonly playerAuthKey: Redacted.Redacted<string> & Brand<"PlayerAuthKey">
    readonly success: "NewDevice"
    readonly playerEmail: Redacted.Redacted<string> & Brand<"PlayerEmail">
    readonly playerPhoto?: string | undefined
    readonly playerNickname?: string | undefined
  },
  NimblebitError | HttpApiDecodeError | BadRequest | Unauthorized | InternalServerError | HttpClientError | ParseError,
  NimblebitAuth.NimblebitAuth | HttpClient.HttpClient
>
```

[Source](https://github.com/leonitousconforti/tinyburg/packages/tinytower-sdk/blob/main/src/TinyTower.ts#L195)

Since v1.0.0

## raffle_checkEnteredCurrent

Checks if the player has entered the current hourly raffle.

**Signature**

```ts
declare const raffle_checkEnteredCurrent: (args_0: {
  readonly playerId: string & Brand<"PlayerId">
  readonly playerAuthKey: Redacted.Redacted<string> & Brand<"PlayerAuthKey">
}) => Effect.Effect<
  boolean,
  NimblebitError | HttpApiDecodeError | BadRequest | Unauthorized | InternalServerError | HttpClientError | ParseError,
  NimblebitAuth.NimblebitAuth | HttpClient.HttpClient
>
```

[Source](https://github.com/leonitousconforti/tinyburg/packages/tinytower-sdk/blob/main/src/TinyTower.ts#L747)

Since v1.0.0

## raffle_enterMultiRaffle

Enters the player into the next 8 hourly raffles.

**Signature**

```ts
declare const raffle_enterMultiRaffle: (args_0: {
  readonly playerId: string & Brand<"PlayerId">
  readonly playerAuthKey: Redacted.Redacted<string> & Brand<"PlayerAuthKey">
}) => Effect.Effect<
  void,
  NimblebitError | HttpApiDecodeError | BadRequest | Unauthorized | InternalServerError | HttpClientError | ParseError,
  NimblebitAuth.NimblebitAuth | HttpClient.HttpClient
>
```

[Source](https://github.com/leonitousconforti/tinyburg/packages/tinytower-sdk/blob/main/src/TinyTower.ts#L699)

Since v1.0.0

## raffle_enterRaffle

Enters the player into the hourly raffle.

**Signature**

```ts
declare const raffle_enterRaffle: (args_0: {
  readonly playerId: string & Brand<"PlayerId">
  readonly playerAuthKey: Redacted.Redacted<string> & Brand<"PlayerAuthKey">
}) => Effect.Effect<
  void,
  NimblebitError | HttpApiDecodeError | BadRequest | Unauthorized | InternalServerError | HttpClientError | ParseError,
  NimblebitAuth.NimblebitAuth | HttpClient.HttpClient
>
```

[Source](https://github.com/leonitousconforti/tinyburg/packages/tinytower-sdk/blob/main/src/TinyTower.ts#L651)

Since v1.0.0

## social_getGifts

Retrieves gifts sent to the player but does not mark them as received.

**Signature**

```ts
declare const social_getGifts: (args_0: {
  readonly playerId: string & Brand<"PlayerId">
  readonly playerAuthKey: Redacted.Redacted<string> & Brand<"PlayerAuthKey">
}) => Effect.Effect<
  {
    total: number
    gifts: ReadonlyArray<{
      readonly from: string & Brand<"PlayerId">
      readonly to: string & Brand<"PlayerId">
      readonly id: number
      readonly c: string
      readonly checksum: string
      readonly type: "None" | "Play" | "Gift" | "Cloud" | "Raffle" | "Visit"
      readonly contents: string
    }>
  },
  NimblebitError | HttpApiDecodeError | BadRequest | Unauthorized | InternalServerError | HttpClientError | ParseError,
  NimblebitAuth.NimblebitAuth | HttpClient.HttpClient
>
```

[Source](https://github.com/leonitousconforti/tinyburg/packages/tinytower-sdk/blob/main/src/TinyTower.ts#L848)

Since v1.0.0

## social_getVisits

Retrieves visits made to the player's tower.

**Signature**

```ts
declare const social_getVisits: (args_0: {
  readonly playerId: string & Brand<"PlayerId">
  readonly playerAuthKey: Redacted.Redacted<string> & Brand<"PlayerAuthKey">
}) => Effect.Effect<
  {
    total: number
    visits: ReadonlyArray<{
      readonly from: string & Brand<"PlayerId">
      readonly to: string & Brand<"PlayerId">
      readonly id: number
      readonly c: string
      readonly checksum: string
      readonly type: "None" | "Play" | "Gift" | "Cloud" | "Raffle" | "Visit"
      readonly contents: string
    }>
  },
  NimblebitError | HttpApiDecodeError | BadRequest | Unauthorized | InternalServerError | HttpClientError | ParseError,
  NimblebitAuth.NimblebitAuth | HttpClient.HttpClient
>
```

[Source](https://github.com/leonitousconforti/tinyburg/packages/tinytower-sdk/blob/main/src/TinyTower.ts#L1117)

Since v1.0.0

## social_pullFriendMeta

Pulls metadata about a friend's tower from the Nimblebit servers.

**Signature**

```ts
declare const social_pullFriendMeta: (
  args_0: {
    readonly playerId: string & Brand<"PlayerId">
    readonly playerAuthKey: Redacted.Redacted<string> & Brand<"PlayerAuthKey">
  } & { friendId: Schema.Schema.Type<NimblebitConfig.PlayerIdSchema> }
) => Effect.Effect<
  {
    readonly maxGold: number
    readonly vip: boolean
    readonly doorman: {
      readonly homeIndex: number
      readonly workIndex: number
      readonly placedDreamJob: boolean
      readonly dreamJobIndex: number
      readonly costume?: string | undefined
      readonly vip:
        | number
        | "None"
        | "Engineer"
        | "TravelAgent"
        | "Deliveryman"
        | "BigSpender"
        | "Celebrity"
        | "GiftBit"
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
      readonly attributes: {
        readonly $unknown: ReadonlyArray<string>
        readonly birthday: readonly [number, number]
        readonly gender: "male" | "female"
        readonly name: string
        readonly designColors: {
          readonly skinColorIndex: number
          readonly hairColorIndex: number
          readonly shoeColorIndex: number
          readonly pantColor: {
            readonly r: number & Brand<"U8">
            readonly g: number & Brand<"U8">
            readonly b: number & Brand<"U8">
          }
          readonly shirtColor: {
            readonly r: number & Brand<"U8">
            readonly g: number & Brand<"U8">
            readonly b: number & Brand<"U8">
          }
        }
        readonly accessories: {
          readonly tie: Either<
            { readonly r: number & Brand<"U8">; readonly g: number & Brand<"U8">; readonly b: number & Brand<"U8"> },
            { readonly r: number & Brand<"U8">; readonly g: number & Brand<"U8">; readonly b: number & Brand<"U8"> }
          >
          readonly earrings: Either<
            { readonly r: number & Brand<"U8">; readonly g: number & Brand<"U8">; readonly b: number & Brand<"U8"> },
            { readonly r: number & Brand<"U8">; readonly g: number & Brand<"U8">; readonly b: number & Brand<"U8"> }
          >
          readonly glasses: Either<number, number>
          readonly hairAccessory: Either<number, number>
          readonly hat: Either<
            {
              readonly gender: "male" | "female" | "bi"
              readonly color: {
                readonly r: number & Brand<"U8">
                readonly g: number & Brand<"U8">
                readonly b: number & Brand<"U8">
              }
              readonly index: number
            },
            {
              readonly color: {
                readonly r: number & Brand<"U8">
                readonly g: number & Brand<"U8">
                readonly b: number & Brand<"U8">
              }
              readonly index: number
            }
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
    } & {
      readonly $unknown: {
        readonly [x: string]: {
          readonly value: string
          readonly $locationMetadata: { readonly after: string | null | undefined }
        }
      }
    }
    readonly stories: number
    readonly requestedFloorId: number
    readonly bitbook?: string | undefined
    readonly ts: string
  },
  NimblebitError | HttpApiDecodeError | BadRequest | Unauthorized | InternalServerError | HttpClientError | ParseError,
  NimblebitAuth.NimblebitAuth | HttpClient.HttpClient
>
```

[Source](https://github.com/leonitousconforti/tinyburg/packages/tinytower-sdk/blob/main/src/TinyTower.ts#L948)

Since v1.0.0

## social_pullFriendTower

Pulls a friend's tower save data from the Nimblebit servers.

**Signature**

```ts
declare const social_pullFriendTower: (
  args_0: {
    readonly playerId: string & Brand<"PlayerId">
    readonly playerAuthKey: Redacted.Redacted<string> & Brand<"PlayerAuthKey">
  } & { friendId: Schema.Schema.Type<NimblebitConfig.PlayerIdSchema> }
) => Effect.Effect<
  { saveId: number; data: string },
  NimblebitError | HttpApiDecodeError | BadRequest | Unauthorized | InternalServerError | HttpClientError | ParseError,
  NimblebitAuth.NimblebitAuth | HttpClient.HttpClient
>
```

[Source](https://github.com/leonitousconforti/tinyburg/packages/tinytower-sdk/blob/main/src/TinyTower.ts#L999)

Since v1.0.0

## social_receiveGift

Marks a gift sent to the player as received.

**Signature**

```ts
declare const social_receiveGift: (
  args_0: {
    readonly playerId: string & Brand<"PlayerId">
    readonly playerAuthKey: Redacted.Redacted<string> & Brand<"PlayerAuthKey">
  } & { giftId: number }
) => Effect.Effect<
  void,
  NimblebitError | HttpApiDecodeError | BadRequest | Unauthorized | InternalServerError | HttpClientError | ParseError,
  NimblebitAuth.NimblebitAuth | HttpClient.HttpClient
>
```

[Source](https://github.com/leonitousconforti/tinyburg/packages/tinytower-sdk/blob/main/src/TinyTower.ts#L899)

Since v1.0.0

## social_retrieveFriendsSnapshotList

Retrieves a list of a friend's snapshots from the Nimblebit servers.

**Signature**

```ts
declare const social_retrieveFriendsSnapshotList: (
  args_0: {
    readonly playerId: string & Brand<"PlayerId">
    readonly playerAuthKey: Redacted.Redacted<string> & Brand<"PlayerAuthKey">
  } & { friendId: Schema.Schema.Type<NimblebitConfig.PlayerIdSchema> }
) => Effect.Effect<
  ReadonlyArray<{
    readonly snapshotId: number
    readonly meta: {
      readonly maxGold: number
      readonly vip: boolean
      readonly doorman: {
        readonly homeIndex: number
        readonly workIndex: number
        readonly placedDreamJob: boolean
        readonly dreamJobIndex: number
        readonly costume?: string | undefined
        readonly vip:
          | number
          | "None"
          | "Engineer"
          | "TravelAgent"
          | "Deliveryman"
          | "BigSpender"
          | "Celebrity"
          | "GiftBit"
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
        readonly attributes: {
          readonly $unknown: ReadonlyArray<string>
          readonly birthday: readonly [number, number]
          readonly gender: "male" | "female"
          readonly name: string
          readonly designColors: {
            readonly skinColorIndex: number
            readonly hairColorIndex: number
            readonly shoeColorIndex: number
            readonly pantColor: {
              readonly r: number & Brand<"U8">
              readonly g: number & Brand<"U8">
              readonly b: number & Brand<"U8">
            }
            readonly shirtColor: {
              readonly r: number & Brand<"U8">
              readonly g: number & Brand<"U8">
              readonly b: number & Brand<"U8">
            }
          }
          readonly accessories: {
            readonly tie: Either<
              { readonly r: number & Brand<"U8">; readonly g: number & Brand<"U8">; readonly b: number & Brand<"U8"> },
              { readonly r: number & Brand<"U8">; readonly g: number & Brand<"U8">; readonly b: number & Brand<"U8"> }
            >
            readonly earrings: Either<
              { readonly r: number & Brand<"U8">; readonly g: number & Brand<"U8">; readonly b: number & Brand<"U8"> },
              { readonly r: number & Brand<"U8">; readonly g: number & Brand<"U8">; readonly b: number & Brand<"U8"> }
            >
            readonly glasses: Either<number, number>
            readonly hairAccessory: Either<number, number>
            readonly hat: Either<
              {
                readonly gender: "male" | "female" | "bi"
                readonly color: {
                  readonly r: number & Brand<"U8">
                  readonly g: number & Brand<"U8">
                  readonly b: number & Brand<"U8">
                }
                readonly index: number
              },
              {
                readonly color: {
                  readonly r: number & Brand<"U8">
                  readonly g: number & Brand<"U8">
                  readonly b: number & Brand<"U8">
                }
                readonly index: number
              }
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
      } & {
        readonly $unknown: {
          readonly [x: string]: {
            readonly value: string
            readonly $locationMetadata: { readonly after: string | null | undefined }
          }
        }
      }
      readonly stories: number
      readonly requestedFloorId: number
      readonly bitbook?: string | undefined
      readonly ts: string
    }
    readonly created: Date
  }>,
  NimblebitError | HttpApiDecodeError | BadRequest | Unauthorized | InternalServerError | HttpClientError | ParseError,
  NimblebitAuth.NimblebitAuth | HttpClient.HttpClient
>
```

[Source](https://github.com/leonitousconforti/tinyburg/packages/tinytower-sdk/blob/main/src/TinyTower.ts#L1066)

Since v1.0.0

## social_sendItem

Sends a sync item to a friend.

**Signature**

```ts
declare const social_sendItem: (
  args_0: {
    readonly playerId: string & Brand<"PlayerId">
    readonly playerAuthKey: Redacted.Redacted<string> & Brand<"PlayerAuthKey">
  } & {
    itemStr: string
    itemType: (typeof SyncItemType)[keyof typeof SyncItemType]
    friendId: Schema.Schema.Type<NimblebitConfig.PlayerIdSchema>
  }
) => Effect.Effect<
  void,
  NimblebitError | HttpApiDecodeError | BadRequest | Unauthorized | InternalServerError | HttpClientError | ParseError,
  NimblebitAuth.NimblebitAuth | HttpClient.HttpClient
>
```

[Source](https://github.com/leonitousconforti/tinyburg/packages/tinytower-sdk/blob/main/src/TinyTower.ts#L787)

Since v1.0.0

## social_visit

Sends a visit to a friend's tower.

**Signature**

```ts
declare const social_visit: (
  args_0: {
    readonly playerId: string & Brand<"PlayerId">
    readonly playerAuthKey: Redacted.Redacted<string> & Brand<"PlayerAuthKey">
  } & { friendId: Schema.Schema.Type<NimblebitConfig.PlayerIdSchema> }
) => Effect.Effect<
  void,
  NimblebitError | HttpApiDecodeError | BadRequest | Unauthorized | InternalServerError | HttpClientError | ParseError,
  NimblebitAuth.NimblebitAuth | HttpClient.HttpClient
>
```

[Source](https://github.com/leonitousconforti/tinyburg/packages/tinytower-sdk/blob/main/src/TinyTower.ts#L1168)

Since v1.0.0

## sync_checkForNewerSave

Checks what the latest save version is on the Nimblebit servers.

**Signature**

```ts
declare const sync_checkForNewerSave: (args_0: {
  readonly playerId: string & Brand<"PlayerId">
  readonly playerAuthKey: Redacted.Redacted<string> & Brand<"PlayerAuthKey">
}) => Effect.Effect<
  number,
  NimblebitError | HttpApiDecodeError | BadRequest | Unauthorized | InternalServerError | HttpClientError | ParseError,
  NimblebitAuth.NimblebitAuth | HttpClient.HttpClient
>
```

[Source](https://github.com/leonitousconforti/tinyburg/packages/tinytower-sdk/blob/main/src/TinyTower.ts#L412)

Since v1.0.0

## sync_pullSave

Pulls the latest save data from the Nimblebit servers.

**Signature**

```ts
declare const sync_pullSave: (args_0: {
  readonly playerId: string & Brand<"PlayerId">
  readonly playerAuthKey: Redacted.Redacted<string> & Brand<"PlayerAuthKey">
}) => Effect.Effect<
  { saveId: number; data: string },
  NimblebitError | HttpApiDecodeError | BadRequest | Unauthorized | InternalServerError | HttpClientError | ParseError,
  NimblebitAuth.NimblebitAuth | HttpClient.HttpClient
>
```

[Source](https://github.com/leonitousconforti/tinyburg/packages/tinytower-sdk/blob/main/src/TinyTower.ts#L282)

Since v1.0.0

## sync_pullSnapshot

Pulls a specific snapshot from the Nimblebit servers.

**Signature**

```ts
declare const sync_pullSnapshot: (
  args_0: {
    readonly playerId: string & Brand<"PlayerId">
    readonly playerAuthKey: Redacted.Redacted<string> & Brand<"PlayerAuthKey">
  } & { snapshotId: number }
) => Effect.Effect<
  { snapshotId: number; data: string },
  NimblebitError | HttpApiDecodeError | BadRequest | Unauthorized | InternalServerError | HttpClientError | ParseError,
  NimblebitAuth.NimblebitAuth | HttpClient.HttpClient
>
```

[Source](https://github.com/leonitousconforti/tinyburg/packages/tinytower-sdk/blob/main/src/TinyTower.ts#L472)

Since v1.0.0

## sync_pushSave

Pushes save data to the Nimblebit servers.

**Signature**

```ts
declare const sync_pushSave: (
  args_0: {
    readonly playerId: string & Brand<"PlayerId">
    readonly playerAuthKey: Redacted.Redacted<string> & Brand<"PlayerAuthKey">
  } & { data: Schema.Schema.Type<typeof SaveData> }
) => Effect.Effect<
  void,
  NimblebitError | HttpApiDecodeError | BadRequest | Unauthorized | InternalServerError | HttpClientError | ParseError,
  NimblebitAuth.NimblebitAuth | HttpClient.HttpClient
>
```

[Source](https://github.com/leonitousconforti/tinyburg/packages/tinytower-sdk/blob/main/src/TinyTower.ts#L346)

Since v1.0.0

## sync_pushSnapshot

Pushes a snapshot to the Nimblebit servers.

**Signature**

```ts
declare const sync_pushSnapshot: (
  args_0: {
    readonly playerId: string & Brand<"PlayerId">
    readonly playerAuthKey: Redacted.Redacted<string> & Brand<"PlayerAuthKey">
  } & { data: Schema.Schema.Type<typeof SaveData> }
) => Effect.Effect<
  void,
  NimblebitError | HttpApiDecodeError | BadRequest | Unauthorized | InternalServerError | HttpClientError | ParseError,
  NimblebitAuth.NimblebitAuth | HttpClient.HttpClient
>
```

[Source](https://github.com/leonitousconforti/tinyburg/packages/tinytower-sdk/blob/main/src/TinyTower.ts#L537)

Since v1.0.0

## sync_retrieveSnapshotList

Retrieves a list of snapshots from the Nimblebit servers.

**Signature**

```ts
declare const sync_retrieveSnapshotList: (args_0: {
  readonly playerId: string & Brand<"PlayerId">
  readonly playerAuthKey: Redacted.Redacted<string> & Brand<"PlayerAuthKey">
}) => Effect.Effect<
  ReadonlyArray<{
    readonly id: number
    readonly timestamp: bigint
    readonly meta: {
      readonly maxGold: number
      readonly vip: boolean
      readonly doorman: {
        readonly homeIndex: number
        readonly workIndex: number
        readonly placedDreamJob: boolean
        readonly dreamJobIndex: number
        readonly costume?: string | undefined
        readonly vip:
          | number
          | "None"
          | "Engineer"
          | "TravelAgent"
          | "Deliveryman"
          | "BigSpender"
          | "Celebrity"
          | "GiftBit"
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
        readonly attributes: {
          readonly $unknown: ReadonlyArray<string>
          readonly birthday: readonly [number, number]
          readonly gender: "male" | "female"
          readonly name: string
          readonly designColors: {
            readonly skinColorIndex: number
            readonly hairColorIndex: number
            readonly shoeColorIndex: number
            readonly pantColor: {
              readonly r: number & Brand<"U8">
              readonly g: number & Brand<"U8">
              readonly b: number & Brand<"U8">
            }
            readonly shirtColor: {
              readonly r: number & Brand<"U8">
              readonly g: number & Brand<"U8">
              readonly b: number & Brand<"U8">
            }
          }
          readonly accessories: {
            readonly tie: Either<
              { readonly r: number & Brand<"U8">; readonly g: number & Brand<"U8">; readonly b: number & Brand<"U8"> },
              { readonly r: number & Brand<"U8">; readonly g: number & Brand<"U8">; readonly b: number & Brand<"U8"> }
            >
            readonly earrings: Either<
              { readonly r: number & Brand<"U8">; readonly g: number & Brand<"U8">; readonly b: number & Brand<"U8"> },
              { readonly r: number & Brand<"U8">; readonly g: number & Brand<"U8">; readonly b: number & Brand<"U8"> }
            >
            readonly glasses: Either<number, number>
            readonly hairAccessory: Either<number, number>
            readonly hat: Either<
              {
                readonly gender: "male" | "female" | "bi"
                readonly color: {
                  readonly r: number & Brand<"U8">
                  readonly g: number & Brand<"U8">
                  readonly b: number & Brand<"U8">
                }
                readonly index: number
              },
              {
                readonly color: {
                  readonly r: number & Brand<"U8">
                  readonly g: number & Brand<"U8">
                  readonly b: number & Brand<"U8">
                }
                readonly index: number
              }
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
      } & {
        readonly $unknown: {
          readonly [x: string]: {
            readonly value: string
            readonly $locationMetadata: { readonly after: string | null | undefined }
          }
        }
      }
      readonly stories: number
      readonly requestedFloorId: number
      readonly bitbook?: string | undefined
      readonly ts: string
    }
  }>,
  NimblebitError | HttpApiDecodeError | BadRequest | Unauthorized | InternalServerError | HttpClientError | ParseError,
  NimblebitAuth.NimblebitAuth | HttpClient.HttpClient
>
```

[Source](https://github.com/leonitousconforti/tinyburg/packages/tinytower-sdk/blob/main/src/TinyTower.ts#L603)

Since v1.0.0

# Schemas

## SaveData

How to decode a SaveData from Nimblebit's object format.

**Signature**

```ts
declare const SaveData: Schema.transform<
  typeof Schema.String,
  Schema.transformOrFail<
    typeof Schema.String,
    Schema.extend<
      Schema.Struct<{
        coins: Schema.PropertySignature<":", number, "Pc", ":", string, false, never>
        bux: Schema.PropertySignature<":", number, "Pb", ":", string, false, never>
        Ppig: Schema.PropertySignature<"?:", string | undefined, "Ppig", "?:", string | undefined, false, never>
        Pplim: Schema.PropertySignature<"?:", string | undefined, "Pplim", "?:", string | undefined, false, never>
        maxGold: Schema.PropertySignature<":", number, "Pmg", ":", string, false, never>
        gold: Schema.PropertySignature<":", number, "Pg", ":", string, false, never>
        tip: Schema.PropertySignature<":", number, "Ptip", ":", string, false, never>
        needUpgrade: Schema.PropertySignature<":", number, "Pnu", ":", string, false, never>
        ver: Schema.PropertySignature<":", string, "Pver", ":", string, false, never>
        roof: Schema.PropertySignature<":", number, "Pr", ":", string, false, never>
        lift: Schema.PropertySignature<":", number, "Pe", ":", string, false, never>
        lobby: Schema.PropertySignature<":", number, "Pl", ":", string, false, never>
        buxBought: Schema.PropertySignature<":", number, "Pbxb", ":", string, false, never>
        installTime: Schema.PropertySignature<":", number, "PiT", ":", string, false, never>
        lastSaleTick: Schema.PropertySignature<":", number, "PlST", ":", string, false, never>
        lobbyName: Schema.PropertySignature<":", string, "Pln", ":", string, false, never>
        raffleID: Schema.PropertySignature<":", number, "Prf", ":", string, false, never>
        vipTrialEnd: Schema.PropertySignature<":", bigint, "Pvte", ":", string, false, never>
        costumes: Schema.PropertySignature<":", ReadonlyArray<string>, "Pcos", ":", string, false, never>
        pets: Schema.PropertySignature<
          "?:",
          ReadonlyArray<string> | undefined,
          "Ppets",
          "?:",
          string | undefined,
          false,
          never
        >
        missionHist: Schema.PropertySignature<
          "?:",
          ReadonlyArray<string> | undefined,
          "Pmhst",
          "?:",
          string | undefined,
          false,
          never
        >
        bbHist: Schema.PropertySignature<":", ReadonlyArray<string>, "Pbhst", ":", string, false, never>
        roofs: Schema.PropertySignature<":", ReadonlyArray<string>, "Prfs", ":", string, false, never>
        lifts: Schema.PropertySignature<":", ReadonlyArray<string>, "Plfs", ":", string, false, never>
        lobbies: Schema.PropertySignature<":", ReadonlyArray<string>, "Plbs", ":", string, false, never>
        bannedFriends: Schema.PropertySignature<
          "?:",
          ReadonlyArray<string> | undefined,
          "Pbf",
          "?:",
          string | undefined,
          false,
          never
        >
        liftSpeed: Schema.PropertySignature<"?:", number | undefined, "Pls", "?:", string | undefined, false, never>
        totalPoints: Schema.PropertySignature<":", bigint, "Ptp", ":", string, false, never>
        lrc: Schema.PropertySignature<":", string, "Plrc", ":", string, false, never>
        lfc: Schema.PropertySignature<":", string, "Plfc", ":", string, false, never>
        cfd: Schema.PropertySignature<":", string, "Pcfd", ":", string, false, never>
        lbc: Schema.PropertySignature<":", string, "Plbc", ":", string, false, never>
        lbbcp: Schema.PropertySignature<":", string, "Plbbcp", ":", string, false, never>
        lcmiss: Schema.PropertySignature<":", string, "Plcmiss", ":", string, false, never>
        lcg: Schema.PropertySignature<":", string, "Plcg", ":", string, false, never>
        sfx: Schema.PropertySignature<":", number, "Psfx", ":", string, false, never>
        mus: Schema.PropertySignature<":", number, "Pmus", ":", string, false, never>
        notes: Schema.PropertySignature<":", number, "Pnts", ":", string, false, never>
        autoLiftDisable: Schema.PropertySignature<":", number, "Pald", ":", string, false, never>
        videos: Schema.PropertySignature<":", number, "Pvds", ":", string, false, never>
        vidCheck: Schema.PropertySignature<":", number, "Pvdc", ":", string, false, never>
        bbnotes: Schema.PropertySignature<":", number, "Pbbn", ":", string, false, never>
        hidechat: Schema.PropertySignature<":", number, "Phchat", ":", string, false, never>
        tmi: Schema.PropertySignature<":", string, "Ptmi", ":", string, false, never>
        PVF: Schema.PropertySignature<"?:", string | undefined, "PVF", "?:", string | undefined, false, never>
        PHP: Schema.PropertySignature<"?:", string | undefined, "PHP", "?:", string | undefined, false, never>
        mission: Schema.PropertySignature<
          "?:",
          | ({ readonly id: string } & {
              readonly $unknown: {
                readonly [x: string]: {
                  readonly value: string
                  readonly $locationMetadata: { readonly after: string | null | undefined }
                }
              }
            })
          | undefined,
          "Pmiss",
          "?:",
          string | undefined,
          false,
          never
        >
        doorman: Schema.PropertySignature<
          ":",
          {
            readonly homeIndex: number
            readonly workIndex: number
            readonly placedDreamJob: boolean
            readonly dreamJobIndex: number
            readonly costume?: string | undefined
            readonly vip:
              | number
              | "None"
              | "Engineer"
              | "TravelAgent"
              | "Deliveryman"
              | "BigSpender"
              | "Celebrity"
              | "GiftBit"
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
            readonly attributes: {
              readonly $unknown: ReadonlyArray<string>
              readonly birthday: readonly [number, number]
              readonly gender: "male" | "female"
              readonly name: string
              readonly designColors: {
                readonly skinColorIndex: number
                readonly hairColorIndex: number
                readonly shoeColorIndex: number
                readonly pantColor: {
                  readonly r: number & Brand<"U8">
                  readonly g: number & Brand<"U8">
                  readonly b: number & Brand<"U8">
                }
                readonly shirtColor: {
                  readonly r: number & Brand<"U8">
                  readonly g: number & Brand<"U8">
                  readonly b: number & Brand<"U8">
                }
              }
              readonly accessories: {
                readonly tie: Either<
                  {
                    readonly r: number & Brand<"U8">
                    readonly g: number & Brand<"U8">
                    readonly b: number & Brand<"U8">
                  },
                  {
                    readonly r: number & Brand<"U8">
                    readonly g: number & Brand<"U8">
                    readonly b: number & Brand<"U8">
                  }
                >
                readonly earrings: Either<
                  {
                    readonly r: number & Brand<"U8">
                    readonly g: number & Brand<"U8">
                    readonly b: number & Brand<"U8">
                  },
                  {
                    readonly r: number & Brand<"U8">
                    readonly g: number & Brand<"U8">
                    readonly b: number & Brand<"U8">
                  }
                >
                readonly glasses: Either<number, number>
                readonly hairAccessory: Either<number, number>
                readonly hat: Either<
                  {
                    readonly gender: "male" | "female" | "bi"
                    readonly color: {
                      readonly r: number & Brand<"U8">
                      readonly g: number & Brand<"U8">
                      readonly b: number & Brand<"U8">
                    }
                    readonly index: number
                  },
                  {
                    readonly color: {
                      readonly r: number & Brand<"U8">
                      readonly g: number & Brand<"U8">
                      readonly b: number & Brand<"U8">
                    }
                    readonly index: number
                  }
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
          } & {
            readonly $unknown: {
              readonly [x: string]: {
                readonly value: string
                readonly $locationMetadata: { readonly after: string | null | undefined }
              }
            }
          },
          "Pdrmn",
          ":",
          string,
          false,
          never
        >
        playerID: Schema.PropertySignature<":", string, "Ppid", ":", string, false, never>
        playerRegistered: Schema.PropertySignature<":", number, "Preg", ":", string, false, never>
        bzns: Schema.PropertySignature<
          ":",
          ReadonlyArray<
            {
              readonly homeIndex: number
              readonly workIndex: number
              readonly placedDreamJob: boolean
              readonly dreamJobIndex: number
              readonly costume?: string | undefined
              readonly vip:
                | number
                | "None"
                | "Engineer"
                | "TravelAgent"
                | "Deliveryman"
                | "BigSpender"
                | "Celebrity"
                | "GiftBit"
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
              readonly attributes: {
                readonly $unknown: ReadonlyArray<string>
                readonly birthday: readonly [number, number]
                readonly gender: "male" | "female"
                readonly name: string
                readonly designColors: {
                  readonly skinColorIndex: number
                  readonly hairColorIndex: number
                  readonly shoeColorIndex: number
                  readonly pantColor: {
                    readonly r: number & Brand<"U8">
                    readonly g: number & Brand<"U8">
                    readonly b: number & Brand<"U8">
                  }
                  readonly shirtColor: {
                    readonly r: number & Brand<"U8">
                    readonly g: number & Brand<"U8">
                    readonly b: number & Brand<"U8">
                  }
                }
                readonly accessories: {
                  readonly tie: Either<
                    {
                      readonly r: number & Brand<"U8">
                      readonly g: number & Brand<"U8">
                      readonly b: number & Brand<"U8">
                    },
                    {
                      readonly r: number & Brand<"U8">
                      readonly g: number & Brand<"U8">
                      readonly b: number & Brand<"U8">
                    }
                  >
                  readonly earrings: Either<
                    {
                      readonly r: number & Brand<"U8">
                      readonly g: number & Brand<"U8">
                      readonly b: number & Brand<"U8">
                    },
                    {
                      readonly r: number & Brand<"U8">
                      readonly g: number & Brand<"U8">
                      readonly b: number & Brand<"U8">
                    }
                  >
                  readonly glasses: Either<number, number>
                  readonly hairAccessory: Either<number, number>
                  readonly hat: Either<
                    {
                      readonly gender: "male" | "female" | "bi"
                      readonly color: {
                        readonly r: number & Brand<"U8">
                        readonly g: number & Brand<"U8">
                        readonly b: number & Brand<"U8">
                      }
                      readonly index: number
                    },
                    {
                      readonly color: {
                        readonly r: number & Brand<"U8">
                        readonly g: number & Brand<"U8">
                        readonly b: number & Brand<"U8">
                      }
                      readonly index: number
                    }
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
            } & {
              readonly $unknown: {
                readonly [x: string]: {
                  readonly value: string
                  readonly $locationMetadata: { readonly after: string | null | undefined }
                }
              }
            }
          >,
          "Pbits",
          ":",
          string,
          false,
          never
        >
        stories: Schema.PropertySignature<
          ":",
          ReadonlyArray<
            {
              readonly storyHeight: number
              readonly floorId: number
              readonly level: number
              readonly openDate: Date | { readonly date: Date; readonly extraTicks: bigint }
              readonly stockBaseTime: string
              readonly stockingTier: number
              readonly stockingStartTime: Date | { readonly date: Date; readonly extraTicks: bigint }
              readonly stocks: ReadonlyArray<bigint>
              readonly lastSaleTicks: ReadonlyArray<Date | { readonly date: Date; readonly extraTicks: bigint }>
              readonly floorName: string
              readonly floorPaint?: string | undefined
            } & {
              readonly $unknown: {
                readonly [x: string]: {
                  readonly value: string
                  readonly $locationMetadata: { readonly after: string | null | undefined }
                }
              }
            }
          >,
          "Pstories",
          ":",
          string,
          false,
          never
        >
        friends: Schema.PropertySignature<":", string, "Pfrns", ":", string, false, never>
        bbPosts: Schema.PropertySignature<
          ":",
          ReadonlyArray<
            {
              readonly date: Date | { readonly date: Date; readonly extraTicks: bigint }
              readonly _tid: string
              readonly bitizen: {
                readonly homeIndex: number
                readonly workIndex: number
                readonly placedDreamJob: boolean
                readonly dreamJobIndex: number
                readonly costume?: string | undefined
                readonly vip:
                  | number
                  | "None"
                  | "Engineer"
                  | "TravelAgent"
                  | "Deliveryman"
                  | "BigSpender"
                  | "Celebrity"
                  | "GiftBit"
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
                readonly attributes: {
                  readonly $unknown: ReadonlyArray<string>
                  readonly birthday: readonly [number, number]
                  readonly gender: "male" | "female"
                  readonly name: string
                  readonly designColors: {
                    readonly skinColorIndex: number
                    readonly hairColorIndex: number
                    readonly shoeColorIndex: number
                    readonly pantColor: {
                      readonly r: number & Brand<"U8">
                      readonly g: number & Brand<"U8">
                      readonly b: number & Brand<"U8">
                    }
                    readonly shirtColor: {
                      readonly r: number & Brand<"U8">
                      readonly g: number & Brand<"U8">
                      readonly b: number & Brand<"U8">
                    }
                  }
                  readonly accessories: {
                    readonly tie: Either<
                      {
                        readonly r: number & Brand<"U8">
                        readonly g: number & Brand<"U8">
                        readonly b: number & Brand<"U8">
                      },
                      {
                        readonly r: number & Brand<"U8">
                        readonly g: number & Brand<"U8">
                        readonly b: number & Brand<"U8">
                      }
                    >
                    readonly earrings: Either<
                      {
                        readonly r: number & Brand<"U8">
                        readonly g: number & Brand<"U8">
                        readonly b: number & Brand<"U8">
                      },
                      {
                        readonly r: number & Brand<"U8">
                        readonly g: number & Brand<"U8">
                        readonly b: number & Brand<"U8">
                      }
                    >
                    readonly glasses: Either<number, number>
                    readonly hairAccessory: Either<number, number>
                    readonly hat: Either<
                      {
                        readonly gender: "male" | "female" | "bi"
                        readonly color: {
                          readonly r: number & Brand<"U8">
                          readonly g: number & Brand<"U8">
                          readonly b: number & Brand<"U8">
                        }
                        readonly index: number
                      },
                      {
                        readonly color: {
                          readonly r: number & Brand<"U8">
                          readonly g: number & Brand<"U8">
                          readonly b: number & Brand<"U8">
                        }
                        readonly index: number
                      }
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
              } & {
                readonly $unknown: {
                  readonly [x: string]: {
                    readonly value: string
                    readonly $locationMetadata: { readonly after: string | null | undefined }
                  }
                }
              }
              readonly source_name: string
              readonly body: string
              readonly media_type: string
              readonly media_path: string
              readonly likes: number
            } & {
              readonly $unknown: {
                readonly [x: string]: {
                  readonly value: string
                  readonly $locationMetadata: { readonly after: string | null | undefined }
                }
              }
            }
          >,
          "PBB",
          ":",
          string,
          false,
          never
        >
        bbpost: Schema.PropertySignature<":", string, "Plp", ":", string, false, never>
      }>,
      Schema.Struct<{
        $unknown: Schema.Record$<
          typeof Schema.String,
          Schema.Struct<{
            value: typeof Schema.String
            $locationMetadata: Schema.Struct<{ after: Schema.NullishOr<typeof Schema.String> }>
          }>
        >
      }>
    >,
    never
  >
>
```

[Source](https://github.com/leonitousconforti/tinyburg/packages/tinytower-sdk/blob/main/src/TinyTower.ts#L35)

Since v1.0.0
