---
"@tinyburg/insight": minor
---

Probe any Nimblebit Unity game: `NBSync.layerAgent` spawns a game with a game-agnostic agent that hooks its web requests, hashing and NBSync classes before its first request, and `NBSync.probe` records its launch traffic, then calls its read-only NBSync methods and records those too. `Metadata` reads the URL paths compiled into a game from its APK.
