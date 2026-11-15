---
"@tinyburg/lego-tower-sdk": minor
---

Add the `Save` module with schemas for LEGO Tower's save, the JSON string the game stores, and for the zlib-compressed bytes the sync server holds, checked against saves the game itself wrote. Decoding keeps keys the schemas do not model, and the player's secret and email decode to `Redacted` values.
