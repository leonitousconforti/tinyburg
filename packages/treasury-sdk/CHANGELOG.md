# @tinyburg/treasury-sdk

## 0.4.0

### Minor Changes

- 9159310: Declare scopes as flat `@yielded/auth` `OAuthScope.Described` constants instead of a tree, and remove `NimblebitScopes`. Each `Scopes` module now exports the whole game's scope, `Read`, `Write`, one scope per endpoint (`Scopes.SyncPullSave`), and in the game SDKs a `:read` and a `:write` scope per area (`Scopes.SyncRead`). Every endpoint accepts its own scope, its area's side (game SDKs), the game's side and the game. The game SDKs no longer have the bare area scopes such as `tinytower:sync`; every other scope name is unchanged. `@tinyburg/tinyburg-sdk`'s and `@tinyburg/treasury-sdk`'s scope names and requirements are unchanged.

### Patch Changes

- Updated dependencies [51cfcfc]
- Updated dependencies [9159310]
- Updated dependencies [16c9e1c]
- Updated dependencies [34ac6e5]
    - @tinyburg/nimblebit-sdk@0.4.0
    - @tinyburg/tinytower-sdk@0.4.0

## 0.3.0

### Minor Changes

- 160e0ac: Add `OpenOffers` to `TreasuryPublicGroup`: `GET /v1/treasury/offers` lists the live open offers, without who made them, for anyone. `GetTrade` now also answers any trader for an open offer, so it can be accepted from its page.

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
