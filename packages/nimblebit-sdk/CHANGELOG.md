# tinyburg/nimblebit-sdk

## 0.4.0

### Minor Changes

- 51cfcfc: `NimblebitSchema.CSharpDate` decodes to an Effect `DateTime.Utc` instead of a `Date`. TinyTower's floor open, stocking and last sale times, bitbook post dates and friend timestamps change type with it, in tinytower-sdk's `SaveData` and the one tinytower-classic-sdk re-exports.
- 9159310: Declare scopes as flat `@yielded/auth` `OAuthScope.Described` constants instead of a tree, and remove `NimblebitScopes`. Each `Scopes` module now exports the whole game's scope, `Read`, `Write`, one scope per endpoint (`Scopes.SyncPullSave`), and in the game SDKs a `:read` and a `:write` scope per area (`Scopes.SyncRead`). Every endpoint accepts its own scope, its area's side (game SDKs), the game's side and the game. The game SDKs no longer have the bare area scopes such as `tinytower:sync`; every other scope name is unchanged. `@tinyburg/tinyburg-sdk`'s and `@tinyburg/treasury-sdk`'s scope names and requirements are unchanged.

### Patch Changes

- 16c9e1c: `NimblebitSchema.split` is built on Effect's `SchemaGetter.split` and decodes an empty string as an empty list instead of `[""]`, so an empty bitbook, bitizen, floor or friend list no longer fails to decode. `CSharpDate` now decodes tick counts before 1970 that are not whole milliseconds correctly.

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
