---
title: NimblebitError.ts
nav_order: 4
parent: Modules
---

## NimblebitError.ts overview

Nimblebit error schemas.

Since v1.0.0

---

## Exports Grouped by Category

- [Errors](#errors)
  - [NimblebitError](#nimblebiterror)
  - [NimblebitError (type alias)](#nimblebiterror-type-alias)
  - [NimblebitErrorTypeId](#nimblebiterrortypeid)
  - [NimblebitErrorTypeId (type alias)](#nimblebiterrortypeid-type-alias)
  - [isNimblebitError](#isnimblebiterror)

---

# Errors

## NimblebitError

**Signature**

```ts
declare const NimblebitError: typeof internal.NimblebitError
```

[Source](https://github.com/leonitousconforti/tinyburg/packages/nimblebit-sdk/blob/main/src/NimblebitError.ts#L38)

Since v1.0.0

## NimblebitError (type alias)

**Signature**

```ts
type NimblebitError = internal.NimblebitError
```

[Source](https://github.com/leonitousconforti/tinyburg/packages/nimblebit-sdk/blob/main/src/NimblebitError.ts#L32)

Since v1.0.0

## NimblebitErrorTypeId

**Signature**

```ts
declare const NimblebitErrorTypeId: unique symbol
```

[Source](https://github.com/leonitousconforti/tinyburg/packages/nimblebit-sdk/blob/main/src/NimblebitError.ts#L14)

Since v1.0.0

## NimblebitErrorTypeId (type alias)

**Signature**

```ts
type NimblebitErrorTypeId = typeof NimblebitErrorTypeId
```

[Source](https://github.com/leonitousconforti/tinyburg/packages/nimblebit-sdk/blob/main/src/NimblebitError.ts#L20)

Since v1.0.0

## isNimblebitError

**Signature**

```ts
declare const isNimblebitError: (u: unknown) => u is NimblebitError
```

[Source](https://github.com/leonitousconforti/tinyburg/packages/nimblebit-sdk/blob/main/src/NimblebitError.ts#L26)

Since v1.0.0
