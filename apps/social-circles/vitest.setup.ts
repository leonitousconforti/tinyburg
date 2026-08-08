import { setup } from "foldkit/test/vitest";

// Registers `toHaveText`, `toBeDisabled`, `toHaveAccessibleName` and the rest
// of the Scene matchers with `expect`, and augments vitest's `Assertion` type
// so no `declare module` block is needed at the call sites.
setup();
