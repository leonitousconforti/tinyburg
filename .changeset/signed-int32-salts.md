---
"@tinyburg/nimblebit-sdk": patch
"@tinyburg/bitcity-sdk": patch
"@tinyburg/disco-zoo-sdk": patch
"@tinyburg/lego-tower-sdk": patch
"@tinyburg/pocket-planes-sdk": patch
"@tinyburg/pocket-trains-sdk": patch
"@tinyburg/tinytower-sdk": patch
"@tinyburg/tinytower-classic-sdk": patch
"@tinyburg/tinytower-vegas-sdk": patch
---

`NimblebitAuth` now draws signed int32 salts, as the games do, and every SDK's endpoints accept a negative `salt`.
