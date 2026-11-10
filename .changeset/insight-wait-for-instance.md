---
"@tinyburg/insight": patch
---

`waitForInstance` now waits for a static field that holds an array or a string, not only an object, and waits for il2cpp to initialize the class that declares the field before reading it, which would otherwise crash the game. It also returns the field's value.
