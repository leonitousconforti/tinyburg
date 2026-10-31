# @tinyburg/pocket-trains-sdk

The Pocket Trains api, for the authproxy.

Pocket Trains speaks Nimblebit's NBSync protocol under the game code `pt`. Requests
are signed with `NimblebitAuth` from `@tinyburg/nimblebit-sdk`, using the
game's own secret salt, and the endpoints carry the `pockettrains` scope tree
built by `defineGame`. Game-specific save and meta payloads are still
`Schema.Unknown`.
