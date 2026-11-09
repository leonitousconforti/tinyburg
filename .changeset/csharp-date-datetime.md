---
"@tinyburg/nimblebit-sdk": minor
"@tinyburg/tinytower-sdk": minor
"@tinyburg/tinytower-classic-sdk": minor
---

`NimblebitSchema.CSharpDate` decodes to an Effect `DateTime.Utc` instead of a `Date`. TinyTower's floor open, stocking and last sale times, bitbook post dates and friend timestamps change type with it, in tinytower-sdk's `SaveData` and the one tinytower-classic-sdk re-exports.
