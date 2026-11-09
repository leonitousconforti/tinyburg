---
"@tinyburg/nimblebit-sdk": patch
"@tinyburg/tinytower-sdk": patch
---

`NimblebitSchema.split` is built on Effect's `SchemaGetter.split` and decodes an empty string as an empty list instead of `[""]`, so an empty bitbook, bitizen, floor or friend list no longer fails to decode. `CSharpDate` now decodes tick counts before 1970 that are not whole milliseconds correctly.
