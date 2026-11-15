---
"@tinyburg/disco-zoo-sdk": minor
---

Add the `Save` module with schemas for Disco Zoo's save, the JSON string the game keeps in PlayerPrefs and syncs, and for the zlib-compressed bytes the sync server holds. Decoding keeps keys the schemas do not model, in every object of the save, and the player's salt and email decode to `Redacted` values.
