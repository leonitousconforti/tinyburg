---
"@tinyburg/tinytower-sdk": minor
"@tinyburg/tinytower-classic-sdk": minor
---

`sync_pushSave` and `sync_pushSnapshot` can now make a player's first upload: a player with no save starts from version 0 instead of failing on `current_version`'s `NoSave`. `device_playerDetails` also returns the `saveVersion` and `checksum` (`h`) the server sends, `social_pullFriendMeta` is typed as possibly `undefined` (Nimblebit answers `Found` without the friend when it has no tower for them), and `SyncItemType` gains the game's `Promo` and `Referral`.
