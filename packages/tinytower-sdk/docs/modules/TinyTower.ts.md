---
title: TinyTower.ts
nav_order: 4
parent: Modules
---

## TinyTower.ts overview

Tiny Tower SDK for interacting with Nimblebit's cloud services.

Since v1.0.0

---

## Exports Grouped by Category

- [API](#api)
  - [Api](#api-1)
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

---

# API

## Api

**Signature**

```ts
declare const Api: HttpApi<
  "TinyTowerApi",
  | HttpApiGroup<
      "DeviceManagementGroup",
      | HttpApiEndpoint<
          "DeviceNewPlayer",
          "GET",
          { readonly salt1: number & Brand<"U32">; readonly salt2: number & Brand<"U32">; readonly hash: string },
          never,
          never,
          never,
          | { readonly error: string }
          | {
              readonly playerId: string & Brand<"PlayerId">
              readonly playerSs: Redacted.Redacted<string> & Brand<"PlayerAuthKey">
            },
          never,
          never,
          never
        >
      | HttpApiEndpoint<
          "DevicePlayerDetails",
          "GET",
          {
            readonly hash: string
            readonly playerId: string & Brand<"PlayerId">
            readonly salt: number & Brand<"U32">
          },
          never,
          never,
          never,
          | { readonly error: string }
          | {
              readonly player: {
                readonly playerId: string & Brand<"PlayerId">
                readonly playerEmail: Redacted.Redacted<string> & Brand<"PlayerEmail">
                readonly registered: boolean
                readonly blacklisted: boolean
              }
            },
          never,
          never,
          never
        >
      | HttpApiEndpoint<
          "DeviceVerifyDevice",
          "GET",
          { readonly playerId: string & Brand<"PlayerId">; readonly verificationCode: string },
          never,
          never,
          never,
          | { readonly error: string }
          | {
              readonly playerId: string & Brand<"PlayerId">
              readonly playerAuthKey: Redacted.Redacted<string> & Brand<"PlayerAuthKey">
              readonly success: "NewDevice"
              readonly playerEmail: Redacted.Redacted<string> & Brand<"PlayerEmail">
              readonly playerPhoto?: string | undefined
              readonly playerNickname?: string | undefined
            },
          never,
          never,
          never
        >
      | HttpApiEndpoint<
          "DeviceRegisterEmail",
          "POST",
          {
            readonly hash: string
            readonly playerId: string & Brand<"PlayerId">
            readonly salt: number & Brand<"U32">
          },
          never,
          { readonly email: Redacted.Redacted<string>; readonly promote: 1 },
          never,
          { readonly error: string } | { readonly success: "NewEmail" } | { readonly success: "NewDevice" },
          never,
          never,
          never
        >,
      never,
      never,
      false
    >
  | HttpApiGroup<
      "SyncManagementGroup",
      | HttpApiEndpoint<
          "SyncPullSave",
          "GET",
          {
            readonly hash: string
            readonly playerId: string & Brand<"PlayerId">
            readonly salt: number & Brand<"U32">
          },
          never,
          never,
          never,
          | { readonly error: string }
          | { readonly success: "NotFound" }
          | {
              readonly success: "Found"
              readonly data: Uint8Array<ArrayBufferLike>
              readonly checksum: string
              readonly saveId: number
            },
          never,
          never,
          never
        >
      | HttpApiEndpoint<
          "SyncPushSave",
          "POST",
          {
            readonly hash: string
            readonly playerId: string & Brand<"PlayerId">
            readonly salt: number & Brand<"U32">
          },
          never,
          {
            readonly data: Uint8Array<ArrayBufferLike>
            readonly vip: boolean
            readonly p: "IOS" | "Android"
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
                readonly birthday: readonly [number, number]
                readonly $unknown: ReadonlyArray<string>
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
                      readonly gender: "male" | "female" | "unisex"
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
            readonly saveVersion: number
            readonly level: number
            readonly reqFID: number
            readonly mg: number
            readonly l: string
          },
          never,
          { readonly error: string } | { readonly success: "Saved" } | { readonly success: "NotSaved" },
          never,
          never,
          never
        >
      | HttpApiEndpoint<
          "SyncCheckForNewerSave",
          "GET",
          {
            readonly hash: string
            readonly playerId: string & Brand<"PlayerId">
            readonly salt: number & Brand<"U32">
          },
          never,
          never,
          never,
          | { readonly error: string }
          | { readonly success: "NotFound" }
          | { readonly success: "Found"; readonly checksum: string; readonly saveId: number },
          never,
          never,
          never
        >
      | HttpApiEndpoint<
          "SyncPushSnapshot",
          "POST",
          {
            readonly hash: string
            readonly playerId: string & Brand<"PlayerId">
            readonly salt: number & Brand<"U32">
          },
          never,
          {
            readonly data: Uint8Array<ArrayBufferLike>
            readonly vip: boolean
            readonly p: "IOS" | "Android"
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
                readonly birthday: readonly [number, number]
                readonly $unknown: ReadonlyArray<string>
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
                      readonly gender: "male" | "female" | "unisex"
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
            readonly saveVersion: number
            readonly level: number
            readonly reqFID: number
            readonly mg: number
            readonly l: string
          },
          never,
          { readonly error: string } | { readonly success: "Saved" } | { readonly success: "NotSaved" },
          never,
          never,
          never
        >
      | HttpApiEndpoint<
          "SyncPullSnapshot",
          "GET",
          {
            readonly hash: string
            readonly playerId: string & Brand<"PlayerId">
            readonly salt: number & Brand<"U32">
            readonly snapshotId: number
          },
          never,
          never,
          never,
          | { readonly error: string }
          | { readonly success: "NotFound" }
          | {
              readonly success: "Found"
              readonly data: Uint8Array<ArrayBufferLike>
              readonly checksum: string
              readonly snapshotId: number
            },
          never,
          never,
          never
        >
      | HttpApiEndpoint<
          "SyncRetrieveSnapshotList",
          "GET",
          {
            readonly hash: string
            readonly playerId: string & Brand<"PlayerId">
            readonly salt: number & Brand<"U32">
          },
          never,
          never,
          never,
          | { readonly error: string }
          | { readonly success: "NotFound" }
          | {
              readonly success: "Found"
              readonly saves: ReadonlyArray<{
                readonly id: number
                readonly timestamp: bigint
                readonly meta: {
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
                      readonly birthday: readonly [number, number]
                      readonly $unknown: ReadonlyArray<string>
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
                            readonly gender: "male" | "female" | "unisex"
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
                  readonly maxGold: number
                  readonly requestedFloorId: number
                  readonly bitbook?: string | undefined
                  readonly ts: string
                }
              }>
            },
          never,
          never,
          never
        >,
      never,
      never,
      false
    >
  | HttpApiGroup<
      "RaffleGroup",
      | HttpApiEndpoint<
          "RaffleEnter",
          "POST",
          {
            readonly hash: string
            readonly playerId: string & Brand<"PlayerId">
            readonly salt: number & Brand<"U32">
          },
          never,
          never,
          never,
          { readonly error: string } | { readonly success: "Entered" } | { readonly success: "NotEntered" },
          never,
          never,
          never
        >
      | HttpApiEndpoint<
          "RaffleEnterMulti",
          "POST",
          {
            readonly hash: string
            readonly playerId: string & Brand<"PlayerId">
            readonly salt: number & Brand<"U32">
          },
          never,
          never,
          never,
          { readonly error: string } | { readonly success: "Entered" } | { readonly success: "NotEntered" },
          never,
          never,
          never
        >
      | HttpApiEndpoint<
          "RaffleCheckEnteredCurrent",
          "GET",
          {
            readonly hash: string
            readonly playerId: string & Brand<"PlayerId">
            readonly salt: number & Brand<"U32">
          },
          never,
          never,
          never,
          { readonly error: string } | { readonly success: "Entered" } | { readonly success: "NotEntered" },
          never,
          never,
          never
        >,
      never,
      never,
      false
    >
  | HttpApiGroup<
      "SocialGroup",
      | HttpApiEndpoint<
          "SocialSendItem",
          "POST",
          {
            readonly hash: string
            readonly playerId: string & Brand<"PlayerId">
            readonly salt: number & Brand<"U32">
            readonly syncItemType: "None" | "Play" | "Gift" | "Cloud" | "Raffle" | "Visit"
            readonly friendId: string & Brand<"PlayerId">
          },
          never,
          { readonly itemStr: string },
          never,
          { readonly error: string } | { readonly success: "Sent" } | { readonly success: "NotSent" },
          never,
          never,
          never
        >
      | HttpApiEndpoint<
          "SocialGetGifts",
          "GET",
          {
            readonly hash: string
            readonly playerId: string & Brand<"PlayerId">
            readonly salt: number & Brand<"U32">
          },
          never,
          never,
          never,
          | { readonly error: string }
          | { readonly success: "NotFound" }
          | {
              readonly success: "Found"
              readonly gifts: ReadonlyArray<{
                readonly from: string & Brand<"PlayerId">
                readonly to: string & Brand<"PlayerId">
                readonly checksum: string
                readonly id: number
                readonly c: string
                readonly type: "None" | "Play" | "Gift" | "Cloud" | "Raffle" | "Visit"
                readonly contents: string
              }>
              readonly total: number
            },
          never,
          never,
          never
        >
      | HttpApiEndpoint<
          "SocialReceiveGift",
          "POST",
          {
            readonly hash: string
            readonly playerId: string & Brand<"PlayerId">
            readonly salt: number & Brand<"U32">
            readonly giftId: number
          },
          never,
          never,
          never,
          { readonly error: string } | { readonly success: "Received" } | { readonly success: "NotReceived" },
          never,
          never,
          never
        >
      | HttpApiEndpoint<
          "SocialPullFriendMeta",
          "POST",
          {
            readonly hash: string
            readonly playerId: string & Brand<"PlayerId">
            readonly salt: number & Brand<"U32">
          },
          never,
          { readonly friends: string & Brand<"PlayerId"> },
          never,
          | { readonly error: string }
          | { readonly success: "NotFound" }
          | {
              readonly success: "Found"
              readonly meta: {
                readonly [x: string & Brand<"PlayerId">]: {
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
                      readonly birthday: readonly [number, number]
                      readonly $unknown: ReadonlyArray<string>
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
                            readonly gender: "male" | "female" | "unisex"
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
                  readonly maxGold: number
                  readonly requestedFloorId: number
                  readonly bitbook?: string | undefined
                  readonly ts: string
                }
              }
            },
          never,
          never,
          never
        >
      | HttpApiEndpoint<
          "SocialPullFriendTower",
          "GET",
          {
            readonly hash: string
            readonly playerId: string & Brand<"PlayerId">
            readonly salt: number & Brand<"U32">
            readonly friendId: string & Brand<"PlayerId">
          },
          never,
          never,
          never,
          | { readonly error: string }
          | { readonly success: "NotFound" }
          | {
              readonly playerId: string & Brand<"PlayerId">
              readonly success: "Found"
              readonly data: Uint8Array<ArrayBufferLike>
              readonly checksum: string
              readonly saveId: number
            },
          never,
          never,
          never
        >
      | HttpApiEndpoint<
          "SocialRetrieveFriendsSnapshotList",
          "GET",
          {
            readonly hash: string
            readonly playerId: string & Brand<"PlayerId">
            readonly salt: number & Brand<"U32">
            readonly friendId: string & Brand<"PlayerId">
          },
          never,
          never,
          never,
          | { readonly error: string }
          | { readonly success: "NotFound" }
          | {
              readonly success: "Found"
              readonly saves: ReadonlyArray<{
                readonly snapshotId: number
                readonly meta: {
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
                      readonly birthday: readonly [number, number]
                      readonly $unknown: ReadonlyArray<string>
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
                            readonly gender: "male" | "female" | "unisex"
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
                  readonly maxGold: number
                  readonly requestedFloorId: number
                  readonly bitbook?: string | undefined
                  readonly ts: string
                }
                readonly created: Date
              }>
            },
          never,
          never,
          never
        >
      | HttpApiEndpoint<
          "SocialGetVisits",
          "GET",
          {
            readonly hash: string
            readonly playerId: string & Brand<"PlayerId">
            readonly salt: number & Brand<"U32">
          },
          never,
          never,
          never,
          | { readonly error: string }
          | { readonly success: "NotFound" }
          | {
              readonly success: "Found"
              readonly gifts: ReadonlyArray<{
                readonly from: string & Brand<"PlayerId">
                readonly to: string & Brand<"PlayerId">
                readonly checksum: string
                readonly id: number
                readonly c: string
                readonly type: "None" | "Play" | "Gift" | "Cloud" | "Raffle" | "Visit"
                readonly contents: string
              }>
              readonly total: number
            },
          never,
          never,
          never
        >,
      never,
      never,
      false
    >,
  HttpApiDecodeError | BadRequest | Unauthorized | InternalServerError,
  never
>
```

[Source](https://github.com/leonitousconforti/tinyburg/packages/tinytower-sdk/blob/main/src/TinyTower.ts#L31)

Since v1.0.0

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
  NimblebitAuth | HttpClient.HttpClient
>
```

[Source](https://github.com/leonitousconforti/tinyburg/packages/tinytower-sdk/blob/main/src/TinyTower.ts#L40)

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
  NimblebitAuth | HttpClient.HttpClient
>
```

[Source](https://github.com/leonitousconforti/tinyburg/packages/tinytower-sdk/blob/main/src/TinyTower.ts#L78)

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
  NimblebitAuth | HttpClient.HttpClient
>
```

[Source](https://github.com/leonitousconforti/tinyburg/packages/tinytower-sdk/blob/main/src/TinyTower.ts#L158)

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
  NimblebitAuth | HttpClient.HttpClient
>
```

[Source](https://github.com/leonitousconforti/tinyburg/packages/tinytower-sdk/blob/main/src/TinyTower.ts#L118)

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
  NimblebitAuth | HttpClient.HttpClient
>
```

[Source](https://github.com/leonitousconforti/tinyburg/packages/tinytower-sdk/blob/main/src/TinyTower.ts#L670)

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
  NimblebitAuth | HttpClient.HttpClient
>
```

[Source](https://github.com/leonitousconforti/tinyburg/packages/tinytower-sdk/blob/main/src/TinyTower.ts#L622)

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
  NimblebitAuth | HttpClient.HttpClient
>
```

[Source](https://github.com/leonitousconforti/tinyburg/packages/tinytower-sdk/blob/main/src/TinyTower.ts#L574)

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
      readonly checksum: string
      readonly id: number
      readonly c: string
      readonly type: "None" | "Play" | "Gift" | "Cloud" | "Raffle" | "Visit"
      readonly contents: string
    }>
  },
  NimblebitError | HttpApiDecodeError | BadRequest | Unauthorized | InternalServerError | HttpClientError | ParseError,
  NimblebitAuth | HttpClient.HttpClient
>
```

[Source](https://github.com/leonitousconforti/tinyburg/packages/tinytower-sdk/blob/main/src/TinyTower.ts#L771)

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
      readonly checksum: string
      readonly id: number
      readonly c: string
      readonly type: "None" | "Play" | "Gift" | "Cloud" | "Raffle" | "Visit"
      readonly contents: string
    }>
  },
  NimblebitError | HttpApiDecodeError | BadRequest | Unauthorized | InternalServerError | HttpClientError | ParseError,
  NimblebitAuth | HttpClient.HttpClient
>
```

[Source](https://github.com/leonitousconforti/tinyburg/packages/tinytower-sdk/blob/main/src/TinyTower.ts#L1040)

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
        readonly birthday: readonly [number, number]
        readonly $unknown: ReadonlyArray<string>
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
              readonly gender: "male" | "female" | "unisex"
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
    readonly maxGold: number
    readonly requestedFloorId: number
    readonly bitbook?: string | undefined
    readonly ts: string
  },
  NimblebitError | HttpApiDecodeError | BadRequest | Unauthorized | InternalServerError | HttpClientError | ParseError,
  NimblebitAuth | HttpClient.HttpClient
>
```

[Source](https://github.com/leonitousconforti/tinyburg/packages/tinytower-sdk/blob/main/src/TinyTower.ts#L871)

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
  NimblebitAuth | HttpClient.HttpClient
>
```

[Source](https://github.com/leonitousconforti/tinyburg/packages/tinytower-sdk/blob/main/src/TinyTower.ts#L922)

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
  NimblebitAuth | HttpClient.HttpClient
>
```

[Source](https://github.com/leonitousconforti/tinyburg/packages/tinytower-sdk/blob/main/src/TinyTower.ts#L822)

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
          readonly birthday: readonly [number, number]
          readonly $unknown: ReadonlyArray<string>
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
                readonly gender: "male" | "female" | "unisex"
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
      readonly maxGold: number
      readonly requestedFloorId: number
      readonly bitbook?: string | undefined
      readonly ts: string
    }
    readonly created: Date
  }>,
  NimblebitError | HttpApiDecodeError | BadRequest | Unauthorized | InternalServerError | HttpClientError | ParseError,
  NimblebitAuth | HttpClient.HttpClient
>
```

[Source](https://github.com/leonitousconforti/tinyburg/packages/tinytower-sdk/blob/main/src/TinyTower.ts#L989)

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
  NimblebitAuth | HttpClient.HttpClient
>
```

[Source](https://github.com/leonitousconforti/tinyburg/packages/tinytower-sdk/blob/main/src/TinyTower.ts#L710)

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
  NimblebitAuth | HttpClient.HttpClient
>
```

[Source](https://github.com/leonitousconforti/tinyburg/packages/tinytower-sdk/blob/main/src/TinyTower.ts#L1091)

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
  NimblebitAuth | HttpClient.HttpClient
>
```

[Source](https://github.com/leonitousconforti/tinyburg/packages/tinytower-sdk/blob/main/src/TinyTower.ts#L335)

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
  NimblebitAuth | HttpClient.HttpClient
>
```

[Source](https://github.com/leonitousconforti/tinyburg/packages/tinytower-sdk/blob/main/src/TinyTower.ts#L205)

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
  NimblebitAuth | HttpClient.HttpClient
>
```

[Source](https://github.com/leonitousconforti/tinyburg/packages/tinytower-sdk/blob/main/src/TinyTower.ts#L395)

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
  NimblebitAuth | HttpClient.HttpClient
>
```

[Source](https://github.com/leonitousconforti/tinyburg/packages/tinytower-sdk/blob/main/src/TinyTower.ts#L269)

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
  NimblebitAuth | HttpClient.HttpClient
>
```

[Source](https://github.com/leonitousconforti/tinyburg/packages/tinytower-sdk/blob/main/src/TinyTower.ts#L460)

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
          readonly birthday: readonly [number, number]
          readonly $unknown: ReadonlyArray<string>
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
                readonly gender: "male" | "female" | "unisex"
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
      readonly maxGold: number
      readonly requestedFloorId: number
      readonly bitbook?: string | undefined
      readonly ts: string
    }
  }>,
  NimblebitError | HttpApiDecodeError | BadRequest | Unauthorized | InternalServerError | HttpClientError | ParseError,
  NimblebitAuth | HttpClient.HttpClient
>
```

[Source](https://github.com/leonitousconforti/tinyburg/packages/tinytower-sdk/blob/main/src/TinyTower.ts#L526)

Since v1.0.0
