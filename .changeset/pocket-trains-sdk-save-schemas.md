---
"@tinyburg/pocket-trains-sdk": minor
---

Add the `Save` module with schemas for Pocket Trains' save, the block text the game stores and syncs, and for the zlib-compressed bytes the sync server holds, checked against saves the game itself wrote. Decoding fails on blocks the schemas do not model rather than dropping them, and the player's salt and email decode to `Redacted` values.
