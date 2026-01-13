---
title: Schema.ts
nav_order: 2
parent: "@tinyburg/tinytower-sdk"
---

## Schema.ts overview

Schemas and parsers for decoding Nimblebit's custom data formats.

Since v1.0.0

---

## Exports Grouped by Category

- [Schemas](#schemas)
  - [BitbookPost](#bitbookpost)
  - [Bitizen](#bitizen)
  - [BitizenAttributes](#bitizenattributes)
  - [Floor](#floor)
  - [Gift](#gift)
  - [Mission](#mission)
  - [PlayerMetaData](#playermetadata)
  - [SaveData](#savedata)

---

# Schemas

## BitbookPost

How to decode a Bitbook post from Nimblebit's object format.

**Signature**

```ts
declare const BitbookPost: Schema.transformOrFail<
  typeof Schema.String,
  Schema.extend<
    Schema.Struct<{
      _tid: Schema.PropertySignature<":", string, "bb_tid", ":", string, false, never>
      bitizen: Schema.PropertySignature<
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
              readonly tie: Either.Either<
                {
                  readonly r: number & Brand<"U8">
                  readonly g: number & Brand<"U8">
                  readonly b: number & Brand<"U8">
                },
                { readonly r: number & Brand<"U8">; readonly g: number & Brand<"U8">; readonly b: number & Brand<"U8"> }
              >
              readonly earrings: Either.Either<
                {
                  readonly r: number & Brand<"U8">
                  readonly g: number & Brand<"U8">
                  readonly b: number & Brand<"U8">
                },
                { readonly r: number & Brand<"U8">; readonly g: number & Brand<"U8">; readonly b: number & Brand<"U8"> }
              >
              readonly glasses: Either.Either<number, number>
              readonly hairAccessory: Either.Either<number, number>
              readonly hat: Either.Either<
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
        },
        "bb_bzn",
        ":",
        string,
        false,
        never
      >
      source_name: Schema.PropertySignature<":", string, "bb_sname", ":", string, false, never>
      date: Schema.PropertySignature<
        ":",
        Date | { readonly date: Date; readonly extraTicks: bigint },
        "bb_date",
        ":",
        string,
        false,
        never
      >
      body: Schema.PropertySignature<":", string, "bb_txt", ":", string, false, never>
      media_type: Schema.PropertySignature<":", string, "bb_mt", ":", string, false, never>
      media_path: Schema.PropertySignature<":", string, "bb_mp", ":", string, false, never>
      likes: Schema.PropertySignature<":", number, "bb_lks", ":", string, false, never>
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
```

[Source](https://github.com/leonitousconforti/tinyburg/packages/tinytower-sdk/blob/main/src/Schema.ts#L322)

Since v1.0.0

## Bitizen

How to decode a Bitizen from Nimblebit's object format.

**Signature**

```ts
declare const Bitizen: Schema.transformOrFail<
  typeof Schema.String,
  Schema.extend<
    Schema.Struct<{
      homeIndex: Schema.PropertySignature<":", number, "h", ":", string, false, never>
      workIndex: Schema.PropertySignature<":", number, "w", ":", string, false, never>
      placedDreamJob: Schema.PropertySignature<":", boolean, "d", ":", "0" | "1", false, never>
      dreamJobIndex: Schema.PropertySignature<":", number, "j", ":", string, false, never>
      costume: Schema.PropertySignature<"?:", string, "c", ":", string, false, never>
      vip: Schema.PropertySignature<
        ":",
        number | "None" | "Engineer" | "TravelAgent" | "Deliveryman" | "BigSpender" | "Celebrity" | "GiftBit",
        "v",
        ":",
        string,
        false,
        never
      >
      customName: Schema.PropertySignature<"?:", string | undefined, "cn", "?:", string | undefined, false, never>
      pet: Schema.PropertySignature<
        "?:",
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
        | undefined,
        "p",
        "?:",
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
        | undefined,
        false,
        never
      >
      attributes: Schema.PropertySignature<
        ":",
        {
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
            readonly tie: Either.Either<
              { readonly r: number & Brand<"U8">; readonly g: number & Brand<"U8">; readonly b: number & Brand<"U8"> },
              { readonly r: number & Brand<"U8">; readonly g: number & Brand<"U8">; readonly b: number & Brand<"U8"> }
            >
            readonly earrings: Either.Either<
              { readonly r: number & Brand<"U8">; readonly g: number & Brand<"U8">; readonly b: number & Brand<"U8"> },
              { readonly r: number & Brand<"U8">; readonly g: number & Brand<"U8">; readonly b: number & Brand<"U8"> }
            >
            readonly glasses: Either.Either<number, number>
            readonly hairAccessory: Either.Either<number, number>
            readonly hat: Either.Either<
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
        },
        "BA",
        ":",
        string,
        false,
        never
      >
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
```

[Source](https://github.com/leonitousconforti/tinyburg/packages/tinytower-sdk/blob/main/src/Schema.ts#L269)

Since v1.0.0

## BitizenAttributes

How to decode a Bitizen's attributes from Nimblebit's ordered list format.

**Signature**

```ts
declare const BitizenAttributes: Schema.suspend<
  {
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
      readonly tie: Either.Either<
        { readonly r: number & Brand<"U8">; readonly g: number & Brand<"U8">; readonly b: number & Brand<"U8"> },
        { readonly r: number & Brand<"U8">; readonly g: number & Brand<"U8">; readonly b: number & Brand<"U8"> }
      >
      readonly earrings: Either.Either<
        { readonly r: number & Brand<"U8">; readonly g: number & Brand<"U8">; readonly b: number & Brand<"U8"> },
        { readonly r: number & Brand<"U8">; readonly g: number & Brand<"U8">; readonly b: number & Brand<"U8"> }
      >
      readonly glasses: Either.Either<number, number>
      readonly hairAccessory: Either.Either<number, number>
      readonly hat: Either.Either<
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
  },
  string,
  never
>
```

[Source](https://github.com/leonitousconforti/tinyburg/packages/tinytower-sdk/blob/main/src/Schema.ts#L32)

Since v1.0.0

## Floor

How to decode a Floor from Nimblebit's object format.

**Signature**

```ts
declare const Floor: Schema.transformOrFail<
  typeof Schema.String,
  Schema.extend<
    Schema.Struct<{
      storyHeight: Schema.PropertySignature<":", number, "Fs", ":", string, false, never>
      floorId: Schema.PropertySignature<":", number, "Ff", ":", string, false, never>
      level: Schema.PropertySignature<":", number, "Fl", ":", string, false, never>
      openDate: Schema.PropertySignature<
        ":",
        Date | { readonly date: Date; readonly extraTicks: bigint },
        "Fod",
        ":",
        string,
        false,
        never
      >
      stockBaseTime: Schema.PropertySignature<":", string, "Fsbt", ":", string, false, never>
      stockingTier: Schema.PropertySignature<":", number, "Fsi", ":", string, false, never>
      stockingStartTime: Schema.PropertySignature<
        ":",
        Date | { readonly date: Date; readonly extraTicks: bigint },
        "Fst",
        ":",
        string,
        false,
        never
      >
      stocks: Schema.PropertySignature<":", ReadonlyArray<bigint>, "Fstk", ":", string, false, never>
      lastSaleTicks: Schema.PropertySignature<
        ":",
        ReadonlyArray<Date | { readonly date: Date; readonly extraTicks: bigint }>,
        "Flst",
        ":",
        string,
        false,
        never
      >
      floorName: Schema.PropertySignature<":", string, "Fn", ":", string, false, never>
      floorPaint: Schema.PropertySignature<"?:", string | undefined, "Fp", "?:", string | undefined, false, never>
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
```

[Source](https://github.com/leonitousconforti/tinyburg/packages/tinytower-sdk/blob/main/src/Schema.ts#L341)

Since v1.0.0

## Gift

Gift schema.

**Signature**

```ts
declare const Gift: Schema.Struct<{
  id: Schema.PropertySignature<":", number, "gift_id", ":", string, false, never>
  to: Schema.PropertySignature<":", string & Brand<"PlayerId">, "gift_to", ":", string, false, never>
  from: Schema.PropertySignature<":", string & Brand<"PlayerId">, "gift_from", ":", string, false, never>
  type: Schema.PropertySignature<
    ":",
    "None" | "Play" | "Gift" | "Cloud" | "Raffle" | "Visit",
    "gift_type",
    ":",
    "None" | "Play" | "Gift" | "Cloud" | "Raffle" | "Visit",
    false,
    never
  >
  contents: Schema.PropertySignature<":", string, "gift_str", ":", string, false, never>
  checksum: Schema.PropertySignature<":", string, "h", ":", string, false, never>
  c: Schema.PropertySignature<":", string, "c", ":", string, false, never>
}>
```

[Source](https://github.com/leonitousconforti/tinyburg/packages/tinytower-sdk/blob/main/src/Schema.ts#L515)

Since v1.0.0

## Mission

How to decode a Mission from Nimblebit's object format.

**Signature**

```ts
declare const Mission: Schema.transformOrFail<
  typeof Schema.String,
  Schema.extend<
    Schema.Struct<{ id: Schema.PropertySignature<":", string, "m_id", ":", string, false, never> }>,
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
```

[Source](https://github.com/leonitousconforti/tinyburg/packages/tinytower-sdk/blob/main/src/Schema.ts#L369)

Since v1.0.0

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
          readonly tie: Either.Either<
            { readonly r: number & Brand<"U8">; readonly g: number & Brand<"U8">; readonly b: number & Brand<"U8"> },
            { readonly r: number & Brand<"U8">; readonly g: number & Brand<"U8">; readonly b: number & Brand<"U8"> }
          >
          readonly earrings: Either.Either<
            { readonly r: number & Brand<"U8">; readonly g: number & Brand<"U8">; readonly b: number & Brand<"U8"> },
            { readonly r: number & Brand<"U8">; readonly g: number & Brand<"U8">; readonly b: number & Brand<"U8"> }
          >
          readonly glasses: Either.Either<number, number>
          readonly hairAccessory: Either.Either<number, number>
          readonly hat: Either.Either<
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
  vip: Schema.transform<typeof Schema.NumberFromString, typeof Schema.BooleanFromUnknown>
}>
```

[Source](https://github.com/leonitousconforti/tinyburg/packages/tinytower-sdk/blob/main/src/Schema.ts#L471)

Since v1.0.0

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
                readonly tie: Either.Either<
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
                readonly earrings: Either.Either<
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
                readonly glasses: Either.Either<number, number>
                readonly hairAccessory: Either.Either<number, number>
                readonly hat: Either.Either<
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
                  readonly tie: Either.Either<
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
                  readonly earrings: Either.Either<
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
                  readonly glasses: Either.Either<number, number>
                  readonly hairAccessory: Either.Either<number, number>
                  readonly hat: Either.Either<
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
              readonly level: number
              readonly storyHeight: number
              readonly floorId: number
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
                    readonly tie: Either.Either<
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
                    readonly earrings: Either.Either<
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
                    readonly glasses: Either.Either<number, number>
                    readonly hairAccessory: Either.Either<number, number>
                    readonly hat: Either.Either<
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

[Source](https://github.com/leonitousconforti/tinyburg/packages/tinytower-sdk/blob/main/src/Schema.ts#L389)

Since v1.0.0
