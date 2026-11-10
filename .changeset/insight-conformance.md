---
"@tinyburg/insight": minor
---

`Conformance` checks an SDK's `HttpApi` against a probe run of its game: which endpoints the game called, whether their real responses decode, the exact preimage the game signed, and which compiled-in paths the SDK lacks, with the game's secrets redacted. Each game SDK with an Android build now has `pnpm conformance`.
