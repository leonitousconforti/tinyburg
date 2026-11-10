---
"@tinyburg/tinytower-sdk": patch
---

Fix Bitizen first names: `Bitizens.maleNames` held the game's female first names and `Bitizens.femaleNames` its male ones, because the data generator wrote each list under the other's name. Every Bitizen decoded from a save got its first name from the other gender's list, and encoding only accepted a first name from that list. The last-name lists are the same either way.
