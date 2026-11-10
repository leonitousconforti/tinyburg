---
title: Generate.ts
nav_order: 2
parent: Modules
---

## Generate.ts overview

Helpers for an SDK's `frida/Generate.ts`, which regenerates some of the
SDK's source files from its game's own data. It runs the game on insight's
emulator with the SDK's agent (`frida/Agent.ts`) loaded, asks the agent for
the data and writes it between the two separator lines of each file.

Since v1.0.0

---

## Exports Grouped by Category

- [Generate](#generate)
  - [Options (interface)](#options-interface)
  - [banner](#banner)
  - [isRetryable](#isretryable)
  - [isUpToDate](#isuptodate)
  - [main](#main)
  - [replaceEnumTypeFields](#replaceenumtypefields)
  - [replaceGeneratedContent](#replacegeneratedcontent)
  - [sortIndexable](#sortindexable)

---

# Generate

## Options (interface)

**Signature**

```ts
export interface Options<E, R> {
  /** The game's Android package, such as `com.nimblebit.tinytower`. */
  readonly bundleIdentifier: string
  /** The game's name, as each generated file's banner gives it. */
  readonly game: string
  /** The SDK's agent, `new URL("./Agent.ts", import.meta.url)`. */
  readonly agent: URL
  /** The files `generate` rewrites. */
  readonly files: ReadonlyArray<string>
  /** Regenerate the files even if they are from the game's current version. */
  readonly force?: boolean | undefined
  /** Asks the agent for the data and writes the files. */
  readonly generate: Effect.Effect<void, E, R>
}
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/insight/src/Generate.ts#L138)

Since v1.0.0

## banner

The comment each generated file starts with. `main` reads the
version back out of it to skip a game whose files are up to date.

**Signature**

```ts
declare const banner: (game: string, version: string) => Effect.Effect<string>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/insight/src/Generate.ts#L27)

Since v1.0.0

## isRetryable

Whether a failed generate is worth another try. A crashed frida-server
shows up as a failed spawn, attach, resume, load or RPC call while the
agent starts, and as a "detached" FridaSessionError, the cause of the
RpcClientError, for each RPC after that. "compile" errors come from
building the agent and would happen again.

**Signature**

```ts
declare const isRetryable: (error: unknown) => boolean
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/insight/src/Generate.ts#L127)

Since v1.0.0

## isUpToDate

Whether every file was generated from this version of the game.

**Signature**

```ts
declare const isUpToDate: (
  files: ReadonlyArray<string>,
  game: string,
  version: string
) => Effect.Effect<boolean, PlatformError.PlatformError, FileSystem.FileSystem>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/insight/src/Generate.ts#L106)

Since v1.0.0

## main

Regenerates an SDK's files unless they are from the game's current version
on Google Play: boots insight's emulator, installs the game, loads the
SDK's agent and runs `generate`. A frida-server crash (killed, or a
segfault) or a crash of the game detaches the session; the emulator
restarts frida-server, and `generate` gets two more tries, each with a new
session and agent.

**Signature**

```ts
declare const main: <E, R>(
  options: Options<E, R>
) => Effect.Effect<
  void,
  | FridaSessionError.FridaSessionError
  | ConfigError
  | EncodingError
  | FridaDeviceAcquisitionError
  | HttpClientError
  | SchemaError
  | PlatformError.PlatformError
  | NoSuchElementError
  | PlayAccountError
  | PlatformError.BadArgument
  | E
  | TimeoutError,
  | FileSystem.FileSystem
  | ChildProcessSpawner
  | Path
  | Exclude<
      Exclude<Exclude<Exclude<R, Scope>, FridaScript | FridaSession | Protocol>, FridaDevice.FridaDevice>,
      HttpClient | AndroidDeviceService | PlayAccount
    >
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/insight/src/Generate.ts#L164)

Since v1.0.0

## replaceEnumTypeFields

In stringified JSON, replaces each string value of `fieldname` that is a
member of `enums` with a reference to it, `typeName.Member`, so the
generated file refers to its enum instead of repeating the strings.

**Signature**

```ts
declare const replaceEnumTypeFields: (
  stringified: string,
  fieldname: string,
  enums: Readonly<Record<string, string>>,
  typeName: string
) => string
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/insight/src/Generate.ts#L89)

Since v1.0.0

## replaceGeneratedContent

Replaces what is between the two separator lines of a file.

**Signature**

```ts
declare const replaceGeneratedContent: (
  filePath: string,
  newContent: string
) => Effect.Effect<void, PlatformError.PlatformError, FileSystem.FileSystem>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/insight/src/Generate.ts#L46)

Since v1.0.0

## sortIndexable

Turns a record of objects keyed by name, each with a numeric `index`, into
a list ordered by that index, with the name as a `name` field.

**Signature**

```ts
declare const sortIndexable: <T extends Readonly<{ index: string }>>(
  input: Readonly<Record<string, T>>
) => Array<Omit<T, "index"> & { readonly name: string }>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/insight/src/Generate.ts#L70)

Since v1.0.0
