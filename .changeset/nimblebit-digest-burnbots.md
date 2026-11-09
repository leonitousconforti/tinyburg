---
"@tinyburg/nimblebit-sdk": minor
---

`NimblebitAuth.layerDirect` and `layerDirectConfig` now sign with `effect/crypto`'s `Digest` instead of importing `node:crypto`, so they need a `Digest` layer (`NodeCrypto.layerDigest` or `Digest.layerWebCrypto`) alongside `SecureRandom`. `burnbot` now has players for Bit City, Disco Zoo, LEGO Tower, Pocket Planes, Pocket Trains and Tiny Tower Vegas, and `PlayerIdSchema` accepts the 6-character ids LEGO Tower now issues.
