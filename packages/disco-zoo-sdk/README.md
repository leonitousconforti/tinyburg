# @tinyburg/disco-zoo-sdk

The Disco Zoo api, for the authproxy.

Disco Zoo speaks Nimblebit's NBSync protocol under the game code `dz`. Requests
are signed with `NimblebitAuth` from `@tinyburg/nimblebit-sdk`, using the
game's own secret salt, and the endpoints carry the `discozoo` scope tree
built by `defineGame`. Game-specific save and meta payloads are still
`Schema.Unknown`.
