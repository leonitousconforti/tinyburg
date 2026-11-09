---
"@tinyburg/nimblebit-sdk": minor
"@tinyburg/tinytower-sdk": minor
"@tinyburg/tinytower-classic-sdk": minor
"@tinyburg/pocket-planes-sdk": minor
"@tinyburg/pocket-trains-sdk": minor
"@tinyburg/lego-tower-sdk": minor
"@tinyburg/disco-zoo-sdk": minor
"@tinyburg/bitcity-sdk": minor
"@tinyburg/tinytower-vegas-sdk": minor
"@tinyburg/tinyburg-sdk": minor
"@tinyburg/treasury-sdk": minor
---

Declare scopes as flat `@yielded/auth` `OAuthScope.Described` constants instead of a tree, and remove `NimblebitScopes`. Each `Scopes` module now exports the whole game's scope, `Read`, `Write`, one scope per endpoint (`Scopes.SyncPullSave`), and in the game SDKs a `:read` and a `:write` scope per area (`Scopes.SyncRead`). Every endpoint accepts its own scope, its area's side (game SDKs), the game's side and the game. The game SDKs no longer have the bare area scopes such as `tinytower:sync`; every other scope name is unchanged. `@tinyburg/tinyburg-sdk`'s and `@tinyburg/treasury-sdk`'s scope names and requirements are unchanged.
