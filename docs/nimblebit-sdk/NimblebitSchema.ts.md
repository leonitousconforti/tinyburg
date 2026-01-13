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
  - [csharpDate](#csharpdate)
  - [unityColor](#unitycolor)
  - [unityColorFromString](#unitycolorfromstring)
- [Types](#types)
  - [ValidateNimblebitItemSchema (type alias)](#validatenimblebititemschema-type-alias)

---

# Parsers

## parseNimblebitObject

**Signature**

```ts
declare const parseNimblebitObject: <Fields extends Schema.Struct.Fields>(
  struct: Schema.Struct<Fields>
) => Schema.transformOrFail<
  typeof Schema.String,
  Schema.extend<
    Schema.Struct<Fields>,
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

[Source](https://github.com/leonitousconforti/tinyburg/packages/nimblebit-sdk/blob/main/src/NimblebitSchema.ts#L67)

Since v1.0.0

## parseNimblebitOrderedList

**Signature**

```ts
declare const parseNimblebitOrderedList: <
  const Items extends ReadonlyArray<{ property: PropertyKey; schema: Schema.Schema.Any }>
>(
  items: ValidateNimblebitItemSchema<Items>,
  separator?: string | undefined
) => Schema.transformOrFail<
  typeof Schema.String,
  Schema.extend<
    Schema.Struct<{ [K in Items[number]["property"]]: Extract<Items[number], { property: K }>["schema"] }>,
    Schema.Struct<{ $unknown: Schema.Array$<typeof Schema.String> }>
  >,
  Items[number]["schema"]["Context"]
>
```

[Source](https://github.com/leonitousconforti/tinyburg/packages/nimblebit-sdk/blob/main/src/NimblebitSchema.ts#L37)

Since v1.0.0

# Schemas

## csharpDate

**Signature**

```ts
declare const csharpDate: Schema.transform<
  typeof Schema.BigInt,
  Schema.Union<
    [
      typeof Schema.DateFromSelf,
      Schema.Struct<{ date: typeof Schema.DateFromSelf; extraTicks: typeof Schema.BigIntFromSelf }>
    ]
  >
>
```

[Source](https://github.com/leonitousconforti/tinyburg/packages/nimblebit-sdk/blob/main/src/NimblebitSchema.ts#L92)

Since v1.0.0

## unityColor

**Signature**

```ts
declare const unityColor: Schema.Struct<{
  r: typeof EffectSchemas.Number.U8
  g: typeof EffectSchemas.Number.U8
  b: typeof EffectSchemas.Number.U8
}>
```

[Source](https://github.com/leonitousconforti/tinyburg/packages/nimblebit-sdk/blob/main/src/NimblebitSchema.ts#L118)

Since v1.0.0

## unityColorFromString

**Signature**

```ts
declare const unityColorFromString: Schema.transform<
  Schema.TemplateLiteralParser<
    [
      Schema.transform<typeof Schema.NumberFromString, Schema.refine<number, typeof Schema.NonNegative>>,
      ":",
      Schema.transform<typeof Schema.NumberFromString, Schema.refine<number, typeof Schema.NonNegative>>,
      ":",
      Schema.transform<typeof Schema.NumberFromString, Schema.refine<number, typeof Schema.NonNegative>>
    ]
  >,
  Schema.Struct<{
    r: typeof EffectSchemas.Number.U8
    g: typeof EffectSchemas.Number.U8
    b: typeof EffectSchemas.Number.U8
  }>
>
```

[Source](https://github.com/leonitousconforti/tinyburg/packages/nimblebit-sdk/blob/main/src/NimblebitSchema.ts#L128)

Since v1.0.0

# Types

## ValidateNimblebitItemSchema (type alias)

**Signature**

```ts
type ValidateNimblebitItemSchema<Items> = {
  [K in keyof Items]: Items[K] extends {
    property: infer P
    schema: Schema.Schema<infer _A, infer _I, infer _R>
  }
    ? [_I] extends [string | Readonly<string>]
      ? { property: P; schema: Items[K]["schema"] }
      : { property: P; schema: `Nimblebit ordered list items schemas must be encodeable to strings` }
    : Items[K]
}
```

[Source](https://github.com/leonitousconforti/tinyburg/packages/nimblebit-sdk/blob/main/src/NimblebitSchema.ts#L17)

Since v1.0.0
