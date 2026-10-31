# @tinyburg/lego-tower-sdk

The LEGO Tower api, for the authproxy.

LEGO Tower speaks Nimblebit's NBSync protocol under the game code `lt`. Requests
are signed with `NimblebitAuth` from `@tinyburg/nimblebit-sdk`, using the
game's own secret salt, and the endpoints carry the `legotower` scope tree
built by `defineGame`. Game-specific save and meta payloads are still
`Schema.Unknown`.
