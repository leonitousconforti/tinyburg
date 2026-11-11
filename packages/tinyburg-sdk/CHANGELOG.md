# @tinyburg/tinyburg-sdk

## 0.3.0

### Minor Changes

- 9159310: Declare scopes as flat `@yielded/auth` `OAuthScope.Described` constants instead of a tree, and remove `NimblebitScopes`. Each `Scopes` module now exports the whole game's scope, `Read`, `Write`, one scope per endpoint (`Scopes.SyncPullSave`), and in the game SDKs a `:read` and a `:write` scope per area (`Scopes.SyncRead`). Every endpoint accepts its own scope, its area's side (game SDKs), the game's side and the game. The game SDKs no longer have the bare area scopes such as `tinytower:sync`; every other scope name is unchanged. `@tinyburg/tinyburg-sdk`'s and `@tinyburg/treasury-sdk`'s scope names and requirements are unchanged.

### Patch Changes

- Updated dependencies [51cfcfc]
- Updated dependencies [9159310]
- Updated dependencies [16c9e1c]
- Updated dependencies [34ac6e5]
    - @tinyburg/nimblebit-sdk@0.4.0
    - @tinyburg/tinytower-sdk@0.4.0
    - @tinyburg/tinytower-classic-sdk@0.4.0

## 0.2.2

### Patch Changes

- Updated dependencies [2ec1bdc]
- Updated dependencies [cf0f658]
- Updated dependencies [aad505b]
- Updated dependencies [bb4314f]
- Updated dependencies [c779076]
- Updated dependencies [97dec84]
- Updated dependencies [cf0f658]
- Updated dependencies [f2a4875]
- Updated dependencies [faf14b1]
    - @tinyburg/tinytower-sdk@0.3.0
    - @tinyburg/nimblebit-sdk@0.3.0
    - @tinyburg/tinytower-classic-sdk@0.3.0

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
