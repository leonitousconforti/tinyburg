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

Declare scopes as flat `@yielded/auth` `OAuthScope.Described` constants instead of a tree, and remove `NimblebitScopes`. Each `Scopes` module now exports the whole game's scope, `Read`, `Write` and one scope per endpoint (`Scopes.SyncPullSave`), and every endpoint accepts its own scope, its side's and the game's. The game SDKs no longer have area scopes such as `tinytower:sync` and `tinytower:sync:read`; endpoint scope names are unchanged. `@tinyburg/tinyburg-sdk`'s and `@tinyburg/treasury-sdk`'s scope names and requirements are unchanged.
