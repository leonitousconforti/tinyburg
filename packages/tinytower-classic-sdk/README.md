# @tinyburg/tinytower-classic-sdk

The TinyTower Classic api, for the authproxy and for tinyburg.app.

Classic speaks the same protocol as TinyTower under a different game code, so
this package is TinyTower's endpoints and client re-issued with that code in
every path and every signed string, and its own scope tree (`tinytowerclassic`,
`tinytowerclassic:sync:read`, ...) stamped on the endpoints. Save data,
bitizens, gifts and item types are the same schemas, imported from
`@tinyburg/tinytower-sdk` rather than copied.

The game code, `ttc`, lives in `src/Game.ts`; every path and hash derives
from it.
