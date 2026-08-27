---
title: NimblebitScopes.ts
nav_order: 7
parent: Modules
---

## NimblebitScopes.ts overview

The scope tree every Nimblebit game's api is guarded by.

A game sits at the top and splits into a `:read` and a `:write` branch that
span the whole game. Beneath it, each area of the api (`sync`, `social`,
...) splits into a `:read` and a `:write` branch of its own, with a leaf
per endpoint under those. A scope grants everything beneath it, so
`<game>:read` grants every read in the game, `<game>:sync:read` every
read in one area, and `<game>:sync:pull_save` one endpoint. That reaches
enforcement without any prefix matching: a leaf carries the list an
endpoint accepts - itself, its area's branch, its area, the game's branch,
the game - and a key holding any one of them matches by plain equality.

A leaf exists only as part of an area, and an area only as part of a game,
both made by `defineGame` from the spec that names them, so nothing
can be outside the tree and no name can disagree with its place in it.
`Sync.read.pull_save` is the leaf named `<game>:sync:pull_save`, and
`Sync.read.pull_save.grants` is what goes on the endpoint. `defineArea`
makes a standalone area for an api whose scopes need no game above them.

This lives here rather than in one game's sdk because every game builds the
same shape: a sdk that only needs to declare its scopes should not have to
depend on TinyTower to do it.

`import type` keeps this module free of runtime imports.

Since v1.0.0

---

## Exports Grouped by Category

- [Constructors](#constructors)
  - [defineArea](#definearea)
  - [defineGame](#definegame)
- [Models](#models)
  - [Area (interface)](#area-interface)
  - [Branch (interface)](#branch-interface)
  - [Game (interface)](#game-interface)
  - [Leaf (interface)](#leaf-interface)

---

# Constructors

## defineArea

Makes a standalone area, its two branches and their leaves from one
literal. Names are derived from the path - the area's name, `:read` or
`:write`, and the leaf's key - so a leaf's name says where it sits and
nothing has to be written twice.

For an api whose scopes need no game above them. Inside a game, areas are
written as part of `defineGame` instead.

**Signature**

```ts
declare const defineArea: <R extends string, W extends string>(
  spec: { readonly name: string } & AreaSpec<R, W> & NoReservedLeaves<R, W>
) => KeyedArea<R, W>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/nimblebit-sdk/src/NimblebitScopes.ts#L171)

Since v1.0.0

## defineGame

Makes a game, its `:read` and `:write` branches, and every area beneath it
from one literal. Areas are keyed by name and prefixed with the game's, so
`sync` inside `tinytower` is `tinytower:sync` and its leaves
`tinytower:sync:<key>`; the game's own branches gather every read and every
write across its areas.

**Signature**

```ts
declare const defineGame: <const Areas extends Readonly<Record<string, AreaSpec<string, string>>>>(spec: {
  readonly name: string
  readonly description: string
  readonly read: { readonly description: string }
  readonly write: { readonly description: string }
  readonly areas: Areas & {
    readonly [K in keyof Areas]: Areas[K] extends AreaSpec<infer R, infer W> ? NoReservedLeaves<R, W> : never
  }
}) => Game & {
  readonly areas: { readonly [K in keyof Areas]: Areas[K] extends AreaSpec<infer R, infer W> ? KeyedArea<R, W> : never }
}
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/nimblebit-sdk/src/NimblebitScopes.ts#L185)

Since v1.0.0

# Models

## Area (interface)

One area of an api: a scope that grants both of its branches.

**Signature**

```ts
export interface Area extends ResourceServer.ScopeDescription {
  readonly read: Branch
  readonly write: Branch
}
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/nimblebit-sdk/src/NimblebitScopes.ts#L64)

Since v1.0.0

## Branch (interface)

A `:read` or `:write` branch: a scope that grants every leaf under it.

**Signature**

```ts
export interface Branch extends ResourceServer.ScopeDescription {
  readonly children: ReadonlyArray<Leaf>
}
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/nimblebit-sdk/src/NimblebitScopes.ts#L54)

Since v1.0.0

## Game (interface)

One game: a scope that grants every area, with a `:read` and a `:write`
branch that each span every area.

**Signature**

```ts
export interface Game extends ResourceServer.ScopeDescription {
  readonly read: Branch
  readonly write: Branch
  readonly areas: Readonly<Record<string, Area>>
}
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/nimblebit-sdk/src/NimblebitScopes.ts#L76)

Since v1.0.0

## Leaf (interface)

A scope on one endpoint, and the scopes that grant it. `grants` is the
endpoint's `OIDCScopes` annotation.

Exported, along with `Branch`, `Area` and `Game`, because a
package that builds its own tree has to be able to name the type of what it
exports.

**Signature**

```ts
export interface Leaf extends ResourceServer.ScopeDescription {
  readonly grants: ReadonlyArray<ResourceServer.ScopeDescription>
}
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/nimblebit-sdk/src/NimblebitScopes.ts#L44)

Since v1.0.0
