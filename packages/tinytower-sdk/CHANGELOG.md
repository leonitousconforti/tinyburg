# @tinyburg/tinytower-sdk

## 0.3.0

### Minor Changes

- cf0f658: Add `SaveDiffer`, serializable patches over a decoded save with an exact `diff`, and `Splice`, which takes floors, bitizens, costumes, pets, fittings and currency out of one tower and into another, refusing any edit that would leave a save contradicting itself.
- faf14b1: `sync_pushSave` and `sync_pushSnapshot` can now make a player's first upload: a player with no save starts from version 0 instead of failing on `current_version`'s `NoSave`. `device_playerDetails` also returns the `saveVersion` and `checksum` (`h`) the server sends, `social_pullFriendMeta` is typed as possibly `undefined` (Nimblebit answers `Found` without the friend when it has no tower for them), and `SyncItemType` gains the game's `Promo` and `Referral`.

### Patch Changes

- 2ec1bdc: Update `effect` to 4.1.2 and the `@efffrida/*` dependencies to the releases built for it. `DeviceLive` now restarts `frida-server` when it exits, at most 5 times, and sessions on the old server detach.
- cf0f658: `TinyTower.SaveData` decodes an empty costume, pet, fitting, history or banned friend list as an empty array rather than as one holding an empty name.
- aad505b: Update `frida` to 17.26.2 and the `@efffrida/*` dependencies to the releases built against it. 17.25.0 and 17.25.1 crashed Unity games on attach on Android, and 17.26.0 resolves exports of the game's own libraries in the emulated realm.
- f2a4875: `NimblebitAuth` now draws signed int32 salts, as the games do, and every SDK's endpoints accept a negative `salt`.
- Updated dependencies [bb4314f]
- Updated dependencies [c779076]
- Updated dependencies [97dec84]
- Updated dependencies [f2a4875]
    - @tinyburg/nimblebit-sdk@0.3.0

## 0.2.1

### Patch Changes

- 9b20bdc: Republish from the Release workflow to verify npm trusted publishing. No code changes.
- Updated dependencies [9b20bdc]
    - @tinyburg/nimblebit-sdk@0.2.1

## 0.2.0

### Minor Changes

- Move to Effect 4.1 and declare each endpoint's scopes with `@yielded/auth`'s `OAuthScope` annotations. BEHAVIOR CHANGE: `effect` 4.1.1 and `@yielded/auth` 0.1.0-beta.47 are now peer dependencies, and `NimblebitAuth` layers require `SecureRandom` from `effect/crypto` instead of `Crypto`.

### Patch Changes

- Updated dependencies
    - @tinyburg/nimblebit-sdk@0.2.0

## 0.1.0

### Minor Changes

- b9b405a: New releases with new structures

### Patch Changes

- Updated dependencies [b9b405a]
    - @tinyburg/nimblebit-sdk@0.1.0

## 0.0.2

### Patch Changes

- a766e8a: Bump tinytower version and regenerate data
- Updated dependencies [a766e8a]
    - @tinyburg/nimblebit-sdk@0.0.2
