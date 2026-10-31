# @tinyburg/tinytower-vegas-sdk

The Tiny Tower Vegas api, for the authproxy.

Tiny Tower Vegas speaks Nimblebit's NBSync protocol under the game code `vegas`. Requests
are signed with `NimblebitAuth` from `@tinyburg/nimblebit-sdk`, using the
game's own secret salt, and the endpoints carry the `tinytowervegas` scope tree
built by `defineGame`. Game-specific save and meta payloads are still
`Schema.Unknown`.
