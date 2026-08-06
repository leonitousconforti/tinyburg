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
