---
title: NimblebitScopes.ts
nav_order: 7
parent: Modules
---

## NimblebitScopes.ts overview

The scope tree every Nimblebit game's api is guarded by.

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
  - [ScopeDescription (type alias)](#scopedescription-type-alias)
- [Requirements](#requirements)
  - [entryName](#entryname)
  - [isSatisfied](#issatisfied)
  - [requiredBy](#requiredby)

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

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/nimblebit-sdk/src/NimblebitScopes.ts#L158)

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

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/nimblebit-sdk/src/NimblebitScopes.ts#L172)

Since v1.0.0

# Models

## Area (interface)

One area of an api: a scope that grants both of its branches.

**Signature**

```ts
export interface Area extends ScopeDescription {
  readonly read: Branch
  readonly write: Branch
}
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/nimblebit-sdk/src/NimblebitScopes.ts#L50)

Since v1.0.0

## Branch (interface)

A `:read` or `:write` branch: a scope that grants every leaf under it.

**Signature**

```ts
export interface Branch extends ScopeDescription {
  readonly children: ReadonlyArray<Leaf>
}
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/nimblebit-sdk/src/NimblebitScopes.ts#L40)

Since v1.0.0

## Game (interface)

One game: a scope that grants every area, with a `:read` and a `:write`
branch that each span every area.

**Signature**

```ts
export interface Game extends ScopeDescription {
  readonly read: Branch
  readonly write: Branch
  readonly areas: Readonly<Record<string, Area>>
}
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/nimblebit-sdk/src/NimblebitScopes.ts#L62)

Since v1.0.0

## Leaf (interface)

One endpoint's scope. `grants` is the leaf and every scope above it,
narrowest first, and `required` is the requirement an endpoint is
annotated with: any one of `grants`.

**Signature**

```ts
export interface Leaf extends ScopeDescription {
  readonly grants: Arr.NonEmptyReadonlyArray<ScopeDescription>
  readonly required: OAuthScope.Requirement
}
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/nimblebit-sdk/src/NimblebitScopes.ts#L29)

Since v1.0.0

## ScopeDescription (type alias)

A scope by name, with the text a player reads for it on the consent
screen.

**Signature**

```ts
type ScopeDescription = OAuthScope.Described
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/nimblebit-sdk/src/NimblebitScopes.ts#L19)

Since v1.0.0

# Requirements

## entryName

The scope name of a requirement entry, which is either a bare scope or a
described one.

**Signature**

```ts
declare const entryName: (entry: OAuthScope.OAuthScope | OAuthScope.Described) => string
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/nimblebit-sdk/src/NimblebitScopes.ts#L229)

Since v1.0.0

## isSatisfied

Whether holding `held` satisfies `requirement`, by name, exactly as the
Tinyburg OAuth server checks a token: every `allOf` scope held and, when
`anyOf` is present, at least one of those. A requirement with neither, or
with an empty `anyOf`, is satisfied by nothing, because the server refuses
it too; `{ allOf: [] }` is satisfied by anything.

**Signature**

```ts
declare const isSatisfied: (requirement: OAuthScope.Requirement, held: ReadonlySet<string>) => boolean
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/nimblebit-sdk/src/NimblebitScopes.ts#L242)

Since v1.0.0

## requiredBy

The requirement that accepts exactly one scope: what a group is annotated
with when nothing narrower than the whole node will do.

**Signature**

```ts
declare const requiredBy: (node: ScopeDescription) => OAuthScope.Requirement
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/nimblebit-sdk/src/NimblebitScopes.ts#L218)

Since v1.0.0
