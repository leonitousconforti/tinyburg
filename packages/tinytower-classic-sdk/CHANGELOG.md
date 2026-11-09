# @tinyburg/tinytower-classic-sdk

## 0.3.0

### Minor Changes

- faf14b1: `sync_pushSave` and `sync_pushSnapshot` can now make a player's first upload: a player with no save starts from version 0 instead of failing on `current_version`'s `NoSave`. `device_playerDetails` also returns the `saveVersion` and `checksum` (`h`) the server sends, `social_pullFriendMeta` is typed as possibly `undefined` (Nimblebit answers `Found` without the friend when it has no tower for them), and `SyncItemType` gains the game's `Promo` and `Referral`.

### Patch Changes

- f2a4875: `NimblebitAuth` now draws signed int32 salts, as the games do, and every SDK's endpoints accept a negative `salt`.
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

## 0.2.1

### Patch Changes

- 9b20bdc: Republish from the Release workflow to verify npm trusted publishing. No code changes.
- Updated dependencies [9b20bdc]
    - @tinyburg/nimblebit-sdk@0.2.1
    - @tinyburg/tinytower-sdk@0.2.1

## 0.2.0

### Minor Changes

- First release: SDKs for Bit City, Disco Zoo, LEGO Tower, Pocket Planes, Pocket Trains, TinyTower Classic and Tiny Tower Vegas, and the treasury's trade escrow api.

### Patch Changes

- Updated dependencies
    - @tinyburg/nimblebit-sdk@0.2.0
    - @tinyburg/tinytower-sdk@0.2.0
