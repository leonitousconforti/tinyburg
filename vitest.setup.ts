import { addEqualityTesters } from "@effect/vitest";

// No tsconfig project includes this file, so the `allowedUnstableApis` list in
// `tsconfig.base.jsonc` does not reach it.
// oxlint-disable-next-line effecttsgo/unstable-api-usage
addEqualityTesters();
