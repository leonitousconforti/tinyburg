---
title: Endpoints.ts
nav_order: 1
parent: "@tinyburg/tinytower-sdk"
---

## Endpoints.ts overview

Since v1.0.0

---

## Exports Grouped by Category

- [Schemas](#schemas)
  - [PlayerMetaData](#playermetadata)

---

# Schemas

## PlayerMetaData

Player metadata associated with save data and snapshots.

**Signature**

```ts
declare const PlayerMetaData: Schema.Struct<{
  stories: Schema.PropertySignature<":", number, "level", ":", string, false, never>
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
    },
    "avatar",
    ":",
    string,
    false,
    never
  >
  maxGold: Schema.PropertySignature<":", number, "mg", ":", string, false, never>
  requestedFloorId: Schema.PropertySignature<":", number, "reqFID", ":", string, false, never>
  bitbook: Schema.PropertySignature<"?:", string | undefined, "bb", "?:", string | undefined, false, never>
  ts: typeof Schema.String
  vip: Schema.Union<[Schema.transformLiteral<false, "0">, Schema.transformLiteral<true, "1">]>
}>
```

[Source](https://github.com/leonitousconforti/tinyburg/packages/tinytower-sdk/blob/main/src/Endpoints.ts#L113)

Since v1.0.0
