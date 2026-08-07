---
title: Chrome.ts
nav_order: 1
parent: "@tinyburg/ui"
---

## Chrome.ts overview

The shared page furniture: cards, buttons, banners, and the navigation
pills every tinyburg app wears. Views are generic over the app's message
type, so a component that emits nothing composes into any page.

Since v1.0.0

---

## Exports Grouped by Category

- [Classes](#classes)
  - [card](#card)
  - [dangerButton](#dangerbutton)
  - [primaryButton](#primarybutton)
  - [quietButton](#quietbutton)
  - [smallButton](#smallbutton)
- [Views](#views)
  - [appBackLink](#appbacklink)
  - [articleBackLink](#articlebacklink)
  - [articleHeading](#articleheading)
  - [banner](#banner)
  - [bullet](#bullet)

---

# Classes

## card

The card every section of every page sits in.

**Signature**

```ts
declare const card: "bg-card-bg shadow-pixel-hover border-gold w-full rounded-2xl border-3 p-8"
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/src/Chrome.ts#L17)

Since v1.0.0

## dangerButton

A compact button for destructive actions; red enough to slow a reader down.

**Signature**

```ts
declare const dangerButton: "font-pixel shrink-0 rounded-lg border-2 border-red-300 bg-white px-3 py-2 text-[0.55rem] text-red-700 transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:border-red-500 disabled:pointer-events-none disabled:opacity-50"
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/src/Chrome.ts#L43)

Since v1.0.0

## primaryButton

The one button per view that moves things forward.

**Signature**

```ts
declare const primaryButton: "font-pixel bg-sky-dark shadow-pixel hover:shadow-pixel-hover shrink-0 rounded-lg px-4 py-3 text-[0.6rem] text-white transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-50"
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/src/Chrome.ts#L25)

Since v1.0.0

## quietButton

A full-size button for actions that are safe to click.

**Signature**

```ts
declare const quietButton: "font-pixel shadow-pixel hover:shadow-pixel-hover shrink-0 rounded-lg border-2 border-gray-300 bg-white px-4 py-3 text-[0.6rem] text-gray-700 transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-50"
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/src/Chrome.ts#L34)

Since v1.0.0

## smallButton

A compact button for the per-row actions in a list.

**Signature**

```ts
declare const smallButton: "font-pixel shrink-0 rounded-lg border-2 border-gray-300 bg-white px-3 py-2 text-[0.55rem] text-gray-700 transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:border-sky-blue disabled:pointer-events-none disabled:opacity-50"
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/src/Chrome.ts#L52)

Since v1.0.0

# Views

## appBackLink

The absolute top-left pill used on app pages.

`back-link` names it for the View Transition API: when both the outgoing
and incoming page carry a back link the browser slides the one pill between
their two positions instead of fading it out and another one in. Exactly
one of these renders per page, which is what the name requires.

**Signature**

```ts
declare const appBackLink: <M>(h: HtmlBuilder<M>, href: string, label: string) => Html
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/src/Chrome.ts#L86)

Since v1.0.0

## articleBackLink

The fixed top-left pill used on article pages (about, privacy, terms, ...).
Shares the `back-link` transition name with `appBackLink`.

**Signature**

```ts
declare const articleBackLink: <M>(h: HtmlBuilder<M>, href: string, label: string) => Html
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/src/Chrome.ts#L104)

Since v1.0.0

## articleHeading

Section heading inside an article card.

**Signature**

```ts
declare const articleHeading: <M>(h: HtmlBuilder<M>, text: string) => Html
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/src/Chrome.ts#L136)

Since v1.0.0

## banner

A status or problem line above the page content. Notices are announced
politely; problems interrupt.

**Signature**

```ts
declare const banner: <M>(h: HtmlBuilder<M>, tone: "notice" | "problem", text: string) => Html
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/src/Chrome.ts#L62)

Since v1.0.0

## bullet

A bullet list item with the sky-dark dot marker.

**Signature**

```ts
declare const bullet: <M>(h: HtmlBuilder<M>, children: ReadonlyArray<Html | string>) => Html
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/src/Chrome.ts#L121)

Since v1.0.0
