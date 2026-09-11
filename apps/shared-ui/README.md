# @tinyburg/ui

The internal component library for tinyburg's foldkit apps: the pixel theme, page furniture (cards, buttons, banners, back links), and icons. Private for now.

## Using it

Add the workspace dependency, then wire up both halves:

**Styles** — in the app's global css:

```css
@import "tailwindcss";
@import "@tinyburg/ui/theme.css";
@source "../../node_modules/@tinyburg/ui/src";
```

The `@source` line matters: component classes live in this package's TypeScript, and tailwind only generates utilities for files it scans. Adjust the relative path to reach the app's `node_modules` from the css file. App-specific tokens go in the app's own `@theme` block, which composes with the shared one.

**Views** — components are plain foldkit view functions, generic over the app's message type:

```ts
import { banner, card, primaryButton } from "@tinyburg/ui/Chrome";
import { towerIcon } from "@tinyburg/ui/Icons";
```

## Standalone pages

`StandalonePage` is the odd one out: server-rendered pages that are not part of
any SPA. The OIDC consent screen runs during a third-party authorization, where
the browser holds no access token for a SPA to authenticate with; the Discord
`/link` callback is a bare redirect landing on whichever device finished the
round trip. They are all the same card on the same sky-blue background.

They cannot use the Tailwind half of this package. A standalone page is served
by a different app on a different origin from the SPA whose stylesheet Vite
emitted under a content-hashed name, and inlining that whole stylesheet to show
six lines of text would be absurd. So this one module ships its own CSS.

That CSS and the document shell are real files, `StandalonePage.css` and
`StandalonePage.html`, read once at module load and inlined. The shell has to be
a template rather than a view because Foldkit refuses to render anything rooted
at `<html>`, `<head>` or `<body>` - a browser builds those from the document it
parses, so the served root would never be the element the view wrote. It does
not have to be a string literal in a `.ts` file, though. Source comments in both
are stripped before anything is served.

```ts
import { StandalonePage } from "@tinyburg/ui";

// A heading and a sentence, which most outcome pages are.
StandalonePage.renderNotice({ language: "en", title: "Linked", body: "..." });

// Anything else composes the pieces and renders its own view.
StandalonePage.render({ model, view, favicon: true });
```

The pieces are `card`, `lead`, `footnote`, `permissions` (the list of things a
page is asking you to agree to) and `actions` (a form of submit buttons, one per
answer). Every render is static: no hydration stamp, no Flags, no bundle, and
identical behaviour with scripting turned off.

**This module reads from disk, so it is server-only.** Nothing in a browser
bundle may import it. It also depends on this package's `exports` pointing at
`./src/*`, so the `.css` and `.html` sit next to the compiled module at runtime;
pointing them at `dist` would need the build to copy both.
