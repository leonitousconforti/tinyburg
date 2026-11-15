---
"@tinyburg/tinytower-vegas-sdk": minor
---

Add the `SocialRetrieveFriendsSnapshotList` endpoint (`/sync/current_player_snapshots/`) and the `social_getVisits`, `social_pullFriendGame`, `social_pullFriendMeta` and `social_retrieveFriendsSnapshotList` client functions, and decode `total` from `get_visits` and `event_rewards` from `get_items`. The endpoint docs now say which requests the game was seen making and which are only inferred.
