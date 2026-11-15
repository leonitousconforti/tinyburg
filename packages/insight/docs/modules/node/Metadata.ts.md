---
title: Metadata.ts
nav_order: 3
parent: Modules
---

## Metadata.ts overview

Reads the string literals compiled into a Unity il2cpp game straight from
its APK: `global-metadata.dat` is stored unencrypted in Nimblebit's games,
and its literal table lists every URL path segment the game can request,
including the ones a probe run never exercises.

Since v1.0.0

---

## Exports Grouped by Category

- [Errors](#errors)
  - [MetadataNotFoundError (class)](#metadatanotfounderror-class)
- [Metadata](#metadata)
  - [stringLiterals](#stringliterals)
  - [urlPaths](#urlpaths)
  - [urlPathsFromApks](#urlpathsfromapks)
- [Zip](#zip)
  - [readZipEntry](#readzipentry)

---

# Errors

## MetadataNotFoundError (class)

None of the files was an APK with il2cpp metadata in it.

**Signature**

```ts
declare class MetadataNotFoundError
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/insight/src/Metadata.ts#L118)

Since v1.0.0

# Metadata

## stringLiterals

Every string literal in an il2cpp `global-metadata.dat`, in table order
(which roughly follows the code that uses them). Metadata versions 38 and
later keep only offsets, each literal running to the next; earlier ones keep
a length with each offset.

**Signature**

```ts
declare const stringLiterals: (metadata: Uint8Array) => ReadonlyArray<string>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/insight/src/Metadata.ts#L70)

Since v1.0.0

## urlPaths

The literals that look like NBSync URL path segments (`/sync/pull/`,
`/get_items/`, ...), without duplicates.

**Signature**

```ts
declare const urlPaths: (literals: ReadonlyArray<string>) => ReadonlyArray<string>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/insight/src/Metadata.ts#L106)

Since v1.0.0

## urlPathsFromApks

The NBSync URL path segments compiled into a game, read from its APK files
(the base APK holds the metadata in a split install).

**Signature**

```ts
declare const urlPathsFromApks: (
  files: ReadonlyArray<string>
) => Effect.Effect<ReadonlyArray<string>, PlatformError.PlatformError | MetadataNotFoundError, FileSystem.FileSystem>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/insight/src/Metadata.ts#L129)

Since v1.0.0

# Zip

## readZipEntry

Reads one entry of a zip archive (an APK), if it is there. Handles stored
and deflated entries, which is all an APK uses.

**Signature**

```ts
declare const readZipEntry: (archive: Uint8Array, name: string) => Option.Option<Uint8Array>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/insight/src/Metadata.ts#L25)

Since v1.0.0
