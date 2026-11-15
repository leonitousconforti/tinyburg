# @tinyburg/bitcity-sdk

## 0.2.0

### Minor Changes

- dd81dd2: Add the `Buildings`, `Cities`, `Missions`, `Upgrades` and `Vehicles` modules with Bit City's data tables, read from the game itself by a frida agent that `pnpm generate` loads into it on insight's emulator.
- 9159310: Declare scopes as flat `@yielded/auth` `OAuthScope.Described` constants instead of a tree, and remove `NimblebitScopes`. Each `Scopes` module now exports the whole game's scope, `Read`, `Write`, one scope per endpoint (`Scopes.SyncPullSave`), and in the game SDKs a `:read` and a `:write` scope per area (`Scopes.SyncRead`). Every endpoint accepts its own scope, its area's side (game SDKs), the game's side and the game. The game SDKs no longer have the bare area scopes such as `tinytower:sync`; every other scope name is unchanged. `@tinyburg/tinyburg-sdk`'s and `@tinyburg/treasury-sdk`'s scope names and requirements are unchanged.

### Patch Changes

- Updated dependencies [51cfcfc]
- Updated dependencies [9159310]
- Updated dependencies [16c9e1c]
    - @tinyburg/nimblebit-sdk@0.4.0

## 0.1.2

### Patch Changes

- f2a4875: `NimblebitAuth` now draws signed int32 salts, as the games do, and every SDK's endpoints accept a negative `salt`.
- Updated dependencies [bb4314f]
- Updated dependencies [c779076]
- Updated dependencies [97dec84]
- Updated dependencies [f2a4875]
    - @tinyburg/nimblebit-sdk@0.3.0

## 0.1.1

### Patch Changes

- 9b20bdc: Republish from the Release workflow to verify npm trusted publishing. No code changes.
- Updated dependencies [9b20bdc]
    - @tinyburg/nimblebit-sdk@0.2.1

## 0.1.0

### Minor Changes

- First release: SDKs for Bit City, Disco Zoo, LEGO Tower, Pocket Planes, Pocket Trains, TinyTower Classic and Tiny Tower Vegas, and the treasury's trade escrow api.

### Patch Changes

- Updated dependencies
    - @tinyburg/nimblebit-sdk@0.2.0
