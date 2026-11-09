# @tinyburg/pocket-planes-sdk

The Pocket Planes api, for the authproxy.

Pocket Planes speaks Nimblebit's NBSync protocol under the game code `pp`. Requests
are signed with `NimblebitAuth` from `@tinyburg/nimblebit-sdk`, using the
game's own secret salt, and the endpoints carry the `pocketplanes` scope tree
built by `defineGame`. Save data is returned as raw bytes, and gift elements
and friend meta values are still `Schema.Unknown`.
