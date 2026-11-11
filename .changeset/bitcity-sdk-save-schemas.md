---
"@tinyburg/bitcity-sdk": minor
---

Add the `Save` module with schemas for Bit City's JSON save and the cloud sync's zlib copy of it, checked against saves Bit City 1.6.0 wrote. Decoding keeps keys the schemas do not model, the player's salt and email decode to `Redacted`, and encoding writes the save back the way the game does.
