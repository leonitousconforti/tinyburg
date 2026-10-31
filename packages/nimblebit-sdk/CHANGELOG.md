# tinyburg/nimblebit-sdk

## 0.2.2

### Patch Changes

- bb4314f: Encode the unknown properties that decoded as coming before every known one back at the start of the object, instead of dropping them.

## 0.2.1

### Patch Changes

- 9b20bdc: Republish from the Release workflow to verify npm trusted publishing. No code changes.

## 0.2.0

### Minor Changes

- Move to Effect 4.1 and declare each endpoint's scopes with `@yielded/auth`'s `OAuthScope` annotations. BEHAVIOR CHANGE: `effect` 4.1.1 and `@yielded/auth` 0.1.0-beta.47 are now peer dependencies, and `NimblebitAuth` layers require `SecureRandom` from `effect/crypto` instead of `Crypto`.

## 0.1.0

### Minor Changes

- b9b405a: New releases with new structures

## 0.0.2

### Patch Changes

- a766e8a: Bump tinytower version and regenerate data
