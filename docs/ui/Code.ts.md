---
title: Code.ts
nav_order: 2
parent: "@tinyburg/ui"
---

## Code.ts overview

Syntax highlighting for the code samples on our marketing and docs pages.

This is deliberately not a real highlighter. The snippets it colors are
string literals in our own source, written by us, in two languages — so a
tokenizer that handles those two languages well beats shipping a megabyte
of TextMate grammars to color four blocks. It emits tokens rather than an
HTML string, which keeps the output as ordinary vdom: no InnerHTML escape
hatch, and it diffs like everything else on the page.

The palette is VS Code's default Dark+, so a snippet here looks the way it
will look when the reader pastes it into their editor.

Since v1.0.0

---

## Exports Grouped by Category

- [Highlighting](#highlighting)
  - [highlight](#highlight)
- [Models](#models)
  - [Language (type alias)](#language-type-alias)
  - [Token (interface)](#token-interface)
  - [TokenKind (type alias)](#tokenkind-type-alias)
- [Views](#views)
  - [codeBlock](#codeblock)

---

# Highlighting

## highlight

Splits source into colored runs. Text that no branch claims comes back as
`plain`, so concatenating every token's text reproduces the input exactly.

**Signature**

```ts
declare const highlight: (language: Language, source: string) => ReadonlyArray<Token>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/src/Code.ts#L160)

Since v1.0.0

# Models

## Language (type alias)

The languages we know how to color.

**Signature**

```ts
type Language = "ts" | "sh"
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/src/Code.ts#L60)

Since v1.0.0

## Token (interface)

A run of source text that shares one color.

**Signature**

```ts
export interface Token {
  readonly text: string
  readonly kind: TokenKind
}
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/src/Code.ts#L49)

Since v1.0.0

## TokenKind (type alias)

The kinds of token we distinguish, named after the Light+ scopes they take
their color from rather than after grammar concepts.

**Signature**

```ts
type TokenKind =
  | "comment"
  | "string"
  | "number"
  /** Control flow and module structure: `import`, `from`, `return`. Purple. */
  | "keyword"
  /** Declarations: `const`, `function`, `class`. Blue. */
  | "storage"
  /** Capitalized identifiers, which in our snippets are always types or namespaces. Teal. */
  | "type"
  /** An identifier in call position. Olive. */
  | "function"
  /** Any other identifier. Navy. */
  | "variable"
  /** Punctuation, operators, and whitespace. Black. */
  | "plain"
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/src/Code.ts#L26)

Since v1.0.0

# Views

## codeBlock

A highlighted block of source, on the dark background its palette was
designed for.

**Signature**

```ts
declare const codeBlock: <M>(h: HtmlBuilder<M>, language: Language, source: string) => Html
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/src/Code.ts#L220)

Since v1.0.0
