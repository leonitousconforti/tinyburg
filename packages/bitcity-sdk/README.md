# @tinyburg/bitcity-sdk

The Bit City api, for the authproxy.

Bit City speaks Nimblebit's NBSync protocol under the game code `bc`. Requests
are signed with `NimblebitAuth` from `@tinyburg/nimblebit-sdk`, using the
game's own secret salt, and the endpoints carry the `bitcity` scope tree
built by `defineGame`. Game-specific save and meta payloads are still
`Schema.Unknown`.
