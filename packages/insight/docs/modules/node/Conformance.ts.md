---
title: Conformance.ts
nav_order: 1
parent: Modules
---

## Conformance.ts overview

Checks an SDK's `HttpApi` against what a game was recorded doing (see
`NBSync.probe`): which of its endpoints the game called, whether the real
responses decode with the endpoint's success schemas, the exact preimage the
game signed for each request, and which URL paths the game has that the
SDK lacks.

The report redacts the game's signing secrets and the player's auth key.

Since v1.0.0

---

## Exports Grouped by Category

- [Conformance](#conformance)
  - [check](#check)
  - [hasProblems](#hasproblems)
  - [main](#main)
  - [render](#render)
  - [run](#run)
- [Errors](#errors)
  - [ConformanceError (class)](#conformanceerror-class)
- [Models](#models)
  - [ApiLike (interface)](#apilike-interface)
  - [EndpointCheck (interface)](#endpointcheck-interface)
  - [Options (interface)](#options-interface)
  - [Report (interface)](#report-interface)
  - [RequestCheck (interface)](#requestcheck-interface)

---

# Conformance

## check

Checks `api` against one probe run of its game.

**Signature**

```ts
declare const check: (api: ApiLike, run: NBSync.ProbeRun, options?: Options) => Report
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/insight/src/Conformance.ts#L263)

Since v1.0.0

## hasProblems

Whether the run contradicts the SDK: a Nimblebit request no endpoint
matches, or a response an endpoint's schemas cannot decode.

**Signature**

```ts
declare const hasProblems: (report: Report) => boolean
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/insight/src/Conformance.ts#L380)

Since v1.0.0

## main

An SDK's `pnpm conformance`: runs `run`, prints the report as Markdown and
fails if the game did something the SDK does not model. The secret the SDK
signs with for this game is read from `secretVariable`, if set, and only
compared with the game's.

**Signature**

```ts
declare const main: (
  api: ApiLike,
  bundleIdentifier: string,
  secretVariable: string
) => Effect.Effect<
  undefined,
  | FridaSessionError
  | Config.ConfigError
  | EncodingError
  | FridaDeviceAcquisitionError
  | HttpClientError
  | Schema.SchemaError
  | PlatformError
  | NoSuchElementError
  | PlayAccountError
  | BadArgument
  | RpcClientError
  | Metadata.MetadataNotFoundError
  | ConformanceError,
  FileSystem | ChildProcessSpawner | Path
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/insight/src/Conformance.ts#L483)

Since v1.0.0

## render

The report as Markdown.

**Signature**

```ts
declare const render: (report: Report) => string
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/insight/src/Conformance.ts#L389)

Since v1.0.0

## run

Probes a game on the emulator (see `NBSync.probe`), reads the URL paths
compiled into it from its APK, and checks `api` against both.

**Signature**

```ts
declare const run: (
  api: ApiLike,
  bundleIdentifier: string,
  options?: (Omit<Options, "literals"> & NBSync.ProbeOptions) | undefined
) => Effect.Effect<
  Report,
  | FridaSessionError
  | Config.ConfigError
  | EncodingError
  | FridaDeviceAcquisitionError
  | HttpClientError
  | Schema.SchemaError
  | PlatformError
  | NoSuchElementError
  | PlayAccountError
  | RpcClientError
  | Metadata.MetadataNotFoundError,
  FileSystem | ChildProcessSpawner | Path | HttpClient | AndroidDeviceService | PlayAccount
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/insight/src/Conformance.ts#L446)

Since v1.0.0

# Errors

## ConformanceError (class)

The game made a request the SDK has no endpoint for, or got a response the
SDK's schemas cannot decode.

**Signature**

```ts
declare class ConformanceError
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/insight/src/Conformance.ts#L468)

Since v1.0.0

# Models

## ApiLike (interface)

The parts of an `HttpApi` the check reads, so any SDK's `Api` fits.

**Signature**

```ts
export interface ApiLike {
  readonly groups: Readonly<
    Record<
      string,
      {
        readonly endpoints: Readonly<
          Record<string, { readonly method: string; readonly path: string; readonly success: ReadonlySet<Schema.Top> }>
        >
      }
    >
  >
}
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/insight/src/Conformance.ts#L98)

Since v1.0.0

## EndpointCheck (interface)

One endpoint of the SDK's `HttpApi`.

**Signature**

```ts
export interface EndpointCheck {
  readonly name: string
  readonly method: string
  readonly path: string
  readonly observed: boolean
  /** Whether every captured response decoded; null when none was captured. */
  readonly decoded: boolean | null
  /** Whether the game has this path compiled in, when its literals were given. */
  readonly literal: boolean | null
}
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/insight/src/Conformance.ts#L56)

Since v1.0.0

## Options (interface)

**Signature**

```ts
export interface Options {
  /** URL path segments compiled into the game, from `Metadata.urlPathsFromApks`. */
  readonly literals?: ReadonlyArray<string> | undefined
  /** The secret the SDK signs with, to compare with the game's. */
  readonly configuredSecret?: Redacted.Redacted<string> | undefined
}
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/insight/src/Conformance.ts#L85)

Since v1.0.0

## Report (interface)

**Signature**

```ts
export interface Report {
  readonly bundleIdentifier: string
  readonly requests: ReadonlyArray<RequestCheck>
  readonly endpoints: ReadonlyArray<EndpointCheck>
  /** Path segments compiled into the game that no SDK endpoint uses. */
  readonly literalsWithoutEndpoint: ReadonlyArray<string>
  /** Whether the secret the SDK is configured with is the game's current `NBSync._ss`. */
  readonly configuredSecretMatches: boolean | null
}
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/insight/src/Conformance.ts#L71)

Since v1.0.0

## RequestCheck (interface)

One request the game made to Nimblebit.

**Signature**

```ts
export interface RequestCheck {
  /** "startup" for the game's own launch traffic, else the driven method. */
  readonly trigger: string
  readonly method: string
  readonly host: string
  /** The path with the endpoint's params (and the player id) as `{tokens}`. */
  readonly path: string
  /** The SDK endpoint whose path matched, as `Group.Endpoint`. */
  readonly endpoint: string | null
  /** The string the game hashed for this request, tokenized, secrets as `{secret:N}`. */
  readonly preimage: string | null
  readonly algorithm: "md5" | "sha256" | null
  /** Whether the secret appended to the preimage is the game's `NBSync._ss`. */
  readonly secretIsSs: boolean | null
  /** The response body, redacted and clipped. */
  readonly response: string | null
  /** Whether the response decoded with the endpoint's success schemas. */
  readonly decoded: boolean | null
  readonly decodeError: string | null
}
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/insight/src/Conformance.ts#L29)

Since v1.0.0
