# tinyburg/nimblebit-sdk

## 0.3.0

### Minor Changes

- c779076: `NimblebitAuth.layerDirect` and `layerDirectConfig` now sign with `effect/crypto`'s `Digest` instead of importing `node:crypto`, so they need a `Digest` layer (`NodeCrypto.layerDigest` or `Digest.layerWebCrypto`) alongside `SecureRandom`, and `salt` no longer declares a `PlatformError` it could never fail with. `burnbot` now has players for Bit City, Disco Zoo, LEGO Tower, Pocket Planes, Pocket Trains and Tiny Tower Vegas, and `PlayerIdSchema` accepts the 6-character ids LEGO Tower now issues.
- 97dec84: `NimblebitError.NimblebitErrorTypeId` is now `NimblebitError.TypeId`, the string `"~@tinyburg/nimblebit-sdk/NimblebitError"` rather than a symbol, following Effect 4's type ids.

### Patch Changes

- bb4314f: Encode the unknown properties that decoded as coming before every known one back at the start of the object, instead of dropping them.
- f2a4875: `NimblebitAuth` now draws signed int32 salts, as the games do, and every SDK's endpoints accept a negative `salt`.

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
