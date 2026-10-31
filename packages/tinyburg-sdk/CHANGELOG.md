# @tinyburg/tinyburg-sdk

## 0.2.1

### Patch Changes

- 9b20bdc: Republish from the Release workflow to verify npm trusted publishing. No code changes.
- Updated dependencies [9b20bdc]
    - @tinyburg/nimblebit-sdk@0.2.1
    - @tinyburg/tinytower-classic-sdk@0.2.1
    - @tinyburg/tinytower-sdk@0.2.1

## 0.2.0

### Minor Changes

- Renamed from `@tinyburg/trading-sdk`: it is the client for tinyburg.app's game endpoints under `/v1/<game>`, not for trading (that is `@tinyburg/treasury-sdk`). BEHAVIOR CHANGE: import from `@tinyburg/tinyburg-sdk`; the `HttpApi` is now named `TinyburgApi`.
- Move to Effect 4.1 and declare each endpoint's scopes with `@yielded/auth`'s `OAuthScope` annotations. BEHAVIOR CHANGE: `effect` 4.1.1 and `@yielded/auth` 0.1.0-beta.47 are now peer dependencies, and `NimblebitAuth` layers require `SecureRandom` from `effect/crypto` instead of `Crypto`.

### Patch Changes

- Updated dependencies
- Updated dependencies
    - @tinyburg/nimblebit-sdk@0.2.0
    - @tinyburg/tinytower-sdk@0.2.0
    - @tinyburg/tinytower-classic-sdk@0.2.0

## 0.1.0

### Minor Changes

- b9b405a: New releases with new structures

### Patch Changes

- Updated dependencies [b9b405a]
    - @tinyburg/nimblebit-sdk@0.1.0

## 0.0.1

### Patch Changes

- Updated dependencies [a766e8a]
    - @tinyburg/nimblebit-sdk@0.0.2
