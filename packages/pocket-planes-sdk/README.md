# @tinyburg/pocket-planes-sdk

The Pocket Planes api, for the authproxy.

Pocket Planes speaks Nimblebit's NBSync protocol under the game code `pp`. Requests
are signed with `NimblebitAuth` from `@tinyburg/nimblebit-sdk`, using the
game's own secret salt, and the endpoints carry the `pocketplanes` scope tree
built by `defineGame`. Game-specific save and meta payloads are still
`Schema.Unknown`.
