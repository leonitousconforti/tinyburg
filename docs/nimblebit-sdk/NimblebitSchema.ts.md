---
title: NimblebitSchema.ts
nav_order: 5
parent: "@tinyburg/nimblebit-sdk"
---

## NimblebitSchema.ts overview

Schemas and parsers for decoding Nimblebit's custom data formats.

Since v1.0.0

---

## Exports Grouped by Category

- [Parsers](#parsers)
  - [parseNimblebitObject](#parsenimblebitobject)
  - [parseNimblebitOrderedList](#parsenimblebitorderedlist)
- [Schemas](#schemas)
  - [CSharpDate](#csharpdate)
  - [UnityColor](#unitycolor)
  - [split](#split)

---

# Parsers

## parseNimblebitObject

**Signature**

```ts
declare const parseNimblebitObject: <Fields extends { readonly [x: PropertyKey]: Schema.Codec<any, string, any, any> }>(
  struct: Schema.Struct<Fields>
) => Schema.decodeTo<
  Schema.Struct<
    Fields & {
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
  Schema.Struct.DecodingServices<Fields>,
  Schema.Struct.EncodingServices<Fields>
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/nimblebit-sdk/src/NimblebitSchema.ts#L59)

Since v1.0.0

## parseNimblebitOrderedList

**Signature**

```ts
declare const parseNimblebitOrderedList: <
  const Items extends ReadonlyArray<{
    property: PropertyKey
    schema: Schema.Codec<any, string, any, any> & {
      readonly "~encoded.optionality": "required"
      readonly "~encoded.mutability": "readonly"
      readonly "~type.optionality": "required"
      readonly "~type.mutability": "readonly"
    }
  }>
>(
  items: Items,
  separator?: string
) => Schema.decodeTo<
  Schema.Struct<
    { [K in Items[number]["property"]]: Extract<Items[number], { property: K }>["schema"] } & {
      readonly $unknown: Schema.$Array<Schema.String>
    }
  >,
  Schema.String,
  Items[number]["schema"]["DecodingServices"],
  Items[number]["schema"]["EncodingServices"]
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/nimblebit-sdk/src/NimblebitSchema.ts#L24)

Since v1.0.0

# Schemas

## CSharpDate

**Signature**

```ts
declare const CSharpDate: Schema.decodeTo<
  Schema.Union<
    readonly [Schema.Date, Schema.Struct<{ readonly date: Schema.Date; readonly extraTicks: Schema.BigInt }>]
  >,
  Schema.BigInt,
  never,
  never
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/nimblebit-sdk/src/NimblebitSchema.ts#L88)

Since v1.0.0

## UnityColor

**Signature**

```ts
declare const UnityColor: Schema.decodeTo<
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
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/nimblebit-sdk/src/NimblebitSchema.ts#L108)

Since v1.0.0

## split

**Signature**

```ts
declare const split: (options?: {
  readonly separator?: string | undefined
}) => (from: Schema.String) => Schema.decodeTo<Schema.$Array<Schema.String>, Schema.String, never>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/nimblebit-sdk/src/NimblebitSchema.ts#L132)

Since v1.0.0
