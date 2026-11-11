---
"@tinyburg/pocket-planes-sdk": minor
---

Add the `Save` module with schemas for Pocket Planes's save, the JSON string the game stores and syncs, and for the zlib-compressed bytes the sync server holds, checked against saves the game itself wrote. Decoding keeps keys the schemas do not model, and the player's auth salt and email decode to `Redacted` values.
