---
title: NimblebitGame.ts
nav_order: 5
parent: Modules
---

## NimblebitGame.ts overview

Every Nimblebit game with a cloud sync service, and the several names each
one goes by.

Since v1.0.0

---

## Exports Grouped by Category

- [Accessors](#accessors)
  - [codeOf](#codeof)
  - [fromCode](#fromcode)
- [Games](#games)
  - [NimblebitGame (type alias)](#nimblebitgame-type-alias)
  - [NimblebitGames](#nimblebitgames)
- [Models](#models)
  - [NimblebitGameInfo (interface)](#nimblebitgameinfo-interface)
- [Schemas](#schemas)
  - [NimblebitGameSchema](#nimblebitgameschema)

---

# Accessors

## codeOf

**Signature**

```ts
declare const codeOf: <G extends NimblebitGame>(game: G) => (typeof NimblebitGames)[G]["code"]
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/nimblebit-sdk/src/NimblebitGame.ts#L101)

Since v1.0.0

## fromCode

**Signature**

```ts
declare const fromCode: (code: (typeof NimblebitGames)[keyof typeof NimblebitGames]["code"]) => NimblebitGameInfo
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/nimblebit-sdk/src/NimblebitGame.ts#L108)

Since v1.0.0

# Games

## NimblebitGame (type alias)

**Signature**

```ts
type NimblebitGame = (typeof NimblebitGameSchema.literals)[number]
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/nimblebit-sdk/src/NimblebitGame.ts#L30)

Since v1.0.0

## NimblebitGames

**Signature**

```ts
declare const NimblebitGames: {
  readonly tinytower: {
    readonly name: "TinyTower"
    readonly code: "tt"
    readonly bundleId: "com.nimblebit.tinytower"
    readonly sdk: "@tinyburg/tinytower-sdk"
  }
  readonly tinytowerclassic: {
    readonly name: "TinyTower Classic"
    readonly code: "ttc"
    readonly sdk: "@tinyburg/tinytower-classic-sdk"
  }
  readonly pocketplanes: {
    readonly name: "Pocket Planes"
    readonly code: "pp"
    readonly bundleId: "com.nimblebit.pocketplanes"
    readonly sdk: "@tinyburg/pocket-planes-sdk"
  }
  readonly pockettrains: {
    readonly name: "Pocket Trains"
    readonly code: "pt"
    readonly bundleId: "com.nimblebit.pockettrains"
    readonly sdk: "@tinyburg/pocket-trains-sdk"
  }
  readonly legotower: {
    readonly name: "LEGO Tower"
    readonly code: "lt"
    readonly bundleId: "com.nimblebit.legotower"
    readonly sdk: "@tinyburg/lego-tower-sdk"
  }
  readonly discozoo: {
    readonly name: "Disco Zoo"
    readonly code: "dz"
    readonly bundleId: "com.nimblebit.discozoo"
    readonly sdk: "@tinyburg/disco-zoo-sdk"
  }
  readonly bitcity: {
    readonly name: "Bit City"
    readonly code: "bc"
    readonly bundleId: "com.nimblebit.bitcity"
    readonly sdk: "@tinyburg/bitcity-sdk"
  }
  readonly tinytowervegas: {
    readonly name: "Tiny Tower Vegas"
    readonly code: "vegas"
    readonly bundleId: "com.nimblebit.vegas"
    readonly sdk: "@tinyburg/tinytower-vegas-sdk"
  }
}
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/nimblebit-sdk/src/NimblebitGame.ts#L47)

Since v1.0.0

# Models

## NimblebitGameInfo (interface)

**Signature**

```ts
export interface NimblebitGameInfo {
  readonly name: string
  readonly code: string
  readonly bundleId?: string | undefined
  readonly sdk: string
}
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/nimblebit-sdk/src/NimblebitGame.ts#L36)

Since v1.0.0

# Schemas

## NimblebitGameSchema

**Signature**

```ts
declare const NimblebitGameSchema: Schema.Literals<
  readonly [
    "tinytower",
    "tinytowerclassic",
    "pocketplanes",
    "pockettrains",
    "legotower",
    "discozoo",
    "bitcity",
    "tinytowervegas"
  ]
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/nimblebit-sdk/src/NimblebitGame.ts#L15)

Since v1.0.0
