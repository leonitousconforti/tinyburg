---
"@tinyburg/tinytower-sdk": patch
---

`TinyTower.SaveData` decodes an empty costume, pet, fitting, history or banned friend list as an empty array rather than as one holding an empty name.
